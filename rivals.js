/* Prancheta FC — clássicos e rivalidades
 * Rivalidade de 0 a 3 entre dois clubes. Nasce da mesma cidade ou entre os dois gigantes de cada país (3),
 * ou entre vizinhos de nível no mesmo país e divisão (1–2) e cresce quando os dois se cruzam em mata-mata e, mais ainda, em finais.
 * Clássico enche o estádio, tem mais cartões, mexe mais com a moral e com a diretoria.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

  P.ensureRivals = function (g) {
    if (g.riv) return g.riv;
    const riv = g.riv = {};
    const clubs = g.db.clubs;
    for (let i = 0; i < clubs.length; i++) for (let j = i + 1; j < clubs.length; j++) {
      const a = clubs[i], b = clubs[j];
      if (a.city && b.city && a.city === b.city) riv[key(a.id, b.id)] = 3;
    }
    // grande clássico nacional: os dois clubes de maior tradição de cada país
    const byCountry = {};
    for (const c of clubs) (byCountry[c.country] = byCountry[c.country] || []).push(c);
    for (const list of Object.values(byCountry)) {
      const top = list.slice().sort((x, y) => y.rep - x.rep);
      if (top.length >= 2) riv[key(top[0].id, top[1].id)] = 3;
    }
    // vizinho de nível: mesmo país e divisão, reputação parecida (bem parecida = clássico)
    for (const c of clubs) {
      const near = clubs.filter((o) => o.id !== c.id && o.country === c.country && o.div === c.div && Math.abs(o.rep - c.rep) < 8)
        .sort((x, y) => Math.abs(x.rep - c.rep) - Math.abs(y.rep - c.rep))[0];
      if (near && !riv[key(c.id, near.id)]) riv[key(c.id, near.id)] = Math.abs(near.rep - c.rep) < 1 && P.dt(c) <= 2 ? 2 : 1;
    }
    return riv;
  };
  P.rivalry = (g, a, b) => { if (!g || !a || !b) return 0; const r = P.ensureRivals(g); return Math.min(3, Math.floor(r[key(a, b)] || 0)); };
  P.rivalBump = function (g, a, b, n) { const r = P.ensureRivals(g), k = key(a, b); r[k] = Math.min(3, (r[k] || 0) + n); };
  P.rivalsOf = function (g, cid) {
    const r = P.ensureRivals(g), out = [];
    for (const [k, v] of Object.entries(r)) { if (v < 1) continue; const [a, b] = k.split('|'); if (a === cid || b === cid) out.push({ id: a === cid ? b : a, v: Math.min(3, Math.floor(v)) }); }
    return out.sort((x, y) => y.v - x.v);
  };
  P.rivalWord = (v) => (v >= 3 ? 'Grande clássico' : v >= 2 ? 'Clássico' : 'Rivalidade');

  // Depois de cada rodada: mata-mata aproxima rivais; final cria rivalidade de verdade
  const isFinal = (step) => (step.t === 'cup' && step.r === P.CUP_NAMES.length - 1) || (step.t === 'sc' && P.SC_NAMES && step.r === P.SC_NAMES.length - 1)
    || (step.t === 'rz' && P.RZ_NAMES && step.r === P.RZ_NAMES.length - 1) || (step.t === 'po' && step.r === 1);
  P.rivalWeek = function (g, step, results) {
    for (const { it } of results || []) {
      if (!it.ko) continue;
      P.rivalBump(g, it.m.h, it.m.a, isFinal(step) ? 1 : 0.34);
    }
  };

  // Dek/kicker para a capa e o quadro do próximo jogo
  P.derbyTag = function (g, um) {
    const v = P.rivalry(g, um.m.h, um.m.a);
    return v ? `<span class="derby-tag">${esc(P.rivalWord(v))}</span>` : '';
  };
})(window.PFC);
