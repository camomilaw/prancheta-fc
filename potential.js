/* Prancheta FC — potencial dinâmico (estilo FIFA)
 * Jogadores de até 24 anos (e todo o Sub-20) têm o potencial reavaliado na
 * semana 24 e no fim da temporada, conforme o tempo de jogo e a nota média.
 * Jogou bastante e bem: sobe. Ficou encostado: cai.
 */
(function (P) {
  P.POT = { maxAge: 24, mid: 24 };

  // Mudança de potencial numa metade de temporada
  P.potDelta = function (share, note, age, r) {
    let d = 0;
    if (share >= 0.6 && note >= 7.2) d = 2 + (r() < 0.5 ? 1 : 0);
    else if (share >= 0.6 && note >= 6.6) d = 1 + (r() < 0.5 ? 1 : 0);
    else if (share >= 0.4 && note >= 6.5) d = 1;
    else if (share >= 0.25 && note >= 6.9) d = 1;
    else if (share >= 0.4 && note < 6.0) d = -1;
    else if (share === 0 && age >= 20) d = -(1 + (r() < 0.5 ? 1 : 0));
    else if (share < 0.15) d = r() < 0.6 ? -1 : 0;
    if (age <= 20 && d) d = Math.round(d * 1.25) || d;
    return d;
  };
  // Potencial na escala de força (1-99)
  P.potOvr = (p) => Math.max(P.ovr(p), Math.round(p.potO || (p.pot || 0) * 5));

  // Jogos disputados por cada clube até agora na temporada
  function clubGames(g) {
    const n = {};
    const add = (m) => { if (m && m.done) { n[m.h] = (n[m.h] || 0) + 1; n[m.a] = (n[m.a] || 0) + 1; } };
    for (const d of Object.keys(g.lg)) g.lg[d].forEach((rd) => rd.forEach(add));
    (g.cup.rounds || []).forEach((r) => r.ties.forEach(add));
    if (g.po) for (const d of Object.keys(g.po)) { g.po[d].semi.forEach(add); add(g.po[d].final); }
    return n;
  }
  const youthGames = (g) => (g.lg[1] || []).filter((rd) => rd[0] && rd[0].done).length;

  function apply(p, d, youth) {
    if (!d) return 0;
    const before = P.potOvr(p);
    if (youth) {
      p.potO = P.clamp(p.potO + d, P.ovr(p), 99);
      p.pot = p.potO / 5;
      if (p.lo) { p.lo = P.clamp(p.lo + d, 30, 99); p.hi = P.clamp(p.hi + d, p.lo + 2, 99); }
    } else {
      p.pot = P.clamp(p.pot + d / 5, P.ovr(p) / 5, 99 / 5);
      if (p.potO) p.potO = Math.round(p.pot * 5);
    }
    const real = P.potOvr(p) - before;
    p.potT = real;
    return real;
  }

  // phase: 'mid' (semana 24) ou 'end' (fim da temporada)
  P.potentialUpdate = function (g, phase) {
    const r = Math.random;
    const cg = clubGames(g), yg = youthGames(g);
    const up = [], down = [];
    const track = (p, d) => { if (!d) return; (d > 0 ? up : down).push(`${p.name} (${d > 0 ? '+' : ''}${d}, agora ${P.potOvr(p)})`); };
    const evalP = (p, games, youth) => {
      const mid = p._mid || { j: 0, nt: 0, cg: 0 };
      const j = phase === 'end' ? p.s.j - mid.j : p.s.j;
      const nt = phase === 'end' ? p.s.nt - mid.nt : p.s.nt;
      const tot = phase === 'end' ? games - mid.cg : games;
      if (phase === 'mid') p._mid = { j: p.s.j, nt: p.s.nt, cg: games };
      else delete p._mid;
      if (tot < 4) return 0;
      const share = j / tot, note = j ? nt / j : 0;
      return apply(p, P.potDelta(share, note, p.age, r), youth);
    };
    for (const p of Object.values(g.db.players)) {
      if (!p.clubId || p.age > P.POT.maxAge) { delete p._mid; continue; }
      const d = evalP(p, cg[p.clubId] || 0, false);
      if (p.clubId === g.user) track(p, d);
    }
    if (g.y) for (const p of Object.values(g.y.squad)) track(p, evalP(p, yg, true));
    if (up.length || down.length) {
      const parts = [];
      if (up.length) parts.push(`em alta: ${up.join(', ')}`);
      if (down.length) parts.push(`em baixa: ${down.join(', ')}`);
      P.news(g, `Avaliação de potencial (${phase === 'mid' ? 'meio' : 'fim'} da temporada) ${parts.join('; ')}.`, up.length >= down.length ? 'good' : 'warn');
    }
  };
})(window.PFC);
