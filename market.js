/* Prancheta FC — mercado de transferências
 * Janelas, busca, propostas (valor + salário + anos), empréstimos, jogadores livres,
 * propostas da IA pelos seus jogadores e transferências entre clubes da IA.
 */
(function (P) {
  const A = P.app, esc = P.esc;

  P.MARKET = {
    windows: [[0, 8], [22, 28]],   // semanas do calendário com janela aberta [início, fim)
    maxSquad: 32, minSquad: 16,
    loanFee: 0.1                   // taxa de empréstimo = 10% do valor
  };

  // ---------- Regras ----------
  P.windowOpen = (g) => !g.over && P.MARKET.windows.some(([a, b]) => g.week >= a && g.week < b);
  P.windowText = function (g) {
    if (g.over) return 'Janela fechada até a nova temporada';
    for (const [a, b] of P.MARKET.windows) {
      if (g.week >= a && g.week < b) return `Janela aberta até a semana ${b}`;
      if (g.week < a) return `Janela fechada. Abre na semana ${a + 1}`;
    }
    return 'Janela fechada até a nova temporada';
  };
  const isStarter = (g, p) => p.clubId && g.tac[p.clubId] && g.tac[p.clubId].xi.includes(p.id);

  // Quanto o clube pede pelo jogador (null = não vende)
  P.askPrice = function (g, p) {
    if (!p.clubId) return 0;
    const c = P.club(g, p.clubId);
    if (P.squad(g, p.clubId).length <= 20) return null;
    let m = 1;
    if (isStarter(g, p)) m *= 1.35;
    if (p.age <= 21) m *= 1.2;
    if (p.ctr <= g.season) m *= 0.6;
    if (c.bal < 0) m *= 0.8;
    return Math.round(P.value(p) * m / 10000) * 10000;
  };
  // Quanto o jogador quer ganhar para ir (null = recusa)
  P.playerDemand = function (g, p, toCid) {
    const to = P.club(g, toCid);
    const from = p.clubId ? P.club(g, p.clubId) : null;
    const diff = from ? to.div - from.div : 0;
    if (from && diff >= 3 && P.ovr(p) >= 72) return null;
    let d = Math.max(p.clubId ? p.wage * 1.1 : 0, P.wageFor(p) * (p.clubId ? 1 : 1.05));
    if (diff > 0) d *= 1 + diff * 0.25;
    return Math.round(d / 500) * 500;
  };

  // ---------- Execução ----------
  P.transfer = function (g, p, toCid, fee, wage, years, kind) {
    const from = p.clubId;
    if (fee) { P.pay(g, toCid, -fee, 'Contratações'); if (from) P.pay(g, from, fee, 'Vendas'); }
    p.clubId = toCid; p.wage = wage; p.ctr = g.season + years; p.listed = false;
    p.mor = Math.max(p.mor, 70); p.cond = Math.max(p.cond, 80);
    delete p.loan;
    if (kind === 'loan') { p.loan = { from, till: g.season, wage: p.wage }; p.ctr = Math.max(p.ctr, g.season); }
    P.dirty(g);
    if (from && g.tac[from]) P.fixXI(g, from);
    if (g.tac[toCid]) P.fixXI(g, toCid);
    g.tx = g.tx || [];
    g.tx.unshift({ s: g.season, w: g.week + 1, pid: p.id, name: p.name, pos: p.pos, ovr: P.ovr(p), from, to: toCid, fee, kind: kind || (from ? 'buy' : 'free') });
    if (g.tx.length > 60) g.tx.length = 60;
    if (g.offers) g.offers = g.offers.filter((o) => o.pid !== p.id);
  };

  // Proposta do usuário: devolve { ok, msg, counter }
  P.userOffer = function (g, p, fee, wage, years, loan) {
    const me = P.club(g, g.user);
    const free = !p.clubId;
    if (!free && !P.windowOpen(g)) return { ok: false, msg: P.windowText(g) + '. Jogadores livres podem ser contratados a qualquer momento.' };
    if (P.squad(g, g.user).length >= P.MARKET.maxSquad) return { ok: false, msg: `Seu elenco já tem ${P.MARKET.maxSquad} jogadores. Dispense ou venda alguém antes.` };
    if (loan) {
      if (P.squad(g, p.clubId).length <= 20 || isStarter(g, p)) return { ok: false, msg: `O ${P.club(g, p.clubId).name} não empresta um jogador importante.` };
      fee = Math.round(P.value(p) * P.MARKET.loanFee / 10000) * 10000;
      if (me.bal < fee) return { ok: false, msg: `A taxa de empréstimo é ${P.money(fee)} e o saldo não cobre.` };
      P.transfer(g, p, g.user, fee, p.wage, 0, 'loan');
      return { ok: true, msg: `${p.name} chegou por empréstimo até o fim da temporada. Taxa: ${P.money(fee)}.` };
    }
    if (me.bal < fee) return { ok: false, msg: 'O saldo do clube não cobre esse valor.' };
    if (!free) {
      const ask = P.askPrice(g, p);
      if (ask == null) return { ok: false, msg: `O ${P.club(g, p.clubId).name} não quer vender: o elenco deles está curto.` };
      if (fee < ask * 0.85) return { ok: false, msg: `Proposta recusada. O ${P.club(g, p.clubId).name} nem quer conversar abaixo de ${P.money(Math.round(ask * 0.85 / 10000) * 10000)}.` };
      if (fee < ask) return { ok: false, counter: { fee: ask }, msg: `O ${P.club(g, p.clubId).name} faz uma contraproposta: ${P.money(ask)}.` };
    }
    const demand = P.playerDemand(g, p, g.user);
    if (demand == null) return { ok: false, msg: `${p.name} não quer jogar na ${me.div}ª divisão.` };
    if (wage < demand) return { ok: false, counter: { wage: demand }, msg: `${free ? '' : 'O clube aceitou, mas '}${p.name} quer ganhar ${P.money(demand)}/mês.` };
    P.transfer(g, p, g.user, fee, wage, years);
    P.news(g, `${p.name} é o novo reforço do ${me.name}${fee ? ` por ${P.money(fee)}` : ' (jogador livre)'}.`, 'good');
    return { ok: true, msg: `Negócio fechado! ${p.name} assinou até ${p.ctr}.` };
  };

  P.acceptOffer = function (g, oid) {
    const o = (g.offers || []).find((x) => x.id === oid); if (!o) return null;
    const p = g.db.players[o.pid];
    if (!p || p.clubId !== g.user) { g.offers = g.offers.filter((x) => x.id !== oid); return null; }
    if (P.squad(g, g.user).length <= P.MARKET.minSquad) return 'Seu elenco ficaria pequeno demais.';
    P.transfer(g, p, o.from, o.fee, Math.max(p.wage, P.wageFor(p)), 3);
    P.news(g, `${p.name} foi vendido ao ${P.club(g, o.from).name} por ${P.money(o.fee)}.`, 'good');
    return '';
  };

  // ---------- Mundo em movimento (roda toda semana) ----------
  P.marketWeek = function (g, step) {
    const rnd = Math.random;
    g.offers = (g.offers || []).filter((o) => o.until > g.week && P.windowOpen(g));
    if (!P.windowOpen(g)) return;
    const clubs = g.db.clubs;
    const ovrs = P.clubOvrs(g.db);

    // 1. propostas pelos seus jogadores
    const mine = P.squad(g, g.user).filter((p) => !p.loan);
    const listed = mine.filter((p) => p.listed);
    if (mine.length > P.MARKET.minSquad && rnd() < (listed.length ? 0.8 : 0.55)) {
      const p = listed.length && rnd() < 0.7 ? P.pick(rnd, listed) : P.weighted(rnd, mine, (x) => P.value(x));
      const me = P.club(g, g.user);
      const buyers = clubs.filter((c) => c.id !== g.user && c.div <= me.div + 1 && c.bal > P.value(p) * 1.3 && P.ovr(p) >= ovrs[c.id] - 6);
      if (buyers.length && !(g.offers || []).some((o) => o.pid === p.id)) {
        const b = P.pick(rnd, buyers);
        const fee = Math.round(P.value(p) * (p.listed ? 0.8 + rnd() * 0.25 : 0.9 + rnd() * 0.4) * (isStarter(g, p) ? 1.15 : 1) / 10000) * 10000;
        g.offers.push({ id: P.uid('o'), pid: p.id, from: b.id, fee, until: g.week + 2 });
        P.news(g, `O ${b.name} fez uma proposta de ${P.money(fee)} por ${p.name}. Veja em Mercado › Propostas.`, 'warn');
      }
    }

    // 2. transferências entre clubes da IA
    const tries = 10;
    for (let i = 0; i < tries; i++) {
      const buyer = P.pick(rnd, clubs);
      if (buyer.id === g.user || buyer.bal < 1e5) continue;
      const sq = P.squad(g, buyer.id);
      if (sq.length >= 30) continue;
      const line = P.pick(rnd, ['DEF', 'MEI', 'ATA', 'DEF', 'MEI', 'ATA', 'GOL']);
      const mineLine = sq.filter((p) => P.LINE[p.pos] === line).map(P.ovr).sort((a, b) => b - a);
      const bar = (mineLine[0] || 40) + 1;
      const budget = buyer.bal * 0.45;
      const sample = [];
      const all = Object.values(g.db.players), off = Math.floor(rnd() * all.length);
      for (let k = 0; k < all.length; k++) {
        const p = all[(off + k) % all.length];
        if (P.LINE[p.pos] !== line || p.clubId === buyer.id || p.clubId === g.user || p.loan) continue;
        const c = p.clubId && P.club(g, p.clubId);
        if (c && (c.div < buyer.div || c.div > buyer.div + 2)) continue;
        if (P.ovr(p) < bar) continue;
        sample.push(p);
        if (sample.length > 40) break;
      }
      const cands = sample.filter((p) => { const a = P.askPrice(g, p); return a != null && a <= budget; });
      if (!cands.length) continue;
      const p = cands.sort((a, b) => P.ovr(b) - P.ovr(a))[0];
      if (P.playerDemand(g, p, buyer.id) == null) continue;
      P.transfer(g, p, buyer.id, P.askPrice(g, p), P.playerDemand(g, p, buyer.id), 2 + Math.floor(rnd() * 3));
      // elenco grande demais: dispensa o pior
      const after = P.squad(g, buyer.id);
      if (after.length > 28) { const worst = after.sort((a, b) => P.ovr(a) - P.ovr(b))[0]; worst.clubId = null; worst.ctr = 0; worst.freeSince = g.season; P.dirty(g); P.fixXI(g, buyer.id); }
    }

    // 3. clubes com elenco curto contratam livres
    for (const c of clubs) {
      if (c.id === g.user) continue;
      const n = P.squad(g, c.id).length;
      if (n >= 20) continue;
      const free = Object.values(g.db.players).filter((p) => !p.clubId).sort((a, b) => P.ovr(b) - P.ovr(a));
      const f = free.find((p) => P.ovr(p) <= ovrs[c.id] + 3);
      if (f) P.transfer(g, f, c.id, 0, P.wageFor(f), 1 + Math.floor(rnd() * 2), 'free');
    }
  };

  // Antes da virada: empréstimos voltam, alguns contratos da IA viram jogadores livres
  P.marketPreSeason = function (g, r) {
    for (const p of Object.values(g.db.players)) {
      if (p.loan && p.loan.till <= g.season) {
        const back = p.loan.from;
        if (p.clubId === g.user) P.news(g, `${p.name} voltou ao ${P.club(g, back).name} após o empréstimo.`, '');
        p.clubId = back; delete p.loan;
      }
    }
    P.dirty(g);
    for (const c of g.db.clubs) {
      if (c.id === g.user) continue;
      const sq = P.squad(g, c.id);
      sq.filter((p) => p.ctr <= g.season && sq.length > 22 && r() < 0.2).forEach((p) => { p.clubId = null; p.ctr = 0; p.freeSince = g.season + 1; });
    }
    g.offers = [];
    P.dirty(g);
  };
  // Depois da virada: completa elencos da IA e limpa livres antigos
  P.marketPostSeason = function (g, r, used) {
    for (const c of g.db.clubs) {
      if (c.id === g.user) continue;
      const sq = P.squad(g, c.id);
      for (let i = sq.length; i < 22; i++) {
        const lacking = Object.keys(P.SQUAD_TEMPLATE).find((pos) => P.squad(g, c.id).filter((x) => x.pos === pos).length < P.SQUAD_TEMPLATE[pos]) || 'MC';
        const y = P.makePlayer(r, { pos: lacking, level: P.levelFromRep(c.rep) - 1, age: 17 + Math.floor(r() * 3), clubId: c.id, used, country: c.country });
        g.db.players[y.id] = y; P.dirty(g);
      }
    }
    for (const p of Object.values(g.db.players)) {
      if (!p.clubId) {
        if (p.freeSince == null) p.freeSince = g.season;
        if (p.age >= 34 || g.season - p.freeSince >= 2) delete g.db.players[p.id];
      }
    }
    P.dirty(g);
  };

  // ---------- Tela do mercado ----------
  const club = (cid) => g0().db.clubs.find((c) => c.id === cid);
  const g0 = () => A.g;
  function rowP(p, extra) {
    const c = p.clubId ? club(p.clubId) : null;
    return `<button class="prow" data-a="player" data-id="${p.id}"><span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
      <span class="nm"><b>${esc(p.name)}${p.loan ? '<span class="chip xi">Emprestado</span>' : ''}</b><small>${c ? esc(c.short) + ' · ' + c.div + 'ª' : 'Livre'} · ${p.age} anos · ${esc(p.nat || '')} · ${P.money(P.value(p))}</small></span>
      ${extra || '<span></span>'}<span class="ovr">${P.ovr(p)}</span></button>`;
  }
  P.marketView = function () {
    const g = A.g, st = A.st;
    const f = st.mk || (st.mk = { tab: 'busca', pos: 'ALL', age: 99, min: 0, free: false, sort: 'ovr', div: 0 });
    const offers = (g.offers || []).filter((o) => g.db.players[o.pid] && g.db.players[o.pid].clubId === g.user);
    const tabs = `<div class="seg">${[['busca', 'Buscar'], ['prop', `Propostas${offers.length ? ' (' + offers.length + ')' : ''}`], ['venda', 'À venda'], ['tx', 'Transferências']].map(([k, n]) => `<button class="${f.tab === k ? 'on' : ''}" data-a="mkTab" data-k="${k}">${n}</button>`).join('')}</div>`;
    const me = club(g.user);
    let body = '';
    if (f.tab === 'busca') {
      const opt = (key, list, cur) => `<select class="sel" data-c="mkF" data-k="${key}">${list.map(([v, n]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
      let list = Object.values(g.db.players).filter((p) => p.clubId !== g.user);
      if (f.free) list = list.filter((p) => !p.clubId);
      if (f.pos !== 'ALL') list = list.filter((p) => p.pos === f.pos);
      if (f.age < 99) list = list.filter((p) => p.age <= f.age);
      if (f.div) list = list.filter((p) => p.clubId && club(p.clubId).div === Number(f.div));
      const withO = list.map((p) => ({ p, o: P.ovr(p) })).filter((x) => x.o >= f.min);
      const sorter = { ovr: (a, b) => b.o - a.o, val: (a, b) => P.value(a.p) - P.value(b.p), age: (a, b) => a.p.age - b.p.age }[f.sort];
      const res = withO.sort(sorter).slice(0, 40).map((x) => x.p);
      body = `<div class="filters" style="margin-bottom:10px">
          ${opt('pos', [['ALL', 'Todas as posições']].concat(P.POS.map((x) => [x, x + ' · ' + P.POS_NAME[x]])), f.pos)}
          ${opt('age', [[99, 'Qualquer idade'], [21, 'Até 21'], [23, 'Até 23'], [26, 'Até 26'], [29, 'Até 29']], f.age)}
          ${opt('min', [[0, 'Qualquer força'], [50, 'Força 50+'], [60, 'Força 60+'], [70, 'Força 70+'], [80, 'Força 80+']], f.min)}
          ${opt('div', [[0, 'Todas as divisões']].concat(Array.from({ length: P.DIVS }, (_, i) => [i + 1, (i + 1) + 'ª divisão'])), f.div)}
          ${opt('sort', [['ovr', 'Mais fortes'], ['val', 'Mais baratos'], ['age', 'Mais jovens']], f.sort)}
          <label class="switch"><input type="checkbox" data-c="mkFree" ${f.free ? 'checked' : ''}> Só livres</label></div>
        <div class="plist">${res.map((p) => rowP(p)).join('') || '<p class="empty">Ninguém com esses filtros.</p>'}</div>
        <p class="muted" style="font-size:.85rem">Mostrando até 40 jogadores. Toque para ver a ficha e fazer proposta.</p>`;
    } else if (f.tab === 'prop') {
      body = offers.length ? `<div class="plist">${offers.map((o) => {
        const p = g.db.players[o.pid], b = club(o.from);
        return `<div class="offer"><div class="row" style="gap:8px">${P.badge(b, 28)}<div style="flex:1;min-width:0"><b>${esc(b.name)}</b> <span class="muted">(${b.div}ª div)</span><div class="muted" style="font-size:.85rem">quer <b>${esc(p.name)}</b> · ${p.pos} · força ${P.ovr(p)} · vale ${P.money(P.value(p))}</div></div><b class="num">${P.money(o.fee)}</b></div>
          <div class="row"><span class="muted" style="font-size:.8rem;flex:1">Vale até a semana ${o.until}</span><button class="btn sm" data-a="mkReject" data-id="${o.id}">Recusar</button><button class="btn sm primary" data-a="mkAccept" data-id="${o.id}">Aceitar</button></div></div>`;
      }).join('')}</div>` : `<p class="empty">Nenhuma proposta no momento. Coloque jogadores à venda pela ficha deles para atrair interessados.</p>`;
    } else if (f.tab === 'venda') {
      const ls = P.squad(g, g.user).filter((p) => p.listed);
      body = ls.length ? `<div class="plist">${ls.map((p) => rowP(p, '<span class="chip sus">À venda</span>')).join('')}</div>` : '<p class="empty">Nenhum jogador à venda. Abra a ficha de um jogador do seu elenco e toque em "Colocar à venda".</p>';
    } else {
      const tx = (g.tx || []);
      body = tx.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Jogador</th><th>De</th><th>Para</th><th class="n">Valor</th></tr></thead><tbody>${tx.slice(0, 40).map((t) => {
        const fc = t.from ? club(t.from) : null, tc = club(t.to);
        const mineRow = t.from === g.user || t.to === g.user;
        return `<tr class="${mineRow ? 'me' : ''} ${g.db.players[t.pid] ? 'click' : ''}" ${g.db.players[t.pid] ? `data-a="player" data-id="${t.pid}"` : ''}><td>${esc(t.name)} <span class="muted">${t.pos} ${t.ovr}</span></td><td>${fc ? esc(fc.short) : 'Livre'}</td><td>${tc ? esc(tc.short) : '-'}</td><td class="n">${t.kind === 'loan' ? 'Empr.' : t.fee ? P.money(t.fee) : 'Livre'}</td></tr>`;
      }).join('')}</tbody></table></div>` : '<p class="empty">Nenhuma transferência ainda nesta carreira.</p>';
    }
    return `<div class="card"><div class="head"><h2>Mercado</h2><b class="${me.bal < 0 ? 'v1' : ''}">${P.money(me.bal)}</b></div>
      <div class="window ${P.windowOpen(g) ? 'open' : ''}">${esc(P.windowText(g))}</div>
      <div style="margin:12px 0">${tabs}</div>${body}</div>`;
  };

  // Painel de proposta dentro da ficha do jogador
  P.marketPanel = function (p, mode) {
    const g = A.g;
    if (mode === 'offer' || mode === 'loan') {
      const d = A.st.offer && A.st.offer.pid === p.id ? A.st.offer : (A.st.offer = { pid: p.id, fee: p.clubId ? (P.askPrice(g, p) || P.value(p)) : 0, wage: P.playerDemand(g, p, g.user) || P.wageFor(p), years: 3, msg: '', ok: false });
      if (mode === 'loan') {
        const fee = Math.round(P.value(p) * P.MARKET.loanFee / 10000) * 10000;
        return `<div class="card" style="display:flex;flex-direction:column;gap:10px"><b>Empréstimo até o fim da temporada</b>
          <div class="muted">Taxa de ${P.money(fee)} ao ${esc(club(p.clubId).name)}. Você paga o salário de ${P.money(p.wage)}/mês enquanto ele estiver aqui.</div>
          ${d.msg ? `<div class="msg ${d.ok ? 'good' : ''}">${esc(d.msg)}</div>` : ''}
          <div class="row"><button class="btn" data-a="player" data-id="${p.id}">Voltar</button><span class="spacer"></span>${d.ok ? '' : `<button class="btn primary" data-a="mkLoan" data-id="${p.id}">Pedir empréstimo</button>`}</div></div>`;
      }
      return `<div class="card" style="display:flex;flex-direction:column;gap:10px"><b>${p.clubId ? 'Proposta de compra' : 'Contratar jogador livre'}</b>
        ${p.clubId ? `<div class="field"><label class="label" for="of-fee">Valor da transferência (R$)</label><input id="of-fee" type="number" min="0" step="10000" inputmode="numeric" data-i="ofF" data-k="fee" value="${d.fee}"></div>` : ''}
        <div class="field"><label class="label" for="of-wage">Salário mensal oferecido (R$)</label><input id="of-wage" type="number" min="0" step="500" inputmode="numeric" data-i="ofF" data-k="wage" value="${d.wage}"></div>
        <div class="seg">${[1, 2, 3, 4, 5].map((y) => `<button class="${y === d.years ? 'on' : ''}" data-a="ofYears" data-id="${p.id}" data-y="${y}">${y} ${y === 1 ? 'ano' : 'anos'}</button>`).join('')}</div>
        <div class="muted" style="font-size:.85rem">Saldo: ${P.money(club(g.user).bal)} · valor de mercado: ${P.money(P.value(p))}</div>
        ${d.msg ? `<div class="msg ${d.ok ? 'good' : ''}">${esc(d.msg)}</div>` : ''}
        <div class="row"><button class="btn" data-a="player" data-id="${p.id}">Voltar</button><span class="spacer"></span>${d.ok ? '' : `<button class="btn primary" data-a="mkOffer" data-id="${p.id}">Enviar proposta</button>`}</div></div>`;
    }
    return '';
  };
  P.marketButtons = function (p) {
    const g = A.g;
    if (!g) return '';
    if (p.clubId === g.user) return p.loan ? '' : `<button class="btn" data-a="mkList" data-id="${p.id}">${p.listed ? 'Tirar da venda' : 'Colocar à venda'}</button>`;
    const free = !p.clubId;
    return `<button class="btn primary" data-a="offerOpen" data-id="${p.id}">${free ? 'Contratar' : 'Fazer proposta'}</button>${free || p.loan ? '' : `<button class="btn" data-a="loanOpen" data-id="${p.id}">Empréstimo</button>`}`;
  };

  // ---------- Ações ----------
  Object.assign(A.ACT, {
    mkTab(d) { A.st.mk.tab = d.k; A.render(); },
    offerOpen(d) { A.st.offer = null; A.playerSheet(d.id, 'offer'); },
    loanOpen(d) { A.st.offer = null; A.playerSheet(d.id, 'loan'); },
    ofYears(d) { A.st.offer.years = Number(d.y); A.playerSheet(d.id, 'offer'); },
    mkOffer(d) {
      const g = A.g, p = g.db.players[d.id], o = A.st.offer;
      const r = P.userOffer(g, p, o.fee, o.wage, o.years, false);
      o.msg = r.msg; o.ok = r.ok;
      if (r.counter) Object.assign(o, r.counter);
            if (r.ok) { A.save(); A.render(); }
      A.playerSheet(d.id, 'offer');
    },
    mkLoan(d) {
      const g = A.g, p = g.db.players[d.id];
      A.st.offer = A.st.offer || { pid: p.id };
      const r = P.userOffer(g, p, 0, p.wage, 0, true);
      A.st.offer.msg = r.msg; A.st.offer.ok = r.ok;
      if (r.ok) { A.save(); A.render(); }
      A.playerSheet(d.id, 'loan');
    },
    mkList(d) { const p = A.g.db.players[d.id]; p.listed = !p.listed; A.save(); A.render(); A.playerSheet(d.id); A.toast(p.listed ? `${p.name} está à venda` : `${p.name} saiu da lista de venda`); },
    mkAccept(d) { const err = P.acceptOffer(A.g, d.id); if (err) { A.toast(err); return; } A.save(); A.render(); A.toast('Venda concluída'); },
    mkReject(d) { A.g.offers = A.g.offers.filter((o) => o.id !== d.id); A.save(); A.render(); }
  });
  Object.assign(A.CHG, {
    mkF(el) { const k = el.dataset.k; A.st.mk[k] = ['age', 'min', 'div'].includes(k) ? Number(el.value) : el.value; A.render(); },
    mkFree(el) { A.st.mk.free = el.checked; A.render(); }
  });
  Object.assign(A.INP, {
    ofF(el) { if (A.st.offer) A.st.offer[el.dataset.k] = Math.max(0, Math.round(Number(el.value) || 0)); }
  });
})(window.PFC);
