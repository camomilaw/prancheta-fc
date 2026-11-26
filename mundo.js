/* Prancheta FC — Carreira normal: o mundo das ligas nacionais
 * 15 países, cada um com a sua pirâmide (2 a 4 divisões). Acesso e rebaixamento só dentro do país.
 * Internamente cada divisão ganha um número global (1 = a liga mais forte do mundo), assim o motor do
 * jogo continua funcionando por "divisão"; estas funções dizem a que país e nível cada uma pertence.
 * Ligas que você não acompanha são simuladas em silêncio: só placar e estatística básica dos jogadores.
 * Na Ultraliga (db sem "world") todas as funções daqui devolvem o comportamento de sempre.
 */
(function (P) {
  // rep = força do 1º clube da divisão de cima; sizes = clubes em cada divisão (de cima para baixo); z = continente
  P.WORLD_DEF = [
    { c: 'ENG', rep: 94, sizes: [20, 20, 20, 20], z: 'eu' },
    { c: 'ESP', rep: 92, sizes: [20, 20, 20], z: 'eu' },
    { c: 'ITA', rep: 90, sizes: [20, 20, 20], z: 'eu' },
    { c: 'GER', rep: 90, sizes: [18, 18, 20], z: 'eu' },
    { c: 'FRA', rep: 86, sizes: [18, 18, 18], z: 'eu' },
    { c: 'POR', rep: 82, sizes: [18, 18, 16], z: 'eu' },
    { c: 'NED', rep: 80, sizes: [18, 18], z: 'eu' },
    { c: 'TUR', rep: 77, sizes: [18, 18], z: 'eu' },
    { c: 'BEL', rep: 76, sizes: [16, 16], z: 'eu' },
    { c: 'BRA', rep: 85, sizes: [20, 20, 20, 20], z: 'am' },
    { c: 'ARG', rep: 81, sizes: [20, 20, 18], z: 'am' },
    { c: 'MEX', rep: 76, sizes: [18, 18], z: 'am' },
    { c: 'USA', rep: 73, sizes: [18, 16], z: 'am' },
    { c: 'URU', rep: 71, sizes: [16, 16], z: 'am' },
    { c: 'CHI', rep: 70, sizes: [16, 16], z: 'am' }
  ];
  const SPREAD = 12, DROP = 9;
  const PREP = { ENG: 'da', ESP: 'da', ITA: 'da', GER: 'da', FRA: 'da', POR: 'de', NED: 'da', TUR: 'da', BEL: 'da', BRA: 'do', ARG: 'da', MEX: 'do', USA: 'dos', URU: 'do', CHI: 'do' };
  P.countryPrep = (c) => `${PREP[c] || 'de'} ${P.countryName(c)}`;
  const r2 = (v) => Math.round(v * 100) / 100;

  // ---------- Mundo atual ----------
  P._W = null;
  P.setWorld = function (db) {
    const W = db && db.world;
    P._W = W || null;
    P.DIVS = W ? W.divs.length : 8;
  };
  P.isNormal = (g) => (g ? !!((g.db || g).world) : !!P._W);
  P.divInfo = (d) => (P._W ? P._W.divs[d - 1] || null : null);
  // nível econômico/esportivo comparável entre países (1 = topo; na Ultraliga é o próprio número)
  P.divTier = (d) => { const i = P.divInfo(d); return i ? i.tier : d; };
  P.dt = (c) => (c ? P.divTier(c.div) : 9);
  P.divLvl = (d) => { const i = P.divInfo(d); return i ? i.lvl : d; };
  P.divCountry = (d) => { const i = P.divInfo(d); return i ? i.c : null; };
  P.divSize = (d) => { const i = P.divInfo(d); return i ? i.size : P.DIV_SIZE; };
  P.isTopDiv = (d) => P.divLvl(d) === 1;
  P.divAbove = function (d) {
    const i = P.divInfo(d);
    if (!i) return d > 1 ? d - 1 : null;
    const x = P._W.divs.find((o) => o.c === i.c && o.lvl === i.lvl - 1);
    return x ? x.d : null;
  };
  P.divBelow = function (d) {
    const i = P.divInfo(d);
    if (!i) return d < P.DIVS ? d + 1 : null;
    const x = P._W.divs.find((o) => o.c === i.c && o.lvl === i.lvl + 1);
    return x ? x.d : null;
  };
  // divisões de um país, de cima para baixo
  P.countryDivs = (c) => (P._W ? P._W.divs.filter((o) => o.c === c).sort((a, b) => a.lvl - b.lvl).map((o) => o.d) : []);
  P.worldCountries = () => (P._W ? P.WORLD_DEF.filter((w) => P._W.divs.some((o) => o.c === w.c)).map((w) => w.c) : []);
  P.topDivOf = (c) => P.countryDivs(c)[0] || 1;

  // "3ª divisão" (Ultraliga) ou "1ª divisão da Inglaterra"; curto: "3ª" / "1ª ING"
  P.divName = function (d, short) {
    const i = P.divInfo(d);
    if (!i) return short ? `${d}ª` : `${d}ª divisão`;
    return short ? `${i.lvl}ª ${i.c}` : `${i.lvl}ª divisão ${P.countryPrep(i.c)}`;
  };
  // nome do título da liga: "Ultraliga" / "3ª divisão" / "Campeonato da Inglaterra" / "2ª divisão da Inglaterra"
  P.leagueTitle = function (d) {
    const i = P.divInfo(d);
    if (!i) return d === 1 ? 'Ultraliga' : `${d}ª divisão`;
    return i.lvl === 1 ? `Campeonato ${P.countryPrep(i.c)}` : P.divName(d);
  };

  // Regras de acesso e rebaixamento de cada divisão
  P.zoneRules = function (d) {
    if (!P._W) return { up: d > 1 ? P.RULES.autoUp : 0, po: d > 1 ? P.RULES.playoff : null, down: d < P.DIVS ? P.RULES.down : 0 };
    const above = P.divAbove(d), below = P.divBelow(d);
    const n = (a, b) => (Math.min(P.divSize(a), P.divSize(b)) >= 18 ? 3 : 2);
    return { up: above ? n(above, d) : 0, po: null, down: below ? n(d, below) : 0 };
  };

  // Ligas acompanhadas: o país do seu clube e os que você escolheu ao criar a carreira
  P.followed = function (g, d) {
    if (!P.isNormal(g)) return true;
    const c = P.divCountry(d);
    const me = P.club(g, g.user);
    return (me && P.divCountry(me.div) === c) || (g.follow || []).includes(c);
  };
  P.silentClub = (g, cid) => { const c = P.club(g, cid); return !!c && !P.followed(g, c.div); };

  // ---------- Economia por divisão ----------
  // Cota de TV interpolada pelo nível: a 1ª da Inglaterra recebe como a 1ª da Ultraliga
  const tvAt = (t) => {
    const T = P.ECON_TV0, x = P.clamp(t, 1, T.length) - 1, i = Math.floor(x), f = x - i;
    if (i >= T.length - 1) return T[T.length - 1];
    return Math.round(Math.exp(Math.log(T[i]) * (1 - f) + Math.log(T[i + 1]) * f) / 1e5) * 1e5;
  };
  const origEcon = P.applyEcon;
  P.applyEcon = function (db) {
    P.setWorld(db);
    origEcon(db);
    if (db && db.world) P.ECON.tv = db.world.divs.map((o) => tvAt(o.tier));
  };

  // ---------- Gerar o mundo ----------
  P.generateWorld = function (seed) {
    const r = P.rng(seed || 2027);
    const towns = {}, shorts = {}, used = new Set(); // cidades e siglas únicas dentro de cada país
    const entries = [];
    for (const W of P.WORLD_DEF) W.sizes.forEach((size, i) => { const top = W.rep - i * DROP; entries.push({ c: W.c, z: W.z, lvl: i + 1, size, top, avg: top - SPREAD / 2 }); });
    entries.sort((a, b) => b.avg - a.avg || a.lvl - b.lvl);
    const topAvg = entries[0].avg;
    const db = { version: P.VERSION, clubs: [], players: {}, world: { v: 1, divs: [] } };
    let pc = 1, cc = 1;
    entries.forEach((e, i) => {
      const d = i + 1;
      db.world.divs.push({ d, c: e.c, z: e.z, lvl: e.lvl, size: e.size, tier: r2(P.clamp(1 + (topAvg - e.avg) / 6.29, 1, 9)) });
      for (let k = 0; k < e.size; k++) {
        const meta = P.clubMeta(r, e.c, towns[e.c] = towns[e.c] || new Set(), shorts[e.c] = shorts[e.c] || new Set());
        const rep = Math.round((e.top - SPREAD * k / (e.size - 1) + P.gauss(r) * 1.2) * 10) / 10;
        const club = Object.assign({ id: 'c' + (cc++), country: e.c }, meta, { rep, div: d });
        db.clubs.push(club);
        P.makeSquad(r, db, club, used, () => 'p' + (pc++));
      }
    });
    P.setWorld(db);
    return db;
  };

  // Calendário: ligas menores têm rodadas vazias espalhadas, para todas terminarem juntas
  P.padRounds = function (rounds, R) {
    const n = rounds.length;
    if (n >= R || n < 2) return rounds;
    const out = Array.from({ length: R }, () => []);
    rounds.forEach((rd, i) => { out[Math.round(i * (R - 1) / (n - 1))] = rd; });
    return out;
  };

  // Calendário da Carreira normal (as copas entram pelo P.normalCupSteps, quando existir)
  P.normalCalendar = function (g, rounds) {
    const extra = P.normalCupSteps ? P.normalCupSteps(g, rounds) : {};
    for (let lr = 0; lr < rounds; lr++) {
      g.cal.push({ t: 'lg', r: lr });
      (extra[lr + 1] || []).forEach((st) => g.cal.push(st));
    }
    (extra.end || []).forEach((st) => g.cal.push(st));
  };

  // Acesso e rebaixamento dentro de cada país (fim de temporada)
  P.normalMoves = function (g, sum) {
    const moves = {};
    for (let d = 1; d <= P.DIVS; d++) {
      const tb = P.table(g, d).map((x) => x.cid);
      const z = P.zoneRules(d);
      const up = z.up ? tb.slice(0, z.up) : [];
      const down = z.down ? tb.slice(-z.down) : [];
      up.forEach((cid) => { moves[cid] = P.divAbove(d); });
      down.forEach((cid) => { moves[cid] = P.divBelow(d); });
      sum.divs.push({ d, champ: tb[0], up, down });
    }
    return moves;
  };

  // ---------- Simulação silenciosa ----------
  const SC_W = { ATA: 5, PD: 3, PE: 3, MEI: 2.5, MC: 1.2, VOL: 0.6, ZAG: 0.5, LD: 0.5, LE: 0.5, GOL: 0 };
  const AS_W = { MEI: 4, PD: 3.5, PE: 3.5, MC: 2.5, ATA: 2, LD: 1.5, LE: 1.5, VOL: 1, ZAG: 0.4, GOL: 0.05 };
  function poisson(r, l) { let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= r(); } while (p > L); return k - 1; }
  function xiOf(g, cid) {
    const sq = P.squad(g, cid).filter((p) => !p.inj && !p.susp).map((p) => ({ p, o: P.ovr(p) })).sort((a, b) => b.o - a.o);
    const gk = sq.find((x) => x.p.pos === 'GOL');
    const out = sq.filter((x) => x.p.pos !== 'GOL').slice(0, 10);
    return (gk ? [gk] : []).concat(out).map((x) => x.p);
  }
  const wpick = (r, arr, wf) => { let t = 0; const w = arr.map((x) => { const v = wf(x); t += v; return v; }); let x = r() * t; for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x <= 0) return arr[i]; } return arr[arr.length - 1]; };
  // ovrs: força dos clubes (P.clubOvrs). Devolve o jogo pronto, sem eventos guardados.
  P.quickMatch = function (g, it, ovrs) {
    const r = Math.random, m = it.m;
    const d = ((ovrs[m.h] || 60) - (ovrs[m.a] || 60)) * 0.085 + (m.neutral ? 0 : 0.2);
    m.hg = poisson(r, 1.25 * Math.exp(d / 2)); m.ag = poisson(r, 1.25 * Math.exp(-d / 2));
    m.done = true; m.q = 1;
    if (it.ko) {
      if (m.hg === m.ag) { const hw = r() < 0.5 + d * 0.05; m.pen = hw ? [4, 3] : [3, 4]; }
      m.w = m.hg > m.ag ? m.h : m.hg < m.ag ? m.a : (m.pen[0] > m.pen[1] ? m.h : m.a);
    }
    const lg = it.comp === 'lg';
    [[m.h, m.hg, m.ag], [m.a, m.ag, m.hg]].forEach(([cid, gf, ga]) => {
      const xi = xiOf(g, cid); if (!xi.length) return;
      const note = {};
      xi.forEach((p) => { note[p.id] = 6.28 + (P.ovr(p) - 65) * 0.012 + (gf > ga ? 0.4 : gf < ga ? -0.4 : 0) + P.gauss(r) * 0.55 + (p.pos === 'GOL' && !ga ? 0.6 : 0); });
      for (let k = 0; k < gf; k++) {
        const sc = wpick(r, xi, (p) => (SC_W[p.pos] || 0.5) * Math.pow(P.ovr(p) / 60, 3.2));
        if (lg) sc.s.g++; else sc.s.cg++;
        note[sc.id] += 0.9;
        if (r() < 0.72) {
          const others = xi.filter((p) => p !== sc);
          const as = wpick(r, others, (p) => (AS_W[p.pos] || 0.5) * Math.pow(P.ovr(p) / 60, 2));
          as.s.as++; note[as.id] += 0.4;
        }
      }
      xi.forEach((p) => { p.s.j++; p.s.nt += Math.round(P.clamp(note[p.id], 4, 10) * 10) / 10; });
    });
  };
})(window.PFC);
