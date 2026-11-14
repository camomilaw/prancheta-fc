/* Prancheta FC — motor do jogo (Ultraliga)
 * Força dos jogadores, formações, táticas, simulação das partidas,
 * calendário com 8 divisões, Copa Ultra, playoffs de acesso e virada de temporada.
 * Quer mudar o equilíbrio do jogo? Os números que importam estão em TUNING.
 */
(function (P) {
  P.TUNING = {
    attackPerMin: 0.2,      // chance de um ataque acontecer a cada minuto
    chanceBase: 0.40,       // chance de um ataque virar finalização (times iguais)
    goalBase: 0.55,         // conversão base (chances claras; os chutes de longe usam longShotQ)
    longShot: 0.8,          // chance de um ataque sem chance clara terminar em chute de longe
    longShotQ: 0.11,        // qualidade (xG) desses chutes em relação a uma chance clara
    homeBonus: 1.12,        // vantagem de jogar em casa
    yellowPerMin: 0.0175,   // por time (era 0.02)
    redPerMin: 0.0002,      // vermelho direto (era 0.0003)
    bookedCare: 0.7,        // quem já tem amarelo se cuida: leva menos o segundo
    injuryPerMin: 0.00084,  // era 0.0012 (-30%)
    condDrain: 30,          // desgaste de uma partida (reduzido pela resistência)
    condRecover: 10,        // recuperação por semana (aumentada pela resistência)
    penaltyBase: 0.75,      // conversão de pênalti (no jogo e na disputa)
    cornerShot: 0.3,        // escanteios que viram cabeceio
    cornerXG: 0.055,        // xG de um cabeceio de escanteio (cobrador e cabeceador médios)
    dangerFoul: 0.1,        // faltas cometidas perto da área
    penaltyShare: 0.12,     // dessas, quantas são pênalti
    fkShot: 0.5,            // faltas perto da área cobradas direto no gol
    fkXG: 0.07              // xG de uma falta direta (cobrador médio)
  };

  // Acesso e rebaixamento
  P.RULES = { autoUp: 2, playoff: [3, 6], down: 3 };
  // Copa Ultra: rodadas jogadas depois destas rodadas da liga
  P.CUP_AFTER = [3, 8, 13, 18, 23, 27, 31, 35];
  P.CUP_NAMES = ['Fase preliminar', '1ª fase', '2ª fase', '3ª fase', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];

  // ---------- Formações (x: 0-100 esquerda→direita, y: 0-100 do próprio gol ao ataque) ----------
  P.FORMATIONS = {
    '4-4-2': [['GOL', 50, 6], ['LD', 85, 26], ['ZAG', 62, 22], ['ZAG', 38, 22], ['LE', 15, 26],
      ['PD', 85, 55], ['MC', 62, 50], ['MC', 38, 50], ['PE', 15, 55], ['ATA', 62, 82], ['ATA', 38, 82]],
    '4-3-3': [['GOL', 50, 6], ['LD', 85, 26], ['ZAG', 62, 22], ['ZAG', 38, 22], ['LE', 15, 26],
      ['MC', 70, 50], ['VOL', 50, 42], ['MC', 30, 50], ['PD', 82, 76], ['ATA', 50, 84], ['PE', 18, 76]],
    '4-2-3-1': [['GOL', 50, 6], ['LD', 85, 26], ['ZAG', 62, 22], ['ZAG', 38, 22], ['LE', 15, 26],
      ['VOL', 62, 42], ['VOL', 38, 42], ['PD', 82, 66], ['MEI', 50, 64], ['PE', 18, 66], ['ATA', 50, 86]],
    '4-1-2-1-2': [['GOL', 50, 6], ['LD', 85, 26], ['ZAG', 62, 22], ['ZAG', 38, 22], ['LE', 15, 26],
      ['VOL', 50, 40], ['MC', 72, 54], ['MC', 28, 54], ['MEI', 50, 66], ['ATA', 64, 84], ['ATA', 36, 84]],
    '3-5-2': [['GOL', 50, 6], ['ZAG', 72, 22], ['ZAG', 50, 20], ['ZAG', 28, 22], ['LD', 88, 48],
      ['MC', 66, 50], ['VOL', 50, 42], ['MC', 34, 50], ['LE', 12, 48], ['ATA', 62, 82], ['ATA', 38, 82]],
    '5-3-2': [['GOL', 50, 6], ['LD', 88, 30], ['ZAG', 70, 22], ['ZAG', 50, 20], ['ZAG', 30, 22], ['LE', 12, 30],
      ['MC', 70, 50], ['VOL', 50, 44], ['MC', 30, 50], ['ATA', 62, 80], ['ATA', 38, 80]]
  };
  // Posição pela localização no campo (posicionamento livre). O slot 0 é sempre o goleiro.
  P.posFromXY = function (x, y, i) {
    if (i === 0) return 'GOL';
    const wide = x < 25 || x > 75, right = x > 50;
    if (y < 36) return wide ? (right ? 'LD' : 'LE') : 'ZAG';
    if (y < 47) return wide ? (right ? 'LD' : 'LE') : 'VOL';
    if (y < 58) return wide ? (right ? 'PD' : 'PE') : 'MC';
    if (y < 70) return wide ? (right ? 'PD' : 'PE') : 'MEI';
    return wide ? (right ? 'PD' : 'PE') : 'ATA';
  };
  // Aceita o nome de uma formação ou a tática do clube (com posições livres em t.xy)
  P.slots = (f) => {
    if (f && typeof f === 'object') {
      if (f.xy && f.xy.length === 11) return f.xy.map((c, i) => ({ pos: P.posFromXY(c.x, c.y, i), x: c.x, y: c.y }));
      f = f.f;
    }
    return (P.FORMATIONS[f] || P.FORMATIONS['4-4-2']).map(([pos, x, y]) => ({ pos, x, y }));
  };
  // Instruções de equipe (clubes antigos/IA usam o "estilo" antigo convertido)
  P.insOf = (t) => t.ins || {
    build: t.est === 'pos' ? 'pos' : t.est === 'con' ? 'con' : 'equ',
    pass: t.est === 'dir' ? 'dir' : t.est === 'pos' ? 'cur' : 'equ',
    line: 'med', trap: false, wing: 'cru'
  };

  P.MENTALITY = { def: 'Defensiva', equ: 'Equilibrada', ofe: 'Ofensiva' };
  P.PRESSING = { bai: 'Baixa', med: 'Média', alt: 'Alta' };
  P.STYLE = { equ: 'Misto', pos: 'Posse de bola', con: 'Contra-ataque', dir: 'Jogo direto' };

  // ---------- Força dos jogadores ----------
  P.roles = function (p) {
    const a = p.a;
    return {
      att: (a.fin * 3 + a.dri * 1.5 + a.com * 1.5 + a.dec + a.vel * 1.5 + a.cab * 1.5) / 10,
      cre: (a.pas * 3 + a.vis * 2.5 + a.dec * 1.5 + a.dri + a.cru + a.com) / 10,
      def: (a.des * 2.5 + a.mar * 2.5 + a.pos * 2 + a.cab + a.for + a.vel) / 10,
      gk: (a.ref * 3 + a.um1 * 2 + a.aer * 2 + a.pos * 1.5 + a.com * 1.5) / 10,
      phys: (a.vel + a.res + a.for) / 3
    };
  };
  const POS_W = {
    GOL: { gk: 1 },
    ZAG: { def: 0.75, phys: 0.15, cre: 0.1 },
    LD: { def: 0.45, cre: 0.25, phys: 0.2, att: 0.1 },
    LE: { def: 0.45, cre: 0.25, phys: 0.2, att: 0.1 },
    VOL: { def: 0.5, cre: 0.35, phys: 0.15 },
    MC: { cre: 0.6, def: 0.2, phys: 0.1, att: 0.1 },
    MEI: { cre: 0.55, att: 0.35, phys: 0.1 },
    PD: { att: 0.45, cre: 0.35, phys: 0.2 },
    PE: { att: 0.45, cre: 0.35, phys: 0.2 },
    ATA: { att: 0.75, cre: 0.1, phys: 0.15 }
  };
  const NEAR = {
    GOL: [], LD: ['LE', 'ZAG', 'PD'], LE: ['LD', 'ZAG', 'PE'], ZAG: ['VOL', 'LD', 'LE'],
    VOL: ['MC', 'ZAG'], MC: ['VOL', 'MEI'], MEI: ['MC', 'PD', 'PE', 'ATA'],
    PD: ['PE', 'MEI', 'ATA', 'LD'], PE: ['PD', 'MEI', 'ATA', 'LE'], ATA: ['MEI', 'PD', 'PE']
  };
  P.fit = function (natural, slot) {
    if (natural === slot) return 1;
    if (natural === 'GOL' || slot === 'GOL') return 0.25;
    return NEAR[natural].includes(slot) ? 0.88 : 0.7;
  };
  // Encaixe considerando posições aprendidas no treino (p.pm: maestria 0-1 por posição)
  P.fitP = function (p, pos) {
    const b = P.fit(p.pos, pos), m = p.pm && p.pm[pos];
    return m ? b + (1 - b) * Math.min(1, m) : b;
  };
  P.ovrAt = function (p, pos) {
    const r = P.roles(p), w = POS_W[pos];
    let s = 0;
    for (const k in w) s += r[k] * w[k];
    return P.clamp(Math.round(s * 5 * P.fitP(p, pos)), 1, 99);
  };
  P.ovr = (p) => P.ovrAt(p, p.pos);
  P.condF = (p) => 0.75 + 0.25 * p.cond / 100;
  P.morF = (p) => 0.94 + 0.12 * p.mor / 100;
  P.available = (p) => !p.inj && !p.susp;
  // ---------- Economia: salários, valores, contratos ----------
  P.ECON = {
    tv: [40e6, 24e6, 14e6, 8e6, 5e6, 3e6, 2e6, 1.2e6],            // cota de TV por temporada, por divisão
    ticket: (div) => 15 + (8 - div) * 6.5,                         // ingresso médio (R$)
    prizeFactor: 0.6,                                              // premiação final = cota × fator × (21 - posição) / 20
    cupPrize: [0.2e6, 0.4e6, 0.8e6, 1.5e6, 3e6, 5e6, 8e6, 15e6],   // por vitória em cada fase da copa
    wageBase: 11000, wageGrowth: 1.125                             // salário mensal de um jogador de força 55
  };
  P.wageFor = (p) => {
    const age = p.age <= 20 ? 0.7 : p.age >= 33 ? 0.85 : 1;
    return Math.max(1500, Math.round(P.ECON.wageBase * Math.pow(P.ECON.wageGrowth, P.ovr(p) - 55) * age / 500) * 500);
  };
  P.value = function (p) {
    const ageM = p.age <= 21 ? 1.5 : p.age <= 25 ? 1.25 : p.age <= 29 ? 1 : p.age <= 32 ? 0.6 : 0.3;
    const w = P.ECON.wageBase * Math.pow(P.ECON.wageGrowth, P.ovr(p) - 55);
    return Math.max(10000, Math.round(w * 36 * ageM / 10000) * 10000);
  };
  P.capFromRep = (rep) => Math.round((4000 + rep * rep * 8) / 500) * 500;
  // Preenche dados de economia que faltarem (também atualiza saves antigos)
  P.ensureEconomy = function (g) {
    for (const c of g.db.clubs) {
      if (!c.cap) c.cap = P.capFromRep(c.rep);
      if (c.bal == null) c.bal = Math.round(P.ECON.tv[c.div - 1] * (0.5 + c.rep / 200) / 1e4) * 1e4;
    }
    for (const p of Object.values(g.db.players)) {
      if (!p.wage) p.wage = P.wageFor(p);
      if (!p.ctr) p.ctr = g.season + (Math.random() < 0.15 ? 0 : 1 + Math.floor(Math.random() * 3));
    }
    if (!g.fin) g.fin = { s: g.season, cat: {}, prev: null, log: [] };
    if (P.ensureYouth) P.ensureYouth(g);
    if (P.ensureSuper) P.ensureSuper(g);
    if (P.ensureCompStats) P.ensureCompStats(g);
    if (P.ensureTiers) P.ensureTiers(g);
    if (P.ensureMgr) P.ensureMgr(g);
  };
  P.pay = function (g, cid, v, cat) {
    const c = P.club(g, cid); if (!c) return;
    c.bal = Math.round(c.bal + v);
    if (cid === g.user) g.fin.cat[cat] = Math.round((g.fin.cat[cat] || 0) + v);
  };
  P.payroll = (g, cid) => P.squad(g, cid).reduce((s, p) => s + p.wage, 0);
  // Renovação: o jogador pede aumento; com moral baixa ele recusa
  P.renewOffer = (g, p) => ({
    wage: Math.max(p.wage, Math.round(P.wageFor(p) * (p.mor >= 60 ? 1.1 : P.coachHas && P.coachHas(g, 'motivador') ? 1.35 : 1.25) / 500) * 500),
    willing: p.mor >= 35
  });
  P.renew = function (g, p, years) {
    const o = P.renewOffer(g, p);
    if (!o.willing) return false;
    p.wage = o.wage; p.ctr = g.season + years;
    return true;
  };
  // Rescisão: paga metade dos salários que faltam no contrato
  P.releaseCost = function (g, p) {
    const left = Math.max(0, (p.ctr - g.season + 1) - (g.week || 0) / (g.cal ? g.cal.length : 48));
    return Math.round(p.wage * 12 * left * 0.5 / 1000) * 1000;
  };
  P.release = function (g, p) {
    const cost = P.releaseCost(g, p), cid = p.clubId;
    P.pay(g, cid, -cost, 'Rescisões');
    p.clubId = null; p.ctr = 0;
    P.dirty(g); P.fixXI(g, cid);
    return cost;
  };

  // ---------- Acesso ao estado (com índice de elencos em cache) ----------
  P.club = (g, cid) => g.db.clubs.find((c) => c.id === cid);
  P.dirty = (g) => { if (g) g._sq = null; };
  P.squad = function (g, cid) {
    if (!g._sq) {
      const m = {};
      for (const p of Object.values(g.db.players)) if (p.clubId) (m[p.clubId] = m[p.clubId] || []).push(p);
      Object.defineProperty(g, '_sq', { value: m, writable: true, configurable: true, enumerable: false });
    }
    return (g._sq[cid] || []).slice();
  };
  P.clubOvrs = function (db) {
    const by = {};
    for (const p of Object.values(db.players)) if (p.clubId) (by[p.clubId] = by[p.clubId] || []).push(P.ovr(p));
    const out = {};
    for (const c of db.clubs) {
      const ps = (by[c.id] || []).sort((a, b) => b - a).slice(0, 14);
      out[c.id] = ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : 0;
    }
    return out;
  };
  P.clubOvr = function (db, cid) {
    const ps = Object.values(db.players).filter((p) => p.clubId === cid).map(P.ovr).sort((a, b) => b - a).slice(0, 14);
    return ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : 0;
  };
  P.divClubs = (db, d) => db.clubs.filter((c) => c.div === d);

  // ---------- Escalação ----------
  // Melhor escalação possível: atribuição ótima (algoritmo húngaro) entre posições e jogadores,
  // maximizando a soma da força de cada um na posição em que joga (com a condição física).
  // Assim um zagueiro que rende bem de lateral pode ir para a lateral se isso deixar o time mais forte.
  function assignBest(score, n, m) {
    // minimiza custo = -score; n linhas (posições) <= m colunas (jogadores)
    const INF = 1e18, u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), pj = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      pj[0] = i; let j0 = 0;
      const minv = new Array(m + 1).fill(INF), usedC = new Array(m + 1).fill(false);
      do {
        usedC[j0] = true;
        const i0 = pj[j0]; let delta = INF, j1 = 0;
        for (let j = 1; j <= m; j++) if (!usedC[j]) {
          const cur = -score[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= m; j++) { if (usedC[j]) { u[pj[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
        j0 = j1;
      } while (pj[j0] !== 0);
      do { const j1 = way[j0]; pj[j0] = pj[j1]; j0 = j1; } while (j0);
    }
    const res = new Array(n).fill(-1);
    for (let j = 1; j <= m; j++) if (pj[j]) res[pj[j] - 1] = j - 1;
    return res;
  }
  P.autoXI = function (g, cid, formation) {
    const tt = g.tac[cid];
    const slots = tt && tt.xy ? P.slots(tt) : P.slots(formation);
    const avail = P.squad(g, cid).filter(P.available);
    const n = slots.length;
    const xi = new Array(n).fill(null);
    if (!avail.length) return xi;
    // jogadores fictícios (vazio) quando faltar gente, para a conta fechar
    const cols = avail.concat(new Array(Math.max(0, n - avail.length)).fill(null));
    const score = slots.map((s) => cols.map((p) => (p ? P.ovrAt(p, s.pos) * P.condF(p) : 0)));
    const res = assignBest(score, n, cols.length);
    res.forEach((j, i) => { if (j >= 0 && cols[j]) xi[i] = cols[j].id; });
    return xi;
  };

  P.fixXI = function (g, cid) {
    const t = g.tac[cid];
    if (!t) return [];
    const slots = P.slots(t);
    const fixed = [];
    if (!t.xi || t.xi.length !== slots.length) t.xi = new Array(slots.length).fill(null);
    const ok = (id) => { const p = g.db.players[id]; return p && p.clubId === cid && P.available(p); };
    const used = new Set();
    t.xi = t.xi.map((id) => { if (id && ok(id) && !used.has(id)) { used.add(id); return id; } return null; });
    t.xi.forEach((id, i) => {
      if (id) return;
      const cands = P.squad(g, cid).filter((p) => P.available(p) && !used.has(p.id));
      if (!cands.length) return;
      cands.sort((a, b) => P.ovrAt(b, slots[i].pos) * P.condF(b) - P.ovrAt(a, slots[i].pos) * P.condF(a));
      t.xi[i] = cands[0].id; used.add(cands[0].id); fixed.push(cands[0].name);
    });
    return fixed;
  };

  // ---------- Força do time ----------
  const ATT_W = { GOL: 0, ZAG: 0.1, LD: 0.35, LE: 0.35, VOL: 0.25, MC: 0.5, MEI: 0.9, PD: 0.9, PE: 0.9, ATA: 1.2 };
  const MID_W = { GOL: 0, ZAG: 0.3, LD: 0.5, LE: 0.5, VOL: 1, MC: 1.1, MEI: 0.9, PD: 0.5, PE: 0.5, ATA: 0.2 };
  const DEF_W = { GOL: 0, ZAG: 1.2, LD: 0.9, LE: 0.9, VOL: 0.9, MC: 0.4, MEI: 0.15, PD: 0.2, PE: 0.2, ATA: 0.05 };

  P.paceOf = (on) => {
    const a = on.filter((s) => !s.off && ['ATA', 'PD', 'PE'].includes(s.pos));
    return a.length ? a.reduce((t, s) => t + s.p.a.vel, 0) / a.length : 10;
  };
  P.strength = function (on, tac, opts) {
    opts = opts || {};
    const ins = P.insOf(tac), opp = opts.opp || {};
    const atk = [];
    let att = 0, mid = 0, def = 0, gk = 4, n = 0;
    const cnt = { d: 0, z: 0, m: 0 };
    let crossers = 0, aerial = 0;
    for (const s of on) {
      if (s.off) continue;
      n++;
      const p = s.p, r = P.roles(p);
      const f = P.fitP(p, s.pos) * P.condF(p) * P.morF(p) * (s.chem || 1) * (P.xp ? 1 + P.clamp((P.xp(p) - 8) * 0.0025, -0.02, 0.03) : 1);
      const role = P.roleOf ? P.roleOf(tac, s.i, s.pos) : null;
      const pc = (tac.roles && tac.roles[s.i] && tac.roles[s.i].post) || 'equ';
      const post = (P.POSTURE && P.POSTURE[pc]) || { a: 1, m: 1, d: 1 };
      const ra = role && role.att ? role.att(p, r) : r.att;
      const rm = role && role.cre ? role.cre(p, r) : r.cre;
      // maestria na função: 3 estrelas é neutro; cada estrela vale ~3% no que a função pede
      const mast = role && P.roleMastery ? P.roleMastery(p, s.pos, P.roleKey(tac, s.i, s.pos)) : 3;
      const mf = 1 + 0.03 * (mast - 3);
      let ca = ATT_W[s.pos] * ra * f * (role ? role.a : 1) * post.a * mf;
      if (role && role.vsHigh && opp.line === 'alt') ca *= 1.15; // velocista contra linha alta
      if (hasT(p, 'veloz') && opp.line === 'alt') ca *= 1.08;
      if (['ATA', 'PD', 'PE', 'MEI'].includes(s.pos)) atk.push(ca); else att += ca;
      mid += MID_W[s.pos] * (rm * 0.8 + r.phys * 0.2) * f * (role ? role.m : 1) * post.m * mf;
      def += DEF_W[s.pos] * r.def * f * (role ? role.d : 1) * post.d * mf * (role && role.press && tac.pre === 'alt' ? 1.1 : 1) * (hasT(p, 'pregui') ? 0.92 : 1);
      if (s.pos === 'GOL') gk = r.gk * f * mf * (role && role.gk ? role.gk : 1);
      if (['ZAG', 'LD', 'LE'].includes(s.pos)) cnt.d++;
      if (s.pos === 'ZAG') cnt.z++;
      if (['VOL', 'MC', 'MEI'].includes(s.pos)) cnt.m++;
      if (role && role.cross) crossers++;
      if (role && role.aerial) aerial = Math.max(aerial, p.a.cab);
    }
    // atacantes demais se atrapalham: do 5º em diante rendem metade
    atk.sort((a, b) => b - a).forEach((v, i) => { att += i < 4 ? v : v * 0.5; });
    att /= 5.6; mid /= 5.6; def /= 5.6;
    // formação desequilibrada
    if (cnt.d < 3) def *= Math.pow(0.85, 3 - cnt.d);
    if (!cnt.z) def *= 0.75;
    if (cnt.m === 0) mid *= 0.7; else if (cnt.m === 1) mid *= 0.88;
    // cruzamentos rendem com um centroavante de área
    if (crossers) att *= aerial ? 1 + 0.03 * Math.min(crossers, 3) * (aerial / 15) : 0.97;
    const m = tac.men, pr = tac.pre;
    if (m === 'def') { att *= 0.9; def *= 1.08; }
    if (m === 'ofe') { att *= 1.08; def *= 0.92; }
    if (pr === 'alt') { mid *= 1.05; def *= 1.02; }
    if (pr === 'bai') { mid *= 0.96; def *= 1.02; }
    if (ins.build === 'pos') { mid *= 1.06; att *= 0.97; }
    if (ins.build === 'con') { mid *= 0.95; att *= (opp.line === 'alt' || opts.oppMen === 'ofe') ? 1.1 : 1.02; }
    if (ins.pass === 'cur') mid *= 1.04;
    if (ins.pass === 'dir') { att *= 1.03; mid *= 0.97; }
    const oppPace = opts.oppPace || 11;
    if (ins.line === 'alt') { mid *= 1.04; if (oppPace >= 14) def *= 0.92; }
    if (ins.line === 'bai') { def *= 1.08; mid *= 0.95; att *= 0.96; }
    if (ins.trap && ins.line !== 'bai') def *= (opp.build === 'con' || oppPace >= 14) ? 0.9 : 1.04;
    if (opts.home) { att *= P.TUNING.homeBonus; mid *= P.TUNING.homeBonus; }
    return { att, mid, def, gk, n, shape: cnt };
  };

  P.teamPreview = function (g, cid) {
    const t = g.tac[cid], slots = P.slots(t);
    const on = t.xi.map((id, i) => ({ p: g.db.players[id], pos: slots[i].pos, i, chem: (cid === g.user && P.chemMult) ? P.chemMult(g, t, i) : 1 })).filter((s) => s.p);
    return P.strength(on, t);
  };

  // ---------- Calendário da liga (turno e returno, mando equilibrado) ----------
  P.makeFixtures = function (ids, r) {
    const t = P.shuffle(r, ids.slice());
    if (t.length % 2) t.push(null);
    const n = t.length, first = [];
    for (let k = 0; k < n - 1; k++) {
      const games = [];
      for (let i = 0; i < n / 2; i++) {
        const a = t[i], b = t[n - 1 - i];
        if (a == null || b == null) continue;
        games.push({ h: a, a: b });
      }
      first.push(games);
      t.splice(1, 0, t.pop());
    }
    const streak = {}, homes = {};
    ids.forEach((id) => { streak[id] = 0; homes[id] = 0; });
    for (const rd of first) {
      for (const m of rd) {
        const x = m.h, y = m.a;
        const xHome = streak[x] < streak[y] || (streak[x] === streak[y] && (homes[x] < homes[y] || (homes[x] === homes[y] && r() < 0.5)));
        m.h = xHome ? x : y; m.a = xHome ? y : x;
        homes[m.h]++;
        streak[m.h] = Math.max(1, streak[m.h] + 1);
        streak[m.a] = Math.min(-1, streak[m.a] - 1);
      }
    }
    const second = first.map((rd) => rd.map((m) => ({ h: m.a, a: m.h })));
    return first.concat(second).map((rd) => rd.map((m) => Object.assign(m, { done: false })));
  };

  // ---------- Simulação de partida ----------
  function lineup(g, cid, home) {
    const t = g.tac[cid], slots = P.slots(t);
    const on = t.xi.map((id, i) => ({ p: g.db.players[id], pos: slots[i].pos, i, off: false, chem: (cid === g.user && P.chemMult) ? P.chemMult(g, t, i) : 1 })).filter((s) => s.p);
    const bench = P.squad(g, cid).filter((p) => P.available(p) && !t.xi.includes(p.id));
    return { cid, t, on, bench, subs: 0, home, yel: {}, played: new Set(on.map((s) => s.p.id)) };
  }

  // ---------- Bola parada, capitão e características ----------
  const hasT = (p, k) => (P.hasT ? P.hasT(p, k) : false);
  P.SP_SKILL = {
    pen: (p) => (p.a.fin + p.a.com) / 2 + (hasT(p, 'penal') ? 3 : 0) + (hasT(p, 'pressao') ? 1 : 0) - (hasT(p, 'nervoso') ? 1.5 : 0),
    fk: (p) => p.a.fin * 0.4 + p.a.cru * 0.4 + p.a.com * 0.2 + (hasT(p, 'faltas') ? 4 : 0),
    co: (p) => p.a.cru + (hasT(p, 'garcom') ? 2 : 0) + (hasT(p, 'cruzador') ? 2 : 0),
    cap: (p) => p.age * 0.25 + (p.a.dec + p.a.com) / 2 + (hasT(p, 'lider') ? 6 : 0)
  };
  // Cobrador (ou capitão) em campo: o escolhido na tática; fora de campo, o melhor que estiver jogando
  P.spTaker = function (lu, kind) {
    const act = lu.on.filter((s) => !s.off && (kind === 'cap' || s.pos !== 'GOL'));
    if (!act.length) return null;
    const want = lu.t.sp && lu.t.sp[kind];
    const chosen = want && act.find((s) => s.p.id === want);
    if (chosen) return chosen.p;
    return act.reduce((b, s) => (!b || P.SP_SKILL[kind](s.p) > P.SP_SKILL[kind](b) ? s.p : b), null);
  };
  const cardT = (p) => (hasT(p, 'temper') ? 1.8 : hasT(p, 'disc') ? 0.45 : 1);
  const injT = (p) => (hasT(p, 'vidro') ? 2 : hasT(p, 'ferro') ? 0.4 : 1);

  // Simulação em etapas: simInit cria o jogo, simAdvance avança minutos
  // (pode parar num evento), simFinish fecha as notas. P.simulate faz tudo de uma vez.
  P.simInit = function (g, fx, opts) {
    const L = [lineup(g, fx.h, !fx.neutral), lineup(g, fx.a, false)];
    if (opts && opts.manual != null) L[opts.manual].manual = true;
    const S = [null, null];
    const recalc = () => {
      S[0] = P.strength(L[0].on, L[0].t, { home: !fx.neutral, oppMen: L[1].t.men, opp: P.insOf(L[1].t), oppPace: P.paceOf(L[1].on) });
      S[1] = P.strength(L[1].on, L[1].t, { home: false, oppMen: L[0].t.men, opp: P.insOf(L[0].t), oppPace: P.paceOf(L[0].on) });
      [0, 1].forEach((i) => { const miss = 11 - S[i].n; if (miss > 0) { const f = Math.pow(0.88, miss); S[i].att *= f; S[i].mid *= f; S[i].def *= f; } });
      // capitão em campo; um líder puxa mais o time
      [0, 1].forEach((i) => { const c = P.spTaker(L[i], 'cap'); if (c) { const f = 1.01 + (hasT(c, 'lider') ? 0.02 : 0); S[i].att *= f; S[i].mid *= f; S[i].def *= f; } });
      // estilo do técnico (só no time do jogador)
      [0, 1].forEach((i) => { const cf = P.coachFx ? P.coachFx(g, L[i].cid, L[i].t) : null; if (cf) { S[i].att *= cf.a; S[i].mid *= cf.m; S[i].def *= cf.d; } });
    };
    recalc();
    const cardF = [0, 1].map((i) => { const cf = P.coachFx ? P.coachFx(g, L[i].cid, L[i].t) : null; return cf ? cf.cards : 1; });
    return { fx, L, S, recalc, cardF, ev: [], goals: [0, 0], shots: [0, 0], sot: [0, 0], xg: [0, 0], fouls: [0, 0], corners: [0, 0], posAcc: [0, 0], gls: {}, ast: {}, min: 0, end: 90 + 1 + Math.floor(Math.random() * 5) };
  };
  P.simAdvance = function (st, toMin, stopFn) {
    const T = P.TUNING, rnd = Math.random;
    const { L, S, ev, goals, shots, posAcc, gls, ast, recalc } = st;
    if (!st.sot) Object.assign(st, { sot: [0, 0], xg: [0, 0], fouls: [0, 0], corners: [0, 0] });
    const { sot, xg, fouls, corners } = st;
    const ps = st.ps || (st.ps = {});
    const pst = (id) => ps[id] || (ps[id] = { sh: 0, sot: 0, xg: 0, tk: 0, sv: 0 });
    const active = (side) => L[side].on.filter((s) => !s.off);
    const mm = (min) => ({ m: Math.min(min, 90), x: min > 90 ? min - 90 : 0 });
    // pressão: fim de jogo apertado
    const press = (p, min) => (min >= 70 && Math.abs(goals[0] - goals[1]) <= 1 ? (hasT(p, 'pressao') ? 1.1 : hasT(p, 'nervoso') ? 0.9 : 1) : 1);
    const gkOf = (side) => { const s = active(side).find((x) => x.pos === 'GOL'); return s ? s.p : null; };
    const rfx = (side, s, k) => { const ro = P.roleOf ? P.roleOf(L[side].t, s.i, s.pos) : null; return ro && ro.fx && ro.fx[k] ? ro.fx[k] : 1; };
    const score = (side, min, p, sp, asId) => {
      goals[side]++; sot[side]++;
      gls[p.id] = (gls[p.id] || 0) + 1;
      if (asId) ast[asId] = (ast[asId] || 0) + 1;
      ev.push(Object.assign(mm(min), { t: 'gol', s: side, p: p.id, as: asId || null, sp }));
    };
    const setShot = (side, min, p, pg, sp, asId, onT) => {
      shots[side]++; xg[side] += pg;
      const q = pst(p.id); q.sh++; q.xg += pg;
      if (rnd() < pg) { q.sot++; score(side, min, p, sp, asId); }
      else if (rnd() < onT) { sot[side]++; q.sot++; const gk = gkOf(1 - side); if (gk) pst(gk.id).sv++; }
    };
    // escanteio: às vezes vira cabeceio do mais forte pelo alto
    const corner = (side, min) => {
      corners[side]++;
      if (rnd() >= T.cornerShot) return;
      const tk = P.spTaker(L[side], 'co'); if (!tk) return;
      const pool = active(side).filter((s) => s.pos !== 'GOL' && s.p !== tk); if (!pool.length) return;
      const hd = P.weighted(rnd, pool, (s) => ({ ZAG: 1.4, ATA: 1.4, VOL: 0.8 }[s.pos] || 0.5) * (s.p.a.cab + s.p.a.for * 0.3) * (hasT(s.p, 'cabeca') ? 1.6 : 1) * (hasT(s.p, 'fisico') ? 1.2 : 1) * rfx(side, s, 'header'));
      const gkS = active(1 - side).find((x) => x.pos === 'GOL'), areaF = gkS ? rfx(1 - side, gkS, 'area') : 1;
      const gk = gkOf(1 - side);
      const q = (P.SP_SKILL.co(tk) / 12) * (hd.p.a.cab * (hasT(hd.p, 'cabeca') ? 1.25 : 1) / 12);
      setShot(side, min, hd.p, P.clamp(T.cornerXG * q * areaF * (12 / Math.max(4, gk ? gk.a.aer : 8)) * press(hd.p, min), 0.01, 0.4), 'esc', tk.id, 0.35);
    };
    // falta cometida por side; perto da área vira pênalti ou cobrança direta do adversário
    const foul = (side, min) => {
      fouls[side]++;
      if (rnd() >= T.dangerFoul) return;
      const o = 1 - side, gk = gkOf(side);
      if (rnd() < T.penaltyShare) {
        const tk = P.spTaker(L[o], 'pen'); if (!tk) return;
        const gq = gk ? gk.a.ref + (hasT(gk, 'pegapen') ? 3 : 0) : 6;
        const pg = P.clamp((T.penaltyBase + (P.SP_SKILL.pen(tk) - gq) * 0.015) * press(tk, min), 0.45, 0.93);
        shots[o]++; xg[o] += pg;
        if (rnd() < pg) score(o, min, tk, 'pen', null);
        else { if (rnd() < 0.6) sot[o]++; ev.push(Object.assign(mm(min), { t: 'penmiss', s: o, p: tk.id })); }
      } else if (rnd() < T.fkShot) {
        const tk = P.spTaker(L[o], 'fk'); if (!tk) return;
        setShot(o, min, tk, P.clamp(T.fkXG * (P.SP_SKILL.fk(tk) / 12) * (12 / Math.max(4, gk ? gk.a.ref : 8)) * press(tk, min), 0.01, 0.35), 'fal', null, 0.4);
      }
    };
    const last = Math.min(toMin, st.end);
    while (st.min < last) {
      const min = ++st.min;
      const evStart = ev.length;
      const pH = Math.pow(S[0].mid, 2) / (Math.pow(S[0].mid, 2) + Math.pow(S[1].mid, 2));
      posAcc[0] += pH; posAcc[1] += 1 - pH;
      if (min === 46) ev.push({ m: 45, x: 0, t: 'int' });

      if (rnd() < T.attackPerMin) {
        const side = rnd() < pH ? 0 : 1, o = 1 - side;
        const ratio = S[side].att / Math.max(0.1, S[o].def);
        let cp = T.chanceBase * Math.pow(ratio, 1.1);
        const insS = P.insOf(L[side].t);
        if (insS.pass === 'dir') cp *= 1.08;
        if (insS.pass === 'cur') cp *= 0.95;
        cp *= active(side).reduce((m, x) => m * rfx(side, x, 'chance') * (hasT(x.p, 'drible') ? 1.03 : 1), 1); // dribladores e carregadores criam mais
        cp *= active(o).reduce((m, x) => m * (hasT(x.p, 'desat') ? 1.03 : 1), 1); // defensor desatento do outro lado
        cp = P.clamp(cp, 0.12, 0.8);
        // big = chance clara; senão, muitas vezes o time arrisca de longe (xG baixo)
        const big = rnd() < cp;
        if (big || rnd() < T.longShot) {
          shots[side]++;
          const pool = active(side).filter((s) => s.pos !== 'GOL');
          if (pool.length) {
            const sh = P.weighted(rnd, pool, (s) => { const ro = P.roleOf ? P.roleOf(L[side].t, s.i, s.pos) : null; return ATT_W[s.pos] * (s.p.a.fin + s.p.a.cab * (ro && ro.aerial ? 0.8 : 0.4)) * (ro ? ro.a : 1) * (!big && hasT(s.p, 'longe') ? 2.2 : 1) * rfx(side, s, 'shot') * (big && hasT(s.p, 'oport') ? 1.4 : 1) * (hasT(s.p, 'afobado') ? 1.3 : 1); });
            const a = sh.p.a;
            const q = ((a.fin * 2 + a.com + a.cab * 0.5) / 3.5) * P.fitP(sh.p, sh.pos) * P.condF(sh.p) * P.morF(sh.p)
              * press(sh.p, min) * (min >= 75 && hasT(sh.p, 'decisivo') ? 1.12 : 1) * (!big && hasT(sh.p, 'longe') ? 1.4 : 1);
            let pg = T.goalBase * q / (q + S[o].gk * 1.05) * (big ? 1 : T.longShotQ);
            if (big && hasT(sh.p, 'matador')) pg *= 1.07;
            if (hasT(sh.p, 'afobado')) pg *= 0.9;
            if (insS.pass === 'dir') pg *= 0.94;
            if (insS.pass === 'cur') pg *= 1.05;
            if (insS.build === 'pos') pg *= 1.05;
            xg[side] += pg; // xG: chance de gol desta finalização
            const qs = pst(sh.p.id); qs.sh++; qs.xg += pg;
            if (rnd() < pg) {
              goals[side]++; sot[side]++; qs.sot++;
              gls[sh.p.id] = (gls[sh.p.id] || 0) + 1;
              let asId = null;
              const mates = pool.filter((s) => s !== sh);
              if (mates.length && rnd() < (big ? 0.75 : 0.45)) {
                const as = P.weighted(rnd, mates, (s) => (MID_W[s.pos] + ATT_W[s.pos]) * (s.p.a.pas + s.p.a.vis + s.p.a.cru * 0.5) * (hasT(s.p, 'garcom') ? 1.7 : 1) * (hasT(s.p, 'visao') ? 1.4 : 1) * (hasT(s.p, 'lanca') ? 1.3 : 1) * (hasT(s.p, 'pivo') ? 1.3 : 1) * rfx(side, s, 'assist'));
                asId = as.p.id; ast[asId] = (ast[asId] || 0) + 1;
              }
              ev.push(Object.assign(mm(min), { t: 'gol', s: side, p: sh.p.id, as: asId }));
            } else if (rnd() < (big ? 0.36 : 0.26)) {
              sot[side]++; qs.sot++; { const gk = gkOf(o); if (gk) pst(gk.id).sv++; } // no gol, defendido
              if (rnd() < (big ? 0.7 : 0.15)) ev.push(Object.assign(mm(min), { t: 'chance', s: side, p: sh.p.id }));
              if (rnd() < 0.45) corner(side, min);
            } else if (rnd() < 0.45) corner(side, min); // bloqueada ou desviada para fora
          }
        } else {
          // ataque cortado: um defensor fica com o desarme
          const dpool = active(o).filter((s) => s.pos !== 'GOL');
          if (dpool.length) pst(P.weighted(rnd, dpool, (s) => (DEF_W[s.pos] + 0.05) * (s.p.a.des + s.p.a.mar + s.p.a.pos) * rfx(o, s, 'tackle') * (hasT(s.p, 'leitura') ? 1.5 : 1) * (hasT(s.p, 'raca') ? 1.25 : 1) * (hasT(s.p, 'fisico') ? 1.2 : 1) * (hasT(s.p, 'desat') ? 0.6 : 1)).p.id).tk++;
          if (rnd() < 0.5) corner(side, min); // ataque cortado para escanteio
        }
      }
      // faltas (pressão alta faz mais faltas); cartões abaixo também contam como falta
      for (const side of [0, 1]) {
        const pre = L[side].t.pre;
        const pitF = active(side).reduce((m, x) => m * (rfx(side, x, 'foul') > 1 ? 1.1 : 1), 1); // pitbulls fazem mais faltas
        if (rnd() < 0.115 * (pre === 'alt' ? 1.25 : pre === 'bai' ? 0.85 : 1) * pitF) foul(side, min);
      }

      for (const side of [0, 1]) {
        const act = active(side);
        if (!act.length) continue;
        if (rnd() < T.yellowPerMin * (L[side].t.pre === 'alt' ? 1.2 : 1) * ((st.cardF && st.cardF[side]) || 1)) {
          // quem já tem amarelo joga com mais cuidado (menos segundos amarelos)
          const s = P.weighted(rnd, act, (x) => (DEF_W[x.pos] + 0.2) * (L[side].yel[x.p.id] ? T.bookedCare : 1) * cardT(x.p) * rfx(side, x, 'foul'));
          const id = s.p.id;
          L[side].yel[id] = (L[side].yel[id] || 0) + 1;
          foul(side, min);
          if (L[side].yel[id] >= 2) { s.off = true; ev.push(Object.assign(mm(min), { t: 'vermelho', s: side, p: id, two: true })); recalc(); }
          else ev.push(Object.assign(mm(min), { t: 'amarelo', s: side, p: id }));
        } else if (rnd() < T.redPerMin) {
          const s = P.weighted(rnd, act, (x) => (DEF_W[x.pos] + 0.2) * cardT(x.p));
          s.off = true; foul(side, min); ev.push(Object.assign(mm(min), { t: 'vermelho', s: side, p: s.p.id })); recalc();
        }
        // jogadores cansados (condição < 65) aumentam o risco de lesão
        if (rnd() < T.injuryPerMin * (act.some((x) => x.p.cond < 65) ? 1.8 : 1)) {
          const s = P.weighted(rnd, act, (x) => ((110 - x.p.cond) / 10 + 1) * injT(x.p));
          const ity = P.injuryType ? P.injuryType(rnd) : { n: 'Lesão', w: 1 + Math.floor(rnd() * 5) };
          const weeks = ity.w;
          s.off = true; s.injured = weeks; s.injN = ity.n;
          const e = Object.assign(mm(min), { t: 'lesao', s: side, p: s.p.id, w: weeks, n: ity.n });
          const lu = L[side];
          if (lu.subs < 5 && lu.bench.length && !lu.manual) {
            lu.bench.sort((a, b) => P.ovrAt(b, s.pos) * P.condF(b) - P.ovrAt(a, s.pos) * P.condF(a));
            const sub = lu.bench.shift();
            lu.on.push({ p: sub, pos: s.pos, i: s.i, off: false, chem: 1 });
            lu.played.add(sub.id); lu.subs++;
            e.sub = sub.id;
          }
          ev.push(e); recalc();
        }
      }
      if (stopFn) for (let k = evStart; k < ev.length; k++) if (stopFn(ev[k])) return ev[k];
    }
    return null;
  };
  // Substituição durante o jogo (sai um jogador em campo ou um lesionado ainda não trocado)
  P.simSub = function (st, side, outId, inId) {
    const lu = st.L[side];
    if (lu.subs >= 5) return 'Já foram feitas as 5 substituições.';
    const s = lu.on.find((x) => x.p.id === outId && (!x.off || (x.injured && !x.replaced)));
    const inP = lu.bench.find((p) => p.id === inId);
    if (!s || !inP) return 'Substituição inválida.';
    if (!s.off) s.off = true;
    s.replaced = true;
    lu.on.push({ p: inP, pos: s.pos, i: s.i, off: false, chem: 1 });
    lu.bench = lu.bench.filter((p) => p.id !== inId);
    lu.played.add(inId); lu.subs++;
    st.ev.push({ m: Math.min(Math.max(st.min, 1), 90), x: st.min > 90 ? st.min - 90 : 0, t: 'sub', s: side, p: inId, o: outId });
    st.recalc();
    return '';
  };
  // Troca de posição entre dois jogadores em campo (não conta como substituição)
  P.simSwap = function (st, side, idA, idB) {
    const lu = st.L[side];
    const a = lu.on.find((x) => x.p.id === idA && !x.off), b = lu.on.find((x) => x.p.id === idB && !x.off);
    if (!a || !b || a === b) return 'Troca inválida.';
    [a.i, b.i] = [b.i, a.i]; [a.pos, b.pos] = [b.pos, a.pos];
    st.recalc();
    return '';
  };
  P.simFinish = function (st) {
    const rnd = Math.random;
    const { L, ev, goals, shots, posAcc, gls, ast } = st;
    while (st.min < st.end) P.simAdvance(st, st.end);
    const notes = {};
    for (const side of [0, 1]) {
      const res = Math.sign(goals[side] - goals[1 - side]);
      const conceded = goals[1 - side];
      for (const id of L[side].played) {
        const slot = L[side].on.find((s) => s.p.id === id);
        const pp = slot ? slot.p : null;
        let n = 6.3 + (gls[id] || 0) * 0.9 + (ast[id] || 0) * 0.5 + res * 0.4 + P.gauss(rnd) * (hasT(pp, 'inconst') ? 0.85 : 0.4);
        if (slot && slot.pos === 'GOL') n += conceded === 0 ? 0.6 : -0.25 * conceded;
        else if (slot && P.LINE[slot.pos] === 'DEF') n += conceded === 0 ? 0.3 : -0.1 * conceded;
        if (ev.some((e) => e.t === 'vermelho' && e.p === id)) n -= 1.2;
        notes[id] = Math.round(P.clamp(n, 3, 10) * 10) / 10;
      }
    }
    const tot = posAcc[0] + posAcc[1];
    return {
      hg: goals[0], ag: goals[1], ev,
      st: { pos: Math.round(posAcc[0] / tot * 100), sh: shots, sot: st.sot, xg: st.xg.map((v) => Math.round(v * 100) / 100), fo: st.fouls, co: st.corners },
      notes, played: [Array.from(L[0].played), Array.from(L[1].played)],
      ps: Object.fromEntries(Object.entries(st.ps || {}).map(([k, v]) => [k, { sh: v.sh, sot: v.sot, xg: Math.round(v.xg * 100) / 100, tk: v.tk, sv: v.sv }])),
      lu: L.map((lu) => { const sl = P.slots(lu.t); return { xy: sl.map((x) => [x.x, x.y]), on: lu.on.map((s) => [s.p.id, s.pos, s.i, s.replaced ? 1 : 0, s.off && !s.injured && !s.replaced ? 1 : 0, s.injured ? 1 : 0]) }; }),
      yel: [L[0].yel, L[1].yel], inj: L.map((lu) => lu.on.filter((s) => s.injured).map((s) => [s.p.id, s.injured, s.injN])),
      L
    };
  };
  P.simulate = function (g, fx) { const st = P.simInit(g, fx); P.simAdvance(st, st.end); return P.simFinish(st); };

  // Disputa de pênaltis: 5 cobranças e depois alternadas
  P.penalties = function (L) {
    const rnd = Math.random;
    // o cobrador escolhido abre a série; depois, os melhores batedores em campo
    const kickers = L.map((lu) => {
      const ks = lu.on.filter((s) => !s.off && s.pos !== 'GOL').map((s) => s.p).sort((a, b) => P.SP_SKILL.pen(b) - P.SP_SKILL.pen(a));
      const first = P.spTaker(lu, 'pen');
      return first ? [first].concat(ks.filter((p) => p !== first)) : ks;
    });
    const gks = L.map((lu) => { const s = lu.on.find((x) => !x.off && x.pos === 'GOL'); return s ? s.p.a.ref + (hasT(s.p, 'pegapen') ? 3 : 0) : 6; });
    const score = [0, 0], seq = [];
    const kick = (side, i) => {
      const ks = kickers[side];
      const p = ks.length ? ks[i % ks.length] : null;
      const q = p ? P.SP_SKILL.pen(p) : 8;
      const nerve = p && hasT(p, 'pressao') ? 0.06 : p && hasT(p, 'nervoso') ? -0.08 : 0;
      const prob = P.clamp(P.TUNING.penaltyBase + (q - gks[1 - side]) * 0.015 + nerve, 0.5, 0.93);
      const goal = rnd() < prob;
      if (goal) score[side]++;
      seq.push({ s: side, p: p ? p.id : null, goal, how: goal ? '' : (rnd() < 0.35 ? 'miss' : 'save') });
    };
    for (let i = 0; i < 5; i++) { kick(0, i); kick(1, i); }
    let i = 5;
    while (score[0] === score[1] && i < 40) { kick(0, i); kick(1, i); i++; }
    if (score[0] === score[1]) { const s = rnd() < 0.5 ? 0 : 1; score[s]++; seq.push({ s, p: null, goal: true, how: '' }); }
    score.seq = seq;
    return score;
  };

  // ---------- Tática da IA ----------
  P.aiTactics = function (g, cid, oppId, home, ovrs) {
    const t = g.tac[cid];
    const me = ovrs[cid] || 60, op = ovrs[oppId] || 60;
    const diff = me - op + (home ? 2 : -2);
    t.men = diff > 3 ? 'ofe' : diff < -3 ? 'def' : 'equ';
    t.xi = P.autoXI(g, cid, t.f);
  };

  // ---------- Temporada: calendário semanal ----------
  P.buildSeason = function (g) {
    const r = P.rng((Date.now() + g.season) & 0xffffffff);
    g.lg = {};
    for (let d = 1; d <= P.DIVS; d++) g.lg[d] = P.makeFixtures(P.divClubs(g.db, d).map((c) => c.id), r);
    const rounds = g.lg[1].length;
    g.cal = [];
    for (let lr = 0; lr < rounds; lr++) {
      g.cal.push({ t: 'lg', r: lr });
      const ci = P.CUP_AFTER.indexOf(lr + 1);
      if (ci >= 0) g.cal.push({ t: 'cup', r: ci });
      const ri = P.RZ_AFTER ? P.RZ_AFTER.indexOf(lr + 1) : -1;
      if (ri >= 0) g.cal.push({ t: 'rz', r: ri }); // copas por faixa de divisão (Ascensão, Travessia, Raízes)
    }
    g.cal.push({ t: 'po', r: 0 }, { t: 'po', r: 1 });
    if (P.scSeason && P.scSeason(g)) P.SC_NAMES.forEach((_, r) => g.cal.push({ t: 'sc', r })); // Supercopa no fim da 4ª temporada
    g.cup = { rounds: [], byes: [], winner: null };
    g.po = null;
    g.week = 0; g.over = false; g.summary = null;
  };

  P.stepLabel = function (step) {
    if (!step) return '';
    if (step.t === 'lg') return 'Rodada ' + (step.r + 1);
    if (step.t === 'cup') return 'Copa Ultra · ' + P.CUP_NAMES[step.r];
    if (step.t === 'sc') return 'Supercopa Ultra · ' + P.SC_NAMES[step.r];
    if (step.t === 'rz') return P.tierLabel ? P.tierLabel(step) : 'Copas regionais · ' + P.RZ_NAMES[step.r];
    return 'Playoffs de acesso · ' + (step.r ? 'Final' : 'Semifinal');
  };

  const koWinner = (m) => (m.hg > m.ag ? m.h : m.hg < m.ag ? m.a : (m.pen[0] > m.pen[1] ? m.h : m.a));

  P.cupDraw = function (g, r) {
    if (g.cup.rounds[r]) return;
    const rnd = Math.random;
    let pool;
    if (r === 0) {
      const ovrs = P.clubOvrs(g.db);
      const ranked = g.db.clubs.slice().sort((a, b) => a.div - b.div || ovrs[b.id] - ovrs[a.id]).map((c) => c.id);
      g.cup.byes = ranked.slice(0, 96);
      pool = ranked.slice(96);
      // campeões das copas por divisão entram direto na 1ª fase
      for (const rb of (g.tierByes || []).concat(g.rzBye ? [g.rzBye] : [])) {
        if (!P.club(g, rb) || g.cup.byes.includes(rb)) continue;
        const last = g.cup.byes.pop(); g.cup.byes.push(rb); pool = pool.filter((x) => x !== rb).concat([last]);
      }
      g.tierByes = []; g.rzBye = null;
    } else {
      const prev = g.cup.rounds[r - 1].ties.map(koWinner);
      pool = r === 1 ? g.cup.byes.concat(prev) : prev;
    }
    P.shuffle(rnd, pool);
    const divOf = (cid) => (P.club(g, cid) || { div: 9 }).div;
    const ties = [];
    for (let i = 0; i + 1 < pool.length; i += 2) {
      let h = pool[i], a = pool[i + 1];
      if (divOf(a) > divOf(h) || (divOf(a) === divOf(h) && rnd() < 0.5)) [h, a] = [a, h];
      const m = { h, a, done: false };
      if (r === P.CUP_NAMES.length - 1) m.neutral = true;
      ties.push(m);
    }
    g.cup.rounds[r] = { name: P.CUP_NAMES[r], ties };
  };

  P.poDraw = function (g, r) {
    if (r === 0) {
      if (g.po) return;
      g.po = {};
      for (let d = 2; d <= P.DIVS; d++) {
        const tb = P.table(g, d);
        const [a, b] = P.RULES.playoff; // 3º a 6º
        const ids = tb.slice(a - 1, b).map((x) => x.cid);
        g.po[d] = { semi: [{ h: ids[0], a: ids[3], done: false }, { h: ids[1], a: ids[2], done: false }], final: null, w: null };
      }
    } else {
      for (let d = 2; d <= P.DIVS; d++) {
        const po = g.po[d];
        if (po.final) continue;
        const tb = P.table(g, d).map((x) => x.cid);
        let h = koWinner(po.semi[0]), a = koWinner(po.semi[1]);
        if (tb.indexOf(a) < tb.indexOf(h)) [h, a] = [a, h];
        po.final = { h, a, done: false };
      }
    }
  };

  // Partidas de uma semana (sorteia copa/playoffs se ainda não sorteados)
  P.stepMatches = function (g, step) {
    step = step || g.cal[g.week];
    if (!step) return [];
    const out = [];
    if (step.t === 'lg') {
      for (let d = 1; d <= P.DIVS; d++) (g.lg[d][step.r] || []).forEach((m) => out.push({ m, comp: 'lg', div: d }));
    } else if (step.t === 'cup') {
      P.cupDraw(g, step.r);
      g.cup.rounds[step.r].ties.forEach((m) => out.push({ m, comp: 'cup', ko: true }));
    } else if (step.t === 'sc') {
      P.scMatches(g, step.r).forEach((m) => out.push({ m, comp: 'sc', ko: true }));
    } else if (step.t === 'rz') {
      P.rzMatches(g, step.r).forEach((x) => out.push({ m: x.m, comp: x.comp, ko: x.ko }));
    } else {
      P.poDraw(g, step.r);
      for (let d = 2; d <= P.DIVS; d++) {
        const po = g.po[d];
        (step.r === 0 ? po.semi : [po.final]).forEach((m) => out.push({ m, comp: 'po', div: d, ko: true }));
      }
    }
    return out;
  };
  P.userMatch = function (g, step) {
    return P.stepMatches(g, step).find((x) => x.m.h === g.user || x.m.a === g.user) || null;
  };

  // ---------- Jogar uma semana ----------
  // Uma semana em duas metades: beginWeek simula os outros jogos e prepara o seu
  // (ao vivo, se interactive); endWeek fecha tudo. playWeek faz as duas direto.
  P.playWeek = function (g) { return g.over ? null : P.endWeek(g, P.beginWeek(g, false)); };
  const applyResult = (ctx, it, r) => {
    const m = it.m;
    m.hg = r.hg; m.ag = r.ag; m.ev = r.ev; m.st = r.st; m.notes = r.notes; m.done = true;
    if (it.ko) {
      if (r.hg === r.ag) { const pen = P.penalties(r.L); m.pen = [pen[0], pen[1]]; m.penSeq = pen.seq; }
      m.w = koWinner(m);
    }
    delete r.L;
    ctx.playing.add(m.h); ctx.playing.add(m.a);
    ctx.results.push({ it, r });
  };
  P.beginWeek = function (g, interactive) {
    const step = g.cal[g.week];
    const items = P.stepMatches(g, step);
    const ovrs = P.clubOvrs(g.db);
    const userDiv = (P.club(g, g.user) || {}).div;
    const warn = [];
    if (P.trainWeek) P.trainWeek(g, step);

    // 1. escalações
    for (const { m } of items) {
      for (const [cid, opp, home] of [[m.h, m.a, true], [m.a, m.h, false]]) {
        if (cid === g.user) {
          const t = g.tac[cid];
          if (t.auto) t.xi = P.autoXI(g, cid, t.f);
          else warn.push(...P.fixXI(g, cid));
        } else P.aiTactics(g, cid, opp, home, ovrs);
      }
    }
    if (warn.length) P.news(g, 'Escalação ajustada: ' + warn.join(', ') + ' entrou no lugar de quem estava fora.', 'warn');

    // 2. jogos (o seu fica para depois, se for ao vivo)
    const ctx = { step, userDiv, results: [], playing: new Set(), live: null };
    for (const it of items) {
      const mineM = it.m.h === g.user || it.m.a === g.user;
      if (interactive && mineM) { ctx.live = { it, side: it.m.h === g.user ? 0 : 1, st: P.simInit(g, it.m, { manual: it.m.h === g.user ? 0 : 1 }) }; continue; }
      applyResult(ctx, it, P.simulate(g, it.m));
    }
    return ctx;
  };
  P.endWeek = function (g, ctx) {
    if (ctx.live) { const { it, st } = ctx.live; applyResult(ctx, it, P.simFinish(st)); ctx.live = null; }
    const { step, userDiv, results, playing } = ctx;

    // 3. suspensões cumpridas (só de quem jogou na semana) e lesões
    for (const p of Object.values(g.db.players)) {
      if (p.susp > 0 && playing.has(p.clubId)) p.susp--;
      if (p.inj > 0) p.inj--;
    }

    // 4. estatísticas, condição, moral, cartões
    for (const { it, r } of results) {
      const m = it.m;
      [m.h, m.a].forEach((cid, side) => {
        const res = Math.sign(side === 0 ? r.hg - r.ag : r.ag - r.hg);
        const t = g.tac[cid];
        const playedSet = new Set(r.played[side]);
        for (const id of r.played[side]) {
          const p = g.db.players[id];
          p.s.j++;
          p.s.nt += r.notes[id] || 6;
          const drain = (P.TUNING.condDrain - p.a.res * 0.6 + (t.pre === 'alt' ? 5 : t.pre === 'bai' ? -4 : 0)) * (hasT(p, 'incans') ? 0.7 : 1);
          p.cond = P.clamp(p.cond - drain, 30, 100);
          const motiv = cid === g.user && P.coachHas && P.coachHas(g, 'motivador'), discp = cid === g.user && P.coachHas && P.coachHas(g, 'disciplinador');
          p.mor = P.clamp(p.mor + res * 6 * (res < 0 && hasT(p, 'raca') ? 0.5 : 1) * (res < 0 && motiv ? 0.6 : 1) + ((r.notes[id] || 6) - 6.5) * 3 + (motiv ? 1.5 : 0) - (discp ? 0.8 : 0), 20, 100);
        }
        for (const p of P.squad(g, cid)) {
          if (!playedSet.has(p.id)) p.mor = P.clamp(p.mor + res * 2 - (P.ovr(p) > 70 ? 1.5 : 0) - (hasT(p, 'estrela') ? 3 : 0), 20, 100);
        }
        // líder de vestiário segura o ânimo depois da derrota
        if (res < 0 && P.squad(g, cid).some((p) => hasT(p, 'vestiario'))) for (const p of P.squad(g, cid)) p.mor = P.clamp(p.mor + 2, 20, 100);
        for (const [id, n] of Object.entries(r.yel[side])) {
          const p = g.db.players[id];
          if (n >= 2) { p.s.cv++; p.susp = Math.max(p.susp, 1); }
          else {
            p.s.ca++; p.ylw++;
            if (p.ylw >= 4) {
              p.ylw = 0; p.susp = Math.max(p.susp, 1);
              if (cid === g.user) {
                P.news(g, `${p.name} levou o 4º amarelo e cumpre suspensão no próximo jogo.`, 'warn');
                if (P.mail) P.mail(g, { k: 'sus', pid: p.id, subj: `${p.name} suspenso por cartões`, body: `Chefe, o ${p.name} recebeu o 3º amarelo e está fora do próximo jogo. Vale definir quem entra no lugar dele.` });
              }
            }
          }
        }
        for (const [id, w, n] of r.inj[side]) { g.db.players[id].inj = w; g.db.players[id].injN = n || 'Lesão'; }
      });
      if (P.compStats) P.compStats(g, it, r);
      if (P.mgrMatch) P.mgrMatch(g, it, r);
      for (const e of r.ev) {
        if (e.t === 'gol') {
          const p = g.db.players[e.p];
          if (it.comp === 'lg') p.s.g++; else if (it.comp === 'cup' || it.comp === 'po') p.s.cg++;
          if (e.as) g.db.players[e.as].s.as++;
        }
        if (e.t === 'vermelho' && !e.two) { const p = g.db.players[e.p]; p.s.cv++; p.susp = Math.max(p.susp, 2); }
      }
    }
    for (const p of Object.values(g.db.players)) {
      p.cond = Math.round(P.clamp(p.cond + P.TUNING.condRecover + p.a.res * 0.45, 30, 100));
      p.mor = Math.round(p.mor);
      p.s.nt = Math.round(p.s.nt * 10) / 10;
    }

    // 5. finanças da semana: bilheteria, premiação da copa, cotas de TV e salários
    const tblCache = {};
    const posIn = (cid) => { const c = P.club(g, cid); if (!tblCache[c.div]) tblCache[c.div] = P.table(g, c.div).map((x) => x.cid); return tblCache[c.div].indexOf(cid) + 1; };
    const before = P.club(g, g.user).bal;
    for (const { it } of results) {
      const m = it.m, hc = P.club(g, m.h);
      let gate;
      if (it.comp === 'sc') { gate = Math.round(hc.cap * P.ECON.ticket(hc.div) * P.ECON.scTicket); hc.lastOcc = 100; } // Supercopa: sempre lotado
      else {
        const occ = P.clamp(0.4 + 0.4 * (1 - (posIn(m.h) - 1) / 19) + (it.ko ? 0.15 : 0), 0.25, 1);
        gate = P.gateFor ? P.gateFor(g, hc, occ) : Math.round(hc.cap * occ * P.ECON.ticket(hc.div));
      }
      if (m.neutral) { P.pay(g, m.h, gate / 2, 'Bilheteria'); P.pay(g, m.a, gate / 2, 'Bilheteria'); }
      else P.pay(g, m.h, gate, 'Bilheteria');
      if (it.comp === 'cup') P.pay(g, m.w, P.ECON.cupPrize[step.r], 'Premiação');
    }
    if (step.t === 'lg') for (const c of g.db.clubs) P.pay(g, c.id, P.ECON.tv[c.div - 1] / g.lg[c.div].length, 'Cotas de TV');
    const wages = {};
    for (const p of Object.values(g.db.players)) if (p.clubId) wages[p.clubId] = (wages[p.clubId] || 0) + p.wage;
    for (const [cid, w] of Object.entries(wages)) P.pay(g, cid, -w * 12 / g.cal.length, 'Salários');
    const after = P.club(g, g.user).bal;
    g.fin.log.unshift({ s: g.season, w: g.week + 1, v: after - before, bal: after, l: P.stepLabel(step) });
    if (g.fin.log.length > 30) g.fin.log.length = 30;
    if (after < 0 && before >= 0) P.news(g, 'O saldo do clube ficou negativo. A diretoria pede corte de gastos.', 'bad');
    if (P.marketWeek) P.marketWeek(g, step);
    if (P.youthWeek) P.youthWeek(g, step);
    if (P.clubWeek) P.clubWeek(g, step, ctx);
    if (step.t === 'lg' && step.r === 25) { // aviso de contratos (rodada 26)
      const exp = P.squad(g, g.user).filter((p) => p.ctr <= g.season);
      if (exp.length) P.news(g, `${exp.length} ${exp.length === 1 ? 'contrato termina' : 'contratos terminam'} nesta temporada: ${exp.map((p) => p.name).join(', ')}. Renove pela ficha do jogador ou eles saem de graça.`, 'warn');
    }

    // 6. notícias do meu time
    const mine = results.find(({ it }) => it.m.h === g.user || it.m.a === g.user);
    if (mine) {
      const m = mine.it.m, home = m.h === g.user;
      if (mine.r.lu) { m.lu = mine.r.lu; m.ps = mine.r.ps; }
      const opp = P.club(g, home ? m.a : m.h);
      const gf = home ? m.hg : m.ag, ga = home ? m.ag : m.hg;
      const comp = mine.it.comp === 'lg' ? '' : ` (${P.stepLabel(step)})`;
      let txt;
      if (mine.it.ko) {
        const won = m.w === g.user;
        const pen = m.pen ? ` e ${won ? 'venceu' : 'perdeu'} nos pênaltis por ${home ? m.pen[0] : m.pen[1]} a ${home ? m.pen[1] : m.pen[0]}` : '';
        txt = `${gf} a ${ga} contra o ${opp.name}${pen}${comp}. ${won ? 'Classificado!' : 'Eliminado.'}`;
        P.news(g, txt, won ? 'good' : 'bad');
      } else {
        const word = gf > ga ? 'Vitória' : gf < ga ? 'Derrota' : 'Empate';
        P.news(g, `${word} por ${gf} a ${ga} ${home ? 'contra o' : 'diante do'} ${opp.name}${home ? ' em casa' : ' fora'}${comp}.`, gf > ga ? 'good' : gf < ga ? 'bad' : '');
      }
      for (const e of m.ev) {
        if (e.s !== (home ? 0 : 1)) continue;
        const p = g.db.players[e.p];
        if (e.t === 'lesao') {
          P.news(g, `${p.name} sofreu ${e.n ? e.n.toLowerCase() : 'uma lesão'} e fica fora por ${e.w} ${e.w === 1 ? 'semana' : 'semanas'}.`, 'bad');
          if (P.flash && e.w >= 6) P.flash(g, { pri: 2, ttl: 1, kicker: 'Departamento médico', head: `Baque: ${p.name} fica ${e.w} semanas fora`, dek: `${e.n ? e.n : 'A lesão'} tira ${p.name} de boa parte da temporada. O técnico ${g.manager} terá de mexer no time.` });
          if (P.mail) P.mail(g, { k: 'inj', pid: p.id, subj: `${p.name} lesionado: ${e.w} ${e.w === 1 ? 'semana' : 'semanas'} fora`, body: `Chefe, o departamento médico confirmou: o ${p.name} sofreu ${e.n ? e.n.toLowerCase() : 'uma lesão'} no jogo contra o ${opp.name} e fica fora por ${e.w} ${e.w === 1 ? 'semana' : 'semanas'}. Precisamos rever a escalação.` });
        }
        if (e.t === 'vermelho') {
          P.news(g, `${p.name} foi expulso e está suspenso.`, 'bad');
          if (P.mail) P.mail(g, { k: 'sus', pid: p.id, subj: `${p.name} suspenso após expulsão`, body: `Chefe, o ${p.name} foi expulso contra o ${opp.name}${e.two ? ' (dois amarelos)' : ''} e cumpre suspensão de ${e.two ? '1 jogo' : '2 jogos'}. Precisamos de alguém na posição dele.` });
        }
      }
      if (P.chemAfterMatch) P.chemAfterMatch(g, m, mine.r, home);
      if (P.afterUserMatch) P.afterUserMatch(g, mine.it, mine.r, home);
    }
    if (step.t === 'cup' && step.r === P.CUP_NAMES.length - 1) {
      const fin = g.cup.rounds[step.r].ties[0];
      g.cup.winner = fin.w;
      P.news(g, `${P.club(g, fin.w).name} é o campeão da Copa Ultra!`, fin.w === g.user ? 'good' : '');
    }
    if (P.scWeek) P.scWeek(g, step, results);
    if (P.rzWeek) P.rzWeek(g, step, results);

    if (P.titleCheck) P.titleCheck(g, step); // tela de título

    // 7. dados da animação (antes de enxugar o que não precisa ficar salvo)
    const anim = results.map(({ it }) => ({
      h: it.m.h, a: it.m.a, comp: it.comp, div: it.div, pen: it.m.pen || null,
      goals: it.m.ev.filter((e) => e.t === 'gol').map((e) => ({ m: e.m, x: e.x, s: e.s })),
      full: it.m
    }));
    // partidas de outras divisões guardam só o placar (save menor)
    for (const { it } of results) {
      if (it.comp === 'lg' && it.div !== userDiv) { delete it.m.ev; delete it.m.notes; delete it.m.st; }
    }

    g.week++;
    if (g.week >= g.cal.length) P.endSeason(g);
    else if (g.cal[g.week].t !== 'lg') P.stepMatches(g); // sorteia copa/playoff da próxima semana
    // rodadas da Taça Raízes sem jogo seu passam direto (não viram uma semana vazia para você)
    while (!g.over && g.week < g.cal.length && g.cal[g.week].t === 'rz' && !P.userMatch(g)) P.endWeek(g, P.beginWeek(g, false));
    return { step, anim };
  };

  P.news = function (g, txt, type) {
    g.news.unshift({ w: g.week + 1, s: g.season, txt, type: type || '' });
    if (g.news.length > 60) g.news.length = 60;
  };

  // ---------- Classificação ----------
  P.table = function (g, d) {
    const rows = {};
    for (const c of P.divClubs(g.db, d)) rows[c.id] = { cid: c.id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, form: [] };
    (g.lg[d] || []).forEach((rd) => rd.forEach((fx) => {
      if (!fx.done || !rows[fx.h] || !rows[fx.a]) return;
      const H = rows[fx.h], A = rows[fx.a];
      H.j++; A.j++; H.gp += fx.hg; H.gc += fx.ag; A.gp += fx.ag; A.gc += fx.hg;
      if (fx.hg > fx.ag) { H.v++; A.d++; H.pts += 3; H.form.push('V'); A.form.push('D'); }
      else if (fx.hg < fx.ag) { A.v++; H.d++; A.pts += 3; H.form.push('D'); A.form.push('V'); }
      else { H.e++; A.e++; H.pts++; A.pts++; H.form.push('E'); A.form.push('E'); }
    }));
    const name = (cid) => (P.club(g, cid) || { name: '' }).name;
    return Object.values(rows).sort((a, b) =>
      b.pts - a.pts || b.v - a.v || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || name(a.cid).localeCompare(name(b.cid)));
  };

  P.scorers = function (g, d, n, cup) {
    const divOf = {};
    g.db.clubs.forEach((c) => { divOf[c.id] = c.div; });
    const key = cup ? 'cg' : 'g';
    return Object.values(g.db.players).filter((p) => p.s[key] > 0 && (cup || divOf[p.clubId] === d))
      .sort((a, b) => b.s[key] - a.s[key] || b.s.as - a.s.as).slice(0, n || 20);
  };

  // ---------- Expectativa da diretoria ----------
  P.expectation = function (gOrDb, cid, ovrs) {
    const db = gOrDb.db || gOrDb;
    const c = db.clubs.find((x) => x.id === cid);
    if (!c) return '';
    ovrs = ovrs || P.clubOvrs(db);
    const rank = P.divClubs(db, c.div).map((x) => x.id).sort((a, b) => ovrs[b] - ovrs[a]).indexOf(cid) + 1;
    if (c.div === 1) return rank <= 2 ? 'Brigar pelo título' : rank <= 6 ? 'Terminar entre os 6' : rank <= 14 ? 'Meio de tabela' : 'Evitar o rebaixamento';
    if (rank <= 2) return 'Subir de divisão';
    if (rank <= 6) return 'Brigar pelo acesso';
    if (rank <= 14) return 'Meio de tabela';
    return c.div < P.DIVS ? 'Evitar o rebaixamento' : 'Fazer uma campanha digna';
  };

  // ---------- Novo jogo ----------
  const AI_FORMS = ['4-4-2', '4-3-3', '4-2-3-1', '4-1-2-1-2', '3-5-2', '4-4-2', '4-3-3', '4-2-3-1'];
  P.newGame = function (db, userCid, manager) {
    const r = P.rng(Date.now() & 0xffffffff);
    const g = { version: P.VERSION, db, user: userCid, manager: manager || 'Técnico', season: 2027, tac: {}, news: [], hist: [] };
    for (const c of db.clubs) {
      g.tac[c.id] = { f: P.pick(r, AI_FORMS), xi: [], men: 'equ', pre: P.pick(r, ['bai', 'med', 'med', 'alt']), est: P.pick(r, ['equ', 'pos', 'con', 'dir', 'equ']), auto: true };
    }
    g.tac[userCid] = { f: '4-4-2', xi: [], men: 'equ', pre: 'med', est: 'equ', auto: true };
    for (const c of db.clubs) g.tac[c.id].xi = P.autoXI(g, c.id, g.tac[c.id].f);
    P.buildSeason(g);
    P.ensureEconomy(g);
    const club = P.club(g, userCid);
    P.news(g, `${g.manager} é o novo técnico do ${club.name}, na ${club.div}ª divisão. A diretoria quer: ${P.expectation(g, userCid).toLowerCase()}.`, 'good');
    return g;
  };

  // ---------- Fim de temporada: campeões, acesso, rebaixamento ----------
  P.endSeason = function (g) {
    g.over = true;
    const sum = { season: g.season, divs: [], cup: g.cup.winner };
    const moves = {};
    for (let d = 1; d <= P.DIVS; d++) {
      const tb = P.table(g, d).map((x) => x.cid);
      const up = d > 1 ? tb.slice(0, P.RULES.autoUp).concat(g.po && g.po[d] && g.po[d].final ? [g.po[d].final.w] : []) : [];
      const down = d < P.DIVS ? tb.slice(-P.RULES.down) : [];
      up.forEach((cid) => { moves[cid] = d - 1; });
      down.forEach((cid) => { moves[cid] = d + 1; });
      if (g.po && g.po[d] && g.po[d].final) g.po[d].w = g.po[d].final.w;
      sum.divs.push({ d, champ: tb[0], up, down });
    }
    g.moves = moves;
    g.summary = sum;
    // premiação pela posição final
    for (let d = 1; d <= P.DIVS; d++) {
      P.table(g, d).forEach((row, i) => P.pay(g, row.cid, P.ECON.tv[d - 1] * P.ECON.prizeFactor * (20 - i) / 20, 'Premiação'));
    }
    const me = P.club(g, g.user);
    const tbMine = P.table(g, me.div).map((x) => x.cid);
    const pos = tbMine.indexOf(g.user) + 1;
    let result = 'Permaneceu';
    if (moves[g.user] < me.div) result = 'Acesso';
    if (moves[g.user] > me.div) result = 'Rebaixado';
    if (pos === 1) result = me.div === 1 ? 'Campeão da Ultraliga' : 'Campeão e acesso';
    if (P.potentialUpdate) P.potentialUpdate(g, 'end');
    if (P.seasonStats) P.seasonStats(g);
    if (P.boardSeasonEnd) P.boardSeasonEnd(g);
    const top = P.scorers(g, 1, 1)[0];
    g.hist.push({
      season: g.season, div: me.div, pos, result,
      champ: P.club(g, sum.divs[0].champ).name,
      cup: g.cup.winner ? P.club(g, g.cup.winner).name : '-',
      cupMine: g.cup.winner === g.user,
      top: top ? `${top.name} (${top.s.g})` : '-',
      bal: me.bal
    });
    if (P.scSeasonEnd) P.scSeasonEnd(g);
    if (P.rzSeasonEnd) P.rzSeasonEnd(g);
    if (P.mgrSeasonEnd) P.mgrSeasonEnd(g);
    P.news(g, `Fim de temporada! ${P.club(g, sum.divs[0].champ).name} é o campeão da Ultraliga. Seu time terminou em ${pos}º na ${me.div}ª divisão: ${result.toLowerCase()}.`, result === 'Rebaixado' ? 'bad' : 'good');
  };

  // Rodadas da liga já disputadas antes da semana w (regras do ano ancoradas na liga)
  P.lgDone = (g, w) => { const end = w == null ? g.week : w; let n = 0; for (let i = 0; i < end && i < g.cal.length; i++) if (g.cal[i].t === 'lg') n++; return n; };

  P.newSeason = function (g) {
    const r = P.rng(Date.now() & 0xffffffff);
    // acesso e rebaixamento
    for (const [cid, d] of Object.entries(g.moves || {})) { const c = P.club(g, cid); if (c) c.div = d; }
    g.moves = null;
    const used = new Set(Object.values(g.db.players).map((p) => p.name));
    const retired = [];
    if (P.marketPreSeason) P.marketPreSeason(g, r);
    // contratos encerrados: a IA renova, os seus jogadores sem renovação saem de graça
    const left = [];
    for (const p of Object.values(g.db.players)) {
      if (!p.clubId || !p.ctr || p.ctr > g.season) continue;
      if (p.clubId === g.user) { left.push(p.name); p.clubId = null; p.ctr = 0; }
      else { p.ctr = g.season + 1 + Math.floor(r() * 3); p.wage = P.wageFor(p); }
    }
    for (const p of Object.values(g.db.players)) {
      const avgNote = p.s.j ? p.s.nt / p.s.j : 6.5;
      if (p.age >= 34 && (r() < (p.age - 33) * 0.25 || p.age >= 38)) {
        if (p.clubId) {
          const club = P.club(g, p.clubId);
          const young = P.makePlayer(r, { pos: p.pos, level: P.levelFromRep(club ? club.rep : 65) - 1, age: 17 + Math.floor(r() * 3), clubId: p.clubId, used, country: club && club.country, newgen: true });
          g.db.players[young.id] = young;
          if (p.clubId === g.user) retired.push(`${p.name} se aposentou; ${young.name} (${young.age} anos) subiu da base`);
        }
        delete g.db.players[p.id];
        continue;
      }
      // experiência: um pouco por ano de vida, mais para quem jogou bastante
      if (P.xp) p.xp = P.clamp(Math.round((P.xp(p) + 0.4 + (p.s.j >= 25 ? 0.7 : p.s.j >= 10 ? 0.45 : p.s.j >= 3 ? 0.2 : 0)) * 10) / 10, 1, 20);
      p.age++;
      // evolução (levemente reduzida) e queda mais suave até os 34-35 anos
      let base = p.age <= 21 ? 0.75 : p.age <= 24 ? 0.42 : p.age <= 29 ? 0.08 : p.age <= 32 ? -0.1 : p.age <= 34 ? -0.25 : p.age === 35 ? -0.5 : -0.8;
      // quem tem rodagem segura melhor a queda
      if (base < 0 && P.xp) base += P.clamp((P.xp(p) - 12) * 0.012, -0.05, 0.08);
      if (p.age <= 24 && P.ovr(p) / 5 >= p.pot) base = Math.min(base, 0.1);
      if (avgNote >= 7) base += 0.2;
      if (base > 0 && p.clubId === g.user && P.adF) base *= P.adF(g, p);
      for (const at of P.ATTRS) {
        if (P.GK_ATTRS.includes(at.k) && p.pos !== 'GOL') continue;
        let d = base + P.gauss(r) * 0.6;
        if (p.age >= 31 && P.PHYS_ATTRS.includes(at.k)) d -= p.age >= 35 ? 0.4 : p.age >= 33 ? 0.3 : 0.2;
        p.a[at.k] = P.clamp(p.a[at.k] + P.sround(r, d), 1, 20);
      }
      p.s = P.blankStats(); p.cs = {}; p.cond = 100; p.mor = 70; p.inj = 0; p.susp = 0; p.ylw = 0;
    }
    P.dirty(g);
    g.season++;
    // elenco mínimo: se faltar gente, jovens da base sobem
    const mineNow = P.squad(g, g.user);
    const meC = P.club(g, g.user);
    const promoted = [];
    for (let i = mineNow.length; i < 22; i++) {
      const lacking = Object.keys(P.SQUAD_TEMPLATE).find((pos) => mineNow.concat(promoted).filter((x) => x.pos === pos).length < P.SQUAD_TEMPLATE[pos]) || 'MC';
      const y = P.makePlayer(r, { pos: lacking, level: P.levelFromRep(meC.rep) - 1.5, age: 17 + Math.floor(r() * 3), clubId: g.user, used, country: meC.country, newgen: true });
      g.db.players[y.id] = y; promoted.push(y);
    }
    P.dirty(g);
    if (P.marketPostSeason) P.marketPostSeason(g, r, used);
    if (P.youthSeason) P.youthSeason(g, r);
    g.fin.prev = { s: g.season - 1, cat: g.fin.cat };
    g.fin.s = g.season; g.fin.cat = {};
    P.ensureEconomy(g);
    P.buildSeason(g);
    for (const c of g.db.clubs) P.fixXI(g, c.id);
    const me = P.club(g, g.user);
    if (left.length) P.news(g, `Contratos encerrados, deixaram o clube: ${left.join(', ')}.`, 'warn');
    if (promoted.length) P.news(g, `Para completar o elenco, subiram da base: ${promoted.map((p) => p.name).join(', ')}.`, '');
    P.news(g, `Começa a temporada ${g.season} na ${me.div}ª divisão. Meta da diretoria: ${P.expectation(g, g.user).toLowerCase()}.`, 'good');
    retired.forEach((t) => P.news(g, t + '.', ''));
    if (P.clubNewSeason) P.clubNewSeason(g);
  };

  // ---------- Criar clube próprio (antes da carreira) ----------
  P.createClub = function (db, opts) {
    const c = db.clubs.find((x) => x.id === opts.replaceId);
    if (!c) throw new Error('Escolha qual clube será substituído.');
    for (const p of Object.values(db.players)) if (p.clubId === c.id) delete db.players[p.id];
    const divReps = P.divClubs(db, c.div).map((x) => x.rep);
    Object.assign(c, {
      name: opts.name, short: opts.short, city: opts.city, stadium: opts.stadium, country: opts.country,
      colors: [opts.c1, opts.c2], rep: Math.round(divReps.reduce((a, b) => a + b, 0) / divReps.length * 10) / 10, custom: true
    });
    if (opts.logo && P.isLogo && P.isLogo(opts.logo)) c.logo = opts.logo; else delete c.logo;
    const used = new Set(Object.values(db.players).map((p) => p.name));
    if (opts.squad === 'generic') {
      // jogadores genéricos numerados, para você renomear como quiser
      let n = 1;
      const level = P.levelFromRep(c.rep) - 0.5;
      for (const pos of Object.keys(P.SQUAD_TEMPLATE)) {
        for (let k = 0; k < P.SQUAD_TEMPLATE[pos]; k++) {
          const p = P.makePlayer(Math.random, { pos, level, clubId: c.id, country: c.country, nat: c.country, name: `Jogador ${String(n++).padStart(2, '0')}` });
          db.players[p.id] = p;
        }
      }
    } else P.makeSquad(Math.random, db, c, used);
    return c;
  };
})(window.PFC);
