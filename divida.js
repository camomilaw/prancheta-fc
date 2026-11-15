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
