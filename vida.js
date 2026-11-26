/* Prancheta FC — mercado com mais vida
 * - Jogador pede para sair quando um clube maior aparece (barrar a saída deixa ele chateado)
 * - Multa rescisória: dá para pagar a multa de jogadores de outros clubes; clubes ricos às vezes
 *   pagam a multa de um jogador seu que valorizou muito
 * - Rumores na Gazeta e "bombas" do mercado entre outros clubes
 * - Empréstimo com opção de compra
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const round = (v) => Math.round(v / 10000) * 10000;

  // ---------- Multa rescisória ----------
  P.clauseOf = function (g, p) {
    if (!p.clubId) return 0;
    if (!p.rc) p.rc = round(P.value(p) * (p.clubId === g.user ? 2.5 : 1.8 + (hash(String(p.id)) % 80) / 100));
    return p.rc;
  };
  // nova multa quando muda de clube ou renova
  const origTransfer = P.transfer;
  P.transfer = function (g, p, toCid, fee, wage, years, kind) {
    const from = p.clubId;
    const r = origTransfer.apply(this, arguments);
    if (kind !== 'loan') delete p.rc;
    // bomba do mercado: transferência grande entre outros clubes
    if (from && toCid !== g.user && from !== g.user && fee && kind !== 'loan' && fee >= 12e6 && (g.bombW !== g.week || g.bombS !== g.season)) {
      g.bombW = g.week; g.bombS = g.season;
      P.news(g, `Bomba no mercado: ${p.name} (força ${P.ovr(p)}) troca o ${P.club(g, from).name} pelo ${P.club(g, toCid).name} por ${P.money(fee)}.`, '');
    }
    return r;
  };

  // ---------- Toda semana com a janela aberta ----------
  const origWeek = P.marketWeek;
  P.marketWeek = function (g, step) {
    origWeek(g, step);
    if (!P.windowOpen(g)) return;
    const rnd = Math.random, me = P.club(g, g.user);
    const mine = P.squad(g, g.user).filter((p) => !p.loan);
    if (mine.length <= P.MARKET.minSquad) return;
    const ovrs = P.clubOvrs(g.db);
    const teamOvr = ovrs[g.user] || 60;
    const busy = (p) => p.pendId || (g.offers || []).some((o) => o.pid === p.id);
    const bigger = (p, extra) => g.db.clubs.filter((c) => c.id !== g.user && P.followed(g, c.div) && (P.dt(c) < P.dt(me) || c.rep > me.rep + 8) && c.bal > (extra || P.value(p)) * 1.3 && ovrs[c.id] <= P.ovr(p) + 4);

    // 1. jogador pede para sair (clube maior apareceu)
    if (rnd() < 0.1) {
      const cands = mine.filter((p) => !busy(p) && p.age >= 20 && (P.ovr(p) >= teamOvr + 3 || p.unh));
      const p = cands.length ? P.weighted(rnd, cands, (x) => P.ovr(x) + (x.unh ? 15 : 0)) : null;
      const buyers = p ? bigger(p) : [];
      if (p && buyers.length) {
        const b = P.pick(rnd, buyers), oid = P.uid('o');
        const fee = round(P.value(p) * (1 + rnd() * 0.2));
        g.offers.push({ id: oid, pid: p.id, from: b.id, fee, until: g.week + 2, ask: true });
        P.news(g, `${p.name} pediu para sair: o ${b.name} ofereceu ${P.money(fee)} e ele quer ir.`, 'warn');
        if (P.mail) P.mail(g, { k: 'saida', pid: p.id, oid, subj: `${p.name} quer sair para o ${b.name}`, body: `Chefe, o ${b.name} (${b.div}ª divisão) ofereceu ${P.money(fee)} pelo ${p.name} e ele veio me dizer que quer muito ir. Se a gente barrar, ele vai ficar chateado. A decisão é sua.` });
      }
    }

    // 2. clube rico paga a multa de um jogador seu que valorizou muito
    if (rnd() < 0.04) {
      const cands = mine.filter((p) => !busy(p) && P.value(p) * 1.25 >= P.clauseOf(g, p));
      const p = cands.length ? P.pick(rnd, cands) : null;
      const rc = p ? P.clauseOf(g, p) : 0;
      const buyers = p ? bigger(p, rc) : [];
      if (p && buyers.length) {
        const b = P.pick(rnd, buyers);
        P.transfer(g, p, b.id, rc, Math.max(p.wage, P.wageFor(p)), 3);
        P.news(g, `O ${b.name} pagou a multa rescisória de ${P.money(rc)} e levou ${p.name}.`, 'bad');
        if (P.flash) P.flash(g, { pri: 3, ttl: 1, kicker: 'Mercado · multa paga', head: `${b.name} paga a multa e tira ${p.name} do ${me.name}`, dek: `Foram ${P.money(rc)} de uma vez. Sem conversa: a multa estava no contrato. Renove contratos para atualizar as multas.` });
        if (P.mail) P.mail(g, { k: 'saida', pid: p.id, subj: `O ${b.name} pagou a multa do ${p.name}`, body: `Chefe, não teve jeito: o ${b.name} depositou a multa rescisória de ${P.money(rc)} e o ${p.name} já se despediu. Dica: renovar o contrato atualiza a multa pelo valor atual do jogador.` });
      }
    }

    // 3. rumores da Gazeta (o clube citado tende a fazer proposta depois)
    if (rnd() < 0.18) {
      const stars = mine.slice().sort((a, b) => P.value(b) - P.value(a)).slice(0, 5);
      const p = stars.length ? P.pick(rnd, stars) : null;
      const buyers = p ? bigger(p) : [];
      if (p && buyers.length) {
        const b = P.pick(rnd, buyers);
        g.rumor = { pid: p.id, from: b.id, w: g.week, s: g.season };
        P.news(g, `Rumor da Gazeta: o ${b.name} está de olho em ${p.name}.`, '');
      }
    }
    // rumor que vira proposta
    if (g.rumor && g.rumor.s === g.season && g.week - g.rumor.w >= 1 && g.week - g.rumor.w <= 4 && rnd() < 0.35) {
      const p = g.db.players[g.rumor.pid], b = P.club(g, g.rumor.from);
      if (p && p.clubId === g.user && !busy(p) && b && b.bal > P.value(p) * 1.2) {
        const oid = P.uid('o'), fee = round(P.value(p) * (1 + rnd() * 0.3));
        g.offers.push({ id: oid, pid: p.id, from: b.id, fee, until: g.week + 2 });
        P.news(g, `O rumor se confirmou: o ${b.name} ofereceu ${P.money(fee)} por ${p.name}.`, 'warn');
        if (P.mail) P.mail(g, { k: 'prop', pid: p.id, oid, subj: `${b.name} quer o ${p.name}`, body: `Chefe, aquele rumor era verdade: o ${b.name} ofereceu ${P.money(fee)} pelo ${p.name}. Veja em Mercado › Propostas.` });
      }
      g.rumor = null;
    }
  };

  // ---------- Ações ----------
  Object.assign(A.ACT, {
    // barrar a saída de quem pediu para sair deixa o jogador chateado
    mkReject(d) {
      const g = A.g, o = (g.offers || []).find((x) => x.id === d.id);
      g.offers = (g.offers || []).filter((x) => x.id !== d.id);
      if (o && o.ask) { const p = g.db.players[o.pid]; if (p) { p.mor = Math.max(20, p.mor - 12); p.unh = true; P.news(g, `${p.name} ficou chateado: você barrou a saída dele para o ${P.club(g, o.from).name}.`, 'bad'); } }
      A.save(); A.render();
    },
    // pagar a multa de um jogador de outro clube
    mkClause(d) {
      const g = A.g, p = g.db.players[d.id]; if (!p || !p.clubId || p.clubId === g.user) return;
      const rc = P.clauseOf(g, p), me = P.club(g, g.user);
      const say = (msg, ok) => { A.st.offer = Object.assign(A.st.offer || { pid: p.id }, { pid: p.id, msg, ok }); A.playerSheet(p.id, 'offer'); };
      if (!P.windowOpen(g)) return say(P.windowText(g));
      if (P.squad(g, g.user).length >= P.MARKET.maxSquad) return say(`Seu elenco já tem ${P.MARKET.maxSquad} jogadores.`);
      if (me.bal < rc) return say(`A multa é de ${P.money(rc)} e o saldo não cobre.`);
      const wage = P.playerDemand(g, p, g.user);
      if (wage == null) return say(`${p.name} não quer jogar na ${me.div}ª divisão, nem com a multa paga.`);
      const fromName = P.club(g, p.clubId).name;
      P.transfer(g, p, g.user, rc, wage, 3);
      P.news(g, `Você pagou a multa rescisória de ${P.money(rc)} e tirou ${p.name} do ${fromName}.`, 'good');
      A.st.offer = null; A.save(); A.render(); A.playerSheet(p.id); A.toast(`Multa paga! ${p.name} assinou até ${p.ctr} ganhando ${P.money(wage)}/mês.`);
    },
    // empréstimo com opção de compra: alternar e exercer
    mkLoanOpt(d) { A.st.offer = A.st.offer || { pid: d.id }; A.st.offer.pid = d.id; A.st.offer.opt = !A.st.offer.opt; A.playerSheet(d.id, 'loan'); },
    mkOptBuy(d) {
      const g = A.g, p = g.db.players[d.id]; if (!p || !p.loan || !p.loan.opt) return;
      const me = P.club(g, g.user), price = p.loan.opt, owner = p.loan.from;
      if (me.bal < price) { A.toast(`A opção custa ${P.money(price)} e o saldo não cobre.`); return; }
      P.pay(g, g.user, -price, 'Contratações'); P.pay(g, owner, price, 'Vendas');
      const ownerName = P.club(g, owner).name;
      delete p.loan; delete p.rc; p.ctr = g.season + 3; p.wage = Math.max(p.wage, P.wageFor(p));
      (g.tx = g.tx || []).unshift({ s: g.season, w: g.week + 1, pid: p.id, name: p.name, pos: p.pos, ovr: P.ovr(p), from: owner, to: g.user, fee: price, kind: 'buy' });
      P.news(g, `Opção de compra exercida: ${p.name} é definitivamente do ${me.name} (${P.money(price)} ao ${ownerName}).`, 'good');
      A.save(); A.render(); A.playerSheet(p.id); A.toast('Opção de compra exercida');
    }
  });

  // pedir empréstimo com opção de compra: custa 20% a mais na taxa
  const origLoan = A.ACT.mkLoan;
  A.ACT.mkLoan = function (d) {
    const g = A.g, p = g.db.players[d.id], opt = A.st.offer && A.st.offer.opt && A.st.offer.pid === d.id;
    const owner = p.clubId, fee = P.loanFeeOf(p);
    if (opt && P.club(g, g.user).bal < fee * 1.2) { A.st.offer.msg = `Com opção de compra a taxa sobe para ${P.money(Math.round(fee * 1.2))} e o saldo não cobre.`; A.st.offer.ok = false; A.playerSheet(d.id, 'loan'); return; }
    origLoan(d);
    if (opt && p.clubId === g.user && p.loan) {
      const extra = Math.round(fee * 0.2 / 10000) * 10000;
      P.pay(g, g.user, -extra, 'Empréstimos'); P.pay(g, owner, extra, 'Empréstimos');
      p.loan.opt = round(P.value(p) * 0.9);
      A.st.offer.msg += ` Opção de compra garantida por ${P.money(p.loan.opt)} até o fim do empréstimo.`;
      A.save(); A.playerSheet(d.id); A.toast(`Empréstimo com opção de compra: dá para comprar ${p.name} por ${P.money(p.loan.opt)} até o fim da temporada.`);
    }
  };

  // Pedaços de tela usados pela ficha e pelo painel de proposta
  P.clauseLine = (g, p) => (p.clubId ? P.money(P.clauseOf(g, p)) : '—');
  P.clauseButton = (g, p) => (p.clubId && p.clubId !== g.user ? `<button class="btn" data-a="mkClause" data-id="${p.id}">Pagar a multa (${P.money(P.clauseOf(g, p))})</button>` : '');
  P.loanOptRow = (p) => { const on = A.st.offer && A.st.offer.pid === p.id && A.st.offer.opt; return `<label class="loan-opt"><input type="checkbox" data-a="mkLoanOpt" data-id="${p.id}" ${on ? 'checked' : ''}> Com opção de compra por ${P.money(round(P.value(p) * 0.9))} (taxa 20% maior)</label>`; };
  P.optBuyButton = (g, p) => (p.clubId === g.user && p.loan && p.loan.opt ? `<button class="btn primary" data-a="mkOptBuy" data-id="${p.id}">Exercer opção (${P.money(p.loan.opt)})</button>` : '');
})(window.PFC);
