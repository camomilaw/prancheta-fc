/* Prancheta FC — Carreira normal v2: formatos reais (temporada completa)
 * Mundo: P.WORLD2 (18 países) + clubes convidados das copas continentais (países fora do jogo).
 * Calendário: semanas de liga ('lg', todas as divisões juntas) e semanas de mata-mata/copa ('ko').
 *   g.lg[d]  = rodadas da divisão d (vazias onde a divisão não joga)
 *   g.dv[d]  = estado da temporada da divisão (grupos, fases, rodadas reservadas)
 *   g.ko[id] = competições de mata-mata, grupos ou fase de liga (playoffs, copas nacionais e continentais)
 *   step 'ko' = { t: 'ko', ev: [[id, fase, jogo]] }
 * Carreiras normais antigas (world.v 1) continuam no mundo.js/copas.js.
 */
(function (P) {
  const A = P.app;
  const R_LG = 46;          // semanas de liga (a maior divisão, com 24 clubes, tem 46 rodadas)
  const SPREAD = 12, DROP = 9;
  const r10k = (v) => Math.round(v / 1e4) * 1e4;
  P.isV2 = (x) => { const db = x ? (x.db || x) : null; return db ? !!(db.world && db.world.v === 2) : !!(P._W && P._W.v === 2); };
  const v2 = (g) => P.isV2(g);
  const club = (g, cid) => P.club(g, cid);
  const lvSpec = (d) => { const i = P.divInfo(d); if (!i || i.guest) return null; const W = P.WORLD2.find((w) => w.c === i.c); return W ? W.lv[i.lvl - 1] : null; };
  P.lvSpec = lvSpec;
  const defOf = (c) => P.WORLD2.find((w) => w.c === c);

  // ---------- Mundo ----------
  const origWC = P.worldCountries;
  P.worldCountries = () => (P._W && P._W.v === 2 ? P.WORLD2.map((w) => w.c).filter((c) => P._W.divs.some((o) => o.c === c && !o.guest)) : origWC());
  P.isGuestDiv = (d) => { const i = P.divInfo(d); return !!(i && i.guest); };

  P.generateWorld2 = function (seed) {
    const r = P.rng(seed || 2027);
    const towns = {}, shorts = {}, used = new Set();
    const entries = [];
    for (const W of P.WORLD2) W.lv.forEach((L, i) => {
      const top = W.rep - i * DROP, spread = SPREAD + Math.max(0, L.size - 24) / 8;
      entries.push({ c: W.c, z: W.z, lvl: i + 1, size: L.size, top, spread, avg: top - spread / 2 });
    });
    entries.sort((a, b) => b.avg - a.avg || a.lvl - b.lvl);
    const topAvg = entries[0].avg;
    // convidados: quantos de cada país (o máximo que alguma copa pede, mais um de reserva)
    const need = {}, zOf = {};
    for (const C of Object.values(P.CONT)) for (const [c, k] of Object.entries(C.guests || {})) { need[c] = (need[c] || 0) + k; zOf[c] = C.conf; }
    const gEntries = Object.keys(need).map((c) => { const top = P.GUEST_REP[c] || 65; return { c, z: zOf[c], lvl: 1, size: Math.min(10, need[c] + 1), top, spread: 8, avg: top - 4, guest: true }; });
    const db = { version: P.VERSION, clubs: [], players: {}, world: { v: 2, divs: [] } };
    let pc = 1, cc = 1;
    const TPL = P.SQUAD_TEMPLATE;
    P.SQUAD_TEMPLATE = { GOL: 3, LD: 2, ZAG: 4, LE: 2, VOL: 2, MC: 2, MEI: 2, PD: 2, PE: 2, ATA: 3 }; // 24 por clube: o mundo é grande
    try {
      entries.concat(gEntries).forEach((e, i) => {
        const d = i + 1;
        db.world.divs.push(Object.assign({ d, c: e.c, z: e.z, lvl: e.lvl, size: e.size, tier: Math.round(P.clamp(1 + (topAvg - e.avg) / 6.29, 1, 9) * 100) / 100 }, e.guest ? { guest: true } : {}));
        for (let k = 0; k < e.size; k++) {
          const meta = P.clubMeta(r, e.c, towns[e.c] = towns[e.c] || new Set(), shorts[e.c] = shorts[e.c] || new Set());
          const rep = Math.round((e.top - e.spread * k / Math.max(1, e.size - 1) + P.gauss(r) * 1.2) * 10) / 10;
          const cl = Object.assign({ id: 'c' + (cc++), country: e.c }, meta, { rep, div: d }, e.guest ? { guest: true } : {});
          db.clubs.push(cl);
          P.makeSquad(r, db, cl, used, () => 'p' + (pc++));
        }
      });
    } finally { P.SQUAD_TEMPLATE = TPL; }
    P.setWorld(db);
    return db;
  };

  // ---------- Utilidades de calendário ----------
  // rodadas em turno único (método do círculo) com mando alternado
  function single(ids, r) {
    const t = P.shuffle(r, ids.slice());
    if (t.length % 2) t.push(null);
    const n = t.length, out = [];
    for (let k = 0; k < n - 1; k++) {
      const rd = [];
      for (let i = 0; i < n / 2; i++) {
        const a = t[i], b = t[n - 1 - i];
        if (a == null || b == null) continue;
        rd.push((k + i) % 2 ? { h: a, a: b, done: false } : { h: b, a: a, done: false });
      }
      out.push(rd);
      t.splice(1, 0, t.pop());
    }
    return out;
  }
  const double = (ids, r) => P.makeFixtures(ids, r);
  const mirror = (rounds) => rounds.map((rd) => rd.map((m) => ({ h: m.a, a: m.h, done: false })));
  const merge = (lists) => { const n = Math.max(0, ...lists.map((l) => l.length)); return Array.from({ length: n }, (_, i) => [].concat(...lists.map((l) => l[i] || []))); };
  // divide em grupos equilibrados (cobra: 1º no A, 2º no B...)
  function snake(ids, G, ovrs) {
    const s = ids.slice().sort((a, b) => (ovrs[b] || 0) - (ovrs[a] || 0)), out = Array.from({ length: G }, () => []);
    s.forEach((id, i) => { const k = Math.floor(i / G), j = i % G; out[k % 2 ? G - 1 - j : j].push(id); });
    return out;
  }
  const byRep = (g, ids) => ids.slice().sort((a, b) => (club(g, b).rep || 0) - (club(g, a).rep || 0));

  // ---------- Tabelas ----------
  // tabela de um conjunto de clubes com os jogos da divisão (opcional: só semanas from..to)
  P.tbl = function (g, d, ids, from, to) {
    const rows = {};
    (ids || P.divClubs(g.db, d).map((c) => c.id)).forEach((cid) => { rows[cid] = { cid, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, form: [] }; });
    (g.lg[d] || []).forEach((rd, si) => {
      if ((from != null && si < from) || (to != null && si > to)) return;
      rd.forEach((m) => {
        if (!m.done || !rows[m.h] || !rows[m.a]) return;
        const H = rows[m.h], Aw = rows[m.a];
        H.j++; Aw.j++; H.gp += m.hg; H.gc += m.ag; Aw.gp += m.ag; Aw.gc += m.hg;
        if (m.hg > m.ag) { H.v++; Aw.d++; H.pts += 3; H.form.push('V'); Aw.form.push('D'); }
        else if (m.hg < m.ag) { Aw.v++; H.d++; Aw.pts += 3; H.form.push('D'); Aw.form.push('V'); }
        else { H.e++; Aw.e++; H.pts++; Aw.pts++; H.form.push('E'); Aw.form.push('E'); }
      });
    });
    const name = (cid) => (club(g, cid) || { name: '' }).name;
    return Object.values(rows).sort((a, b) => b.pts - a.pts || b.v - a.v || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || name(a.cid).localeCompare(name(b.cid)));
  };
  const ranks = (t) => t.map((x) => x.cid);
  const blockSteps = (g, d, k) => (g.dv[d] && g.dv[d].bl[k]) || null;
  const blockDone = (g, d, k) => { const b = blockSteps(g, d, k); return !!b && b.filled !== false && b.steps.every((s) => (g.lg[d][s] || []).every((m) => m.done)); };
  const blockTbl = (g, d, k, ids) => { const b = blockSteps(g, d, k); return P.tbl(g, d, ids, b.steps[0], b.steps[b.steps.length - 1]); };

  // Classificação final de uma divisão (ou de um grupo dela) para acesso, rebaixamento e vagas
  P.rank2 = function (g, d) {
    const dv = g.dv[d], L = lvSpec(d);
    if (!dv || !L) return ranks(P.tbl(g, d));
    if (dv.t === 'split' && dv.split) return dv.split.A.concat(dv.split.B).length === P.divClubs(g.db, d).length
      ? ranks(P.tbl(g, d, dv.split.A)).concat(ranks(P.tbl(g, d, dv.split.B))) : ranks(P.tbl(g, d));
    if (dv.t === 'grp2' && dv.promo) { const top = ranks(blockTbl(g, d, 'p2', dv.promo)); return top.concat(ranks(P.tbl(g, d)).filter((x) => !top.includes(x))); }
    if (dv.t === 'serieC' && dv.quad) {
      const q = dv.quad.map((ids) => ranks(blockTbl(g, d, 'p2', ids)));
      const firsts = ranks(P.tbl(g, d, [q[0][0], q[1][0]])), seconds = [q[0][1], q[1][1]];
      const rest = ranks(blockTbl(g, d, 'p1')).filter((x) => !q[0].includes(x) && !q[1].includes(x));
      const lower = q[0].slice(2).concat(q[1].slice(2));
      return firsts.concat(seconds, lower, rest);
    }
    return ranks(P.tbl(g, d));
  };
  // tabela da semana atual para a tela (grupos, conferências, Apertura/Clausura...)
  P.divViews = function (g, d) {
    const dv = g.dv && g.dv[d]; if (!dv) return null;
    const out = [];
    if (dv.groups && dv.groups.length > 1) dv.groups.forEach((ids, i) => out.push({ k: 'g' + i, n: dv.gname ? dv.gname[i] : `Grupo ${'ABCDEFGHIJKLMNOP'[i]}`, rows: () => P.tbl(g, d, ids, dv.bl.p1 ? dv.bl.p1.steps[0] : null, dv.bl.p1 ? dv.bl.p1.steps[dv.bl.p1.steps.length - 1] : null) }));
    if (dv.t === 'ac') {
      const zs = dv.groups && dv.groups.length > 1 ? dv.groups : [null];
      for (const [k, n] of [['ap', 'Apertura'], ['cl', 'Clausura']]) zs.forEach((ids, zi) => out.push({ k: k + zi, n: n + (zs.length > 1 ? ` · Zona ${'AB'[zi]}` : ''), rows: () => blockTbl(g, d, k, ids || undefined) }));
      out.push({ k: 'an', n: 'Tabela anual', rows: () => P.tbl(g, d) });
    }
    if (dv.t === 'uru') {
      out.push({ k: 'ap', n: 'Apertura', rows: () => blockTbl(g, d, 'ap') });
      if (dv.inter) dv.inter.forEach((ids, i) => out.push({ k: 'in' + i, n: `Intermedio · Série ${'AB'[i]}`, rows: () => blockTbl(g, d, 'in', ids) }));
      out.push({ k: 'cl', n: 'Clausura', rows: () => blockTbl(g, d, 'cl') }, { k: 'an', n: 'Tabela anual', rows: () => P.tbl(g, d) });
    }
    if (dv.t === 'split' && dv.split) out.push({ k: 'A', n: 'Final A', rows: () => P.tbl(g, d, dv.split.A) }, { k: 'B', n: 'Final B', rows: () => P.tbl(g, d, dv.split.B) });
    if (dv.t === 'serieC' && dv.quad) dv.quad.forEach((ids, i) => out.push({ k: 'q' + i, n: `Quadrangular ${'AB'[i]}`, rows: () => blockTbl(g, d, 'p2', ids) }));
    if (dv.t === 'grp2' && dv.promo) out.push({ k: 'pr', n: 'Fase de subida', rows: () => blockTbl(g, d, 'p2', dv.promo) });
    if (dv.t === 'conf' || dv.t === 'nac') { /* grupos já entraram acima */ }
    if (out.length) out.push(...(dv.t === 'ac' || dv.t === 'uru' ? [] : [{ k: 'all', n: 'Geral', rows: () => P.tbl(g, d) }]));
    return out.length ? out : null;
  };

  // ---------- Montar a temporada ----------
  const origBuild = P.buildSeason;
  P.buildSeason = function (g) {
    if (!v2(g)) return origBuild.apply(this, arguments);
    const r = P.rng((Date.now() + g.season) & 0xffffffff), ovrs = P.clubOvrs(g.db);
    g.lg = {}; g.dv = {}; g.ko = {};
    const keys = {}; // semanas de mata-mata: chave → { f: posição na temporada, ev: [] }
    const put = (key, f, ev) => { (keys[key] = keys[key] || { f, ev: [] }).ev.push(ev); };
    for (let d = 1; d <= P.DIVS; d++) {
      g.lg[d] = Array.from({ length: R_LG }, () => []);
      const L = lvSpec(d); if (!L) continue;
      const ids = P.divClubs(g.db, d).map((c) => c.id);
      const dv = g.dv[d] = { t: L.t || 'rr', bl: {} };
      const place = (k, rounds, from, to, n) => { // rodadas espalhadas pelo trecho [from, to) da temporada
        const a = Math.round(from * R_LG), b = Math.max(a + 1, Math.round(to * R_LG)), cnt = rounds ? rounds.length : n;
        const steps = Array.from({ length: cnt }, (_, i) => Math.min(b - 1, a + Math.floor(i * (b - a) / cnt)));
        dv.bl[k] = { steps, filled: !!rounds };
        if (rounds) rounds.forEach((rd, i) => { g.lg[d][steps[i]] = rd; });
      };
      const t = dv.t;
      if (t === 'rr') {
        let rounds = double(ids, r);
        if (L.rounds === 3) rounds = rounds.concat(single(ids, r));
        place('p1', rounds, 0, 1);
      } else if (t === 'grp' || t === 'conf' || t === 'nac') {
        const G = L.groups || 2;
        dv.groups = snake(ids, G, ovrs);
        if (t === 'conf') dv.gname = ['Conferência Leste', 'Conferência Oeste'];
        if (t === 'nac') dv.gname = ['Zona A', 'Zona B'];
        place('p1', merge(dv.groups.map((gr) => double(gr, r))), 0, 1);
      } else if (t === 'split') {
        place('p1', double(ids, r).concat(single(ids, r)), 0, 0.86);
        place('p2', null, 0.87, 1, Math.ceil(ids.length / 2) - 1);
      } else if (t === 'serieC') {
        place('p1', single(ids, r), 0, 0.68);
        place('p2', null, 0.72, 1, 6);
      } else if (t === 'grp2') {
        dv.groups = snake(ids, 2, ovrs); dv.gname = ['Série A', 'Série B'];
        place('p1', merge(dv.groups.map((gr) => double(gr, r))), 0, 0.56);
        place('p2', null, 0.6, 1, 14);
      } else if (t === 'serieD') {
        dv.groups = snake(ids, 16, ovrs);
        place('p1', merge(dv.groups.map((gr) => double(gr, r))), 0, 0.42);
      } else if (t === 'ac') {
        const zones = L.zones || 1;
        let ap;
        if (zones === 2) {
          dv.groups = snake(ids, 2, ovrs); dv.gname = ['Zona A', 'Zona B'];
          const inter = dv.groups[0].map((a, i) => ({ h: a, a: dv.groups[1][i], done: false })).filter((m) => m.a);
          ap = merge(dv.groups.map((gr) => single(gr, r))).concat([inter]);
        } else ap = single(ids, r);
        place('ap', ap, 0, 0.47);
        place('cl', mirror(ap), 0.53, 1);
      } else if (t === 'uru') {
        place('ap', single(ids, r), 0, 0.4);
        place('in', null, 0.41, 0.58, 7);
        place('cl', single(ids, r), 0.6, 1);
      }
      // mata-matas da divisão (no meio e no fim da temporada)
      const W = P.divInfo(d);
      const ko = (id, o) => { g.ko[id] = Object.assign({ id, rounds: [], w: null, c: W.c, d }, o); return g.ko[id]; };
      const sched = (K, keyBase, f0, df) => { let s = 0; K.legs.forEach((n, ri) => { for (let l = 0; l < n; l++) { put(keyBase + (s), f0 + s * df, [K.id, ri, l]); s++; } }); };
      if (L.po) { const K = ko('po' + d, { kind: 'po', n: `Playoff de acesso · ${P.divName(d)}`, legs: L.po.legs.slice(), adv: L.po.adv || 'pens', spec: L.po, win: L.po.win || 0 }); sched(K, 'E', 1.001, 0.001); }
      if (t === 'ac') {
        const lg = L.lig;
        sched(ko('la' + d, { kind: 'lig', n: `Liguilla do Apertura · ${P.divName(d)}`, legs: lg.legs.slice(), adv: lg.adv || 'pens', tour: 'ap', top: lg.top }), 'M', 0.48, 0.001);
        sched(ko('lc' + d, { kind: 'lig', n: `Liguilla do Clausura · ${P.divName(d)}`, legs: lg.legs.slice(), adv: lg.adv || 'pens', tour: 'cl', top: lg.top }), 'E', 1.001, 0.001);
      }
      if (t === 'conf') sched(ko('pf' + d, { kind: 'lig', n: L.mls ? `Playoffs da MLS` : `Playoffs · ${P.divName(d)}`, legs: L.mls ? [1, 2, 1, 1, 1] : [1, 1, 1, 1], adv: 'pens', conf: true, mls: !!L.mls }), 'E', 1.001, 0.001);
      if (t === 'uru') {
        sched(ko('ui' + d, { kind: 'lig', n: 'Final do Intermedio', legs: [1], adv: 'pens', uruI: true }), 'U', 0.59, 0.001);
        sched(ko('uf' + d, { kind: 'lig', n: 'Decisão do título uruguaio', legs: [1, 2], adv: 'pens', uruF: true }), 'E', 1.001, 0.001);
      }
      if (t === 'nac') {
        sched(ko('nf' + d, { kind: 'lig', n: `Final da ${P.divName(d)}`, legs: [1], adv: 'pens', nacF: true }), 'E', 1.001, 0.001);
        sched(ko('nr' + d, { kind: 'po', n: `Reducido · ${P.divName(d)}`, legs: [1, 2, 2, 1], adv: 'pens', nacR: true }), 'E', 1.001, 0.001);
      }
      if (t === 'serieC') sched(ko('sc' + d, { kind: 'lig', n: `Final da ${P.divName(d)}`, legs: [2], adv: 'pens', serieC: true }), 'E', 1.001, 0.001);
      if (t === 'serieD') sched(ko('sd' + d, { kind: 'po', n: `Mata-mata da ${P.divName(d)}`, legs: [2, 2, 2, 2, 2, 2], adv: 'pens', serieD: true }), 'D', 0.44, 0.03);
      if (L.playout) sched(ko('pl' + d, { kind: 'po', n: `Playout · ${P.divName(d)}`, legs: [L.playout.legs], adv: 'pens', playout: true, spec: L.playout }), 'E', 1.001, 0.001);
      (L.rel || []).forEach((x, i) => { const K = ko('rl' + d + '_' + i, { kind: 'rel', n: `Repescagem · ${P.divName(d)} × ${P.divName(P.divBelow(d))}`, legs: [2], adv: 'pens', rel: x }); put('R' + 0, 1.1, [K.id, 0, 0]); put('R' + 1, 1.101, [K.id, 0, 1]); });
    }
    // copas nacionais e continentais
    if (P.nationalCups2) P.nationalCups2(g, put);
    if (P.continental2) P.continental2(g, put);
    // calendário: semanas de liga + semanas de mata-mata em ordem de posição na temporada
    const weeks = [];
    for (let s = 0; s < R_LG; s++) weeks.push({ f: (s + 0.5) / R_LG, st: { t: 'lg', r: s } });
    for (const [key, k] of Object.entries(keys)) weeks.push({ f: k.f, st: { t: 'ko', key, ev: k.ev } });
    weeks.sort((a, b) => a.f - b.f);
    g.cal = weeks.map((w) => w.st);
    g.cup = { rounds: [], byes: [], winner: null }; g.po = null;
    g.week = 0; g.over = false; g.summary = null;
  };
})(window.PFC);

