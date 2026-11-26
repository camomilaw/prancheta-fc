/* Prancheta FC — Carreira normal: copas nacionais e continentais
 * Copa nacional: todos os clubes do país, mata-mata em jogo único (o time de divisão mais baixa joga em casa),
 *   final em campo neutro. Países com mais clubes têm fase preliminar; todas as finais caem na mesma semana.
 * Copa continental (Europa e Américas): 32 clubes classificados pela liga do ano anterior,
 *   8 grupos de 4 (ida e volta), oitavas, quartas, semifinal e final em jogo único.
 * Estrutura: g.nc[país] = { n, start, rounds: [{ ties }], byes, w }; g.cc[z] = { ids, groups, gfx, ko, w }.
 */
(function (P) {
  const NC_N = 7;                                   // fases da copa nacional (a maior tem preliminar + 64)
  const NC_AFTER = [4, 9, 14, 19, 25, 30, 35];      // depois destas rodadas da liga
  const CC_AFTER = [2, 6, 10, 13, 17, 21, 24, 28, 32, 36];
  const CC_NAMES = ['Grupos · 1ª rodada', 'Grupos · 2ª rodada', 'Grupos · 3ª rodada', 'Grupos · 4ª rodada', 'Grupos · 5ª rodada', 'Grupos · 6ª rodada', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
  P.CC = {
    eu: { n: 'Copa dos Campeões da Europa', short: 'Copa da Europa', slots: { ENG: 4, ESP: 4, ITA: 4, GER: 4, FRA: 4, POR: 3, NED: 3, TUR: 3, BEL: 3 }, m: 1 },
    am: { n: 'Copa dos Campeões das Américas', short: 'Copa das Américas', slots: { BRA: 7, ARG: 6, MEX: 5, URU: 5, CHI: 5, USA: 4 }, m: 0.55 }
  };
  const LET = 'ABCDEFGH';
  const koW = (m) => (m.hg > m.ag ? m.h : m.hg < m.ag ? m.a : (m.pen && m.pen[0] > m.pen[1] ? m.h : m.a));
  const ncName = (c) => `Copa ${P.countryPrep(c)}`;
  P.ncName = ncName;
  P.ccName = (z) => P.CC[z].n;
  const ovrsOf = (g) => P.clubOvrs(g.db);
  const lvlOf = (g, cid) => { const c = P.club(g, cid); return c ? P.divLvl(c.div) : 9; };

  // ---------- Calendário ----------
  P.normalCupSteps = function (g, rounds) {
    const at = {};
    const put = (lr, st) => { const k = Math.min(rounds, Math.max(1, Math.round(lr * rounds / 38))); (at[k] = at[k] || []).push(st); };
    NC_AFTER.forEach((lr, r) => put(lr, { t: 'nc', r }));
    CC_AFTER.forEach((lr, r) => put(lr, { t: 'cc', r }));
    initCups(g);
    return at;
  };

  function initCups(g) {
    g.nc = {};
    for (const c of P.worldCountries()) {
      const ids = g.db.clubs.filter((x) => x.country === c && P.divCountry(x.div) === c).map((x) => x.id);
      const P2 = Math.pow(2, Math.floor(Math.log2(ids.length)));
      const n = Math.log2(P2) + (ids.length > P2 ? 1 : 0);
      g.nc[c] = { n, start: NC_N - n, rounds: [], byes: [], w: null };
    }
    g.cc = {};
    const q = g.ccq || {};
    const ovrs = ovrsOf(g);
    for (const [z, def] of Object.entries(P.CC)) {
      let ids = [];
      for (const [c, k] of Object.entries(def.slots)) {
        const prev = (q[c] || []).filter((cid) => P.club(g, cid));
        const top = P.countryDivs(c)[0];
        const pool = prev.length ? prev : P.divClubs(g.db, top).sort((a, b) => b.rep - a.rep).map((x) => x.id);
        ids = ids.concat(pool.slice(0, k));
      }
      ids = ids.slice(0, 32);
      // potes por força; grupos evitam dois clubes do mesmo país quando dá
      const sorted = ids.slice().sort((a, b) => (ovrs[b] || 0) - (ovrs[a] || 0));
      const groups = Array.from({ length: 8 }, () => []);
      for (let pot = 0; pot < 4; pot++) {
        const pp = P.shuffle(Math.random, sorted.slice(pot * 8, pot * 8 + 8));
        for (const cid of pp) {
          const ctry = P.club(g, cid).country;
          const free = groups.map((gr, i) => i).filter((i) => groups[i].length === pot);
          const ok = free.filter((i) => !groups[i].some((x) => P.club(g, x).country === ctry));
          groups[(ok.length ? ok : free)[0]].push(cid);
        }
      }
      g.cc[z] = { ids, groups, gfx: groups.map((gr) => P.makeFixtures(gr, Math.random)), ko: [], w: null };
    }
  }

  // ---------- Sorteios ----------
  function ncDraw(g, c, k) {
    const cup = g.nc[c];
    if (cup.rounds[k]) return;
    const r = Math.random, ovrs = ovrsOf(g);
    let pool;
    if (k === 0) {
      const ids = g.db.clubs.filter((x) => P.divCountry(x.div) === c).map((x) => x.id)
        .sort((a, b) => lvlOf(g, a) - lvlOf(g, b) || (ovrs[b] || 0) - (ovrs[a] || 0));
      const P2 = Math.pow(2, Math.floor(Math.log2(ids.length)));
      if (ids.length > P2) { const nb = 2 * P2 - ids.length; cup.byes = ids.slice(0, nb); pool = ids.slice(nb); }
      else pool = ids;
    } else {
      pool = cup.rounds[k - 1].ties.map(koW);
      if (k === 1 && cup.byes.length) pool = pool.concat(cup.byes);
    }
    P.shuffle(r, pool);
    const ties = [];
    for (let i = 0; i + 1 < pool.length; i += 2) {
      let h = pool[i], a = pool[i + 1];
      if (lvlOf(g, a) > lvlOf(g, h) || (lvlOf(g, a) === lvlOf(g, h) && r() < 0.5)) [h, a] = [a, h];
      const m = { h, a, done: false };
      if (k === cup.n - 1) m.neutral = true;
      ties.push(m);
    }
    cup.rounds[k] = { ties };
  }
  P.ccTable = function (g, z, gi) {
    const cc = g.cc[z], rows = {};
    cc.groups[gi].forEach((cid) => { rows[cid] = { cid, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, form: [] }; });
    cc.gfx[gi].forEach((rd) => rd.forEach((m) => {
      if (!m.done) return;
      const H = rows[m.h], A = rows[m.a];
      H.j++; A.j++; H.gp += m.hg; H.gc += m.ag; A.gp += m.ag; A.gc += m.hg;
      if (m.hg > m.ag) { H.v++; A.d++; H.pts += 3; } else if (m.hg < m.ag) { A.v++; H.d++; A.pts += 3; } else { H.e++; A.e++; H.pts++; A.pts++; }
    }));
    return Object.values(rows).sort((a, b) => b.pts - a.pts || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || b.v - a.v);
  };
  function ccDraw(g, z, k) { // k: 0 oitavas, 1 quartas, 2 semi, 3 final
    const cc = g.cc[z];
    if (cc.ko[k]) return;
    let ties = [];
    if (k === 0) {
      const t = cc.groups.map((_, gi) => P.ccTable(g, z, gi).map((x) => x.cid));
      for (let i = 0; i < 8; i += 2) { ties.push({ h: t[i][0], a: t[i + 1][1], done: false }); ties.push({ h: t[i + 1][0], a: t[i][1], done: false }); }
    } else {
      const pool = P.shuffle(Math.random, cc.ko[k - 1].ties.map(koW));
      for (let i = 0; i + 1 < pool.length; i += 2) ties.push({ h: pool[i], a: pool[i + 1], done: false, neutral: k === 3 });
    }
    cc.ko[k] = { ties };
  }

  // ---------- Partidas da semana ----------
  const origMatches = P.stepMatches;
  P.stepMatches = function (g, step) {
    step = step || g.cal[g.week];
    if (!step || (step.t !== 'nc' && step.t !== 'cc')) return origMatches.apply(this, arguments);
    const out = [];
    if (step.t === 'nc') {
      for (const c of Object.keys(g.nc || {})) {
        const cup = g.nc[c], k = step.r - cup.start;
        if (k < 0 || k >= cup.n) continue;
        ncDraw(g, c, k);
        cup.rounds[k].ties.forEach((m) => out.push({ m, comp: 'nc', ko: true, ctry: c }));
      }
    } else {
      for (const z of Object.keys(g.cc || {})) {
        const cc = g.cc[z];
        if (step.r < 6) cc.gfx.forEach((rds) => (rds[step.r] || []).forEach((m) => out.push({ m, comp: 'cc', z })));
        else { ccDraw(g, z, step.r - 6); cc.ko[step.r - 6].ties.forEach((m) => out.push({ m, comp: 'cc', z, ko: true })); }
      }
    }
    return out;
  };
  const origLabel = P.stepLabel;
  P.stepLabel = function (step) {
    if (step && step.t === 'nc') {
      const g = P.app.g, me = g && P.club(g, g.user), c = me && P.divCountry(me.div);
      const cup = c && g.nc && g.nc[c];
      const k = cup ? step.r - cup.start : step.r;
      const names = ['Final', 'Semifinal', 'Quartas de final', 'Oitavas de final', '3ª fase', '2ª fase', '1ª fase'];
      const left = cup ? cup.n - 1 - k : NC_N - 1 - step.r;
      return `${c ? ncName(c) : 'Copa nacional'} · ${k < 0 ? 'sem jogo do país' : names[left] || 'Fase preliminar'}`;
    }
    if (step && step.t === 'cc') {
      const g = P.app.g, z = g && P.ccOf(g, g.user);
      return `${z ? P.CC[z].short : 'Copas continentais'} · ${CC_NAMES[step.r]}`;
    }
    return origLabel.apply(this, arguments);
  };
  // Em qual copa continental o clube está nesta temporada (ou null)
  P.ccOf = (g, cid) => { for (const z of Object.keys(g.cc || {})) if (g.cc[z].ids.includes(cid)) return z; return null; };

  // ---------- Premiação e campeões (chamado pelo motor no fim de cada semana) ----------
  const tvTop = (c) => P.ECON.tv[P.topDivOf(c) - 1];
  P.normalWeekPrizes = function (g, step, items) {
    if (!P.isNormal(g)) return;
    if (step.t === 'nc') {
      for (const it of items) {
        if (it.comp !== 'nc' || !it.m.w) continue;
        const cup = g.nc[it.ctry], k = step.r - cup.start, left = cup.n - 1 - k;
        P.pay(g, it.m.w, Math.round(tvTop(it.ctry) * [0.3, 0.15, 0.08, 0.05, 0.03, 0.02, 0.015][left] / 1e4) * 1e4, 'Premiação');
        if (left === 0) {
          cup.w = it.m.w;
          const wc = P.club(g, it.m.w);
          if (P.followed(g, wc.div)) P.news(g, `${wc.name} é o campeão da ${ncName(it.ctry)}!`, it.m.w === g.user ? 'good' : '');
          if (it.ctry === P.divCountry(P.club(g, g.user).div)) g.cup.winner = it.m.w; // aparece no histórico da carreira
        }
      }
    }
    if (step.t === 'cc') {
      for (const it of items) {
        if (it.comp !== 'cc') continue;
        const def = P.CC[it.z], m = it.m;
        if (step.r === 0) [m.h, m.a].forEach((cid) => P.pay(g, cid, Math.round(3e6 * def.m / 1e4) * 1e4, 'Premiação')); // participação
        if (!it.ko) {
          if (m.hg !== m.ag) P.pay(g, m.hg > m.ag ? m.h : m.a, Math.round(1.2e6 * def.m / 1e4) * 1e4, 'Premiação');
          else { P.pay(g, m.h, Math.round(4e5 * def.m / 1e4) * 1e4, 'Premiação'); P.pay(g, m.a, Math.round(4e5 * def.m / 1e4) * 1e4, 'Premiação'); }
        } else {
          const k = step.r - 6;
          P.pay(g, m.w, Math.round([4e6, 6e6, 9e6, 18e6][k] * def.m / 1e4) * 1e4, 'Premiação');
          if (k === 3) {
            g.cc[it.z].w = m.w;
            const wc = P.club(g, m.w);
            P.news(g, `${wc.name} conquista a ${def.n}!`, m.w === g.user ? 'good' : '');
            if (P.flash) P.flash(g, { pri: m.w === g.user ? 5 : 2, ttl: 2, kicker: def.n, head: `${wc.name} é campeão ${it.z === 'eu' ? 'da Europa' : 'das Américas'}`, dek: `Final em campo neutro: ${P.club(g, m.h).name} ${m.hg} x ${m.ag} ${P.club(g, m.a).name}${m.pen ? ` (pênaltis ${m.pen[0]} a ${m.pen[1]})` : ''}.` });
          }
        }
      }
    }
  };

  // Classificados para as copas continentais do ano seguinte (pela posição na 1ª divisão)
  const origEnd = P.endSeason;
  P.endSeason = function (g) {
    const r = origEnd.apply(this, arguments);
    if (P.isNormal(g)) {
      g.ccq = {};
      for (const c of P.worldCountries()) g.ccq[c] = P.table(g, P.topDivOf(c)).map((x) => x.cid).slice(0, 8);
      // títulos para a tela de campeões e para a Bola de Ouro
      g.summary.nc = Object.fromEntries(Object.entries(g.nc || {}).map(([c, x]) => [c, x.w]));
      g.summary.cc = Object.fromEntries(Object.entries(g.cc || {}).map(([z, x]) => [z, x.w]));
    }
    return r;
  };
  // títulos de copas para a Bola de Ouro
  P.normalTitles = function (g, add, byTier) {
    if (!P.isNormal(g)) return;
    for (const [c, w] of Object.entries(g.nc || {})) if (w.w) add(w.w, ncName(c), byTier([22, 12, 9, 7, 6, 5, 4, 3], P.topDivOf(c)));
    for (const [z, x] of Object.entries(g.cc || {})) if (x.w) add(x.w, P.CC[z].n, z === 'eu' ? 40 : 26);
  };
})(window.PFC);
