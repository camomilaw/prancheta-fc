/* Prancheta FC — acordos para a próxima janela
 * Com a janela fechada dá para acertar compras e vendas, mas o jogador só muda de clube
 * quando a janela abrir. Até lá ele continua treinando e jogando pelo clube atual.
 * O dinheiro só sai na hora em que a transferência é concluída, e só se quem compra
 * tiver o valor em caixa; senão o negócio cai. Empréstimos continuam só com a janela aberta.
 * Fica em g.pend: [{ id, kind: 'buy' | 'sell' | 'clause', pid, from, to, fee, inst, swap, sv, wage, years, s, w }]
 */
(function (P) {
  const A = P.app, esc = P.esc;

  P.pendOf = (g, pid) => (g.pend || []).find((d) => d.pid === pid || d.swap === pid);
  P.pendIn = (g) => (g.pend || []).filter((d) => d.kind !== 'sell');
  P.pendOut = (g) => (g.pend || []).filter((d) => d.kind === 'sell');
  // quando os acordos viram transferência (texto curto)
  P.pendWhen = function (g) {
    if (g.over) return 'na abertura da janela da próxima temporada';
    const n = P.lgDone(g);
    for (const [a] of P.MARKET.windows) if (n < a) return `quando a janela abrir, depois da rodada ${a} da liga`;
    return 'na abertura da janela da próxima temporada';
  };

  P.pendAdd = function (g, d) {
    d.id = P.uid('pd'); d.s = g.season; d.w = g.week;
    (g.pend = g.pend || []).push(d);
    const p = g.db.players[d.pid];
    if (p) p.pendId = d.id;
    if (d.swap && g.db.players[d.swap]) g.db.players[d.swap].pendId = d.id;
    // outras propostas pelo mesmo jogador deixam de valer
    g.offers = (g.offers || []).filter((o) => o.pid !== d.pid && o.pid !== d.swap);
    if (p) { p.listed = false; p.loanList = false; }
    P.dirty && P.dirty(g);
    return d;
  };

  function clear(g, d) {
    g.pend = (g.pend || []).filter((x) => x.id !== d.id);
    for (const id of [d.pid, d.swap]) { const x = id && g.db.players[id]; if (x && x.pendId === d.id) delete x.pendId; }
  }
  P.pendCancel = function (g, id, why) {
    const d = (g.pend || []).find((x) => x.id === id); if (!d) return;
    clear(g, d);
    const p = g.db.players[d.pid], name = p ? p.name : 'o jogador';
    const other = P.club(g, d.kind === 'sell' ? d.to : d.from);
    if (why) {
      P.news(g, `Negócio desfeito: ${why}`, 'bad');
      if (P.mail) P.mail(g, { k: 'prop', pid: d.pid, subj: `Caiu o acerto com o ${other ? other.name : 'outro clube'}`, body: `Chefe, ${why.charAt(0).toLowerCase() + why.slice(1)}` });
    } else P.news(g, `Você desfez o acordo com o ${other ? other.name : 'outro clube'} por ${name}.`, '');
  };

  // Conclui o que dá; o que não dá, cai (com o motivo)
  P.pendRun = function (g) {
    if (!g.pend || !g.pend.length || !P.windowOpen(g)) return;
    for (const d of g.pend.slice()) {
      const p = g.db.players[d.pid];
      const me = P.club(g, g.user);
      const other = P.club(g, d.kind === 'sell' ? d.to : d.from);
      const oname = other ? other.name : 'o outro clube';
      if (!p) { P.pendCancel(g, d.id, `o jogador do acordo com o ${oname} se aposentou antes da janela abrir.`); continue; }
      if (p.clubId !== d.from || p.loan) { P.pendCancel(g, d.id, `${p.name} não está mais no ${d.kind === 'sell' ? me.name : oname}, então o acordo perdeu o efeito.`); continue; }
      if (d.kind === 'sell') {
        if (!other) { P.pendCancel(g, d.id, `o clube comprador de ${p.name} não existe mais.`); continue; }
        if (other.bal < d.fee) { P.pendCancel(g, d.id, `o ${oname} não tinha ${P.money(d.fee)} em caixa quando a janela abriu, e a venda de ${p.name} foi cancelada. Ele continua no elenco.`); continue; }
        if (P.squad(g, g.user).length <= P.MARKET.minSquad) { P.pendCancel(g, d.id, `a venda de ${p.name} ao ${oname} deixaria o elenco pequeno demais (mínimo de ${P.MARKET.minSquad}).`); continue; }
        clear(g, d);
        P.transfer(g, p, d.to, d.fee, Math.max(p.wage, P.wageFor(p)), 3);
        P.news(g, `Janela aberta: ${p.name} se despediu e foi para o ${oname}. Entraram ${P.money(d.fee)} no caixa.`, 'good');
        continue;
      }
      // compras: o dinheiro precisa estar em caixa agora
      const now = d.kind === 'clause' ? d.fee : Math.round(d.fee / (d.inst || 1) / 10000) * 10000;
      if (me.bal < now) { P.pendCancel(g, d.id, `o clube não tinha ${P.money(now)} em caixa quando a janela abriu, e a contratação de ${p.name} (${oname}) foi cancelada.`); continue; }
      if (d.swap) {
        const sp = g.db.players[d.swap];
        if (!sp || sp.clubId !== g.user || sp.loan) { P.pendCancel(g, d.id, `${sp ? sp.name : 'o jogador da troca'} não está mais no elenco, e o ${oname} desistiu de vender ${p.name}.`); continue; }
      }
      clear(g, d);
      let err = '';
      if (d.kind === 'clause') {
        if (P.squad(g, g.user).length >= P.MARKET.maxSquad) err = `o elenco já tinha ${P.MARKET.maxSquad} jogadores quando a janela abriu, e ${p.name} não pôde ser registrado.`;
        else {
          P.transfer(g, p, g.user, d.fee, d.wage, d.years || 3);
          P.news(g, `Janela aberta: ${p.name} chegou. A multa rescisória de ${P.money(d.fee)} foi paga ao ${oname}.`, 'good');
        }
      } else if (P.negCloseBuy) {
        const e = P.negCloseBuy(g, p, { fee: d.fee, inst: d.inst || 1, swap: d.swap, wage: d.wage, years: d.years }, {}, d.sv);
        if (e) err = `${e.replace(/\.$/, '')}: a contratação de ${p.name} (${oname}) foi cancelada.`;
        else P.news(g, `Janela aberta: ${p.name} se apresentou e já pode jogar.`, 'good');
      }
      if (err) { P.news(g, `Negócio desfeito: ${err}`, 'bad'); if (P.mail) P.mail(g, { k: 'prop', pid: p.id, subj: `Caiu a contratação de ${p.name}`, body: `Chefe, ${err}` }); }
    }
  };

  // Roda quando a janela abre (no meio da temporada) e logo no começo da temporada nova
  const origWeek = P.marketWeek;
  P.marketWeek = function (g) { try { P.pendRun(g); } catch (e) { /* nunca trava a semana */ } return origWeek.apply(this, arguments); };
  const origEnd = P.endWeek; // a semana que abre a janela já conclui os acordos
  P.endWeek = function (g) { const r = origEnd.apply(this, arguments); try { P.pendRun(g); } catch (e) { /* idem */ } return r; };
  const origNew = P.newSeason;
  P.newSeason = function (g) { const r = origNew.apply(this, arguments); try { P.pendRun(g); } catch (e) { /* idem */ } return r; };

  // Vendas: aceitar proposta com a janela fechada vira acordo
  const origAccept = P.acceptOffer;
  P.acceptOffer = function (g, oid) {
    const o = (g.offers || []).find((x) => x.id === oid);
    if (!o || o.kind === 'loan' || P.windowOpen(g)) return origAccept.apply(this, arguments);
    const p = g.db.players[o.pid];
    if (!p || p.clubId !== g.user) { g.offers = g.offers.filter((x) => x.id !== oid); return null; }
    if (P.squad(g, g.user).length - P.pendOut(g).length <= P.MARKET.minSquad) return 'Seu elenco ficaria pequeno demais.';
    P.pendAdd(g, { kind: 'sell', pid: p.id, from: g.user, to: o.from, fee: o.fee });
    P.news(g, `Acordo fechado: ${p.name} vai para o ${P.club(g, o.from).name} por ${P.money(o.fee)} ${P.pendWhen(g)}. Até lá ele segue no elenco, e o dinheiro só entra na transferência.`, 'good');
    return '';
  };

  // Multa rescisória com a janela fechada: acerta agora, paga na abertura
  const origClause = A.ACT.mkClause;
  A.ACT.mkClause = function (d) {
    const g = A.g, p = g.db.players[d.id];
    if (!p || !p.clubId || p.clubId === g.user || P.windowOpen(g)) return origClause.apply(this, arguments);
    const rc = P.clauseOf(g, p), me = P.club(g, g.user);
    const say = (msg, ok) => { A.st.offer = Object.assign(A.st.offer || { pid: p.id }, { pid: p.id, msg, ok }); A.playerSheet(p.id, 'offer'); };
    if (P.pendOf(g, p.id)) return say(`Já existe um acordo por ${p.name}.`);
    const wage = P.playerDemand(g, p, g.user);
    if (wage == null) return say(`${p.name} não quer jogar na ${P.divName(me.div)}, nem com a multa paga.`);
    P.pendAdd(g, { kind: 'clause', pid: p.id, from: p.clubId, to: g.user, fee: rc, wage, years: 3 });
    P.news(g, `Acordo fechado: você vai pagar a multa de ${P.money(rc)} por ${p.name} ${P.pendWhen(g)}.`, 'good');
    A.st.offer = null; A.save(); A.render(); A.playerSheet(p.id);
    A.toast(`Acordo fechado. ${p.name} chega ${P.pendWhen(g)}, se houver ${P.money(rc)} em caixa.`);
  };

  // Desfazer um acordo (pelo Mercado)
  A.ACT.pendUndo = function (d) { P.pendCancel(A.g, d.id); A.save(); A.render(); A.toast('Acordo desfeito'); };

  // Lista dos acordos, mostrada no topo de Mercado › Propostas
  P.pendBox = function (g) {
    const list = g.pend || [];
    if (!list.length) return '';
    const row = (d) => {
      const p = g.db.players[d.pid]; if (!p) return '';
      const sell = d.kind === 'sell', oc = P.club(g, sell ? d.to : d.from);
      const now = sell || d.kind === 'clause' ? d.fee : Math.round(d.fee / (d.inst || 1) / 10000) * 10000;
      const me = P.club(g, g.user);
      const warn = !sell && me.bal < now ? ` <span class="chip sus">saldo hoje não cobre</span>` : '';
      return `<div class="offer"><div class="row" style="gap:8px">${oc ? P.badge(oc, 28) : ''}<div style="flex:1;min-width:0"><b>${sell ? 'Venda' : 'Compra'}: <button class="jr-link" data-a="player" data-id="${p.id}">${esc(p.name)}</button></b> <span class="muted">${p.pos} · força ${P.ovr(p)}</span>${warn}
        <div class="muted" style="font-size:.85rem">${sell ? 'para o' : 'do'} ${oc ? esc(oc.name) : '?'}${d.kind === 'clause' ? ' · multa rescisória' : ''}${d.inst > 1 ? ` · ${d.inst} parcelas` : ''}${d.swap && g.db.players[d.swap] ? ` · + ${esc(g.db.players[d.swap].name)} na troca` : ''}${!sell ? ` · ${P.money(d.wage)}/mês por ${d.years} ${d.years === 1 ? 'ano' : 'anos'}` : ''}</div></div><b class="num">${P.money(d.fee)}</b></div>
        <div class="row"><span class="muted" style="font-size:.8rem;flex:1">Conclui ${esc(P.pendWhen(g))}${sell ? '' : `; precisa de ${P.money(now)} em caixa`}</span><button class="btn sm" data-a="pendUndo" data-id="${d.id}">Desfazer</button></div></div>`;
    };
    return `<div class="label" style="margin:0 0 6px">Acordos para a janela (${list.length})</div><div class="plist">${list.map(row).join('')}</div>
      <p class="muted" style="font-size:.8rem;margin:6px 0 14px">O jogador só muda de clube quando a janela abrir, e o dinheiro só sai nessa hora. Se quem compra não tiver o valor em caixa, o negócio cai.</p>`;
  };
})(window.PFC);
