/* Prancheta FC — Ultraliga Sub-20, olheiros e equipe técnica
 * Seu Sub-20 tem jogadores de verdade. Os Sub-20 dos outros clubes jogam a liga
 * com uma força de equipe (mantém o save leve). Olheiros vasculham regiões do
 * mundo com um foco e mandam relatórios a cada 4 semanas.
 */
(function (P) {
  const A = P.app, esc = P.esc;

  P.YOUTH = { maxSquad: 24, startSquad: 18, wage: 2000, reportEvery: 8, maxScouts: 3, maxAge: 19, gemChance: 1 / 150 };
  // Joia rara: de vez em nunca aparece um garoto de potencial de craque, seja qual for o clube
  const gemPot = (r) => 85 + Math.floor(r() * 11); // 85 a 95

  P.REGIONS = {
    mundo: { n: 'Mundo inteiro', c: Object.keys(P.COUNTRIES) },
    bra: { n: 'Brasil', c: ['BRA'] },
    sula: { n: 'América do Sul', c: ['BRA', 'ARG', 'URU', 'COL', 'CHI', 'PAR', 'PER', 'ECU', 'VEN'] },
    africa: { n: 'África', c: ['NGA', 'GHA', 'SEN', 'CIV', 'CMR', 'MAR', 'EGY', 'ALG', 'ANG', 'MOZ', 'CPV'] },
    asia: { n: 'Ásia e Oceania', c: ['JPN', 'KOR', 'CHN', 'HKG', 'KSA', 'AUS'] },
    nordic: { n: 'Escandinávia e Ilhas Britânicas', c: ['DEN', 'SWE', 'NOR', 'IRL', 'WAL', 'SCO', 'ENG'] },
    leste: { n: 'Leste Europeu e Alpes', c: ['CRO', 'SRB', 'POL', 'SUI', 'AUT'] },
    arg: { n: 'Argentina e Uruguai', c: ['ARG', 'URU'] },
    nort: { n: 'América do Norte', c: ['MEX', 'USA'] },
    euo: { n: 'Europa Ocidental', c: ['ENG', 'SCO', 'FRA', 'BEL', 'NED'] },
    ibe: { n: 'Espanha e Portugal', c: ['ESP', 'POR'] },
    euc: { n: 'Alemanha e Itália', c: ['GER', 'ITA'] },
    les: { n: 'Turquia e Grécia', c: ['TUR', 'GRE'] }
  };
  // Focos de busca: posição + atributos que o olheiro procura
  P.FOCUS = {
    any: { n: 'Melhor talento disponível', pos: null, b: {} },
    cab: { n: 'Atacante cabeceador', pos: ['ATA'], b: { cab: 4, for: 2 } },
    fin: { n: 'Centroavante finalizador', pos: ['ATA'], b: { fin: 4, com: 2 } },
    dri: { n: 'Ponta driblador', pos: ['PD', 'PE'], b: { dri: 4, vel: 2 } },
    vel: { n: 'Ponta veloz', pos: ['PD', 'PE'], b: { vel: 4, cru: 2 } },
    arm: { n: 'Meia armador', pos: ['MEI'], b: { vis: 4, pas: 2 } },
    vla: { n: 'Volante armador', pos: ['VOL'], b: { pas: 3, vis: 3 } },
    vlm: { n: 'Volante marcador', pos: ['VOL'], b: { des: 4, mar: 2 } },
    zag: { n: 'Zagueiro de imposição', pos: ['ZAG'], b: { cab: 3, des: 3 } },
    lat: { n: 'Lateral ofensivo', pos: ['LD', 'LE'], b: { cru: 3, vel: 3 } },
    gol: { n: 'Goleiro de reflexo', pos: ['GOL'], b: { ref: 4, um1: 2 } }
  };
  // Missão por continente/país e por posição/área do campo
  P.CONTINENTS = {
    sam: { n: 'América do Sul', c: ['BRA', 'ARG', 'URU', 'COL', 'CHI', 'PAR', 'PER', 'ECU', 'VEN', 'BOL', 'SUR'] },
    nca: { n: 'América do Norte e Central', c: ['MEX', 'USA', 'CAN', 'JAM', 'PAN', 'CRC', 'DOM', 'SLV', 'GUA'] },
    eur: { n: 'Europa', c: ['ENG', 'SCO', 'WAL', 'NIR', 'IRL', 'ESP', 'POR', 'FRA', 'BEL', 'NED', 'LUX', 'GER', 'ITA', 'SUI', 'AUT', 'DEN', 'SWE', 'NOR', 'FIN', 'ISL', 'FRO', 'POL', 'CZE', 'SVK', 'HUN', 'CRO', 'SRB', 'SVN', 'BIH', 'MNE', 'MKD', 'KOS', 'ALB', 'ROU', 'BUL', 'MDA', 'UKR', 'RUS', 'LTU', 'LVA', 'EST', 'GRE', 'TUR', 'CYP', 'ISR', 'GEO', 'ARM'] },
    afr: { n: 'África', c: ['NGA', 'GHA', 'SEN', 'CIV', 'CMR', 'MAR', 'EGY', 'ALG', 'TUN', 'ANG', 'MOZ', 'CPV', 'MLI', 'GUI', 'BFA', 'COD', 'GAB', 'CAF', 'GAM', 'GNB', 'GNQ', 'BDI', 'ZIM', 'RSA', 'ZAM', 'BEN', 'TOG'] },
    asi: { n: 'Ásia', c: ['JPN', 'KOR', 'CHN', 'HKG', 'KSA', 'UZB', 'IRN', 'JOR', 'IDN'] },
    oce: { n: 'Oceania', c: ['AUS', 'NZL'] }
  };
  P.LINES_N = { GOL: 'Goleiros', DEF: 'Defesa (zagueiros e laterais)', MEI: 'Meio-campo (volantes e meias)', ATA: 'Ataque (pontas e atacantes)' };
  const contCountries = (cont) => (cont && P.CONTINENTS[cont] ? P.CONTINENTS[cont].c : Object.keys(P.COUNTRIES)).filter((k) => P.COUNTRIES[k]);
  const posPick = (r, want) => {
    if (!want || want === 'any') return null;
    if (want.startsWith('L:')) return P.weighted(r, P.POS.filter((x) => P.LINE[x] === want.slice(2)), (x) => P.SQUAD_TEMPLATE[x] || 1);
    return want;
  };
  const posLabel = (want) => (!want || want === 'any' ? 'Qualquer posição' : want.startsWith('L:') ? P.LINES_N[want.slice(2)] : P.POS_NAME[want]);
  P.missionLabel = function (m) {
    if (!m) return '';
    if (m.cont === undefined) return `${P.FOCUS[m.focus] ? P.FOCUS[m.focus].n : ''} · ${P.REGIONS[m.region] ? P.REGIONS[m.region].n : ''}`;
    const place = m.nat ? P.countryName(m.nat) : m.cont ? P.CONTINENTS[m.cont].n : 'Mundo inteiro';
    return `${posLabel(m.pos)} · ${place}`;
  };
  const STAR_WAGE = [0, 8000, 20000, 45000, 90000, 160000];
  const STAR_ERR = [0, 12, 9, 6, 4, 2]; // margem do potencial no relatório
  // Duração da missão: mais tempo = relatório maior, jovens um pouco melhores e avaliação mais precisa
  P.MISSION_DUR = {
    3: { n: '3 meses', q: 0, err: 1, gem: 1, desc: 'relatórios frequentes' },
    6: { n: '6 meses', q: 1.5, err: 0.8, gem: 1.25, desc: 'mais jovens e um pouco melhores' },
    9: { n: '9 meses', q: 3, err: 0.6, gem: 1.5, desc: 'o maior e mais preciso relatório' }
  };
  const durOf = (m) => P.MISSION_DUR[(m && m.dur) || 3] || P.MISSION_DUR[3];
  P.missionWeeks = (g, m) => Math.round(((m && m.dur) || 3) * g.cal.length / 12);

  // ---------- Geração ----------
  function youthPlayer(r, opts) {
    const age = opts.age || 15 + Math.floor(r() * 4);
    const potO = P.clamp(Math.round(opts.potO), 40, 97);
    const gap = { 15: 26, 16: 21, 17: 16, 18: 11, 19: 7 }[age] || 8;
    const target = P.clamp(potO - gap - Math.abs(P.gauss(r)) * 3, 30, 85);
    const p = P.makePlayer(r, { pos: opts.pos, level: target / 5 - 0.4, age: 24, nat: opts.nat, used: opts.used, id: P.uid('y'), newgen: true });
    p.age = age;
    for (const [k, v] of Object.entries(opts.boost || {})) p.a[k] = P.clamp(p.a[k] + v, 1, 20);
    p.potO = Math.max(potO, P.ovr(p) + 2);
    p.pot = p.potO / 5;
    p.clubId = null; p.wage = P.YOUTH.wage; p.ctr = 0;
    return p;
  }
  function randomPos(r) { return P.weighted(r, P.POS, (x) => P.SQUAD_TEMPLATE[x]); }

  function makeCandidates(g) {
    if (P.staffCandidates) { P.staffCandidates(g); return; }
    const r = Math.random;
    const names = new Set();
    g.y.cands = Array.from({ length: 5 }, () => {
      const stars = P.weighted(r, [1, 2, 3, 4, 5], (s) => [0, 30, 30, 22, 12, 6][s]);
      const nat = P.pick(r, Object.keys(P.COUNTRIES));
      return { id: P.uid('s'), role: 'olheiro', name: P.makeName(r, names, nat), nat, stars, wage: STAR_WAGE[stars], fee: STAR_WAGE[stars] * 6 };
    }).sort((a, b) => b.stars - a.stars);
  }

  function seasonSetup(g) {
    const r = Math.random;
    g.y.str = {};
    for (const c of g.db.clubs) g.y.str[c.id] = Math.round(((P.levelFromRep(c.rep) - 2) * 5 + P.gauss(r) * 3) * 10) / 10;
    g.y.res = {};
    g.y.season = g.season;
  }

  P.ensureYouth = function (g) {
    if (g.y) return;
    const r = Math.random;
    const me = P.club(g, g.user);
    g.y = { squad: {}, xi: [], res: {}, str: {}, staff: [], cands: [], reports: [], season: g.season };
    const used = new Set();
    for (let i = 0; i < P.YOUTH.startSquad; i++) {
      const pos = i < 2 ? 'GOL' : randomPos(r);
      const potO = P.levelFromRep(me.rep) * 5 + 4 + P.gauss(r) * 8;
      const p = youthPlayer(r, { pos, potO, nat: P.pickNat(r, me.country), used });
      g.y.squad[p.id] = p;
    }
    seasonSetup(g);
    makeCandidates(g);
  };

  // ---------- Partidas do Sub-20 ----------
  const poisson = (r, l) => { let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= r(); } while (p > L && k < 12); return k - 1; };
  P.youthXI = function (g) {
    const list = Object.values(g.y.squad).filter((p) => !p.inj);
    const slots = P.slots('4-4-2');
    const chosen = (g.y.xi || []).map((id) => g.y.squad[id]).filter((p) => p && !p.inj);
    if (chosen.length === 11) return chosen.map((p, i) => ({ p, pos: slots[i] ? slots[i].pos : p.pos }));
    const pairs = [];
    slots.forEach((s, i) => list.forEach((p) => pairs.push({ i, p, sc: P.ovrAt(p, s.pos) })));
    pairs.sort((a, b) => b.sc - a.sc);
    const xi = new Array(11).fill(null), used = new Set();
    for (const pr of pairs) { if (xi[pr.i] || used.has(pr.p.id)) continue; xi[pr.i] = pr.p; used.add(pr.p.id); }
    return xi.map((p, i) => p && { p, pos: slots[i].pos }).filter(Boolean);
  };
  P.youthStrength = function (g) {
    const xi = P.youthXI(g);
    if (!xi.length) return 30;
    return xi.reduce((s, x) => s + P.ovrAt(x.p, x.pos), 0) / 11;
  };

  function playYouthRound(g, step) {
    const r = Math.random;
    const myStr = P.youthStrength(g);
    for (let d = 1; d <= P.DIVS; d++) {
      const rd = g.lg[d][step.r] || [];
      const out = rd.map((m) => {
        const sh = m.h === g.user ? myStr : g.y.str[m.h] || 50;
        const sa = m.a === g.user ? myStr : g.y.str[m.a] || 50;
        const hg = poisson(r, 1.35 * Math.pow(sh / sa, 2) * 1.1), ag = poisson(r, 1.35 * Math.pow(sa / sh, 2) / 1.1);
        if (m.h === g.user || m.a === g.user) youthStats(g, m.h === g.user ? hg : ag, m.h === g.user ? ag : hg, m.h === g.user ? m.a : m.h, m.h === g.user);
        return [hg, ag];
      });
      (g.y.res[d] = g.y.res[d] || {})[step.r] = out;
    }
  }
  function youthStats(g, gf, ga, opp, home) {
    const r = Math.random;
    const xi = P.youthXI(g);
    const res = Math.sign(gf - ga);
    const scorers = [];
    for (let i = 0; i < gf; i++) {
      const s = P.weighted(r, xi.filter((x) => x.pos !== 'GOL'), (x) => ({ ATA: 5, PD: 3, PE: 3, MEI: 3, MC: 1.5, VOL: 0.7 }[x.pos] || 0.4) * x.p.a.fin);
      if (s) { s.p.s.g++; scorers.push(s.p.name); }
    }
    for (const x of xi) {
      x.p.s.j++;
      const goals = scorers.filter((n) => n === x.p.name).length;
      x.p.s.nt = Math.round((x.p.s.nt + P.clamp(6.3 + goals * 0.9 + res * 0.4 + P.gauss(r) * 0.4, 3, 10)) * 10) / 10;
    }
    g.y.last = { opp, home, gf, ga, scorers, w: g.week + 1 };
  }

  // ---------- Olheiros ----------
  function makeReport(g, s) {
    const r = Math.random;
    const m = s.mission;
    const legacy = m.cont === undefined; // missões antigas (região + foco)
    const reg = legacy ? P.REGIONS[m.region] : { n: m.nat ? P.countryName(m.nat) : m.cont ? P.CONTINENTS[m.cont].n : 'Mundo inteiro', c: m.nat ? [m.nat] : contCountries(m.cont) };
    const foc = legacy ? P.FOCUS[m.focus] : { n: posLabel(m.pos), pos: null, b: {} };
    const D = durOf(m), months = m.dur || 3;
    const n = (1 + Math.floor(s.stars / 2) + 1) * (months / 3);
    const players = [], gems = [];
    for (let i = 0; i < n; i++) {
      const pos = legacy ? (foc.pos ? P.pick(r, foc.pos) : randomPos(r)) : (posPick(r, m.pos) || randomPos(r));
      // o talento que aceita vir acompanha o tamanho do clube (reputação); olheiro melhor acha um pouco acima
      const base = P.levelFromRep(P.club(g, g.user).rep) * 5 + 6;
      const gem = r() < P.YOUTH.gemChance * D.gem;
      const potO = gem ? gemPot(r) : base + 1.5 + D.q + (s.stars - 2.5) * 3 + P.gauss(r) * 6 + (r() < 0.04 ? 8 : 0);
      const p = youthPlayer(r, { pos, potO, nat: P.pick(r, reg.c), boost: foc.b });
      if (gem) { p.gem = true; gems.push(p.name); }
      const err = Math.max(1, Math.round(STAR_ERR[s.stars] * D.err));
      const off = Math.round((r() * 2 - 1) * err * 0.7);
      p.lo = P.clamp(p.potO - err + off, 35, 99); p.hi = P.clamp(p.potO + err + off, p.lo + 2, 99);
      if (p.potO < p.lo) p.lo = p.potO; if (p.potO > p.hi) p.hi = p.potO;
      const mid = (p.lo + p.hi) / 2;
      p.fee = Math.max(50000, Math.round(Math.pow(Math.max(mid - 45, 2), 2) * 900 / 10000) * 10000);
      players.push(p);
    }
    g.y.reports.unshift({ id: P.uid('r'), sid: s.id, scout: s.name, stars: s.stars, region: m.region, focus: m.focus, lbl: P.missionLabel(m) + ' · ' + D.n, s: g.season, w: g.week + 1, players });
    if (g.y.reports.length > 8) g.y.reports.length = 8;
    P.news(g, `Relatório do olheiro ${s.name}: ${n} ${n === 1 ? 'jovem' : 'jovens'} (${foc.n.toLowerCase()}, ${reg.n}). Veja em Sub-20 › Relatórios.`, 'good');
    if (gems.length) { P.news(g, `${s.name} está empolgado: "${gems.join(' e ')} pode ser uma joia rara, daquelas que aparecem uma vez na vida." Veja em Sub-20 › Relatórios.`, 'good'); if (P.flash) P.flash(g, { pri: 3, ttl: 2, kicker: 'Olheiros · ' + reg.n, head: `Olheiro descobre joia: ${gems[0]}`, dek: `${s.name} voltou empolgado da missão: "pode ser uma joia rara, daquelas que aparecem uma vez na vida". O relatório está no Sub-20.` }); }
  }

  // ---------- Hooks do motor ----------
  P.youthWeek = function (g, step) {
    if (!g.y) P.ensureYouth(g);
    if (step.t === 'lg') playYouthRound(g, step);
    for (const s of g.y.staff) {
      if (s.role !== 'olheiro' || !s.mission) continue;
      const m = s.mission;
      if (m.left == null) m.left = Math.max(1, Math.min(P.missionWeeks(g, m), (m.next || 0) - g.week - 1)); // missões antigas
      m.left--;
      if (m.left <= 0) { makeReport(g, s); m.left = P.missionWeeks(g, m); }
    }
    if (P.staffWeek) P.staffWeek(g);
    // salários da base e da equipe técnica
    const yw = Object.keys(g.y.squad).length * P.YOUTH.wage;
    const sw = g.y.staff.reduce((t, s) => t + s.wage, 0);
    if (yw) P.pay(g, g.user, -yw * 12 / g.cal.length, 'Base');
    if (sw) P.pay(g, g.user, -sw * 12 / g.cal.length, 'Equipe técnica');
    // meio da temporada: jovens evoluem um pouco
    if (step.t === 'lg' && step.r === 20) { // meio do ano (rodada 21)
      grow(g, 0.5);
      if (P.potentialUpdate) P.potentialUpdate(g, 'mid');
    }
  };
  function grow(g, f) {
    const r = Math.random;
    for (const p of Object.values(g.y.squad)) {
      const gap = p.potO - P.ovr(p);
      if (gap <= 0) continue;
      const pts = P.clamp(gap * 0.22, 0, 5.5) * f * (p.s.j >= 8 ? 1.2 : 1) * (P.staffStars ? 1 + 0.08 * P.staffStars(g, 'tsub') : 1) * (P.facLvl ? 1 + (P.facLvl(g, 'base') - 3) * 0.06 : 1) * (P.adF ? P.adF(g, p) : 1) * (P.coachHas && P.coachHas(g, 'formador') ? 1.2 : 1);
      for (const at of P.ATTRS) {
        if (P.GK_ATTRS.includes(at.k) && p.pos !== 'GOL') continue;
        p.a[at.k] = P.clamp(p.a[at.k] + P.sround(r, pts / 5 * (1 + P.gauss(r) * 0.3)), 1, 20);
      }
    }
  }
  P.youthTable = function (g, d) {
    const rows = {};
    for (const c of P.divClubs(g.db, d)) rows[c.id] = { cid: c.id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 };
    const res = (g.y && g.y.res[d]) || {};
    for (const [ri, list] of Object.entries(res)) {
      (g.lg[d][ri] || []).forEach((m, i) => {
        const sc = list[i]; if (!sc || !rows[m.h] || !rows[m.a]) return;
        const H = rows[m.h], Aw = rows[m.a];
        H.j++; Aw.j++; H.gp += sc[0]; H.gc += sc[1]; Aw.gp += sc[1]; Aw.gc += sc[0];
        if (sc[0] > sc[1]) { H.v++; Aw.d++; H.pts += 3; } else if (sc[0] < sc[1]) { Aw.v++; H.d++; Aw.pts += 3; } else { H.e++; Aw.e++; H.pts++; Aw.pts++; }
      });
    }
    return Object.values(rows).sort((a, b) => b.pts - a.pts || b.v - a.v || (b.gp - b.gc) - (a.gp - a.gc));
  };
  // Virada de temporada (chamado depois da troca de divisões e de ano)
  P.youthSeason = function (g) {
    if (!g.y) { P.ensureYouth(g); return; }
    const me = P.club(g, g.user);
    const prevDiv = Object.keys(g.y.res).length ? me.div : null;
    void prevDiv;
    grow(g, 1);
    const out = [], up = [];
    for (const p of Object.values(g.y.squad)) {
      if (P.xp) p.xp = P.clamp(Math.round((P.xp(p) + 0.4 + (p.s.j >= 10 ? 0.4 : 0)) * 10) / 10, 1, 20);
      p.age++;
      p.s = P.blankStats(); p.inj = 0;
      if (p.age > P.YOUTH.maxAge) {
        // passou da idade: sobe se tiver vaga e nível, senão é dispensado
        const squad = P.squad(g, g.user);
        const worst = squad.length ? Math.min(...squad.map(P.ovr)) : 0;
        if (squad.length < P.MARKET.maxSquad && P.ovr(p) >= worst - 5) { P.promoteYouth(g, p.id, true); up.push(p.name); }
        else { delete g.y.squad[p.id]; out.push(p.name); }
      }
    }
    g.y.xi = (g.y.xi || []).filter((id) => g.y.squad[id]);
    // nova geração da base: 4 garotos de 15-16 anos, e completa até 16 jovens
    const r = Math.random, fresh = [];
    const n = Object.keys(g.y.squad).length;
    for (let i = 0; i < Math.max(4, 16 - n) && n + i < P.YOUTH.maxSquad; i++) {
      const gem = r() < P.YOUTH.gemChance;
      const y = youthPlayer(r, { pos: randomPos(r), potO: gem ? gemPot(r) : P.levelFromRep(me.rep) * 5 + 4 + P.gauss(r) * 8 + (r() < 0.05 ? 10 : 0) + (P.facLvl ? (P.facLvl(g, 'base') - 2.5) * 3.5 + 1 : 0), age: 15 + Math.floor(r() * 2), nat: P.pickNat(r, me.country) });
      if (gem) { y.gem = true; P.news(g, `Os treinadores da base não param de falar de ${y.name} (${y.age} anos): pode ser uma joia rara, daquelas que aparecem uma vez na vida.`, 'good'); if (P.flash) P.flash(g, { pri: 3, ttl: 2, kicker: 'Categorias de base', head: `Nasce uma joia: ${y.name}, ${y.age} anos`, dek: `Os treinadores da base do ${me.name} não falam de outra coisa. Pode ser daqueles que aparecem uma vez na vida.` }); }
      g.y.squad[y.id] = y; fresh.push(y.name);
    }
    if (fresh.length) P.news(g, `Nova geração na base: ${fresh.join(', ')} chegaram ao Sub-20.`, '');
    seasonSetup(g);
    makeCandidates(g);
    if (P.staffSeason) P.staffSeason(g);
    if (up.length) P.news(g, `Completaram 20 anos e subiram ao profissional: ${up.join(', ')}.`, 'good');
    if (out.length) P.news(g, `Completaram 20 anos sem espaço no profissional e deixaram o clube: ${out.join(', ')}.`, '');
  };

  P.promoteYouth = function (g, id, silent) {
    const p = g.y.squad[id]; if (!p) return 'Jogador não encontrado.';
    if (P.squad(g, g.user).length >= P.MARKET.maxSquad) return `O elenco profissional já tem ${P.MARKET.maxSquad} jogadores.`;
    delete g.y.squad[id];
    g.y.xi = (g.y.xi || []).filter((x) => x !== id);
    p.clubId = g.user; p.pot = p.potO / 5; p.wage = P.wageFor(p); p.ctr = g.season + 3;
    p.s = P.blankStats(); p.cond = 100; p.mor = 75;
    g.db.players[p.id] = p;
    P.dirty(g); P.fixXI(g, g.user);
    if (!silent) P.news(g, `${p.name} (${p.age} anos) foi promovido do Sub-20 ao profissional.`, 'good');
    return '';
  };

  // Devolver ao Sub-20 um jogador do profissional que ainda tem idade de base
  P.canDemote = (g, p) => g.y && p.clubId === g.user && p.age <= P.YOUTH.maxAge && !p.loan;
  P.demoteYouth = function (g, id) {
    const p = g.db.players[id]; if (!p || !P.canDemote(g, p)) return 'Só jogadores do seu elenco com idade de Sub-20 podem voltar para a base.';
    if (Object.keys(g.y.squad).length >= P.YOUTH.maxSquad) return `O Sub-20 já tem ${P.YOUTH.maxSquad} jogadores.`;
    if (P.squad(g, g.user).length <= 16) return 'O elenco profissional ficaria curto demais.';
    delete g.db.players[id];
    g.offers = (g.offers || []).filter((o) => o.pid !== id);
    p.potO = p.potO || Math.round((p.pot || P.ovr(p) / 5) * 5);
    p.clubId = null; p.wage = P.YOUTH.wage; p.ctr = 0; p.listed = false; p.loanList = false;
    p.s = P.blankStats();
    g.y.squad[id] = p;
    P.dirty(g); P.fixXI(g, g.user);
    P.news(g, `${p.name} (${p.age} anos) voltou para o Sub-20.`, '');
    return '';
  };

  // ---------- Tela: Sub-20 e equipe técnica ----------
  const club = (cid) => A.g.db.clubs.find((c) => c.id === cid);
  const potTxt = (p) => (p.lo ? `${p.lo}-${p.hi}` : `${Math.max(P.ovr(p), p.potO - 4)}-${p.potO + 3}`) + (p.potT ? (p.potT > 0 ? ' ↑' : ' ↓') : '');
  function yrow(p, extra) {
    return `<button class="prow" data-a="ySheet" data-id="${p.id}"><span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
      <span class="nm"><b>${esc(p.name)}${p.gem ? '<span class="chip gem">Joia rara</span>' : ''}${(A.g.y.xi || []).includes(p.id) ? '<span class="chip xi">Titular</span>' : ''}</b><small>${esc(p.nat)} · ${p.age} anos · pot. ${potTxt(p)} · ${p.s.j} J · ${p.s.g} G</small></span>
      ${extra || '<span></span>'}<span class="ovr">${P.ovr(p)}</span></button>`;
  }
  P.baseView = function () {
    const g = A.g;
    if (!g.y) P.ensureYouth(g);
    const st = A.st.yb || (A.st.yb = { tab: 'elenco' });
    const tabs = `<div class="seg">${[['elenco', 'Elenco Sub-20'], ['tabela', 'Tabela'], ['olheiros', 'Olheiros'], ['rel', `Relatórios${g.y.reports.length ? ' (' + g.y.reports.length + ')' : ''}`]].map(([k, n]) => `<button class="${st.tab === k ? 'on' : ''}" data-a="yTab" data-k="${k}">${n}</button>`).join('')}</div>`;
    let body = '';
    const me = club(g.user);
    if (st.tab === 'elenco') {
      const list = Object.values(g.y.squad).sort((a, b) => b.potO - a.potO);
      const custom = (g.y.xi || []).length === 11;
      body = `<p class="muted" style="margin:0 0 10px;font-size:.88rem">${list.length}/${P.YOUTH.maxSquad} jovens · força do time ${Math.round(P.youthStrength(g))} · escalação ${custom ? 'manual (11 escolhidos)' : 'automática'}. Aos 20 anos o jogador sobe ao profissional ou é dispensado.</p>
        ${g.y.last ? `<div class="msg" style="margin-bottom:10px">Último jogo: ${g.y.last.home ? me.short : esc(club(g.y.last.opp).short)} ${g.y.last.home ? g.y.last.gf : g.y.last.ga} × ${g.y.last.home ? g.y.last.ga : g.y.last.gf} ${g.y.last.home ? esc(club(g.y.last.opp).short) : me.short}${g.y.last.scorers.length ? ' · gols: ' + esc(g.y.last.scorers.join(', ')) : ''}</div>` : ''}
        ${custom ? '<div style="margin-bottom:10px"><button class="btn sm" data-a="yXiReset">Voltar à escalação automática</button></div>' : ''}
        <div class="plist">${list.map((p) => yrow(p)).join('') || '<p class="empty">Nenhum jovem. Contrate pelos relatórios dos olheiros.</p>'}</div>`;
    } else if (st.tab === 'tabela') {
      const tb = P.youthTable(g, me.div);
      body = `<div class="label" style="margin-bottom:8px">Ultraliga Sub-20 · ${me.div}ª divisão</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">#</th><th>Clube</th><th class="n">P</th><th class="n">J</th><th class="n">V</th><th class="n">E</th><th class="n">D</th><th class="n">SG</th></tr></thead><tbody>
        ${tb.map((r, i) => { const c = club(r.cid); return `<tr class="${r.cid === g.user ? 'me' : ''}"><td class="n">${i + 1}</td><td><span class="club">${P.badge(c, 18)}${esc(c.short)}</span></td><td class="n"><b>${r.pts}</b></td><td class="n">${r.j}</td><td class="n">${r.v}</td><td class="n">${r.e}</td><td class="n">${r.d}</td><td class="n">${r.gp - r.gc}</td></tr>`; }).join('')}
        </tbody></table></div><p class="muted" style="font-size:.85rem">O Sub-20 joga na mesma divisão do time principal, nas semanas de liga.</p>`;
    } else if (st.tab === 'olheiros') {
      const scouts = g.y.staff.filter((s) => s.role === 'olheiro');
      body = `<div class="label" style="margin-bottom:8px">Seus olheiros (${scouts.length}/${P.STAFF_ROLES.olheiro.max})</div>
        ${scouts.map((s) => scoutCard(g, s)).join('') || '<p class="empty">Nenhum olheiro contratado.</p>'}
        <div class="row" style="margin-top:12px"><span class="muted" style="flex:1;font-size:.88rem">Olheiros e o resto da equipe técnica são contratados no Mercado.</span><button class="btn sm" data-a="stGoMarket" data-r="olheiro">Contratar no Mercado</button></div>`;
    } else {
      body = g.y.reports.length ? g.y.reports.map((rep) => `<div class="report"><div class="row" style="gap:8px"><b style="flex:1;min-width:0">${esc(rep.scout)} <span class="stars">${'★'.repeat(rep.stars)}</span></b><span class="muted" style="font-size:.8rem">${rep.s} · semana ${rep.w}</span></div>
        <div class="muted" style="font-size:.85rem;margin-bottom:6px">${esc(rep.lbl || (P.FOCUS[rep.focus].n + ' · ' + P.REGIONS[rep.region].n))}</div>
        <div class="plist">${rep.players.map((p) => `<div class="prow" style="grid-template-columns:44px 1fr auto"><span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
          <span class="nm"><b>${esc(p.name)}${p.gem ? '<span class="chip gem">Joia rara</span>' : ''}</b><small>${esc(P.countryName(p.nat))} · ${p.age} anos · atual ~${P.ovr(p)}</small></span>
          <span class="potbox"><span class="pot">${p.lo}-${p.hi}</span>${p.signed ? '<span class="chip xi">Contratado</span>' : `<button class="btn sm" data-a="ySign" data-r="${rep.id}" data-id="${p.id}">${P.money(p.fee)}</button>`}</span></div>`).join('')}</div></div>`).join('')
        : `<p class="empty">Nenhum relatório ainda. Contrate um olheiro e envie-o numa missão: o relatório chega ao fim da missão (3, 6 ou 9 meses, você escolhe).</p>`;
    }
    return `<div class="card"><div class="head"><h2>Sub-20</h2><button class="btn sm ghost" data-a="go" data-v="elenco">‹ Elenco</button></div>
      <div style="margin-bottom:12px">${tabs}</div>${body}</div>`;
  };
  // Formulário da missão: posição ou área, continente e país (só os do continente escolhido)
  const natOpts = (cont, cur) => `<option value="">${cont ? 'Todo o continente (' + esc(P.CONTINENTS[cont].n) + ')' : 'Qualquer país'}</option>` +
    contCountries(cont).map((k) => [k, P.COUNTRIES[k].n]).sort((a, b) => a[1].localeCompare(b[1])).map(([k, n]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${esc(n)}</option>`).join('');
  function missionForm(s, m) {
    const pos = (m && m.pos) || 'any', cont = (m && m.cont) || '', nat = (m && m.nat) || '', dur = String((m && m.dur) || 3);
    return `<div class="form-grid mission-form" style="margin:8px 0">
      <div class="field"><label class="label" for="ym-pos-${s.id}">Posição ou área</label><select class="sel" id="ym-pos-${s.id}">
        <option value="any" ${pos === 'any' ? 'selected' : ''}>Qualquer posição</option>
        <optgroup label="Área do campo">${Object.entries(P.LINES_N).map(([k, n]) => `<option value="L:${k}" ${pos === 'L:' + k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>
        <optgroup label="Posição específica">${P.POS.map((x) => `<option value="${x}" ${pos === x ? 'selected' : ''}>${x} · ${esc(P.POS_NAME[x])}</option>`).join('')}</optgroup></select></div>
      <div class="field"><label class="label" for="ym-cont-${s.id}">Continente</label><select class="sel" id="ym-cont-${s.id}" data-c="ymCont" data-id="${s.id}">
        <option value="">Mundo inteiro</option>${Object.entries(P.CONTINENTS).map(([k, c]) => `<option value="${k}" ${cont === k ? 'selected' : ''}>${esc(c.n)}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="ym-nat-${s.id}">País</label><select class="sel" id="ym-nat-${s.id}">${natOpts(cont, nat)}</select></div>
      <div class="field"><label class="label" for="ym-dur-${s.id}">Duração</label><select class="sel" id="ym-dur-${s.id}">${Object.entries(P.MISSION_DUR).map(([k, d]) => `<option value="${k}" ${dur === k ? 'selected' : ''}>${d.n} · ${esc(d.desc)}</option>`).join('')}</select></div>
    </div>`;
  }
  function scoutCard(g, s) {
    const m = s.mission;
    const edit = A.st.yb.edit === s.id || !m;
    const sel = (k, map, cur) => `<select class="sel" id="ym-${k}-${s.id}">${Object.entries(map).map(([v, o]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${esc(o.n)}</option>`).join('')}</select>`;
    return `<div class="report"><div class="row" style="gap:8px"><b style="flex:1;min-width:0">${esc(s.name)} <span class="stars">${'★'.repeat(s.stars)}<span class="off">${'★'.repeat(5 - s.stars)}</span></span></b><span class="muted" style="font-size:.8rem">${P.money(s.wage)}/mês</span></div>
      ${edit ? missionForm(s, m && m.cont !== undefined ? m : null) + `
        <div class="row"><button class="btn sm danger" data-a="yFire" data-id="${s.id}">Demitir</button><span class="spacer"></span><button class="btn sm primary" data-a="yMission" data-id="${s.id}">Enviar em missão</button></div>`
      : `<div class="muted" style="font-size:.88rem;margin:4px 0 8px">Em missão de ${esc(durOf(m).n)}: <b>${esc(P.missionLabel(m))}</b> · relatório em ${m.left != null ? m.left : Math.max(1, (m.next || 0) - A.g.week - 1)} ${(m.left || 2) === 1 ? 'semana' : 'semanas'} (depois ele continua na mesma missão)</div>
        <div class="row"><button class="btn sm danger" data-a="yFire" data-id="${s.id}">Demitir</button><span class="spacer"></span><button class="btn sm" data-a="yEdit" data-id="${s.id}">Mudar missão</button></div>`}</div>`;
  }
  A.youthSheet = function (id) {
    const g = A.g, p = g.y.squad[id]; if (!p) return;
    A.st.yb = A.st.yb || { tab: 'elenco' };
    const groups = {};
    P.ATTRS.forEach((at) => { if (P.GK_ATTRS.includes(at.k) && p.pos !== 'GOL') return; (groups[at.g] = groups[at.g] || []).push(at); });
    const vcls = (v) => (v <= 6 ? 'v1' : v <= 10 ? 'v2' : v <= 15 ? 'v3' : 'v4');
    const inXi = (g.y.xi || []).includes(id);
    A.openSheet(`<div class="bar-top"><span class="pos-tag ${P.LINE[p.pos]}" style="padding:4px 8px">${p.pos}</span><h2>${esc(p.name)}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <div class="row"><div style="flex:1;min-width:0"><div>${esc(P.POS_NAME[p.pos])} · ${p.age} anos · ${esc(P.countryName(p.nat))}</div><div class="muted">Sub-20 · potencial estimado ${potTxt(p)}</div></div>
        <div style="text-align:right"><div class="label">Força</div><div class="big-ovr">${P.ovr(p)}</div></div></div>
      <div class="kv"><div><span class="label">Jogos</span><b>${p.s.j}</b></div><div><span class="label">Gols</span><b>${p.s.g}</b></div><div><span class="label">Nota</span><b>${p.s.j ? (p.s.nt / p.s.j).toFixed(1).replace('.', ',') : '–'}</b></div></div>
      <div class="attrs">${Object.entries(groups).map(([gn, list]) => `<div class="grp"><h4 class="label">${gn}</h4>${list.map((at) => `<div class="attr"><span>${at.n}</span><b class="${vcls(p.a[at.k])}">${p.a[at.k]}</b></div>`).join('')}</div>`).join('')}</div>
      ${P.adaptBlock ? P.adaptBlock(g, p) : ''}
      ${A.st.yb.confirm === id ? `<div class="confirm"><b>Dispensar ${esc(p.name)}?</b><div class="row"><button class="btn" data-a="ySheet" data-id="${id}">Cancelar</button><button class="btn danger" data-a="yRelease" data-id="${id}">Dispensar</button></div></div>` : ''}
      <div class="row"><button class="btn" data-a="yXi" data-id="${id}">${inXi ? 'Tirar dos titulares' : 'Escalar como titular'}</button><button class="btn danger" data-a="yReleaseAsk" data-id="${id}">Dispensar</button><span class="spacer"></span><button class="btn primary" data-a="yPromote" data-id="${id}">Promover ao profissional</button></div>`);
  };

  // ---------- Ações ----------
  // ao trocar o continente, a lista de países passa a mostrar só os daquele continente
  Object.assign(A.CHG, {
    ymCont(el) { const box = document.getElementById(`ym-nat-${el.dataset.id}`); if (box) box.innerHTML = natOpts(el.value, ''); }
  });
  Object.assign(A.ACT, {
    yTab(d) { A.st.yb.tab = d.k; A.st.yb.edit = null; A.render(); },
    yDemote(d) {
      const msg = P.demoteYouth(A.g, d.id);
      if (msg) { A.toast(msg); return; }
      if (A.ACT.closeSheet) A.ACT.closeSheet(); A.save(); A.render(); A.toast('Jogador devolvido ao Sub-20');
    },
    ySheet(d) { A.st.yb.confirm = null; A.youthSheet(d.id); },
    yReleaseAsk(d) { A.st.yb.confirm = d.id; A.youthSheet(d.id); },
    yRelease(d) { const g = A.g; const n = g.y.squad[d.id].name; delete g.y.squad[d.id]; g.y.xi = (g.y.xi || []).filter((x) => x !== d.id); A.save(); A.closeSheet(); A.render(); A.toast(`${n} dispensado`); },
    yPromote(d) { const err = P.promoteYouth(A.g, d.id); if (err) { A.toast(err); return; } A.save(); A.closeSheet(); A.render(); A.toast('Promovido ao profissional'); },
    yXi(d) {
      const g = A.g; g.y.xi = g.y.xi || [];
      if (g.y.xi.includes(d.id)) g.y.xi = g.y.xi.filter((x) => x !== d.id);
      else if (g.y.xi.length >= 11) { A.toast('Já há 11 titulares. Tire alguém antes.'); return; }
      else g.y.xi.push(d.id);
      A.save(); A.render(); A.youthSheet(d.id);
      A.toast(g.y.xi.length === 11 ? 'Escalação manual ativa' : `${g.y.xi.length}/11 titulares escolhidos (abaixo de 11, vale a automática)`);
    },
    yXiReset() { A.g.y.xi = []; A.save(); A.render(); },
    yHire(d) {
      const g = A.g, c = g.y.cands.find((x) => x.id === d.id);
      if (g.y.staff.filter((s) => s.role === 'olheiro').length >= P.YOUTH.maxScouts) { A.toast(`Máximo de ${P.YOUTH.maxScouts} olheiros`); return; }
      if (P.club(g, g.user).bal < c.fee) { A.toast('O saldo não cobre as luvas'); return; }
      P.pay(g, g.user, -c.fee, 'Equipe técnica');
      g.y.staff.push(Object.assign({}, c, { mission: null }));
      g.y.cands = g.y.cands.filter((x) => x.id !== d.id);
      A.st.yb.edit = c.id; A.save(); A.render(); A.toast(`${c.name} contratado. Escolha a missão.`);
    },
    yFire(d) { const g = A.g; const s = g.y.staff.find((x) => x.id === d.id); g.y.staff = g.y.staff.filter((x) => x.id !== d.id); A.save(); A.render(); A.toast(`${s.name} demitido`); },
    yEdit(d) { A.st.yb.edit = d.id; A.render(); },
    yMission(d) {
      const g = A.g, s = g.y.staff.find((x) => x.id === d.id);
      const v = (k) => document.getElementById(`ym-${k}-${s.id}`).value;
      s.mission = { pos: v('pos'), cont: v('cont'), nat: v('nat'), dur: Number(v('dur')) || 3 };
      s.mission.left = P.missionWeeks(g, s.mission);
      A.st.yb.edit = null; A.save(); A.render(); A.toast(`Missão de ${durOf(s.mission).n} definida. Relatório em ${s.mission.left} semanas.`);
    },
    ySign(d) {
      const g = A.g, rep = g.y.reports.find((x) => x.id === d.r), p = rep && rep.players.find((x) => x.id === d.id);
      if (!p || p.signed) return;
      if (Object.keys(g.y.squad).length >= P.YOUTH.maxSquad) { A.toast(`O Sub-20 já tem ${P.YOUTH.maxSquad} jovens. Dispense ou promova alguém.`); return; }
      if (P.club(g, g.user).bal < p.fee) { A.toast('O saldo não cobre o valor'); return; }
      P.pay(g, g.user, -p.fee, 'Base');
      const y = P.clone(p); delete y.lo; delete y.hi; delete y.fee; delete y.signed;
      y.lo = p.lo; y.hi = p.hi; // a faixa do olheiro continua sendo o que você sabe
      g.y.squad[y.id] = y; p.signed = true;
      A.save(); A.render(); A.toast(`${y.name} chegou ao Sub-20`);
    }
  });
})(window.PFC);