// ---------- Mata-mata genérico (playoffs, copas nacionais e continentais) ----------
(function (P) {
  const club = (g, cid) => P.club(g, cid);
  const v2 = (g) => P.isV2(g);
  const lvSpec = (d) => P.lvSpec(d);
  const ranksOf = (t) => t.map((x) => x.cid);
  const ovr = (g, cid) => { const o = g._ovrW && g._ovrW.w === g.week ? g._ovrW.o : null; if (o) return o[cid] || 60; Object.defineProperty(g, '_ovrW', { value: { w: g.week, o: P.clubOvrs(g.db) }, writable: true, configurable: true, enumerable: false }); return g._ovrW.o[cid] || 60; };
  const lvlOf = (g, cid) => { const c = club(g, cid); return c ? P.divLvl(c.div) : 9; };

  // nome da fase pelo número de clubes
  P.koRoundName = function (K, ri) {
    const rd = K.rounds[ri];
    const n = rd ? rd.ties.length * 2 : 0;
    if (ri === K.legs.length - 1 && !K.win) return 'Final';
    if (K.conf || K.tags) { const left = K.legs.length - 1 - ri; return ['Final', 'Final de conferência', 'Semifinal de conferência', 'Quartas', 'Oitavas', '1ª fase'][left] || `${ri + 1}ª fase`; }
    return n === 2 ? 'Final' : n === 4 ? 'Semifinal' : n === 8 ? 'Quartas de final' : n === 16 ? 'Oitavas de final' : n === 32 ? '16 avos de final' : `${ri + 1}ª fase`;
  };

  // participantes (em ordem de força/colocação) — calculado quando a primeira fase é sorteada
  function seedsOf(g, K) {
    const d = K.d;
    if (K.seeds) return K.seeds;
    let S = null;
    const dv = d && g.dv[d], L = d && lvSpec(d);
    if (K.kind === 'po' && K.spec && !K.nacR && !K.serieD && !K.playout) {
      const [a, b] = K.spec.r;
      if (dv && dv.groups && dv.t === 'grp') {
        const tabs = dv.groups.map((ids) => P.tbl(g, d, ids));
        const pool = [];
        tabs.forEach((t) => t.slice(a - 1, b).forEach((row, i) => pool.push({ cid: row.cid, pos: a + i, pts: row.pts })));
        if (K.spec.best4) tabs.map((t) => t[b]).filter(Boolean).sort((x, y) => y.pts - x.pts || (y.gp - y.gc) - (x.gp - x.gc)).slice(0, K.spec.best4).forEach((row) => pool.push({ cid: row.cid, pos: b + 1, pts: row.pts }));
        S = pool.sort((x, y) => x.pos - y.pos || y.pts - x.pts).map((x) => x.cid);
      } else S = P.rank2(g, d).slice(a - 1, b);
      if (K.spec.upper && P.divAbove(d)) { const up = P.rank2(g, P.divAbove(d))[K.spec.upper - 1]; if (up) S = [up].concat(S); }
    }
    if (K.playout) S = P.rank2(g, d).slice(K.spec.r[0] - 1, K.spec.r[1]);
    if (K.tour) { // liguilla do Apertura/Clausura
      const b = dv.bl[K.tour];
      const tb = (ids) => P.tbl(g, d, ids, b.steps[0], b.steps[b.steps.length - 1]).map((x) => x.cid).slice(0, K.top);
      if (dv.groups && dv.groups.length > 1) { const zs = dv.groups.map(tb); S = []; for (let i = 0; i < K.top; i++) zs.forEach((z) => { if (z[i]) S.push(z[i]); }); }
      else S = tb();
    }
    if (K.conf) { // playoffs por conferência
      const top = K.mls ? 9 : 8;
      K.tags = {};
      S = [];
      dv.groups.forEach((ids, gi) => P.tbl(g, d, ids).slice(0, top).forEach((row) => { S.push(row.cid); K.tags[row.cid] = gi; }));
    }
    if (K.uruI) { const b = dv.bl.in; S = dv.inter ? dv.inter.map((ids) => P.tbl(g, d, ids, b.steps[0], b.steps[b.steps.length - 1])[0].cid) : []; }
    if (K.nacF) S = dv.groups.map((ids) => P.tbl(g, d, ids)[0].cid);
    if (K.nacR) {
      const tabs = dv.groups.map((ids) => P.tbl(g, d, ids).map((x) => x.cid));
      S = [];
      for (let p = 1; p <= 7; p++) tabs.forEach((t) => { if (t[p]) S.push(t[p]); }); // 2º a 8º de cada zona
    }
    if (K.serieC) S = dv.quad ? P.rank2(g, d).slice(0, 2) : [];
    if (K.serieD) {
      const pool = [];
      dv.groups.forEach((ids) => P.tbl(g, d, ids).slice(0, 4).forEach((row, i) => pool.push({ cid: row.cid, pos: i, pts: row.pts })));
      S = pool.sort((x, y) => x.pos - y.pos || y.pts - x.pts).map((x) => x.cid);
    }
    if (K.rel) {
      const up = P.rank2(g, d)[K.rel.pos - 1], below = P.divBelow(d);
      let low = null;
      if (K.rel.vs === 'po') { const pk = g.ko['po' + below]; low = pk && pk.w ? [].concat(pk.w)[0] : null; }
      else low = P.rank2(g, below)[K.rel.vs - 1];
      S = up && low ? [up, low] : [];
    }
    if (K.fixedSeeds) S = K.fixedSeeds.slice();
    if (S) K.seeds = S;
    return K.seeds || null;
  }

  // cria a fase ri do mata-mata (devolve false se ainda não dá: fase anterior em andamento)
  P.koDraw = function (g, K, ri) {
    if (K.rounds[ri]) return true;
    if (ri > 0 && (!K.rounds[ri - 1] || K.rounds[ri - 1].ties.some((t) => !t.w))) return false;
    if (K.lp && ri === 0 && !P.lpDone(g, K)) return false;
    if (K.uruF) return uruFinal(g, K, ri);
    let pool;
    if (ri === 0) {
      const S = K.lp ? P.lpSeeds(g, K) : seedsOf(g, K);
      if (!S) return false;
      K.order = S.slice();
      pool = S.slice();
    } else {
      pool = K.rounds[ri - 1].ties.map((t) => t.w).concat(ri === 1 ? (K.byes || []) : []);
      if (K.nacR && ri === 1) { const nf = g.ko['nf' + K.d]; const ft = nf && nf.rounds[0] && nf.rounds[0].ties[0]; if (ft && ft.w) { const loser = ft.w === ft.a1 ? ft.a2 : ft.a1; pool.unshift(loser); K.order.unshift(loser); } }
    }
    const legs = K.legs[ri], last = ri === K.legs.length - 1 && !K.win;
    const seedIdx = (cid) => { const i = K.order.indexOf(cid); return i < 0 ? 999 : i; };
    const ties = [];
    const mk = (x, y) => { // x = mais bem colocado
      const t = { a1: x, a2: y, w: null };
      if (legs === 1) {
        let h = x, a = y;
        if (K.random) { if (lvlOf(g, y) > lvlOf(g, x) || (lvlOf(g, y) === lvlOf(g, x) && Math.random() < 0.5)) { h = y; a = x; } }
        t.m = [{ h, a, done: false }];
        if ((last && (K.neutralFinal !== false && (K.spec ? K.spec.neutral : true))) || K.neutralAll) t.m[0].neutral = true;
      } else t.m = [{ h: y, a: x, done: false }, { h: x, a: y, done: false }];
      ties.push(t);
    };
    if (ri === 0 && !K.random) {
      const groups = K.tags ? groupBy(pool, K.tags) : [pool];
      K.byes = [];
      for (const gp of groups) {
        const n = gp.length, P2 = Math.pow(2, Math.floor(Math.log2(Math.max(1, n))));
        const nb = K.nacR ? n % 2 : n > P2 ? 2 * P2 - n : 0;
        K.byes.push(...gp.slice(0, nb));
        const rest = gp.slice(nb);
        for (let i = 0; i < rest.length / 2; i++) mk(rest[i], rest[rest.length - 1 - i]);
      }
    } else if (K.random) {
      if (ri === 0) {
        const n = pool.length, P2 = Math.pow(2, Math.floor(Math.log2(n)));
        const nb = n > P2 ? 2 * P2 - n : 0;
        const ordered = pool.slice().sort((a, b) => lvlOf(g, a) - lvlOf(g, b) || ovr(g, b) - ovr(g, a));
        K.byes = ordered.slice(0, nb);
        pool = P.shuffle(Math.random, ordered.slice(nb));
      } else pool = P.shuffle(Math.random, pool);
      for (let i = 0; i + 1 < pool.length; i += 2) mk(pool[i], pool[i + 1]);
    } else {
      const groups = K.tags ? groupBy(pool, K.tags) : [pool];
      const single = groups.length > 1 && groups.every((gp) => gp.length === 1);
      if (single) { const two = groups.map((gp) => gp[0]).sort((a, b) => seedIdx(a) - seedIdx(b)); mk(two[0], two[1]); }
      else for (const gp of groups) {
        const s = gp.slice().sort((a, b) => seedIdx(a) - seedIdx(b));
        if (s.length % 2) ties.push({ a1: s.shift(), a2: null, w: null, bye: true }); // número ímpar: o mais bem colocado passa direto
        for (let i = 0; i < s.length / 2; i++) mk(s[i], s[s.length - 1 - i]);
      }
    }
    ties.forEach((t) => { if (t.bye) t.w = t.a1; });
    K.rounds[ri] = { ties };
    return true;
  };
  function groupBy(pool, tags) { const m = {}; pool.forEach((cid) => { const k = tags[cid] != null ? tags[cid] : 0; (m[k] = m[k] || []).push(cid); }); return Object.keys(m).sort().map((k) => m[k]); }

  // Uruguai: semifinal Apertura × Clausura, depois final (ida e volta) contra o melhor da tabela anual
  function uruFinal(g, K, ri) {
    const d = K.d, dv = g.dv[d];
    const champ = (k) => { const b = dv.bl[k]; return P.tbl(g, d, null, b.steps[0], b.steps[b.steps.length - 1])[0].cid; };
    if (ri === 0) {
      const ap = champ('ap'), cl = champ('cl');
      const t = { a1: ap, a2: cl, w: null };
      if (ap === cl) { t.w = ap; t.bye = true; K.done = ap; } else t.m = [{ h: ap, a: cl, done: false, neutral: true }];
      K.rounds[0] = { ties: [t] }; K.order = [ap, cl];
      return true;
    }
    const sw = K.rounds[0].ties[0].w;
    const best = P.tbl(g, d)[0].cid;
    const t = { a1: best, a2: sw, w: null };
    if (K.done || best === sw) { t.w = sw; t.bye = true; } else t.m = [{ h: sw, a: best, done: false }, { h: best, a: sw, done: false }];
    K.rounds[1] = { ties: [t] };
    return true;
  }

  // ---------- Fase de liga (continental) ----------
  P.lpDone = (g, K) => K.lp.rounds.every((rd) => rd.every((m) => m.done));
  P.lpTable = function (g, K, ids) {
    const rows = {};
    (ids || K.lp.ids).forEach((cid) => { rows[cid] = { cid, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, form: [] }; });
    K.lp.rounds.forEach((rd) => rd.forEach((m) => {
      if (!m.done || !rows[m.h] || !rows[m.a]) return;
      const H = rows[m.h], Aw = rows[m.a];
      H.j++; Aw.j++; H.gp += m.hg; H.gc += m.ag; Aw.gp += m.ag; Aw.gc += m.hg;
      if (m.hg > m.ag) { H.v++; Aw.d++; H.pts += 3; } else if (m.hg < m.ag) { Aw.v++; H.d++; Aw.pts += 3; } else { H.e++; Aw.e++; H.pts++; Aw.pts++; }
    }));
    return Object.values(rows).sort((a, b) => b.pts - a.pts || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || b.v - a.v);
  };
  // classificados da fase de liga para o mata-mata, em ordem
  P.lpSeeds = function (g, K) {
    const lp = K.lp;
    if (lp.groups) {
      const tabs = lp.groups.map((ids) => P.lpTable(g, K, ids).map((x) => x.cid));
      if (lp.region) { K.tags = {}; tabs.forEach((t, gi) => t.forEach((cid) => { K.tags[cid] = lp.region[gi]; })); }
      const firsts = tabs.map((t) => t[0]), seconds = tabs.map((t) => t[1]);
      const pts = (cid) => { const gi = lp.groups.findIndex((gr) => gr.includes(cid)); return (P.lpTable(g, K, lp.groups[gi]).find((x) => x.cid === cid) || {}).pts || 0; };
      const sortP = (arr) => arr.sort((a, b) => pts(b) - pts(a));
      let S = sortP(firsts).concat(sortP(seconds));
      if (K.extra) { const ex = K.extra(g); S = S.concat(ex); }
      return S;
    }
    if (lp.regions) { // fase de liga dividida em Leste e Oeste (Ásia)
      K.tags = {};
      const S = [];
      lp.regions.forEach((ids, ri) => P.lpTable(g, K, ids).slice(0, 8).forEach((row) => { S.push(row.cid); K.tags[row.cid] = ri; }));
      return S;
    }
    return P.lpTable(g, K).slice(0, 24).map((x) => x.cid);
  };

  // ---------- Partidas da semana ----------
  const compOf = (K) => (K.kind === 'nc' ? 'nc' : K.kind === 'cc' ? 'cc' : 'po');
  const origMatches = P.stepMatches;
  P.stepMatches = function (g, step) {
    step = step || g.cal[g.week];
    if (!step || step.t !== 'ko' || !v2(g)) return origMatches.apply(this, arguments);
    const out = [], current = step === g.cal[g.week];
    for (const [id, ri, leg] of step.ev) {
      const K = g.ko[id]; if (!K) continue;
      if (ri !== 'lp' && !K.rounds[ri] && !current) continue; // semana futura: o sorteio só acontece na hora
      if (ri === 'lp') { (K.lp.rounds[leg] || []).forEach((m) => out.push({ m, comp: 'cc', kid: id, z: K.z })); continue; }
      if (!P.koDraw(g, K, ri)) continue;
      const legs = K.legs[ri];
      for (const t of K.rounds[ri].ties) {
        if (!t.m || !t.m[leg]) continue;
        out.push({ m: t.m[leg], comp: compOf(K), ko: legs === 1 && K.adv !== 'seed', kid: id, ctry: K.c, z: K.z, tie: t });
      }
    }
    return out;
  };

  // resolve os confrontos terminados (ida e volta, vantagem do mais bem colocado)
  P.koResolve = function (g, step) {
    if (!step || step.t !== 'ko') return;
    for (const [id, ri] of step.ev) {
      const K = g.ko[id]; if (!K || ri === 'lp' || !K.rounds[ri]) continue;
      for (const t of K.rounds[ri].ties) {
        if (t.w || !t.m || t.m.some((m) => !m.done)) continue;
        let g1 = 0, g2 = 0;
        t.m.forEach((m) => { g1 += m.h === t.a1 ? m.hg : m.ag; g2 += m.h === t.a1 ? m.ag : m.hg; });
        if (g1 !== g2) t.w = g1 > g2 ? t.a1 : t.a2;
        else if (t.m.length === 1 && t.m[0].w) t.w = t.m[0].w;
        else if (K.adv === 'seed') t.w = t.a1;
        else {
          const p1 = 0.5 + (ovr(g, t.a1) - ovr(g, t.a2)) * 0.01;
          const w1 = Math.random() < p1;
          t.pen = w1 ? [4, 3] : [3, 4]; t.w = w1 ? t.a1 : t.a2;
          const last = t.m[t.m.length - 1]; last.pen = last.h === t.a1 ? t.pen : [t.pen[1], t.pen[0]];
        }
      }
      if (ri === K.legs.length - 1 && K.rounds[ri].ties.every((t) => t.w)) K.w = K.rounds[ri].ties.map((t) => t.w).length === 1 ? K.rounds[ri].ties[0].w : K.rounds[ri].ties.map((t) => t.w);
      if (K.win && K.rounds[ri].ties.length === K.win && K.rounds[ri].ties.every((t) => t.w)) K.w = K.rounds[ri].ties.map((t) => t.w);
    }
  };
})(window.PFC);

