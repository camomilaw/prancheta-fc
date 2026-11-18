/* Prancheta FC — notícias de transferências
 * Manchetes na capa (Gazeta) para as negociações do seu clube, notas sobre os rivais,
 * e o balanço do mercado quando a janela fecha.
 */
(function (P) {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? v[k] : ''));

  const SIGN = ['{me} anuncia {p}', '{p} é do {me}', 'Reforço: {p} chega ao {me}', '{me} fecha com {p}'];
  const SIGN_FREE = ['{p} chega de graça ao {me}', '{me} acerta com {p}, que estava sem clube'];
  const SELL = ['{p} deixa o {me} rumo ao {to}', '{to} leva {p} por {fee}', 'Adeus: {p} é vendido ao {to}'];
  const LOAN_IN = ['{p} chega emprestado ao {me}', '{me} pega {p} emprestado do {from}'];
  const LOAN_OUT = ['{p} vai rodar no {to}', '{me} empresta {p} ao {to}'];
  const QUOTES_IN = ['"Venho para ganhar títulos"', '"Era o projeto que eu queria"', '"Quero retribuir a confiança"', '"Estou pronto para jogar"'];

  // posição em que o jogador costuma atuar, por extenso
  const posTxt = (p) => (P.POS_NAME && P.POS_NAME[p.pos] ? P.POS_NAME[p.pos].toLowerCase() : p.pos);

  const orig = P.transfer;
  P.transfer = function (g, p, toCid, fee, wage, years, kind) {
    const from = p.clubId;
    const ovr = P.ovr(p), age = p.age;
    const r = orig.apply(this, arguments);
    try { report(g, p, from, toCid, fee || 0, kind, ovr, age); } catch (e) { /* notícia nunca quebra o mercado */ }
    return r;
  };

  function report(g, p, from, to, fee, kind, ovr, age) {
    const user = g.user, me = P.club(g, user);
    const fromC = from ? P.club(g, from) : null, toC = P.club(g, to);
    const v = { p: p.name, me: me.name, to: toC ? toC.name : '', from: fromC ? fromC.name : '', fee: P.money(fee) };
    // balanço da janela
    const w = g.txWin || (g.txWin = { s: g.season, list: [] });
    if (w.s !== g.season || w.closed) { w.s = g.season; w.list = []; w.closed = false; }
    w.list.push({ n: p.name, o: ovr, from, to, fee, kind: kind || (from ? 'buy' : 'free') });
    if (w.list.length > 80) w.list.shift();

    if (!P.flash) return;
    // seu clube contrata
    if (to === user && from !== user) {
      if (kind === 'loan') {
        P.flash(g, { pri: 1.2, ttl: 1, kicker: 'Mercado · empréstimo', head: fill(pick(LOAN_IN), v), dek: `${p.name}, ${age} anos, ${posTxt(p)} de força ${ovr}, joga pelo ${me.name} até o fim da temporada. O salário fica por conta do clube.` });
      } else if (fee < 200000) { // as contratações caras já ganham manchete de recorde
        P.flash(g, { pri: 1.2, ttl: 1, kicker: from ? 'Mercado · contratação' : 'Mercado · jogador livre', head: fill(pick(from ? SIGN : SIGN_FREE), v), dek: `${pick(QUOTES_IN)}, disse ${p.name} (${age} anos, ${posTxt(p)}, força ${ovr})${fromC ? `, que chega do ${fromC.name}` : ''}.` });
      } else if (!(g.rec && g.rec[user] === fee)) {
        P.flash(g, { pri: 1.5, ttl: 1, kicker: 'Mercado · contratação', head: fill(pick(SIGN), v), dek: `O ${me.name} pagou ${P.money(fee)} ao ${v.from} por ${p.name} (${age} anos, ${posTxt(p)}, força ${ovr}). ${pick(QUOTES_IN)}, disse o reforço.` });
      }
      return;
    }
    // seu clube vende ou empresta
    if (from === user && to !== user) {
      if (kind === 'loan') {
        P.flash(g, { pri: 1.1, ttl: 1, kicker: 'Mercado · empréstimo', head: fill(pick(LOAN_OUT), v), dek: `${p.name} passa o resto da temporada no ${v.to} e volta com o contrato intacto.` });
      } else {
        const star = ovr >= (P.clubOvrs ? (P.clubOvrs(g.db)[user] || 0) - 1 : 99), big = star || fee >= 5e6;
        P.flash(g, { pri: big ? 2 : 1.3, ttl: big ? 2 : 1, kicker: 'Mercado · venda', head: fill(pick(SELL), v), dek: `O ${me.name} recebe ${P.money(fee)} por ${p.name} (${age} anos, força ${ovr}). ${star ? 'A torcida sente a perda de uma peça importante.' : age <= 21 ? 'Uma aposta que sai cedo, mas o dinheiro reforça o caixa.' : 'O dinheiro reforça o caixa do clube.'}` });
      }
      return;
    }
    // rivais se mexem
    const riv = P.rivalry ? Math.max(from ? P.rivalry(g, user, from) : 0, P.rivalry(g, user, to)) : 0;
    if (riv >= 1 && kind !== 'loan' && ovr >= 70 && (g.rivTxW !== g.week || g.rivTxS !== g.season)) {
      g.rivTxW = g.week; g.rivTxS = g.season;
      const rc = P.rivalry(g, user, to) >= 1 ? toC : fromC;
      const gets = rc === toC;
      P.news(g, gets ? `De olho no rival: o ${rc.name} contratou ${p.name} (força ${ovr})${fee ? ` por ${P.money(fee)}` : ''}.` : `O rival ${rc.name} perdeu ${p.name} (força ${ovr}) para o ${v.to}${fee ? ` por ${P.money(fee)}` : ''}.`, '');
    }
  }

  // fechamento da janela: balanço do mercado
  const origWeek = P.marketWeek;
  P.marketWeek = function (g, step) {
    const was = g.winOpen;
    const r = origWeek ? origWeek.apply(this, arguments) : undefined;
    const now = P.windowOpen ? P.windowOpen(g) : false;
    g.winOpen = now;
    const w = g.txWin;
    if (was && !now && w && !w.closed && w.list.length) {
      w.closed = true;
      const buys = w.list.filter((x) => x.kind !== 'loan' && x.fee > 0);
      const top = buys.slice().sort((a, b) => b.fee - a.fee)[0];
      const mine = w.list.filter((x) => x.to === g.user || x.from === g.user);
      const spent = mine.filter((x) => x.to === g.user).reduce((s, x) => s + x.fee, 0), got = mine.filter((x) => x.from === g.user).reduce((s, x) => s + x.fee, 0);
      if (top) P.news(g, `Fecha a janela: ${buys.length} ${buys.length === 1 ? 'venda' : 'vendas'} na Ultraliga. A maior foi ${top.n} (${P.club(g, top.from) ? P.club(g, top.from).short : '?'} → ${P.club(g, top.to) ? P.club(g, top.to).short : '?'}) por ${P.money(top.fee)}.`, '');
      if (mine.length) P.news(g, `Balanço do ${P.club(g, g.user).name} na janela: ${(() => { const a = mine.filter((x) => x.to === g.user).length, b = mine.filter((x) => x.from === g.user).length; return `${a} ${a === 1 ? 'chegada' : 'chegadas'}, ${b} ${b === 1 ? 'saída' : 'saídas'}`; })()}, ${P.money(spent)} gastos e ${P.money(got)} recebidos.`, spent > got ? 'warn' : 'good');
      if (P.flash && top && top.fee >= 15e6) P.flash(g, { pri: 1, ttl: 1, kicker: 'Mercado · fim da janela', head: `${top.n} foi a contratação da janela`, dek: `${P.money(top.fee)} pagos pelo ${P.club(g, top.to).name}. Ao todo, ${buys.length} transferências pagas na Ultraliga.` });
    }
    return r;
  };
})(window.PFC);
