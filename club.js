/* Prancheta FC — diretoria, dificuldade e estrutura do clube
 * - Dificuldade da diretoria e das negociações (escolhida no início da carreira)
 * - Confiança da diretoria, demissão e propostas de emprego
 * - Estádio (capacidade e preço do ingresso), base, centro de treinamento e centro do clube
 */
(function (P) {
  const A = P.app, esc = P.esc;

  // ---------- Dificuldade ----------
  P.DIFF = {
    board: {
      fac: { n: 'Tranquila', loss: 2, win: 3, limit: 10, from: 99 },
      nor: { n: 'Normal', loss: 3, win: 3, limit: 15, from: 16 },
      dif: { n: 'Exigente', loss: 4, win: 2, limit: 25, from: 10 }
    },
    market: {
      fac: { n: 'Fáceis', ask: 0.85, demand: 0.9, offer: 1.15, lo: 0.8, acc: 0.93 },
      nor: { n: 'Normais', ask: 1, demand: 1, offer: 1, lo: 0.85, acc: 1 },
      dif: { n: 'Difíceis', ask: 1.25, demand: 1.15, offer: 0.88, lo: 0.92, acc: 1 }
    }
  };
  const diff = (g) => (g && g.diff) || { board: 'nor', market: 'nor' };
  P.diffM = (g, k) => (P.DIFF.market[diff(g).market] || P.DIFF.market.nor)[k];
  const boardD = (g) => P.DIFF.board[diff(g).board] || P.DIFF.board.nor;

  const origNewGame = P.newGame;
  P.newGame = function (db, cid, mgr) {
    const g = origNewGame(db, cid, mgr);
    g.diff = Object.assign({ board: 'nor', market: 'nor' }, (A.setup && A.setup.diff) || {});
    P.boardReset(g);
    return g;
  };

  // ---------- Estrutura ----------
  P.FAC = {
    base: { n: 'Categorias de base', d: 'Jovens da base com mais potencial e evolução mais rápida no Sub-20.' },
    ct: { n: 'Centro de treinamento', d: 'Treinos rendem mais e o elenco recupera mais condição por semana.' },
    sede: { n: 'Centro do clube', d: 'Mais receita com patrocinadores e venda de camisas.' }
  };
  const lvlFromRep = (rep) => P.clamp(Math.round(rep / 20), 1, 5);
  P.facOf = (c) => (c.fac = c.fac || { base: lvlFromRep(c.rep), ct: lvlFromRep(c.rep), sede: lvlFromRep(c.rep), price: 1 });
  P.facLvl = (g, k) => P.facOf(P.club(g, g.user))[k];
  const scale = (div) => 0.5 + (8 - div) * 0.6;
  P.facCost = (c, k) => { const n = P.facOf(c)[k]; return n >= 5 ? null : Math.round([0, 1, 2.5, 5, 10][n] * 1e6 * scale(c.div) / 10000) * 10000; };
  P.seatCost = (c) => Math.round(5000 * 1500 * (0.6 + (8 - c.div) * 0.15) / 10000) * 10000; // ampliação de 5 mil lugares

  // Bilheteria: o preço muda a lotação (mais caro = estádio mais vazio)
  P.gateFor = function (g, c, occ) {
    const price = P.facOf(c).price || 1;
    const o = P.clamp(occ * Math.pow(1 / price, 0.9), 0.1, 1);
    c.lastOcc = Math.round(o * 100);
    return Math.round(c.cap * o * P.ECON.ticket(c.div) * price);
  };
  const commercial = (c) => 0.4 * P.ECON.tv[c.div - 1] * (c.rep / 70) * (0.6 + 0.2 * P.facOf(c).sede);

  // ---------- Diretoria ----------
  P.boardReset = function (g) {
    const c = P.club(g, g.user), ovrs = P.clubOvrs(g.db);
    const rank = P.divClubs(g.db, c.div).map((x) => x.id).sort((a, b) => ovrs[b] - ovrs[a]).indexOf(g.user) + 1;
    g.board = { conf: g.board && g.board.keep ? g.board.conf : 60, target: Math.min(18, rank + 1), obj: P.expectation(g, g.user) };
  };
  function myPos(g) { const c = P.club(g, g.user); return P.table(g, c.div).findIndex((r) => r.cid === g.user) + 1; }

  P.clubWeek = function (g, step, ctx) {
    // receita comercial (todos os clubes) e retorno de lesões
    for (const c of g.db.clubs) P.pay(g, c.id, commercial(c) / g.cal.length, 'Patrocínio e camisas');
    // clubes da IA: custos de operação (base, comissão, estrutura) e reinvestimento do que sobra
    for (const c of g.db.clubs) {
      if (c.id === g.user) continue;
      const tv = P.ECON.tv[c.div - 1];
      let cost = c.bal > tv * 0.4 ? 0.16 * tv / g.cal.length : 0;
      const reserve = tv * 1.2;
      if (c.bal > reserve) cost += (c.bal - reserve) * 0.035;
      P.pay(g, c.id, -cost, 'Operação');
    }
    for (const p of Object.values(g.db.players)) if (!p.inj && p.injN) { delete p.injN; p.cond = Math.min(p.cond, 75); }
    // CT: recuperação extra
    const ct = P.facLvl(g, 'ct');
    for (const p of P.squad(g, g.user)) p.cond = Math.min(100, Math.round(p.cond + ct * 0.5));
    // confiança da diretoria
    if (!g.board) P.boardReset(g);
    const B = boardD(g);
    const mine = ctx && ctx.results.find(({ it }) => it.m.h === g.user || it.m.a === g.user);
    if (mine) {
      const m = mine.it.m, home = m.h === g.user;
      const gf = home ? m.hg : m.ag, ga = home ? m.ag : m.hg;
      if (mine.it.ko) g.board.conf += m.w === g.user ? B.win : -B.loss;
      else g.board.conf += gf > ga ? B.win : gf < ga ? -B.loss : 0;
    }
    if (step.t === 'lg' && step.r % 4 === 3) g.board.conf += P.clamp((g.board.target - myPos(g)) * 0.8, -4, 4);
    g.board.conf = P.clamp(Math.round(g.board.conf), 0, 100);
    if (g.week >= B.from && g.board.conf < B.limit && !g.fired) fire(g);
  };

  function jobOffers(g, better) {
    const me = P.club(g, g.user);
    const pool = g.db.clubs.filter((c) => c.id !== g.user && (better ? c.div < me.div || (c.div === me.div && c.rep > me.rep + 5) : c.div >= me.div && c.div <= me.div + 2));
    return P.shuffle(Math.random, pool).slice(0, better ? 2 : 3).map((c) => c.id);
  }
  function fire(g) {
    g.fired = { from: g.user, offers: jobOffers(g, false) };
    P.news(g, `A diretoria do ${P.club(g, g.user).name} perdeu a confiança e demitiu ${g.manager}.`, 'bad');
  }
  P.boardSeasonEnd = function (g) {
    if (!g.board) P.boardReset(g);
    const pos = myPos(g), me = P.club(g, g.user);
    const up = g.moves && g.moves[g.user] < me.div;
    g.board.conf = P.clamp(g.board.conf + P.clamp((g.board.target - pos) * 2, -15, 15) + (up ? 15 : 0), 0, 100);
    if (g.board.conf < boardD(g).limit) { fire(g); return; }
    if (pos <= g.board.target - 3 || up || pos === 1) {
      g.jobs = jobOffers(g, true);
      if (g.jobs.length) P.news(g, `Sua campanha chamou atenção: ${g.jobs.map((id) => P.club(g, id).name).join(' e ')} querem você como técnico.`, 'good');
    }
  };
  P.clubNewSeason = function (g) {
    g.jobs = null;
    if (g.board) g.board.keep = true;
    P.boardReset(g);
  };

  // Trocar de clube (demissão ou proposta aceita)
  P.switchClub = function (g, cid) {
    const old = P.club(g, g.user), nc = P.club(g, cid);
    g.user = cid;
    const t = g.tac[cid]; t.auto = true; delete t.xy; t.roles = [];
    t.xi = P.autoXI(g, cid, t.f);
    g.y = null; P.ensureYouth(g);
    g.chem = {}; g.train = null; g.offers = []; g.fired = null; g.jobs = null;
    g.board = { conf: 60 }; P.boardReset(g);
    P.dirty(g);
    P.news(g, `${g.manager} deixa o ${old.name} e assume o ${nc.name} (${nc.div}ª divisão).`, 'good');
  };

  // ---------- Telas ----------
  P.setupExtra = function () {
    const d = A.setup.diff || (A.setup.diff = { board: 'nor', market: 'nor' });
    const sel = (k, map) => `<select class="sel" data-c="diffSel" data-k="${k}">${Object.entries(map).map(([v, o]) => `<option value="${v}" ${d[k] === v ? 'selected' : ''}>${o.n}</option>`).join('')}</select>`;
    return `<div class="form-grid" style="max-width:520px"><div class="field"><span class="label">Diretoria</span>${sel('board', P.DIFF.board)}</div><div class="field"><span class="label">Negociações</span>${sel('market', P.DIFF.market)}</div></div>`;
  };
  P.createExtra = function (f) {
    if (f.cap == null) Object.assign(f, { cap: 15000, base: 2, ct: 2, sede: 2, bal: '' });
    const lv = (k) => `<select class="sel" data-c="ccSel" data-k="${k}">${[1, 2, 3, 4, 5].map((n) => `<option ${Number(f[k]) === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    return `<div class="form-grid">
      <div class="field"><label class="label" for="cc-cap">Capacidade do estádio</label><input id="cc-cap" type="number" min="1000" max="150000" step="500" data-c="ccSel" data-k="cap" value="${esc(f.cap)}"></div>
      <div class="field"><span class="label">Base (1-5)</span>${lv('base')}</div>
      <div class="field"><span class="label">Centro de treinamento (1-5)</span>${lv('ct')}</div>
      <div class="field"><span class="label">Centro do clube (1-5)</span>${lv('sede')}</div>
      <div class="field"><label class="label" for="cc-bal">Saldo inicial (R$ milhões)</label><input id="cc-bal" type="number" min="0" step="0.5" data-c="ccSel" data-k="bal" value="${esc(f.bal)}" placeholder="Padrão da divisão"></div>
    </div>`;
  };
  P.applyCreateExtra = function (c, f) {
    c.cap = P.clamp(Math.round(Number(f.cap) || 15000), 1000, 150000);
    c.fac = { base: Number(f.base) || 2, ct: Number(f.ct) || 2, sede: Number(f.sede) || 2, price: 1 };
    if (f.bal !== '' && f.bal != null) c.bal = Math.round(Number(f.bal) * 1e6);
  };

  P.boardCard = function (g) {
    if (!g.board) P.boardReset(g);
    const b = g.board, B = boardD(g), col = b.conf >= 60 ? 'var(--good)' : b.conf >= B.limit + 10 ? 'var(--warn)' : 'var(--bad)';
    let jobs = '';
    if (g.over && g.jobs && g.jobs.length) jobs = `<div class="msg good" style="margin-top:10px">Propostas de emprego:</div>${g.jobs.map((id) => { const c = P.club(g, id); return `<div class="staff-row">${P.badge(c, 26)}<div style="flex:1;min-width:0"><b>${esc(c.name)}</b><div class="muted" style="font-size:.85rem">${c.div}ª divisão · ${esc(P.expectation(g, id))}</div></div><button class="btn sm primary" data-a="jobTake" data-id="${id}">Aceitar</button></div>`; }).join('')}`;
    return `<div class="card"><div class="head"><span class="label">Diretoria (${esc(B.n.toLowerCase())})</span><span class="label">Meta: ${esc(b.obj)} · até ${b.target}º</span></div>
      <div class="bar"><span>Confiança</span><span class="tr"><i style="width:${b.conf}%;background:${col}"></i></span><b class="num">${b.conf}</b></div>
      <p class="muted" style="font-size:.82rem;margin:8px 0 0">Abaixo de ${B.limit} você é demitido. Vitórias, posição acima da meta e acesso aumentam a confiança.</p>${jobs}</div>`;
  };
  P.firedModal = function (g) {
    if (!g.fired) return;
    const from = P.club(g, g.fired.from);
    A.openSheet(`<div class="bar-top"><h2>Você foi demitido</h2></div>
      <p style="margin:0">A diretoria do ${esc(from.name)} decidiu encerrar seu trabalho. Escolha um novo clube para continuar a carreira:</p>
      ${g.fired.offers.map((id) => { const c = P.club(g, id); return `<div class="staff-row">${P.badge(c, 30)}<div style="flex:1;min-width:0"><b>${esc(c.name)}</b><div class="muted" style="font-size:.85rem">${c.div}ª divisão · ${esc(P.countryName(c.country))}</div></div><button class="btn sm primary" data-a="jobTake" data-id="${id}">Assumir</button></div>`; }).join('')}`);
    const bg = document.querySelector('.sheet-bg'); if (bg) bg.removeAttribute('data-a');
  };

  P.clubView = function () {
    const g = A.g, c = P.club(g, g.user), f = P.facOf(c);
    const seat = P.seatCost(c);
    const prices = [0.7, 0.85, 1, 1.15, 1.3, 1.5];
    return `<div class="card"><div class="head"><h2>Clube e estrutura</h2><b>${P.money(c.bal)}</b></div>
        <div class="kv"><div><span class="label">Estádio</span><b>${c.cap.toLocaleString('pt-BR')}</b><span class="muted" style="font-size:.78rem">${esc(c.stadium)}</span></div>
          <div><span class="label">Ingresso</span><b>R$ ${Math.round(P.ECON.ticket(c.div) * (f.price || 1))}</b></div>
          <div><span class="label">Última lotação</span><b>${c.lastOcc != null ? c.lastOcc + '%' : '—'}</b></div>
          <div><span class="label">Patrocínio/ano</span><b>${P.money(commercial(c))}</b></div></div>
        <div class="opt" style="margin-top:12px"><span class="label">Preço do ingresso</span><div class="seg">${prices.map((x) => `<button class="${Math.abs((f.price || 1) - x) < 0.01 ? 'on' : ''}" data-a="facPrice" data-v="${x}">${Math.round(x * 100)}%</button>`).join('')}</div>
          <span class="muted" style="font-size:.82rem">Mais caro rende mais por torcedor, mas o estádio enche menos.</span></div>
        <div class="row" style="margin-top:12px"><span style="flex:1" class="muted">Ampliar o estádio em 5.000 lugares: ${P.money(seat)}</span><button class="btn sm" data-a="facSeats">Ampliar</button></div></div>
      <div class="grid2">${Object.entries(P.FAC).map(([k, o]) => {
        const cost = P.facCost(c, k);
        return `<div class="card" style="display:flex;flex-direction:column;gap:8px"><div class="row"><b style="flex:1">${o.n}</b><span class="stars">${'★'.repeat(f[k])}<span class="off">${'★'.repeat(5 - f[k])}</span></span></div>
          <p class="muted" style="margin:0;font-size:.88rem">${o.d}</p>
          ${cost ? `<div class="row"><span class="muted" style="flex:1;font-size:.88rem">Nível ${f[k] + 1}: ${P.money(cost)}</span><button class="btn sm primary" data-a="facUp" data-k="${k}">Melhorar</button></div>` : '<span class="muted">Nível máximo</span>'}</div>`;
      }).join('')}</div>`;
  };

  Object.assign(A.ACT, {
    jobTake(d) { P.switchClub(A.g, d.id); A.closeSheet(); A.save(); A.view = 'inicio'; A.render(); A.toast(`Bem-vindo ao ${P.club(A.g, d.id).name}!`); },
    facPrice(d) { P.facOf(P.club(A.g, A.g.user)).price = Number(d.v); A.save(); A.render(); },
    facSeats() {
      const g = A.g, c = P.club(g, g.user), cost = P.seatCost(c);
      if (c.bal < cost) { A.toast('O saldo não cobre a obra'); return; }
      P.pay(g, g.user, -cost, 'Obras'); c.cap += 5000; A.save(); A.render(); A.toast(`Estádio ampliado para ${c.cap.toLocaleString('pt-BR')} lugares`);
    },
    facUp(d) {
      const g = A.g, c = P.club(g, g.user), cost = P.facCost(c, d.k);
      if (!cost) return;
      if (c.bal < cost) { A.toast('O saldo não cobre a obra'); return; }
      P.pay(g, g.user, -cost, 'Obras'); P.facOf(c)[d.k]++; A.save(); A.render(); A.toast(`${P.FAC[d.k].n} no nível ${P.facOf(c)[d.k]}`);
    }
  });
  Object.assign(A.CHG, { diffSel(el) { A.setup.diff[el.dataset.k] = el.value; } });
})(window.PFC);