// ---------- Copas nacionais e continentais ----------
(function (P) {
  const club = (g, cid) => P.club(g, cid);
  const NF = [0.04, 0.09, 0.14, 0.19, 0.245, 0.3, 0.38, 0.46, 0.53, 0.62, 0.74, 0.86, 0.94];
  const CF = [0.06, 0.11, 0.16, 0.21, 0.26, 0.31, 0.36, 0.41];
  const KF = [0.5, 0.55, 0.6, 0.64, 0.68, 0.72, 0.76, 0.8, 0.84, 0.88, 0.92, 0.96];
  P.ncName2 = (c) => `Copa ${P.countryPrep(c)}`;

  P.nationalCups2 = function (g, put) {
    for (const W of P.WORLD2) {
      if (!W.cup) continue;
      const divs = P.countryDivs(W.c);
      let ids = [];
      divs.slice(0, W.cup.lv).forEach((d) => { ids = ids.concat(P.divClubs(g.db, d).map((c) => c.id)); });
      if (W.cup.plus && divs[W.cup.lv]) ids = ids.concat(P.divClubs(g.db, divs[W.cup.lv]).sort((a, b) => b.rep - a.rep).slice(0, W.cup.plus).map((c) => c.id));
      const n = ids.length, P2 = Math.pow(2, Math.floor(Math.log2(n)));
      const nr = Math.log2(P2) + (n > P2 ? 1 : 0);
      const two = W.cup.two || [];
      const legs = Array.from({ length: nr }, (_, i) => (two.includes(nr - i) ? 2 : 1));
      const K = g.ko['nc' + W.c] = { id: 'nc' + W.c, kind: 'nc', n: P.ncName2(W.c), c: W.c, legs, adv: 'pens', random: true, fixedSeeds: ids, rounds: [], w: null, neutralAll: !!W.cup.neutralAll };
      const total = legs.reduce((a, b) => a + b, 0);
      let s = NF.length - total;
      legs.forEach((n2, ri) => { for (let l = 0; l < n2; l++) { put('N' + s, NF[Math.max(0, s)], [K.id, ri, l]); s++; } });
    }
  };

  // classificados de cada copa continental (lista de clubes, na ordem das vagas)
  function qualify(g) {
    if (g.ccq2) return g.ccq2;
    // 1ª temporada: a força do clube faz as vezes da classificação do ano anterior
    const rank = {};
    for (const c of P.worldCountries()) rank[c] = P.divClubs(g.db, P.topDivOf(c)).sort((a, b) => b.rep - a.rep).map((x) => x.id);
    return P.contQualify(g, rank, {});
  }
  // rank[país] = classificação da 1ª divisão; extra[país] = { cup, ap, cl, ch, sh }
  P.contQualify = function (g, rank, extra) {
    const out = {}, taken = new Set();
    const guestUsed = new Set();
    for (const [id, C] of Object.entries(P.CONT)) {
      const list = [];
      for (const [c, slots] of Object.entries(C.slots)) {
        const rk = rank[c] || [], ex = extra[c] || {};
        for (const sl of slots) {
          let cid = null;
          if (typeof sl === 'number') cid = rk[sl - 1];
          else if (/^a\d+$/.test(sl)) cid = rk[Number(sl.slice(1)) - 1];
          else cid = ex[sl] || null;
          if (!cid || taken.has(cid)) cid = rk.find((x) => !taken.has(x)) || null; // vaga repetida passa para o próximo da liga
          if (cid) { taken.add(cid); list.push(cid); }
        }
      }
      for (const [c, k] of Object.entries(C.guests || {})) {
        const d = g.db.clubs.find((x) => x.guest && x.country === c);
        if (!d) continue;
        const pool = P.divClubs(g.db, d.div).filter((x) => !guestUsed.has(x.id))
          .map((x) => ({ x, s: x.rep + Math.random() * 6 })).sort((a, b) => b.s - a.s).map((o) => o.x.id);
        pool.slice(0, k).forEach((cid) => { guestUsed.add(cid); list.push(cid); });
      }
      out[id] = list;
    }
    return out;
  };

  P.continental2 = function (g, put) {
    const Q = qualify(g); g.ccq2 = null;
    const r = Math.random;
    for (const [id, C] of Object.entries(P.CONT)) {
      const ids = (Q[id] || []).filter((cid) => club(g, cid));
      if (ids.length < 8) continue;
      const K = g.ko[id] = { id, kind: 'cc', n: C.n, z: C.conf, rounds: [], w: null, adv: 'pens', m: C.m };
      let md = 0;
      const ovrs = P.clubOvrs(g.db);
      if (C.fmt === 'swiss') {
        const rounds = circle(P.shuffle(r, ids.slice()), C.md);
        K.lp = { ids, rounds }; md = C.md;
        K.legs = [2, 2, 2, 2, 1];
      } else if (C.fmt === 'swiss2') {
        const west = ids.filter((cid) => (C.west || []).includes(club(g, cid).country)), east = ids.filter((cid) => !west.includes(cid));
        K.lp = { ids, regions: [east, west], rounds: merge2(circle(P.shuffle(r, east), C.md), circle(P.shuffle(r, west), C.md)) }; md = C.md;
        K.legs = [2, 1, 1, 1];
      } else if (C.fmt === 'groups') {
        const G = 8;
        let groups;
        if (C.west) { // Ásia: 4 grupos no Leste e 4 no Oeste
          const west = ids.filter((cid) => C.west.includes(club(g, cid).country)), east = ids.filter((cid) => !west.includes(cid));
          groups = snake2(east, 4, ovrs).concat(snake2(west, 4, ovrs));
          K.lp = { ids, groups, region: [0, 0, 0, 0, 1, 1, 1, 1] };
        } else { groups = snake2(ids, G, ovrs); K.lp = { ids, groups }; }
        K.lp.rounds = mergeN(groups.map((gr) => P.makeFixtures(gr, r)));
        md = 6;
        K.legs = id === 'sud' ? [2, 2, 2, 2, 1] : [2, 2, 2, 1];
        if (id === 'sud') K.extra = (gg) => { const L = gg.ko.lib; if (!L || !L.lp) return []; return L.lp.groups.map((gr) => P.lpTable(gg, L, gr)[2]).filter(Boolean).map((x) => x.cid); };
      } else if (C.fmt === 'ko27') {
        K.fixedSeeds = ids.slice().sort((a, b) => (ovrs[b] || 0) - (ovrs[a] || 0));
        K.legs = [2, 2, 2, 2, 1];
      }
      for (let i = 0; i < md; i++) put('C' + i, CF[i], [id, 'lp', i]);
      const total = K.legs.reduce((a, b) => a + b, 0);
      let s = KF.length - total;
      K.legs.forEach((n2, ri) => { for (let l = 0; l < n2; l++) { put('K' + s, KF[Math.max(0, s)], [id, ri, l]); s++; } });
    }
  };
  // n rodadas de um turno único (cada clube enfrenta n adversários diferentes)
  function circle(ids, n) {
    const t = ids.slice(); if (t.length % 2) t.push(null);
    const N = t.length, out = [];
    for (let k = 0; k < Math.min(n, N - 1); k++) {
      const rd = [];
      for (let i = 0; i < N / 2; i++) { const a = t[i], b = t[N - 1 - i]; if (a == null || b == null) continue; rd.push((k + i) % 2 ? { h: a, a: b, done: false } : { h: b, a: a, done: false }); }
      out.push(rd); t.splice(1, 0, t.pop());
    }
    return out;
  }
  const merge2 = (a, b) => a.map((rd, i) => rd.concat(b[i] || []));
  const mergeN = (lists) => { const n = Math.max(...lists.map((l) => l.length)); return Array.from({ length: n }, (_, i) => [].concat(...lists.map((l) => l[i] || []))); };
  function snake2(ids, G, ovrs) {
    const s = ids.slice().sort((a, b) => (ovrs[b] || 0) - (ovrs[a] || 0)), out = Array.from({ length: G }, () => []);
    s.forEach((id, i) => { const k = Math.floor(i / G), j = i % G; out[k % 2 ? G - 1 - j : j].push(id); });
    return out;
  }
})(window.PFC);

