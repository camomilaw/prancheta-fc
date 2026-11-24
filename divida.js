/* Prancheta FC — clube no vermelho
 * Saldo negativo tem consequência. O peso cresce com o tamanho da dívida em relação à folha anual:
 *   1 · No vermelho      (dívida até 25% da folha anual)
 *   2 · Dívida séria     (até 75%)
 *   3 · Crise financeira (acima de 75%)
 * Em qualquer nível: juros toda rodada, nada de contratar (nem jogador livre) e nada de rescindir
 * sem dinheiro para pagar a rescisão. Quanto maior o nível, mais a diretoria perde a confiança;
 * nos níveis 2 e 3 os salários atrasam (moral cai) e, no 3, a diretoria põe jogadores à venda.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const RATE = 0.004; // juros por rodada sobre a dívida (≈ 25% ao ano)
  const LV = [
    null,
    { n: 'No vermelho', board: 0.5, late: 0, sale: false, end: 3 },
    { n: 'Dívida séria', board: 1, late: 4, sale: false, end: 8 },
    { n: 'Crise financeira', board: 2, late: 6, sale: true, end: 15 }
  ];

  const payroll = (g, cid) => P.squad(g, cid).reduce((s, p) => s + (p.wage || 0), 0) * 12;
  P.debtInfo = function (g, cid) {
    cid = cid || g.user;
    const c = P.club(g, cid);
    if (!c || c.bal >= 0) return { lvl: 0, debt: 0, ratio: 0 };
    const debt = -c.bal, ratio = debt / Math.max(1e6, payroll(g, cid));
    const lvl = ratio <= 0.25 ? 1 : ratio <= 0.75 ? 2 : 3;
    return { lvl, debt, ratio, n: LV[lvl].n };
  };
  P.inRed = (g) => P.club(g, g.user).bal < 0;

  // ---------- Toda rodada ----------
  function debtWeek(g) {
    // juros para todos os clubes no vermelho
    for (const c of g.db.clubs) if (c.bal < 0) P.pay(g, c.id, c.bal * RATE, 'Juros da dívida');
    const d = P.debtInfo(g), me = P.club(g, g.user);
    const prev = g.debtLvl || 0;
    g.debtLvl = d.lvl;
    if (!d.lvl) {
      if (prev) P.news(g, `O ${me.name} saiu do vermelho. Contratações liberadas.`, 'good');
      return;
    }
    const L = LV[d.lvl];
    g.debtW = (g.debtW || 0) + 1;
    // diretoria perde a confiança aos poucos (meio ponto = 1 a cada 2 rodadas)
    if (g.board) {
      g.debtAcc = (g.debtAcc || 0) + L.board;
      const k = Math.floor(g.debtAcc); g.debtAcc -= k;
      g.board.conf = Math.max(0, g.board.conf - k);
    }
    if (d.lvl > prev) {
      const why = d.lvl === 1 ? 'A diretoria proibiu contratações e cobra cortes. Venda jogadores para sair do vermelho.'
        : d.lvl === 2 ? 'Os salários vão começar a atrasar e o elenco vai sentir. A diretoria perde a paciência mais rápido.'
        : 'Os salários atrasam, a diretoria vai colocar jogadores à venda e o cargo do técnico está em risco.';
      P.news(g, `${L.n}: o ${me.name} deve ${P.money(d.debt)}. ${why}`, 'bad');
      if (P.mail) P.mail(g, { k: 'fin', subj: `${L.n}: dívida de ${P.money(d.debt)}`, body: `Chefe, recado da diretoria: o clube deve ${P.money(d.debt)} e paga juros toda rodada. ${why} Enquanto o saldo estiver negativo, não dá para contratar ninguém nem rescindir contratos sem ter o dinheiro da rescisão.` });
      if (d.lvl === 3 && P.flash) P.flash(g, { pri: 3, ttl: 2, kicker: 'Bastidores · finanças', head: `Crise no ${me.name}: dívida chega a ${P.money(d.debt)}`, dek: 'Salários atrasados, diretoria impaciente e jogadores à venda. O técnico precisa reagir rápido.' });
    }
    // salários atrasados: a cada 4 rodadas a moral cai
    if (L.late && g.debtW % 4 === 0) {
      for (const p of P.squad(g, g.user)) if (!p.loan) p.mor = Math.max(20, (p.mor || 60) - L.late);
      P.news(g, `Salários atrasados no ${me.name}: o elenco está insatisfeito.`, 'bad');
    }
    // crise: a diretoria põe à venda quem ganha mais
    if (L.sale && g.debtW % 4 === 2) {
      const p = P.squad(g, g.user).filter((x) => !x.loan && !x.listed).sort((a, b) => b.wage - a.wage)[0];
      if (p && P.squad(g, g.user).length > (P.MARKET ? P.MARKET.minSquad : 18)) {
        p.listed = true;
        P.news(g, `A diretoria colocou ${p.name} (${P.money(p.wage)}/mês) à venda para cortar gastos.`, 'bad');
      }
    }
  }
  const origWeek = P.clubWeek;
  P.clubWeek = function (g, step, ctx) {
    debtWeek(g); // antes, para a checagem de demissão da diretoria já contar a dívida
    return origWeek.apply(this, arguments);
  };

  // Fim de temporada: terminar no vermelho pesa na avaliação
  const origEnd = P.boardSeasonEnd;
  P.boardSeasonEnd = function (g) {
    const d = P.debtInfo(g);
    if (d.lvl && g.board) {
      g.board.conf = Math.max(0, g.board.conf - LV[d.lvl].end);
      P.news(g, `A diretoria reprovou as contas: o ${P.club(g, g.user).name} fechou o ano devendo ${P.money(d.debt)}.`, 'bad');
    }
    return origEnd.apply(this, arguments);
  };

  // ---------- Bloqueios ----------
  // jogador livre não custa taxa, mas no vermelho a diretoria não aprova salário novo
  const origOffer = P.userOffer;
  P.userOffer = function (g, p, fee, wage, years, loan) {
    if (P.inRed(g)) return { ok: false, msg: `Clube no vermelho (${P.money(P.club(g, g.user).bal)}): a diretoria proibiu contratações, inclusive de jogadores livres e empréstimos. Venda jogadores para voltar ao azul.` };
    return origOffer.apply(this, arguments);
  };
  // rescindir exige dinheiro em caixa para pagar a rescisão
  const origRelease = A.ACT.releaseDo;
  A.ACT.releaseDo = function (d) {
    const g = A.g, p = g.db.players[d.id], me = P.club(g, g.user);
    const cost = p ? P.releaseCost(g, p) : 0;
    if (p && cost > 0 && me.bal < cost) {
      A.toast(me.bal < 0 ? `Clube no vermelho: não há dinheiro para pagar a rescisão de ${P.money(cost)}. Tente vender o jogador.` : `A rescisão custa ${P.money(cost)} e o saldo não cobre.`);
      return;
    }
    return origRelease.apply(this, arguments);
  };

  // ---------- Salários mais leves (saves antigos) ----------
  // Os salários-base caíram 15%. Carreiras novas já nascem assim; as antigas são ajustadas uma vez.
  const origNew = P.newGame;
  P.newGame = function () { const g = origNew.apply(this, arguments); g.wv2 = 1; return g; };
  const origEcon = P.ensureEconomy;
  P.ensureEconomy = function (g) {
    const r = origEcon.apply(this, arguments);
    if (g && g.db && !g.wv2) {
      for (const p of Object.values(g.db.players)) {
        if (p.wage) p.wage = Math.max(1500, Math.round(p.wage * 0.85 / 500) * 500);
        if (p.loan && p.loan.wage) p.loan.wage = Math.max(1500, Math.round(p.loan.wage * 0.85 / 500) * 500);
      }
      g.wv2 = 1;
    }
    return r;
  };

  // ---------- Orçamento: quanto da receita a folha consome ----------
  P.budget = function (g, extraWage) {
    const c = P.club(g, g.user), n = P.divClubs(g.db, c.div).length - 1; // jogos em casa na liga
    const tv = P.ECON.tv[c.div - 1];
    const gate = c.cap * 0.65 * P.ECON.ticket(c.div) * n;
    let income = tv + (P.commercialOf ? P.commercialOf(c) : 0.4 * tv) + gate + tv * P.ECON.prizeFactor * 0.5;
    const wages = (P.squad(g, g.user).reduce((s, p) => s + (p.wage || 0), 0) + (extraWage || 0)) * 12;
    const ops = P.opsCost ? P.opsCost(c) : 0;
    income -= ops; // a operação do clube sai antes de pagar a folha
    return { income, wages, ops, pct: Math.round(wages / Math.max(1, income) * 100) };
  };
  const pctCls = (x) => (x <= 70 ? 'ok' : x <= 90 ? 'warn' : 'bad');
  P.budgetCard = function (g) {
    const b = P.budget(g);
    const tip = b.pct <= 70 ? 'Folha saudável: sobra dinheiro para contratar e para imprevistos.'
      : b.pct <= 90 ? 'Folha apertada: uma temporada ruim de bilheteria pode deixar o clube no vermelho.'
      : 'Folha maior que a receita: o saldo vai cair. Venda ou empreste quem ganha muito e joga pouco.';
    return `<div class="card budget-card"><div class="head"><span class="label">Orçamento da temporada</span><b class="bud-${pctCls(b.pct)}">${b.pct}%</b></div>
      <div class="debt-meter bud"><i class="bud-${pctCls(b.pct)}" style="width:${Math.min(100, b.pct)}%"></i><span style="left:70%"></span><span style="left:90%"></span></div>
      <div class="kv" style="margin-top:8px"><div><span class="label">Receita líquida estimada</span><b>${P.money(b.income)}</b></div><div><span class="label">Folha anual</span><b>${P.money(b.wages)}</b></div></div>
      <p class="muted" style="font-size:.82rem;margin:6px 0 0">A folha consome ${b.pct}% da receita estimada (TV, patrocínio, bilheteria e premiação, já descontados ${P.money(b.ops || 0)} de operação do clube). ${tip}</p></div>`;
  };
  // linha do painel de proposta: como fica a folha com o novo salário
  P.wageImpact = function (g, wage) {
    const b = P.budget(g, wage);
    return `<div class="muted" style="font-size:.85rem">Com ele, a folha anual vai para ${P.money(b.wages)}: <b class="bud-${pctCls(b.pct)}">${b.pct}% da receita</b> estimada.</div>`;
  };

  // ---------- Tela de finanças ----------
  P.debtCard = function (g) {
    const d = P.debtInfo(g);
    if (!d.lvl) return '';
    const L = LV[d.lvl];
    const items = [
      `Juros de ${P.money(Math.round(d.debt * RATE))} por rodada`,
      'Contratações bloqueadas (inclusive livres e empréstimos)',
      'Rescisão só com dinheiro em caixa',
      d.lvl === 1 ? 'Diretoria perde 1 de confiança a cada 2 rodadas' : `Diretoria perde ${L.board} de confiança por rodada`
    ];
    if (L.late) items.push(`Salários atrasados: moral do elenco cai ${L.late} a cada 4 rodadas`);
    if (L.sale) items.push('A diretoria põe à venda quem ganha mais');
    items.push(`Terminar a temporada assim: −${L.end} de confiança`);
    const next = d.lvl < 3 ? ` Se a dívida passar de ${d.lvl === 1 ? '25%' : '75%'} da folha anual, a situação piora.` : '';
    return `<div class="card debt-card lv${d.lvl}"><div class="head"><span class="label">Situação: ${esc(L.n)}</span><b class="v1">${P.money(-d.debt)}</b></div>
      <div class="debt-meter"><i style="width:${Math.min(100, Math.round(d.ratio / 1.2 * 100))}%"></i><span style="left:${Math.round(0.25 / 1.2 * 100)}%"></span><span style="left:${Math.round(0.75 / 1.2 * 100)}%"></span></div>
      <p class="muted" style="font-size:.82rem;margin:6px 0">A dívida equivale a ${Math.round(d.ratio * 100)}% da folha salarial de um ano.${next}</p>
      <ul class="debt-list">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p style="font-size:.85rem;margin:6px 0 0">Para sair: venda jogadores (Mercado › À venda), corte salários e segure a bilheteria.</p></div>`;
  };
})(window.PFC);
