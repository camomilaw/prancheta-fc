/* Prancheta FC — mesa de negociação (estilo FM, com cara de jornal)
 * Comprar ou pedir emprestado um jogador de outro clube:
 *  - Transferência: valor, parcelamento (à vista, 2, 3 ou 4 temporadas), jogador incluído na troca,
 *    e depois salário e anos de contrato com o jogador.
 *  - Empréstimo: taxa, quanto do salário você paga (o resto fica com o clube dono) e opção de compra.
 * Cada clube tem um preço mínimo escondido (nem sempre igual à pedida), paciência limitada
 * (3 ou 4 rodadas por janela) e opinião própria sobre parcelar: 2 temporadas costuma passar,
 * 4 temporadas quase nunca. Clube no vermelho quer dinheiro à vista.
 * Jogadores livres continuam no painel simples da ficha (só salário e anos).
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const r10k = (v) => Math.round(v / 10000) * 10000;
  const r500 = (v) => Math.round(v / 500) * 500;
  const INST_F = { 1: 1, 2: 0.96, 3: 0.92, 4: 0.87 };      // quanto vale para o clube receber parcelado
  const INST_P = { 1: 1, 2: 0.65, 3: 0.3, 4: 0.08 };       // chance de o clube aceitar parcelar assim
  const INST_N = { 1: 'À vista', 2: '2 temporadas', 3: '3 temporadas', 4: '4 temporadas' };

  const windowKey = (g) => `${g.season}${P.lgDone && P.lgDone(g) >= 18 ? 'b' : 'a'}`;
  const isStarter = (g, p) => p.clubId && g.tac[p.clubId] && g.tac[p.clubId].xi.includes(p.id);
  const clubAvg = (g, cid) => { const o = P.squad(g, cid).map(P.ovr).sort((a, b) => b - a).slice(0, 18); return o.length ? o.reduce((s, x) => s + x, 0) / o.length : 50; };
  const monthsLeft = (g) => Math.max(1, Math.round((1 - (g.week || 0) / (g.cal ? g.cal.length : 52)) * 12));

  // Memória da negociação: preço mínimo escondido, paciência e humor sobre parcelas (vale pela janela)
  function mem(g, p) {
    g.neg = g.neg || {};
    const k = windowKey(g);
    let m = g.neg[p.id];
    if (!m || m.k !== k || m.club !== p.clubId) {
      const r = Math.random;
      const ask = P.askPrice(g, p);
      const acc = P.diffM ? P.diffM(g, 'acc') : 1;
      m = g.neg[p.id] = {
        k, club: p.clubId, rounds: 0,
        pat: 3 + (r() < 0.5 ? 1 : 0),
        min: ask == null ? null : r10k(ask * acc * (0.84 + r() * 0.2)),   // pode aceitar abaixo ou só acima da pedida
        inst: { 2: r() < INST_P[2], 3: r() < INST_P[3], 4: r() < INST_P[4] },
        loanMood: 0.85 + r() * 0.25,
        log: [], agreed: null, ppat: 3
      };
      if (P.club(g, p.clubId).bal < 0) m.inst = { 2: r() < 0.15, 3: false, 4: false }; // no vermelho: quer dinheiro agora
    }
    for (const id of Object.keys(g.neg)) if (g.neg[id].k !== k) delete g.neg[id]; // limpa janelas antigas
    return m;
  }
  const say = (m, who, txt) => { m.log.unshift({ who, txt }); if (m.log.length > 12) m.log.length = 12; };

  // Valor de um jogador oferecido na troca, para o clube vendedor
  P.swapValue = function (g, sp, toCid) {
    if (!sp || sp.loan) return { v: 0, why: 'não pode ser negociado' };
    if (P.squad(g, toCid).length >= P.MARKET.maxSquad) return { v: 0, why: 'eles não têm vaga no elenco' };
    if (P.playerDemand(g, sp, toCid) == null) return { v: 0, why: `${sp.name} não aceita ir para lá` };
    const avg = clubAvg(g, toCid), o = P.ovr(sp);
    let w = o >= avg ? 0.9 : o >= avg - 4 ? 0.6 : 0;
    if (sp.age >= 31) w *= 0.5;
    if (!w) return { v: 0, why: `eles não querem ${sp.name}` };
    return { v: r10k(P.value(sp) * w), why: '' };
  };

  // ---------- Avaliação do clube ----------
  function evalBuy(g, p, o, m) {
    const c = P.club(g, p.clubId);
    if (m.min == null) return { st: 'no', msg: `O ${c.name} não quer vender: o elenco deles está curto.` };
    if (m.pat <= 0) return { st: 'no', msg: `O ${c.name} encerrou as conversas por ${p.name} nesta janela.` };
    const sp = o.swap ? g.db.players[o.swap] : null;
    const sv = sp ? P.swapValue(g, sp, p.clubId) : { v: 0 };
    const instOk = o.inst === 1 || m.inst[o.inst];
    const eff = o.fee * INST_F[o.inst] + sv.v;
    m.rounds++;
    if (instOk && eff >= m.min) return { st: 'ok', sv };
    m.pat--;
    // contraproposta: chega mais perto do mínimo a cada rodada; parcelamento recusado vira à vista
    const inst = instOk ? o.inst : (m.inst[2] && o.inst > 2 ? 2 : 1);
    const ask = P.askPrice(g, p) || m.min;
    const top = Math.max(m.min, ask);
    const target = m.min + (top - m.min) * Math.pow(0.55, m.rounds);
    const cFee = Math.max(10000, r10k((target - sv.v) / INST_F[inst]));
    const lines = [];
    if (sp && !sv.v) lines.push(`Sobre ${sp.name}: ${sv.why}.`);
    if (!instOk) lines.push(inst === 1 ? 'Parcelar não dá: querem o dinheiro à vista.' : `Em ${INST_N[o.inst].toLowerCase()} não, mas topam em ${INST_N[inst].toLowerCase()}.`);
    if (m.pat <= 0) return { st: 'no', msg: `${lines.join(' ')} Cansado de ir e vir, o ${c.name} encerrou as conversas nesta janela.`.trim() };
    if (eff < m.min * 0.7) return { st: 'counter', counter: { fee: cFee, inst }, msg: `${lines.join(' ')} "Nem perto", respondeu o ${c.name}. Pedem ${P.money(cFee)}${inst > 1 ? ` em ${INST_N[inst].toLowerCase()}` : ''}.`.trim() };
    return { st: 'counter', counter: { fee: cFee, inst }, msg: `${lines.join(' ')} O ${c.name} faz uma contraproposta: ${P.money(cFee)}${inst > 1 ? ` em ${INST_N[inst].toLowerCase()}` : ' à vista'}${sp && sv.v ? ` mais ${sp.name}` : ''}.`.trim() };
  }

  function evalLoan(g, p, o, m) {
    const c = P.club(g, p.clubId);
    if (!p.loanList && (P.squad(g, p.clubId).length <= 20 || isStarter(g, p))) return { st: 'no', msg: `O ${c.name} não empresta um jogador importante.` };
    if (m.pat <= 0) return { st: 'no', msg: `O ${c.name} encerrou as conversas por ${p.name} nesta janela.` };
    const relief = (1 - o.share / 100) * p.wage * monthsLeft(g) * 0.9; // salário que continua com eles
    const need = r10k((P.loanFeeOf(p) + relief) * m.loanMood * (o.opt ? 1.2 : 1));
    m.rounds++;
    if (o.fee >= need) return { st: 'ok' };
    m.pat--;
    if (m.pat <= 0) return { st: 'no', msg: `O ${c.name} cansou da conversa e não empresta ${p.name} nesta janela.` };
    const hint = o.share < 100 ? ` Pagando só ${o.share}% do salário, sobra ${P.money(r500((1 - o.share / 100) * p.wage))}/mês para eles.` : '';
    return { st: 'counter', counter: { fee: need }, msg: `O ${c.name} quer ${P.money(need)} de taxa.${hint}` };
  }

  // ---------- Fechar negócio ----------
  function closeBuy(g, p, o, m, sv) {
    const me = P.club(g, g.user), from = p.clubId, fromC = P.club(g, from);
    const now = r10k(o.fee / o.inst);
    if (me.bal < now) return `O saldo não cobre ${o.inst > 1 ? 'a primeira parcela' : 'o pagamento'} de ${P.money(now)}.`;
    const sp = o.swap ? g.db.players[o.swap] : null;
    if (!sp && P.squad(g, g.user).length >= P.MARKET.maxSquad) return `Seu elenco já tem ${P.MARKET.maxSquad} jogadores.`;
    if (sp && P.squad(g, g.user).length <= P.MARKET.minSquad) return 'Seu elenco ficaria pequeno demais com a troca.';
    P.transfer(g, p, g.user, now, o.wage, o.years);
    if (o.inst > 1) {
      (g.inst = g.inst || []).push({ id: P.uid('i'), club: from, left: o.inst - 1, amt: now, name: p.name });
      if (g.tx && g.tx[0] && g.tx[0].pid === p.id) g.tx[0].fee = o.fee;
    }
    if (sp && sv && sv.v) P.transfer(g, sp, from, 0, Math.max(sp.wage, P.playerDemand(g, sp, from) || sp.wage), 3);
    const parts = [o.fee ? P.money(o.fee) + (o.inst > 1 ? ` em ${o.inst} parcelas` : '') : '', sp && sv.v ? `${sp.name} na troca` : ''].filter(Boolean).join(' + ');
    P.news(g, `${p.name} é o novo reforço do ${me.name}: ${parts || 'sem custo'} ao ${fromC.name}.`, 'good');
    if (P.flash && o.fee >= 200000) {
      const rec = g.rec || (g.rec = {}), prev = rec[g.user] || 0;
      if (o.fee > prev) { rec[g.user] = o.fee; P.flash(g, { pri: 2, ttl: 2, kicker: 'Mercado · recorde', head: `${me.name} paga ${P.money(o.fee)} por ${p.name}`, dek: prev ? `É a contratação mais cara da história do clube. O recorde anterior era de ${P.money(prev)}.` : `É a contratação mais cara da história do clube.` }); }
    }
    delete g.neg[p.id];
    return '';
  }
  function closeLoan(g, p, o) {
    const me = P.club(g, g.user), owner = p.clubId;
    if (me.bal < o.fee) return `O saldo não cobre a taxa de ${P.money(o.fee)}.`;
    if (P.squad(g, g.user).length >= P.MARKET.maxSquad) return `Seu elenco já tem ${P.MARKET.maxSquad} jogadores.`;
    const full = p.wage;
    P.transfer(g, p, g.user, o.fee, full, 0, 'loan');
    p.loan.full = full; p.loan.share = o.share;
    p.wage = Math.max(0, r500(full * o.share / 100));
    if (o.opt) p.loan.opt = r10k(P.value(p) * 0.9);
    P.news(g, `${p.name} chegou emprestado do ${P.club(g, owner).name} até o fim da temporada (taxa de ${P.money(o.fee)}; você paga ${o.share}% do salário${o.opt ? `; opção de compra por ${P.money(p.loan.opt)}` : ''}).`, 'good');
    delete g.neg[p.id];
    return '';
  }

  // ---------- Parcelas: pagas na virada de temporada ----------
  const origPre = P.marketPreSeason;
  P.marketPreSeason = function (g, r) {
    // empréstimo com salário dividido: o jogador volta ganhando o salário cheio
    for (const p of Object.values(g.db.players)) if (p.loan && p.loan.full != null && p.loan.till <= g.season) { p.wage = p.loan.full; delete p.loan.full; }
    const res = origPre ? origPre.apply(this, arguments) : undefined;
    if (g.inst && g.inst.length) {
      for (const it of g.inst) {
        P.pay(g, g.user, -it.amt, 'Contratações'); if (P.club(g, it.club)) P.pay(g, it.club, it.amt, 'Vendas');
        it.left--;
        P.news(g, `Parcela paga ao ${P.club(g, it.club) ? P.club(g, it.club).name : 'clube'} pela compra de ${it.name}: ${P.money(it.amt)}${it.left ? ` (faltam ${it.left})` : ' (última)'}.`, '');
      }
      g.inst = g.inst.filter((it) => it.left > 0);
    }
    return res;
  };
  P.instTotal = (g) => (g.inst || []).reduce((s, it) => s + it.amt * it.left, 0);

  // ---------- Tela ----------
  function state(g, p) {
    const st = A.st.ng && A.st.ng.pid === p.id ? A.st.ng : null;
    if (st) return st;
    const ask = P.askPrice(g, p);
    return (A.st.ng = {
      pid: p.id, kind: 'buy', fee: ask || P.value(p), inst: 1, swap: '',
      wage: P.playerDemand(g, p, g.user) || P.wageFor(p), years: 3,
      lfee: r10k(P.loanFeeOf(p)), share: 100, opt: false, msg: '', ok: false
    });
  }
  A.negSheet = function (id, kind) {
    const g = A.g, p = g.db.players[id]; if (!p || !p.clubId) return;
    const st = state(g, p); if (kind) st.kind = kind;
    if (st.ok) { // negócio fechado: só o resumo
      A.openSheet(`<div class="bar-top"><h2>Negociação</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
        <div class="ng-done"><div class="msg good">${esc(st.msg)}</div>
        <div class="ng-log">${(st.log || []).map((l) => `<p class="${l.who}"><b>${esc(l.nm)}:</b> ${esc(l.txt)}</p>`).join('')}</div>
        <div class="row"><span class="spacer"></span><button class="btn" data-a="closeSheet">Fechar</button><button class="btn primary" data-a="player" data-id="${p.id}">Ver a ficha</button></div></div>`);
      return;
    }
    const m = mem(g, p), c = P.club(g, p.clubId), me = P.club(g, g.user);
    const ask = P.askPrice(g, p);
    const pat = Math.max(0, m.pat);
    const mine = P.squad(g, g.user).filter((x) => !x.loan).sort((a, b) => P.ovr(b) - P.ovr(a));
    const sp = st.swap ? g.db.players[st.swap] : null;
    const sv = sp ? P.swapValue(g, sp, p.clubId) : null;
    const seg = (act, cur, list) => `<div class="seg">${list.map(([k, n]) => `<button class="${String(cur) === String(k) ? 'on' : ''}" data-a="${act}" data-k="${k}">${n}</button>`).join('')}</div>`;
    const agreed = m.agreed;
    const closed = m.pat <= 0 || (st.kind === 'buy' && m.min == null);
    const summary = st.kind === 'buy'
      ? `<div class="ng-sum"><span>Agora: <b>${P.money(r10k(st.fee / st.inst))}</b></span>${st.inst > 1 ? `<span>Depois: <b>${st.inst - 1}× ${P.money(r10k(st.fee / st.inst))}</b> na virada de cada temporada</span>` : ''}${sp ? `<span>Na troca: <b>${esc(sp.name)}</b> ${sv && sv.v ? `(eles avaliam em ~${P.money(sv.v)})${ask != null && sv.v >= ask ? ' <em>· sozinho já vale mais que a pedida: dá para baixar o valor</em>' : ''}` : `<em>(${esc(sv ? sv.why : '')})</em>`}</span>` : ''}<span>Salário: <b>${P.money(st.wage)}/mês</b> por ${st.years} ${st.years === 1 ? 'ano' : 'anos'}</span></div>`
      : `<div class="ng-sum"><span>Taxa: <b>${P.money(st.lfee)}</b></span><span>Você paga <b>${P.money(r500(p.wage * st.share / 100))}/mês</b> (${st.share}% do salário)${st.share < 100 ? `; o ${esc(c.short || c.name)} paga ${P.money(r500(p.wage * (100 - st.share) / 100))}` : ''}</span><span>Até o fim da temporada${st.opt ? ` · opção de compra por ${P.money(r10k(P.value(p) * 0.9))}` : ''}</span></div>`;
    const buyForm = `
      ${agreed ? `<div class="msg good">O ${esc(c.name)} já aceitou: ${P.money(agreed.fee)}${agreed.inst > 1 ? ` em ${agreed.inst} parcelas` : ' à vista'}${agreed.swap && g.db.players[agreed.swap] ? ` + ${esc(g.db.players[agreed.swap].name)}` : ''}. Falta acertar com o jogador.</div>` : `
      <div class="field"><label class="jr-step" for="ng-fee">Valor da transferência</label>
        <div class="ng-fee"><button class="btn sm" data-a="ngStep" data-k="-0.1">−10%</button><input id="ng-fee" class="sel" type="number" min="0" step="10000" inputmode="numeric" data-i="ngF" data-c="ngFc" data-k="fee" value="${st.fee}"><button class="btn sm" data-a="ngStep" data-k="0.1">+10%</button></div>
        <small class="jr-note">Pedida do clube: ${ask == null ? 'não vende' : P.money(ask)} · valor de mercado ${P.money(P.value(p))}</small></div>
      <div class="field"><span class="jr-step">Parcelamento</span>${seg('ngInst', st.inst, [[1, 'À vista'], [2, '2 temp.'], [3, '3 temp.'], [4, '4 temp.']])}
        <small class="jr-note">Parcelar deixa o valor menos atraente para eles. 2 temporadas costuma passar; 4, quase nunca.</small></div>
      <div class="field"><label class="jr-step" for="ng-swap">Incluir na troca</label><select id="ng-swap" class="sel" data-c="ngSwap"><option value="">Ninguém</option>${mine.map((x) => `<option value="${x.id}" ${st.swap === x.id ? 'selected' : ''}>${esc(x.name)} · ${x.pos} · ${P.ovr(x)} · ${P.money(P.value(x))}</option>`).join('')}</select></div>`}
      <div class="ng-two"><div class="field"><label class="jr-step" for="ng-wage">Salário para ${esc(p.name.split(' ')[0])}</label><input id="ng-wage" class="sel" type="number" min="0" step="500" inputmode="numeric" data-i="ngF" data-c="ngFc" data-k="wage" value="${st.wage}"></div>
        <div class="field"><span class="jr-step">Contrato</span>${seg('ngYears', st.years, [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5 anos']])}</div></div>
      <small class="jr-note">Ele ganha ${P.money(p.wage)}/mês hoje. Contrato de 3 anos ou mais: ele aceita ganhar um pouco menos.</small>`;
    const loanForm = `
      <div class="field"><label class="jr-step" for="ng-lfee">Taxa de empréstimo</label>
        <div class="ng-fee"><button class="btn sm" data-a="ngStep" data-k="-0.1">−10%</button><input id="ng-lfee" class="sel" type="number" min="0" step="10000" inputmode="numeric" data-i="ngF" data-c="ngFc" data-k="lfee" value="${st.lfee}"><button class="btn sm" data-a="ngStep" data-k="0.1">+10%</button></div>
        <small class="jr-note">Taxa normal: ${P.money(r10k(P.loanFeeOf(p)))}${p.loanList ? ' (está na lista de empréstimo deles)' : ''}</small></div>
      <div class="field"><span class="jr-step">Quanto do salário você paga</span>${seg('ngShare', st.share, [[25, '25%'], [50, '50%'], [75, '75%'], [100, '100%']])}
        <small class="jr-note">Pagar menos do salário pede uma taxa maior: o resto continua com o ${esc(c.name)}.</small></div>
      <label class="loan-opt"><input type="checkbox" data-a="ngOpt" ${st.opt ? 'checked' : ''}> Com opção de compra (taxa uns 20% maior)</label>`;
    A.openSheet(`<div class="bar-top"><h2>Negociação</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <div class="ng">
        <section class="ng-left">
          <div class="ng-player">${P.badge(c, 40)}<div><b>${esc(p.name)}</b><small>${p.pos} · ${p.age} anos · força ${P.ovr(p)} · ${esc(c.name)}</small><small>Contrato até ${p.ctr} · ${P.money(p.wage)}/mês</small></div></div>
          <div class="ng-mood"><span class="jr-step">Paciência do ${esc(c.short || c.name)}</span><span class="ng-dots">${[0, 1, 2, 3].map((i) => `<i class="${i < pat ? 'on' : ''}"></i>`).join('')}</span></div>
          <div class="ng-log">${m.log.length ? m.log.map((l) => `<p class="${l.who}"><b>${l.who === 'eu' ? esc(me.short || 'Você') : l.who === 'jog' ? esc(p.name.split(' ')[0]) : esc(c.short || c.name)}:</b> ${esc(l.txt)}</p>`).join('') : '<p class="muted">Monte a proposta ao lado. Cada clube tem seu preço e sua paciência: insistir demais encerra a conversa até a próxima janela.</p>'}</div>
          <div class="muted" style="font-size:.8rem">Saldo: ${P.money(me.bal)}${P.instTotal(g) ? ` · parcelas a pagar: ${P.money(P.instTotal(g))}` : ''}</div>
        </section>
        <section class="ng-right">
          ${agreed ? '' : seg('ngKind', st.kind, [['buy', 'Transferência'], ['loan', 'Empréstimo']])}
          ${st.kind === 'buy' ? buyForm : loanForm}
          ${summary}
          ${st.msg ? `<div class="msg ${st.ok ? 'good' : ''}">${esc(st.msg)}</div>` : ''}
          <div class="row ng-act">${st.kind === 'buy' && !agreed && P.clauseButton ? P.clauseButton(g, p) : ''}<span class="spacer"></span>${st.ok || (closed && !agreed) ? '' : `<button class="btn primary" data-a="ngSend">${agreed ? 'Propor ao jogador' : st.kind === 'buy' ? 'Enviar proposta' : 'Propor empréstimo'}</button>`}</div>
        </section>
      </div>`);
    const sh = document.querySelector('#sheet .sheet'); if (sh) sh.classList.add('sheet-wide');
  };

  function send() {
    const g = A.g, st = A.st.ng, p = g.db.players[st.pid]; if (!p) return;
    const m = mem(g, p), me = P.club(g, g.user);
    if (!P.windowOpen(g)) { st.msg = P.windowText(g) + '.'; return; }
    if (st.kind === 'loan') {
      say(m, 'eu', `Empréstimo: ${P.money(st.lfee)} de taxa, pago ${st.share}% do salário${st.opt ? ', com opção de compra' : ''}.`);
      const r = evalLoan(g, p, { fee: st.lfee, share: st.share, opt: st.opt }, m);
      if (r.st === 'ok') {
        say(m, 'clube', 'Fechado.'); keepLog(g, p, m, P.club(g, p.clubId));
        const err = closeLoan(g, p, { fee: st.lfee, share: st.share, opt: st.opt });
        if (err) { st.msg = err; return; }
        st.ok = true; st.msg = `Negócio fechado! ${p.name} chegou emprestado até o fim da temporada.`; return;
      }
      say(m, 'clube', r.msg); st.msg = r.msg;
      if (r.counter) st.lfee = r.counter.fee;
      return;
    }
    // 1) clube
    if (!m.agreed) {
      const sp = st.swap ? g.db.players[st.swap] : null;
      say(m, 'eu', `${P.money(st.fee)}${st.inst > 1 ? ` em ${st.inst} parcelas` : ' à vista'}${sp ? ` + ${sp.name}` : ''}.`);
      const r = evalBuy(g, p, { fee: st.fee, inst: st.inst, swap: st.swap }, m);
      if (r.st !== 'ok') { say(m, 'clube', r.msg); st.msg = r.msg; if (r.counter) { st.fee = r.counter.fee; st.inst = r.counter.inst; } return; }
      m.agreed = { fee: st.fee, inst: st.inst, swap: st.swap, sv: r.sv };
      say(m, 'clube', 'Aceitamos. Agora é com o jogador.');
    }
    // 2) jogador
    const demand = P.playerDemand(g, p, g.user);
    if (demand == null) { st.msg = `${p.name} não quer jogar na ${me.div}ª divisão.`; say(m, 'jog', 'Não tenho interesse nesse projeto.'); return; }
    const need = r500(demand * (st.years >= 3 ? 0.95 : 1)); // contrato mais longo: aceita um pouco menos
    say(m, 'eu', `${P.money(st.wage)}/mês por ${st.years} ${st.years === 1 ? 'ano' : 'anos'}.`);
    if (st.wage < need) {
      m.ppat--;
      if (m.ppat <= 0) { m.agreed = null; m.pat = Math.min(m.pat, 1); st.msg = `${p.name} desistiu da negociação.`; say(m, 'jog', 'Assim não dá. Vou ficar onde estou.'); return; }
      st.wage = need; st.msg = `O clube aceitou, mas ${p.name} quer ${P.money(need)}/mês${st.years < 3 ? ' (ou um pouco menos com contrato de 3 anos ou mais)' : ''}.`;
      say(m, 'jog', `Quero ${P.money(need)}/mês.`); return;
    }
    const a = m.agreed;
    say(m, 'jog', 'Fechado! Pode preparar a apresentação.'); keepLog(g, p, m, P.club(g, p.clubId));
    const err = closeBuy(g, p, { fee: a.fee, inst: a.inst, swap: a.swap, wage: st.wage, years: st.years }, m, a.sv);
    if (err) { st.msg = err; return; }
    st.ok = true; st.msg = `Negócio fechado! ${p.name} assinou até ${p.ctr}.`;
  }
  const keepLog = (g, p, m, clubC) => (A.st.ng.log = m.log.map((l) => ({ who: l.who, txt: l.txt, nm: l.who === 'eu' ? (P.club(g, g.user).short || 'Você') : l.who === 'jog' ? p.name.split(' ')[0] : (clubC.short || clubC.name) })));

  // ---------- Ações ----------
  const reopen = () => { const st = A.st.ng; if (st) A.negSheet(st.pid); };
  const origOffer = A.ACT.offerOpen, origLoanOpen = A.ACT.loanOpen;
  Object.assign(A.ACT, {
    offerOpen(d) { const p = A.g.db.players[d.id]; if (p && p.clubId && p.clubId !== A.g.user) { A.st.ng = null; A.negSheet(d.id, 'buy'); } else origOffer(d); },
    loanOpen(d) { const p = A.g.db.players[d.id]; if (p && p.clubId && p.clubId !== A.g.user) { A.st.ng = null; A.negSheet(d.id, 'loan'); } else if (origLoanOpen) origLoanOpen(d); },
    ngKind(d) { A.st.ng.kind = d.k; A.st.ng.msg = ''; reopen(); },
    ngInst(d) { A.st.ng.inst = Number(d.k); reopen(); },
    ngYears(d) { A.st.ng.years = Number(d.k); reopen(); },
    ngShare(d) { A.st.ng.share = Number(d.k); reopen(); },
    ngOpt() { A.st.ng.opt = !A.st.ng.opt; reopen(); },
    ngStep(d) { const st = A.st.ng, k = st.kind === 'loan' ? 'lfee' : 'fee'; st[k] = Math.max(0, r10k(st[k] * (1 + Number(d.k)))); reopen(); },
    ngSend() {
      send();
      const st = A.st.ng;
      if (st.ok) { A.save(); A.render(); }
      reopen();
    }
  });
  A.CHG.ngSwap = (el) => { A.st.ng.swap = el.value; reopen(); };
  A.INP.ngF = (el) => { A.st.ng[el.dataset.k] = Math.max(0, Number(el.value) || 0); };
  A.CHG.ngFc = (el) => { A.st.ng[el.dataset.k] = Math.max(0, Number(el.value) || 0); reopen(); };
})(window.PFC);