// ---------- Semana a semana e fim de temporada ----------
(function (P) {
  const club = (g, cid) => P.club(g, cid);
  const v2 = (g) => P.isV2(g);
  const single = (ids) => {
    const t = P.shuffle(Math.random, ids.slice()); if (t.length % 2) t.push(null);
    const n = t.length, out = [];
    for (let k = 0; k < n - 1; k++) { const rd = []; for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; if (a == null || b == null) continue; rd.push((k + i) % 2 ? { h: a, a: b, done: false } : { h: b, a: a, done: false }); } out.push(rd); t.splice(1, 0, t.pop()); }
    return out;
  };
  const mergeN = (lists) => { const n = Math.max(...lists.map((l) => l.length)); return Array.from({ length: n }, (_, i) => [].concat(...lists.map((l) => l[i] || []))); };
  const blockDone = (g, d, k) => { const b = g.dv[d] && g.dv[d].bl[k]; return !!b && b.filled !== false && b.steps.every((s) => (g.lg[d][s] || []).every((m) => m.done)); };
  const blockTbl = (g, d, k, ids) => { const b = g.dv[d].bl[k]; return P.tbl(g, d, ids, b.steps[0], b.steps[b.steps.length - 1]); };
  const fill = (g, d, k, rounds) => { const b = g.dv[d].bl[k]; b.steps.forEach((s, i) => { g.lg[d][s] = rounds[i] || []; }); b.filled = true; };

  // segunda fase das ligas que mudam no meio do ano
  function phases(g) {
    for (const [ds, dv] of Object.entries(g.dv || {})) {
      const d = Number(ds);
      if (dv.t === 'split' && !dv.split && blockDone(g, d, 'p1')) {
        const t = P.tbl(g, d).map((x) => x.cid), h = Math.ceil(t.length / 2);
        dv.split = { A: t.slice(0, h), B: t.slice(h) };
        fill(g, d, 'p2', mergeN([single(dv.split.A), single(dv.split.B)]));
      }
      if (dv.t === 'serieC' && !dv.quad && blockDone(g, d, 'p1')) {
        const t = blockTbl(g, d, 'p1').map((x) => x.cid);
        dv.quad = [[t[0], t[3], t[4], t[7]], [t[1], t[2], t[5], t[6]]];
        fill(g, d, 'p2', mergeN(dv.quad.map((q) => P.makeFixtures(q, Math.random))));
      }
      if (dv.t === 'grp2' && !dv.promo && blockDone(g, d, 'p1')) {
        dv.promo = [].concat(...dv.groups.map((ids) => blockTbl(g, d, 'p1', ids).slice(0, 4).map((x) => x.cid)));
        fill(g, d, 'p2', P.makeFixtures(dv.promo, Math.random));
      }
      if (dv.t === 'uru' && !dv.inter && blockDone(g, d, 'ap')) {
        const t = blockTbl(g, d, 'ap').map((x) => x.cid);
        const A = [0, 3, 4, 7, 8, 11, 12, 15].map((i) => t[i]).filter(Boolean), B = t.filter((x) => !A.includes(x));
        dv.inter = [A, B];
        fill(g, d, 'in', mergeN([single(A), single(B)]));
      }
    }
  }

  // prêmios e notícias dos mata-matas
  const tvTop = (c) => P.ECON.tv[P.topDivOf(c) - 1] || 1e6;
  function prizes(g, step, items) {
    if (step.t !== 'ko') return;
    for (const it of items) {
      const K = it.kid && g.ko[it.kid]; if (!K) continue;
      const m = it.m;
      if (K.kind === 'cc') {
        const pay = (cid, v) => P.pay(g, cid, Math.round(v * K.m / 1e4) * 1e4, 'Premiação');
        if (!it.tie) { // fase de liga/grupos
          if (K.lp.rounds[0] && K.lp.rounds[0].includes(m)) { pay(m.h, 18e6); pay(m.a, 18e6); }
          if (m.hg > m.ag) pay(m.h, 2.1e6); else if (m.ag > m.hg) pay(m.a, 2.1e6); else { pay(m.h, 7e5); pay(m.a, 7e5); }
        }
      }
    }
    for (const [id, ri] of step.ev) {
      const K = g.ko[id]; if (!K || ri === 'lp' || !K.rounds[ri]) continue;
      for (const t of K.rounds[ri].ties) {
        if (!t.w || t.paid) continue;
        t.paid = true;
        if (K.kind === 'nc') P.pay(g, t.w, Math.round(tvTop(K.c) * [0.3, 0.15, 0.08, 0.05, 0.03, 0.02, 0.015, 0.01][K.legs.length - 1 - ri] / 1e4) * 1e4 || 1e5, 'Premiação');
        if (K.kind === 'cc') P.pay(g, t.w, Math.round([2e6, 4e6, 7e6, 12e6, 20e6][Math.max(0, 5 - (K.legs.length - ri))] * K.m / 1e4) * 1e4, 'Premiação');
      }
      if (ri === K.legs.length - 1 && K.w && !K.told && !Array.isArray(K.w)) {
        K.told = true;
        const wc = club(g, K.w), me = g.user;
        const show = K.kind === 'cc' || (K.c && P.followed(g, P.topDivOf(K.c)));
        if (show && wc) P.news(g, K.kind === 'lig' || K.kind === 'nc' || K.kind === 'cc' ? `${wc.name} é campeão: ${K.n}!` : `${wc.name} vence: ${K.n}.`, K.w === me ? 'good' : '');
        if (K.kind === 'cc' && P.flash && wc) P.flash(g, { pri: K.w === me ? 5 : 2, ttl: 2, kicker: K.n, head: `${wc.name} é campeão`, dek: `${P.countryName(wc.country)} levanta a taça continental.` });
        if (K.kind === 'nc' && K.c === P.divCountry(P.club(g, me).div)) g.cup.winner = K.w;
      }
    }
  }

  const origPrizes = P.normalWeekPrizes;
  P.normalWeekPrizes = function (g, step, items) {
    if (!v2(g)) return origPrizes && origPrizes.apply(this, arguments);
    if (step.t === 'ko') P.koResolve(g, step);
    prizes(g, step, items);
    phases(g);
  };

  // ---------- Fim de temporada ----------
  function promedio(g, cid, n) {
    const h = (g.prom && g.prom[cid]) || [];
    const last = h.slice(-n);
    const pts = last.reduce((a, x) => a + x[1], 0), j = last.reduce((a, x) => a + x[2], 0);
    return j ? pts / j : 1;
  }
  const koW = (g, id) => { const K = g.ko[id]; return K ? K.w : null; };
  const champOf = (g, d) => {
    const dv = g.dv[d], L = P.lvSpec(d); if (!dv || !L) return null;
    if (dv.t === 'ac') return koW(g, 'lc' + d) || koW(g, 'la' + d) || P.tbl(g, d)[0].cid;
    if (dv.t === 'conf') return koW(g, 'pf' + d) || P.tbl(g, d)[0].cid;
    if (dv.t === 'uru') { const K = g.ko['uf' + d]; return (K && K.w) || P.tbl(g, d)[0].cid; }
    if (dv.t === 'nac') return koW(g, 'nf' + d) || P.tbl(g, d)[0].cid;
    if (dv.t === 'serieC') return koW(g, 'sc' + d) || P.rank2(g, d)[0];
    if (dv.t === 'serieD') return koW(g, 'sd' + d) || null;
    if (dv.t === 'grp') return dv.groups.map((ids) => P.tbl(g, d, ids)[0]).sort((a, b) => b.pts - a.pts)[0].cid;
    return P.rank2(g, d)[0];
  };
  P.champOf2 = champOf;

  const origMoves = P.normalMoves;
  P.normalMoves = function (g, sum) {
    if (!v2(g)) return origMoves.apply(this, arguments);
    const moves = {};
    // promédios (Argentina e Uruguai)
    g.prom = g.prom || {};
    for (const W of P.WORLD2) {
      const d = P.countryDivs(W.c)[0], L = W.lv[0];
      if (!L.relProm) continue;
      P.tbl(g, d).forEach((row) => { (g.prom[row.cid] = g.prom[row.cid] || []).push([g.season, row.pts, row.j]); if (g.prom[row.cid].length > 3) g.prom[row.cid].shift(); });
    }
    sum.titles = [];
    for (const W of P.WORLD2) {
      const divs = P.countryDivs(W.c);
      const up = divs.map(() => new Set()), down = divs.map(() => new Set());
      divs.forEach((d, i) => {
        const L = W.lv[i], dv = g.dv[d] || {}, rk = P.rank2(g, d), above = i > 0, below = i < divs.length - 1;
        if (L.closed) return;
        if (above) {
          if (dv.t === 'grp') dv.groups.forEach((ids) => P.tbl(g, d, ids).slice(0, L.up || 0).forEach((x) => up[i].add(x.cid)));
          else if (dv.t === 'serieC') rk.slice(0, 4).forEach((c) => up[i].add(c));
          else if (dv.t === 'serieD') { const K = g.ko['sd' + d]; const rq = K && K.rounds[3]; if (rq) rq.ties.forEach((t) => t.w && up[i].add(t.w)); }
          else if (dv.t === 'conf') { const w = koW(g, 'pf' + d); if (w) up[i].add(w); }
          else if (dv.t === 'nac') { [koW(g, 'nf' + d), koW(g, 'nr' + d)].forEach((w) => w && up[i].add(w)); }
          else rk.slice(0, L.up || 0).forEach((c) => up[i].add(c));
          const po = g.ko['po' + d];
          if (po && po.w && !(L.po && L.po.to === 'rel')) [].concat(po.w).forEach((w) => {
            const upperClub = L.po.upper ? P.rank2(g, divs[i - 1])[L.po.upper - 1] : null;
            if (w === upperClub) return; // o clube de cima venceu: fica
            up[i].add(w);
            if (upperClub) down[i - 1].add(upperClub);
          });
        }
        if (below) {
          if (dv.t === 'ac') {
            const tb = P.tbl(g, d).map((x) => x.cid);
            for (let k = 0; k < (L.relAnnual || 0); k++) down[i].add(tb[tb.length - 1 - k]);
            const pr = rk.slice().sort((a, b) => promedio(g, a, 3) - promedio(g, b, 3)).filter((c) => !down[i].has(c));
            pr.slice(0, L.relProm || 0).forEach((c) => down[i].add(c));
          } else if (dv.t === 'uru') rk.slice().sort((a, b) => promedio(g, a, 2) - promedio(g, b, 2)).slice(0, L.relProm || 3).forEach((c) => down[i].add(c));
          else if (dv.t === 'nac') dv.groups.forEach((ids) => { const t = P.tbl(g, d, ids); down[i].add(t[t.length - 1].cid); });
          else if (dv.t === 'serieC') { const t = blockTbl(g, d, 'p1').map((x) => x.cid); t.slice(-(L.down || 0)).forEach((c) => down[i].add(c)); }
          else if (dv.t === 'conf') { const t = P.tbl(g, d); down[i].add(t[t.length - 1].cid); }
          else if (L.down) rk.slice(-L.down).forEach((c) => down[i].add(c));
          const pl = g.ko['pl' + d];
          if (pl && pl.rounds[0] && pl.rounds[0].ties[0].w) { const t = pl.rounds[0].ties[0]; down[i].add(t.w === t.a1 ? t.a2 : t.a1); }
          (L.rel || []).forEach((x, k) => {
            const K = g.ko['rl' + d + '_' + k], t = K && K.rounds[0] && K.rounds[0].ties[0];
            if (t && t.w && t.w === t.a2) { down[i].add(t.a1); up[i + 1].add(t.a2); }
          });
        }
      });
      // tamanhos sempre iguais: o que sobe de uma divisão é o que cai da de cima
      for (let i = 0; i < divs.length - 1; i++) {
        const U = up[i + 1], D = down[i];
        if (W.lv[i].closed) continue;
        const rkUp = P.rank2(g, divs[i]), rkLo = P.rank2(g, divs[i + 1]);
        while (U.size > D.size) { const c = rkUp.slice().reverse().find((x) => !D.has(x) && !up[i].has(x)); if (!c) break; D.add(c); }
        while (D.size > U.size) { const c = rkLo.find((x) => !U.has(x) && !down[i + 1].has(x)); if (!c) break; U.add(c); }
      }
      divs.forEach((d, i) => {
        up[i].forEach((c) => { moves[c] = divs[i - 1]; });
        down[i].forEach((c) => { moves[c] = divs[i + 1]; });
        const ch = champOf(g, d);
        sum.divs.push({ d, champ: ch || P.rank2(g, d)[0], up: [...up[i]], down: [...down[i]] });
        if (ch) sum.titles.push({ cid: ch, n: P.leagueTitle(d), d });
        const dv = g.dv[d];
        if (dv && dv.t === 'ac') { const a = koW(g, 'la' + d); if (a && a !== ch) sum.titles.push({ cid: a, n: `Apertura · ${P.leagueTitle(d)}`, d, half: true }); }
      });
    }
    // copas e campeões continentais
    sum.nc = {}; sum.cont = {};
    for (const W of P.WORLD2) if (g.ko['nc' + W.c] && g.ko['nc' + W.c].w) sum.nc[W.c] = g.ko['nc' + W.c].w;
    for (const id of Object.keys(P.CONT)) if (g.ko[id] && g.ko[id].w) sum.cont[id] = g.ko[id].w;
    // vagas continentais do ano que vem
    const rank = {}, extra = {};
    for (const W of P.WORLD2) {
      const d = P.countryDivs(W.c)[0], dv = g.dv[d] || {};
      rank[W.c] = dv.t === 'ac' || dv.t === 'uru' || dv.t === 'conf' ? P.tbl(g, d).map((x) => x.cid) : P.rank2(g, d);
      extra[W.c] = { cup: sum.nc[W.c] || null, ap: koW(g, 'la' + d), cl: koW(g, 'lc' + d), ch: champOf(g, d), sh: P.tbl(g, d)[0] && P.tbl(g, d)[0].cid };
    }
    g.ccq2 = P.contQualify(g, rank, extra);
    return moves;
  };

  // títulos para a Bola de Ouro
  const origTitles = P.normalTitles;
  P.normalTitles = function (g, add, byTier) {
    if (!v2(g)) return origTitles && origTitles.apply(this, arguments);
    const s = g.summary || {};
    (s.titles || []).filter((t) => t.half).forEach((t) => add(t.cid, t.n, byTier([30, 14, 11, 9, 7, 6, 5, 4], t.d) * 0.6)); // títulos de liga já entram pela lista de campeões
    Object.entries(s.nc || {}).forEach(([c, w]) => add(w, P.ncName2(c), byTier([22, 12, 9, 7, 6, 5, 4, 3], P.topDivOf(c))));
    Object.entries(s.cont || {}).forEach(([id, w]) => add(w, P.CONT[id].n, { ucl: 45, uel: 26, uecl: 16, lib: 32, sud: 16, ccc: 16, acle: 20, acl2: 8 }[id] || 10));
  };
})(window.PFC);

// ---------- Telas da Carreira normal v2 ----------
(function (P) {
  const A = P.app, esc = P.esc;
  const club = (g, cid) => P.club(g, cid);
  const v2 = (g) => P.isV2(g);

  // cores da tabela: sobe (azul), mata-mata/repescagem (amarelo), cai (vermelho)
  P.zoneFor2 = function (g, d, vk, i, n) {
    const L = P.lvSpec(d); if (!L) return '';
    const dv = g.dv[d] || {};
    const hasAbove = !!P.divAbove(d), hasBelow = !!P.divBelow(d);
    if (vk && vk[0] === 'g' && dv.t === 'grp') { if (i < (L.up || 0)) return 'z1'; if (L.po && i >= L.po.r[0] - 1 && i < L.po.r[1]) return 'z2'; return ''; }
    if (vk && vk[0] === 'g' && dv.t === 'serieD') return i < 4 ? 'z2' : '';
    if (vk && vk[0] === 'g' && (dv.t === 'conf')) { const top = L.mls ? 9 : 8; return i < top ? 'z2' : ''; }
    if (vk && vk[0] === 'g' && dv.t === 'nac') return i === 0 ? 'z1' : i < 8 ? 'z2' : i === n - 1 ? 'z3' : '';
    if (vk && (vk.startsWith('ap') || vk.startsWith('cl'))) return i < (L.lig ? L.lig.top : 0) ? 'z2' : '';
    if (vk === 'A') return i === 0 ? 'z1' : '';
    if (vk === 'B') { const rels = (L.rel || []).map((x) => x.pos); return n - i <= (L.down || 0) ? 'z3' : rels.includes(i + 7) ? 'z2' : ''; }
    if (vk && vk[0] === 'q') return i < 2 ? 'z1' : '';
    if (vk === 'pr') return i < (L.up || 0) ? 'z1' : i === 2 ? 'z2' : '';
    if (vk === 'an' || vk === 'all' || !vk) {
      if (!hasAbove && i === 0) return 'z1';
      if (hasAbove && i < (L.up || 0)) return 'z1';
      if (hasAbove && L.po && i >= L.po.r[0] - 1 && i < L.po.r[1]) return 'z2';
      if (hasBelow && L.down && i >= n - L.down) return 'z3';
      if ((L.rel || []).some((x) => x.pos === i + 1) || (L.playout && i + 1 >= L.playout.r[0] && i + 1 <= L.playout.r[1]) || L.poUp === i + 1) return 'z2';
    }
    return '';
  };
  P.zoneLegend2 = function (g, d) {
    const L = P.lvSpec(d) || {};
    const notes = [];
    if (L.closed) notes.push('sem acesso nem rebaixamento');
    if (L.relProm) notes.push(`caem ${L.relProm + (L.relAnnual || 0)} pela média de pontos (promédio)${L.relAnnual ? ' e pela tabela anual' : ''}`);
    return `<div class="row legend"><span><span class="zone z1">&nbsp;</span> Título / acesso</span><span><span class="zone z2">&nbsp;</span> Mata-mata / repescagem</span><span><span class="zone z3">&nbsp;</span> Rebaixamento</span></div>${notes.length ? `<p class="muted" style="font-size:.82rem;margin:4px 0 0">${esc(notes.join(' · '))}</p>` : ''}`;
  };

  // ---------- Mata-mata: desenho genérico ----------
  const row = (g, m, label) => A.ogRow(m, m.done ? m.hg : '', m.done ? m.ag : '', { click: true, pen: m.pen, label });
  function koRounds(g, K, title) {
    if (!K.rounds.length) return '<p class="empty">Ainda não começou.</p>';
    return K.rounds.map((rd, ri) => {
      const nm = P.koRoundName(K, ri);
      const ties = rd.ties.slice().sort((a, b) => ((b.a1 === g.user || b.a2 === g.user) ? 1 : 0) - ((a.a1 === g.user || a.a2 === g.user) ? 1 : 0));
      return `<h3 class="cup-h">${esc(nm)}${K.legs[ri] === 2 ? ' <small class="muted">(ida e volta)</small>' : ''}</h3><div class="others">${ties.map((t) => {
        if (t.bye) return `<div class="og"><span class="hm"><span class="tn">${esc(club(g, t.a1).short)}</span> ${P.badge(club(g, t.a1), 18)}</span><span class="s num">passa direto</span><span class="aw"></span></div>`;
        return `<div class="tie">${t.m.map((m, l) => row(g, m, `${title} · ${nm}${t.m.length > 1 ? (l ? ' (volta)' : ' (ida)') : ''}`)).join('')}${t.w && t.m.length > 1 ? `<div class="muted tie-w">Classificado: <b>${esc(club(g, t.w).short)}</b>${t.pen ? ' nos pênaltis' : ''}</div>` : ''}</div>`;
      }).join('')}</div>`;
    }).reverse().join('');
  }
  const winBox = (g, cid, lbl) => { const c = cid && club(g, cid); return c ? `<div class="winner">${P.badge(c, 40)}<div><span class="label">${esc(lbl || 'Campeão')}</span><h3>${esc(c.name)}</h3></div></div>` : ''; };

  // Playoffs de um país (acesso, liguilla, repescagem...)
  P.poView2 = function (g, d) {
    const c = P.divCountry(d);
    const list = Object.values(g.ko).filter((K) => K.c === c && K.kind !== 'nc' && K.d);
    if (!list.length) return '<p class="empty">Este país não tem mata-mata de liga nesta temporada.</p>';
    const st = A.st;
    if (!st.poK || !list.find((K) => K.id === st.poK)) st.poK = (list.find((K) => K.d === d) || list[0]).id;
    const K = g.ko[st.poK];
    const sel = `<select class="sel" data-c="poK" aria-label="Mata-mata">${list.map((x) => `<option value="${x.id}" ${x.id === K.id ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select>`;
    const w = K.w && !Array.isArray(K.w) ? winBox(g, K.w, K.kind === 'rel' ? 'Fica com a vaga' : 'Vencedor') : Array.isArray(K.w) ? `<p class="muted">Classificados: ${K.w.map((x) => esc(club(g, x).name)).join(', ')}</p>` : '';
    return `<div class="filters" style="margin-bottom:12px">${sel}</div>${w}${koRounds(g, K, K.n)}`;
  };
  A.CHG.poK = (el) => { A.st.poK = el.value; A.render(); };
  A.ACT.dvw = (d) => { A.st.dvw = d.k; A.render(); };

  // Copa nacional (v2)
  const origNc = P.ncView;
  P.ncView = function (g) {
    if (!v2(g)) return origNc.apply(this, arguments);
    const st = A.st, me = club(g, g.user);
    const cs = P.worldCountries().filter((c) => g.ko['nc' + c] && P.followed(g, P.topDivOf(c)));
    if (!cs.length) return '<p class="empty">Sem copa nacional.</p>';
    if (!st.ncC || !cs.includes(st.ncC)) st.ncC = cs.includes(P.divCountry(me.div)) ? P.divCountry(me.div) : cs[0];
    const K = g.ko['nc' + st.ncC];
    const sel = `<select class="sel" data-c="ncC" aria-label="País">${cs.map((x) => `<option value="${x}" ${x === st.ncC ? 'selected' : ''}>${esc(P.ncName2(x))}</option>`).join('')}</select>`;
    const n = K.fixedSeeds.length;
    return `${K.w ? winBox(g, K.w) : ''}<div class="filters" style="margin-bottom:12px">${sel}</div>
      <p class="muted" style="font-size:.85rem;margin:0 0 10px">${n} clubes, mata-mata${K.legs.some((x) => x === 2) ? ' (algumas fases em ida e volta)' : ' em jogo único'}, pênaltis em caso de empate. Em jogo único, o time de divisão mais baixa joga em casa.${K.byes && K.byes.length ? ` Os ${K.byes.length} mais fortes entram na 2ª fase.` : ''}</p>${koRounds(g, K, K.n)}`;
  };

  // Copas continentais (v2)
  const origCc = P.ccView;
  P.ccView = function (g) {
    if (!v2(g)) return origCc.apply(this, arguments);
    const st = A.st, ids = Object.keys(P.CONT).filter((id) => g.ko[id]);
    if (!ids.length) return '<p class="empty">Sem copas continentais nesta temporada.</p>';
    const mine = ids.find((id) => (g.ko[id].lp ? g.ko[id].lp.ids : g.ko[id].fixedSeeds || []).includes(g.user));
    const myZ = (P.divInfo(club(g, g.user).div) || {}).z;
    if (!st.ccK || !g.ko[st.ccK]) st.ccK = mine || ids.find((id) => P.CONT[id].conf === myZ) || ids[0];
    const K = g.ko[st.ccK], C = P.CONT[K.id];
    const sel = `<select class="sel" data-c="ccK" aria-label="Copa">${ids.map((id) => `<option value="${id}" ${id === K.id ? 'selected' : ''}>${esc(P.CONT[id].n)}</option>`).join('')}</select>`;
    const info = { swiss: `36 clubes numa fase de liga: cada um faz ${C.md} jogos contra adversários diferentes. Os 8 primeiros vão às oitavas; do 9º ao 24º jogam o mata-mata de ida e volta por uma vaga. Mata-mata em ida e volta e final em jogo único.`,
      swiss2: '24 clubes, 12 no Leste e 12 no Oeste, em fase de liga com 8 jogos. Os 8 melhores de cada lado vão às oitavas (ida e volta); depois jogo único até a final entre Leste e Oeste.',
      groups: `32 clubes em 8 grupos de 4, ida e volta. Os 2 primeiros de cada grupo vão às oitavas.${K.id === 'sud' ? ' Os segundos colocados ainda enfrentam os terceiros da Libertadores numa repescagem.' : ''} Mata-mata em ida e volta e final em jogo único.`,
      ko27: '27 clubes em mata-mata de ida e volta; os 5 mais fortes começam nas oitavas. Final em jogo único.' }[C.fmt];
    const parts = [];
    if (K.lp && K.lp.groups) parts.push(`<h3 class="cup-h">Fase de grupos</h3><div class="cc-grid">${K.lp.groups.map((gr, gi) => tbl(g, P.lpTable(g, K, gr), `Grupo ${'ABCDEFGH'[gi]}`, 2)).join('')}</div>`);
    else if (K.lp && K.lp.regions) parts.push(`<h3 class="cup-h">Fase de liga</h3><div class="cc-grid">${K.lp.regions.map((ids2, ri) => tbl(g, P.lpTable(g, K, ids2), ri ? 'Oeste' : 'Leste', 8)).join('')}</div>`);
    else if (K.lp) parts.push(`<h3 class="cup-h">Fase de liga</h3>${tbl(g, P.lpTable(g, K), '', 8, 24)}`);
    return `${K.w ? winBox(g, K.w) : ''}<div class="filters" style="margin-bottom:12px">${sel}</div><p class="muted" style="font-size:.85rem;margin:0 0 10px">${esc(info || '')}</p>${K.rounds.length || !K.lp ? koRounds(g, K, C.short) : ''}${parts.join('')}`;
  };
  function tbl(g, rows, title, top, mid) {
    return `<div class="cc-gr">${title ? `<div class="label">${esc(title)}</div>` : ''}<table class="tbl"><tbody>${rows.map((r, i) => { const c = club(g, r.cid); return `<tr class="${r.cid === g.user ? 'me' : ''}"><td class="n"><span class="zone ${i < top ? 'z1' : mid && i < mid ? 'z2' : ''}">${i + 1}</span></td><td><button class="club club-btn" data-a="clubInfo" data-id="${c.id}">${P.badge(c, 18)}<span>${esc(c.short)}</span></button> <small class="muted">${esc(c.country)}</small></td><td class="n"><b>${r.pts}</b></td><td class="n">${r.j}</td><td class="n">${r.gp - r.gc}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  A.CHG.ccK = (el) => { A.st.ccK = el.value; A.render(); };

  // Rótulo das semanas de mata-mata
  const origLabel = P.stepLabel;
  P.stepLabel = function (step) {
    const g = A.g;
    if (!step || step.t !== 'ko' || !g || !g.ko) return origLabel.apply(this, arguments);
    const um = P.userMatch(g, step);
    const pick = (ev) => { const K = g.ko[ev[0]]; if (!K) return null; if (ev[1] === 'lp') return `${K.n} · ${K.lp.groups ? 'Grupos' : 'Fase de liga'}, ${ev[2] + 1}ª rodada`; return `${K.n} · ${K.rounds[ev[1]] ? P.koRoundName(K, ev[1]) : 'mata-mata'}${K.legs[ev[1]] === 2 ? (ev[2] ? ' (volta)' : ' (ida)') : ''}`; };
    if (um && um.kid) { const ev = step.ev.find((e) => e[0] === um.kid); if (ev) return pick(ev); }
    const ev = step.ev.find((e) => g.ko[e[0]] && (g.ko[e[0]].kind === 'cc' || (g.ko[e[0]].c && P.followed(g, P.topDivOf(g.ko[e[0]].c))))) || step.ev[0];
    return ev ? pick(ev) || 'Copas' : 'Copas';
  };

  // Retrospectiva v2
  const origSum = P.normalSummary;
  P.normalSummary = function (g) {
    if (!v2(g)) return origSum.apply(this, arguments);
    const s = g.summary, me = club(g, g.user), h = g.hist[g.hist.length - 1];
    const myC = P.divCountry(me.div);
    const cell = (cid) => { const c = cid && club(g, cid); return c ? `<span class="club">${P.badge(c, 18)}<span class="show-sm">${esc(c.short)}</span><span class="nm-long">${esc(c.name)}</span></span>` : '–'; };
    const mine = [];
    if (s.nc && s.nc[myC] === g.user) mine.push('campeão da ' + P.ncName2(myC));
    for (const [id, w] of Object.entries(s.cont || {})) if (w === g.user) mine.push('campeão da ' + P.CONT[id].n);
    const champs = P.worldCountries().map((c) => {
      const d = P.topDivOf(c), x = s.divs.find((y) => y.d === d), half = (s.titles || []).find((t) => t.half && t.d === d);
      return `<tr class="${c === myC ? 'me' : ''}"><td>${esc(P.countryName(c))}</td><td>${cell(x && x.champ)}${half ? `<small class="muted"> · Apertura: ${esc(club(g, half.cid).short)}</small>` : ''}</td><td>${cell(s.nc && s.nc[c])}</td></tr>`;
    }).join('');
    const cont = Object.entries(s.cont || {}).map(([id, w]) => { const c = club(g, w); return `<div class="rt-note">${c ? P.badge(c, 30) : ''}<div><span class="rt-lbl">${esc(P.CONT[id].n)}</span><b>${esc(c ? c.name : '-')}</b></div></div>`; }).join('');
    const mv = (ids, icon) => ids.map((cid) => `<span class="mv">${icon}${esc(club(g, cid).short)}</span>`).join(' ');
    const fol = P.worldCountries().filter((c) => P.followed(g, P.topDivOf(c)));
    const moves = fol.map((c) => P.countryDivs(c).map((d) => { const x = s.divs.find((y) => y.d === d); if (!x) return ''; return `<tr class="${d === me.div ? 'me' : ''}"><td>${esc(P.divName(d, 1))}</td><td>${esc(club(g, x.champ) ? club(g, x.champ).short : '–')}</td><td>${mv(x.up, '▲ ') || '–'}</td><td>${mv(x.down, '▼ ') || '–'}</td></tr>`; }).join('')).join('');
    const bdo = g.bdo && g.bdo.length && g.bdo[g.bdo.length - 1].s === g.season && P.ballonTable ? `<h3 class="rt-h">Bola de Ouro ${g.season}</h3>${P.ballonTable(g, g.bdo[g.bdo.length - 1], 5)}` : '';
    return `<section class="rt">
      <div class="rt-band"><span>Retrospectiva</span><b>${g.season}</b></div>
      <div class="rt-me">${P.badge(me, 48)}<div><span class="rt-lbl">O ano do ${esc(me.short || me.name)}</span><b>${esc(h.result)}</b><small>${h.pos}º lugar na ${esc(P.divName(h.div))}${mine.length ? ' · ' + esc(mine.join(' · ')) : ''}</small></div></div>
      <h3 class="rt-h">Campeões continentais</h3><div class="rt-notes">${cont || '<p class="muted">—</p>'}</div>
      ${bdo}
      <h3 class="rt-h">Campeões pelo mundo</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>País</th><th>Liga</th><th>Copa</th></tr></thead><tbody>${champs}</tbody></table></div>
      <h3 class="rt-h">Sobe e desce</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Div</th><th>Campeão</th><th>Sobem</th><th>Descem</th></tr></thead><tbody>${moves}</tbody></table></div>
      ${P.seasonExtra ? P.seasonExtra(g) : ''}
      <p class="rt-foot">Na virada os jogadores envelhecem, jovens evoluem e alguns se aposentam. As vagas nas copas continentais saem das tabelas e copas desta temporada.</p>
      <button class="btn primary" data-a="newSeason">Começar temporada ${g.season + 1}</button></section>`;
  };

  // Criação: o modo "Carreira normal" agora usa os formatos reais
  P.generateWorld1 = P.generateWorld; // mundo antigo (só para testes e saves antigos)
  P.generateWorld = P.generateWorld2;
})(window.PFC);
