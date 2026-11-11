/* Prancheta FC — motor do jogo
 * Força dos jogadores, formações, táticas, simulação das partidas e da temporada.
 * Quer mudar o equilíbrio do jogo? Os números que importam estão em TUNING.
 */
(function (P) {
  P.TUNING = {
    attackPerMin: 0.2,      // chance de um ataque acontecer a cada minuto
    chanceBase: 0.40,       // chance de um ataque virar finalização (times iguais)
    goalBase: 0.78,         // conversão base (com finalizador = goleiro, ~30%)
    homeBonus: 1.10,        // vantagem de jogar em casa
    yellowPerMin: 0.02,     // por time
    redPerMin: 0.0003,
    injuryPerMin: 0.0012,
    condDrain: 30,          // desgaste de uma partida (reduzido pela resistência)
    condRecover: 10         // recuperação por rodada (aumentada pela resistência)
  };

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
  P.slots = (f) => (P.FORMATIONS[f] || P.FORMATIONS['4-4-2']).map(([pos, x, y]) => ({ pos, x, y }));

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
  // Familiaridade com a posição: jogar fora de posição custa caro
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
  P.ovrAt = function (p, pos) {
    const r = P.roles(p), w = POS_W[pos];
    let s = 0;
    for (const k in w) s += r[k] * w[k];
    return P.clamp(Math.round(s * 5 * P.fit(p.pos, pos)), 1, 99);
  };
  P.ovr = (p) => P.ovrAt(p, p.pos);
  P.condF = (p) => 0.75 + 0.25 * p.cond / 100;
  P.morF = (p) => 0.94 + 0.12 * p.mor / 100;
  P.available = (p) => !p.inj && !p.susp;
  P.value = function (p) {
    const o = P.ovr(p);
    const ageM = p.age <= 21 ? 1.5 : p.age <= 25 ? 1.2 : p.age <= 29 ? 1 : p.age <= 32 ? 0.6 : 0.3;
    return Math.round(Math.pow(Math.max(o - 40, 1), 2.4) * 900 * ageM / 1000) * 1000;
  };

  // ---------- Acesso ao estado ----------
  P.club = (g, cid) => g.db.clubs.find((c) => c.id === cid);
  P.squad = (g, cid) => Object.values(g.db.players).filter((p) => p.clubId === cid);
  P.clubOvr = function (db, cid) {
    const ps = Object.values(db.players).filter((p) => p.clubId === cid).map(P.ovr).sort((a, b) => b - a).slice(0, 14);
    return ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : 0;
  };

  // ---------- Escalação ----------
  P.autoXI = function (g, cid, formation) {
    const slots = P.slots(formation);
    const avail = P.squad(g, cid).filter(P.available);
    const pairs = [];
    slots.forEach((s, i) => avail.forEach((p) => pairs.push({ i, p, sc: P.ovrAt(p, s.pos) * P.condF(p) })));
    pairs.sort((a, b) => b.sc - a.sc);
    const xi = new Array(slots.length).fill(null), used = new Set();
    for (const pr of pairs) {
      if (xi[pr.i] || used.has(pr.p.id)) continue;
      xi[pr.i] = pr.p.id; used.add(pr.p.id);
    }
    return xi;
  };

  // Corrige uma escalação: troca quem está lesionado, suspenso ou saiu do clube
  P.fixXI = function (g, cid) {
    const t = g.tac[cid];
    const slots = P.slots(t.f);
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
  P.ATT_W = ATT_W; P.MID_W = MID_W; P.DEF_W = DEF_W;

  P.strength = function (on, tac, opts) {
    opts = opts || {};
    let att = 0, mid = 0, def = 0, gk = 4, n = 0;
    for (const s of on) {
      if (s.off) continue;
      n++;
      const p = s.p, r = P.roles(p);
      const f = P.fit(p.pos, s.pos) * P.condF(p) * P.morF(p);
      att += ATT_W[s.pos] * r.att * f;
      mid += MID_W[s.pos] * (r.cre * 0.8 + r.phys * 0.2) * f;
      def += DEF_W[s.pos] * r.def * f;
      if (s.pos === 'GOL') gk = r.gk * f;
    }
    att /= 5.6; mid /= 5.6; def /= 5.6;
    const m = tac.men, pr = tac.pre, st = tac.est;
    if (m === 'def') { att *= 0.9; def *= 1.08; }
    if (m === 'ofe') { att *= 1.08; def *= 0.92; }
    if (pr === 'alt') { mid *= 1.05; def *= 1.02; }
    if (pr === 'bai') { mid *= 0.96; def *= 1.02; }
    if (st === 'pos') { mid *= 1.06; att *= 0.97; }
    if (st === 'con') { mid *= 0.95; if (opts.oppMen === 'ofe') att *= 1.1; }
    if (st === 'dir') { att *= 1.03; mid *= 0.97; }
    if (opts.home) { att *= P.TUNING.homeBonus; mid *= P.TUNING.homeBonus; }
    return { att, mid, def, gk, n };
  };

  // Força para exibir na tela de tática (sem bônus de casa)
  P.teamPreview = function (g, cid) {
    const t = g.tac[cid], slots = P.slots(t.f);
    const on = t.xi.map((id, i) => ({ p: g.db.players[id], pos: slots[i].pos })).filter((s) => s.p);
    return P.strength(on, t);
  };

  // ---------- Calendário (turno e returno, método do círculo) ----------
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
    // Mando de campo equilibrado: quem jogou mais vezes seguidas em casa joga fora
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
    const t = g.tac[cid], slots = P.slots(t.f);
    const on = t.xi.map((id, i) => ({ p: g.db.players[id], pos: slots[i].pos, off: false })).filter((s) => s.p);
    const bench = P.squad(g, cid).filter((p) => P.available(p) && !t.xi.includes(p.id));
    return { cid, t, on, bench, subs: 0, home, yel: {}, played: new Set(on.map((s) => s.p.id)) };
  }

  P.simulate = function (g, fx) {
    const T = P.TUNING, rnd = Math.random;
    const L = [lineup(g, fx.h, true), lineup(g, fx.a, false)];
    let S = [null, null];
    const recalc = () => {
      S[0] = P.strength(L[0].on, L[0].t, { home: true, oppMen: L[1].t.men });
      S[1] = P.strength(L[1].on, L[1].t, { home: false, oppMen: L[0].t.men });
      // jogador a menos pesa bastante
      [0, 1].forEach((i) => { const miss = 11 - S[i].n; if (miss > 0) { const f = Math.pow(0.88, miss); S[i].att *= f; S[i].mid *= f; S[i].def *= f; } });
    };
    recalc();
    const ev = [], goals = [0, 0], shots = [0, 0], posAcc = [0, 0];
    const gls = {}, ast = {};
    const active = (side) => L[side].on.filter((s) => !s.off);
    const end = 90 + 1 + Math.floor(rnd() * 5);

    for (let min = 1; min <= end; min++) {
      const pH = Math.pow(S[0].mid, 2) / (Math.pow(S[0].mid, 2) + Math.pow(S[1].mid, 2));
      posAcc[0] += pH; posAcc[1] += 1 - pH;
      if (min === 46) ev.push({ m: 45, t: 'int' });

      if (rnd() < T.attackPerMin) {
        const side = rnd() < pH ? 0 : 1, o = 1 - side;
        const ratio = S[side].att / Math.max(0.1, S[o].def);
        let cp = T.chanceBase * Math.pow(ratio, 1.1);
        if (L[side].t.est === 'dir') cp *= 1.08;
        cp = P.clamp(cp, 0.12, 0.8);
        if (rnd() < cp) {
          shots[side]++;
          const pool = active(side).filter((s) => s.pos !== 'GOL');
          if (pool.length) {
            const sh = P.weighted(rnd, pool, (s) => ATT_W[s.pos] * (s.p.a.fin + s.p.a.cab * 0.4));
            const a = sh.p.a;
            const q = ((a.fin * 2 + a.com + a.cab * 0.5) / 3.5) * P.fit(sh.p.pos, sh.pos) * P.condF(sh.p) * P.morF(sh.p);
            let pg = T.goalBase * q / (q + S[o].gk * 1.05);
            if (L[side].t.est === 'dir') pg *= 0.94;
            if (L[side].t.est === 'pos') pg *= 1.05;
            if (rnd() < pg) {
              goals[side]++;
              gls[sh.p.id] = (gls[sh.p.id] || 0) + 1;
              let asId = null;
              const mates = pool.filter((s) => s !== sh);
              if (mates.length && rnd() < 0.75) {
                const as = P.weighted(rnd, mates, (s) => (MID_W[s.pos] + ATT_W[s.pos]) * (s.p.a.pas + s.p.a.vis + s.p.a.cru * 0.5));
                asId = as.p.id; ast[asId] = (ast[asId] || 0) + 1;
              }
              ev.push({ m: Math.min(min, 90), x: min > 90 ? min - 90 : 0, t: 'gol', s: side, p: sh.p.id, as: asId });
            } else if (rnd() < 0.25) {
              ev.push({ m: Math.min(min, 90), x: min > 90 ? min - 90 : 0, t: 'chance', s: side, p: sh.p.id });
            }
          }
        }
      }

      // Cartões e lesões
      for (const side of [0, 1]) {
        const act = active(side);
        if (!act.length) continue;
        if (rnd() < T.yellowPerMin * (L[side].t.pre === 'alt' ? 1.2 : 1)) {
          const s = P.weighted(rnd, act, (x) => DEF_W[x.pos] + 0.2);
          const id = s.p.id;
          L[side].yel[id] = (L[side].yel[id] || 0) + 1;
          if (L[side].yel[id] >= 2) { s.off = true; ev.push({ m: Math.min(min, 90), t: 'vermelho', s: side, p: id, two: true }); recalc(); }
          else ev.push({ m: Math.min(min, 90), t: 'amarelo', s: side, p: id });
        } else if (rnd() < T.redPerMin) {
          const s = P.weighted(rnd, act, (x) => DEF_W[x.pos] + 0.2);
          s.off = true; ev.push({ m: Math.min(min, 90), t: 'vermelho', s: side, p: s.p.id }); recalc();
        }
        // jogadores cansados (condição < 65) aumentam o risco de lesão
        if (rnd() < T.injuryPerMin * (act.some((x) => x.p.cond < 65) ? 1.8 : 1)) {
          const s = P.weighted(rnd, act, (x) => (110 - x.p.cond) / 10 + 1);
          const weeks = 1 + Math.floor(rnd() * 5);
          s.off = true; s.injured = weeks;
          const e = { m: Math.min(min, 90), t: 'lesao', s: side, p: s.p.id, w: weeks };
          // substituição automática
          const lu = L[side];
          if (lu.subs < 5 && lu.bench.length) {
            lu.bench.sort((a, b) => P.ovrAt(b, s.pos) * P.condF(b) - P.ovrAt(a, s.pos) * P.condF(a));
            const sub = lu.bench.shift();
            lu.on.push({ p: sub, pos: s.pos, off: false });
            lu.played.add(sub.id); lu.subs++;
            e.sub = sub.id;
          }
          ev.push(e); recalc();
        }
      }
    }

    // Notas dos jogadores
    const notes = {};
    for (const side of [0, 1]) {
      const res = Math.sign(goals[side] - goals[1 - side]);
      const conceded = goals[1 - side];
      for (const id of L[side].played) {
        const pl = g.db.players[id];
        const slot = L[side].on.find((s) => s.p.id === id);
        let n = 6.3 + (gls[id] || 0) * 0.9 + (ast[id] || 0) * 0.5 + res * 0.4 + P.gauss(rnd) * 0.4;
        if (slot && slot.pos === 'GOL') n += conceded === 0 ? 0.6 : -0.25 * conceded;
        else if (slot && P.LINE[slot.pos] === 'DEF') n += conceded === 0 ? 0.3 : -0.1 * conceded;
        if (ev.some((e) => e.t === 'vermelho' && e.p === id)) n -= 1.2;
        notes[id] = Math.round(P.clamp(n, 3, 10) * 10) / 10;
        void pl;
      }
    }
    const tot = posAcc[0] + posAcc[1];
    return {
      hg: goals[0], ag: goals[1], ev,
      st: { pos: Math.round(posAcc[0] / tot * 100), sh: shots },
      notes, played: [Array.from(L[0].played), Array.from(L[1].played)],
      yel: [L[0].yel, L[1].yel], inj: L.map((lu) => lu.on.filter((s) => s.injured).map((s) => [s.p.id, s.injured]))
    };
  };

  // ---------- Tática da IA ----------
  P.aiTactics = function (g, cid, oppId, home) {
    const t = g.tac[cid];
    const me = P.clubOvr(g.db, cid), op = P.clubOvr(g.db, oppId);
    const diff = me - op + (home ? 2 : -2);
    t.men = diff > 3 ? 'ofe' : diff < -3 ? 'def' : 'equ';
    t.xi = P.autoXI(g, cid, t.f);
  };

  // ---------- Rodada ----------
  P.playRound = function (g) {
    const rd = g.fixtures[g.round];
    const userWarn = [];
    // 1. escalações
    for (const fx of rd) {
      for (const [cid, opp, home] of [[fx.h, fx.a, true], [fx.a, fx.h, false]]) {
        if (cid === g.user) {
          const t = g.tac[cid];
          if (t.auto) t.xi = P.autoXI(g, cid, t.f);
          else { const fixed = P.fixXI(g, cid); if (fixed.length) userWarn.push(...fixed); }
        } else P.aiTactics(g, cid, opp, home);
      }
    }
    if (userWarn.length) P.news(g, 'Escalação ajustada: ' + userWarn.join(', ') + ' entrou no lugar de quem estava fora.', 'warn');

    // 2. jogos
    const results = [];
    for (const fx of rd) {
      const r = P.simulate(g, fx);
      fx.hg = r.hg; fx.ag = r.ag; fx.ev = r.ev; fx.st = r.st; fx.notes = r.notes; fx.done = true;
      results.push({ fx, r });
    }

    // 3. pós-rodada: suspensões cumpridas, lesões, condição, moral, estatísticas
    const playedIds = new Set();
    for (const p of Object.values(g.db.players)) {
      if (p.susp > 0) p.susp--;
      if (p.inj > 0) p.inj--;
    }
    for (const { fx, r } of results) {
      [fx.h, fx.a].forEach((cid, side) => {
        const res = Math.sign(side === 0 ? r.hg - r.ag : r.ag - r.hg);
        const t = g.tac[cid];
        for (const id of r.played[side]) {
          const p = g.db.players[id];
          playedIds.add(id);
          p.s.j++;
          p.s.nt += r.notes[id] || 6;
          let drain = P.TUNING.condDrain - p.a.res * 0.6 + (t.pre === 'alt' ? 5 : t.pre === 'bai' ? -4 : 0);
          p.cond = P.clamp(p.cond - drain, 30, 100);
          p.mor = P.clamp(p.mor + res * 6 + ((r.notes[id] || 6) - 6.5) * 3, 20, 100);
        }
        for (const p of P.squad(g, cid)) {
          if (!r.played[side].includes(p.id)) p.mor = P.clamp(p.mor + res * 2 - (P.ovr(p) > 70 ? 1.5 : 0), 20, 100);
        }
        for (const [id, n] of Object.entries(r.yel[side])) {
          const p = g.db.players[id];
          if (n >= 2) { p.s.cv++; p.susp = Math.max(p.susp, 1); }
          else {
            p.s.ca++; p.ylw++;
            if (p.ylw >= 3) {
              p.ylw = 0; p.susp = Math.max(p.susp, 1);
              if (cid === g.user) P.news(g, `${p.name} levou o 3º amarelo e cumpre suspensão na próxima rodada.`, 'warn');
            }
          }
        }
        for (const [id, w] of r.inj[side]) g.db.players[id].inj = w;
      });
      for (const e of r.ev) {
        if (e.t === 'gol') { g.db.players[e.p].s.g++; if (e.as) g.db.players[e.as].s.as++; }
        if (e.t === 'vermelho' && !e.two) { g.db.players[e.p].s.cv++; g.db.players[e.p].susp = Math.max(g.db.players[e.p].susp, 2); }
      }
    }
    for (const p of Object.values(g.db.players)) {
      p.cond = P.clamp(p.cond + P.TUNING.condRecover + p.a.res * 0.45, 30, 100);
    }

    // 4. notícias sobre o meu time
    const mine = results.find(({ fx }) => fx.h === g.user || fx.a === g.user);
    if (mine) {
      const { fx } = mine, home = fx.h === g.user;
      const opp = P.club(g, home ? fx.a : fx.h);
      const gf = home ? fx.hg : fx.ag, ga = home ? fx.ag : fx.hg;
      const word = gf > ga ? 'Vitória' : gf < ga ? 'Derrota' : 'Empate';
      P.news(g, `${word} por ${gf} a ${ga} ${home ? 'contra o' : 'diante do'} ${opp.name}${home ? ' em casa' : ' fora'}.`, gf > ga ? 'good' : gf < ga ? 'bad' : '');
      for (const e of fx.ev) {
        const side = home ? 0 : 1;
        if (e.s !== side) continue;
        const p = g.db.players[e.p];
        if (e.t === 'lesao') P.news(g, `${p.name} se lesionou e fica fora por ${e.w} ${e.w === 1 ? 'rodada' : 'rodadas'}.`, 'bad');
        if (e.t === 'vermelho') P.news(g, `${p.name} foi expulso e está suspenso.`, 'bad');
      }
    }

    g.round++;
    if (g.round >= g.fixtures.length) P.endSeason(g);
    return results;
  };

  P.news = function (g, txt, type) {
    g.news.unshift({ r: g.round + 1, s: g.season, txt, type: type || '' });
    if (g.news.length > 50) g.news.length = 50;
  };

  // ---------- Classificação ----------
  P.table = function (g, upto) {
    const rows = {};
    for (const c of g.db.clubs) rows[c.id] = { cid: c.id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, form: [] };
    const lim = upto == null ? g.fixtures.length : upto;
    g.fixtures.slice(0, lim).forEach((rd) => rd.forEach((fx) => {
      if (!fx.done || !rows[fx.h] || !rows[fx.a]) return;
      const H = rows[fx.h], A = rows[fx.a];
      H.j++; A.j++; H.gp += fx.hg; H.gc += fx.ag; A.gp += fx.ag; A.gc += fx.hg;
      if (fx.hg > fx.ag) { H.v++; A.d++; H.pts += 3; H.form.push('V'); A.form.push('D'); }
      else if (fx.hg < fx.ag) { A.v++; H.d++; A.pts += 3; H.form.push('D'); A.form.push('V'); }
      else { H.e++; A.e++; H.pts++; A.pts++; H.form.push('E'); A.form.push('E'); }
    }));
    return Object.values(rows).sort((a, b) =>
      b.pts - a.pts || b.v - a.v || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp ||
      P.club(g, a.cid).name.localeCompare(P.club(g, b.cid).name));
  };

  P.scorers = function (g, n) {
    return Object.values(g.db.players).filter((p) => p.s.g > 0)
      .sort((a, b) => b.s.g - a.s.g || b.s.as - a.s.as).slice(0, n || 20);
  };

  // ---------- Novo jogo / temporada ----------
  const AI_FORMS = ['4-4-2', '4-3-3', '4-2-3-1', '4-1-2-1-2', '3-5-2', '4-4-2', '4-3-3', '4-2-3-1'];
  P.newGame = function (db, userCid, manager) {
    const r = P.rng(Date.now() & 0xffffffff);
    const g = {
      version: P.VERSION, db, user: userCid, manager: manager || 'Técnico',
      season: 2027, round: 0, fixtures: [], tac: {}, news: [], hist: [], over: false
    };
    for (const c of db.clubs) {
      g.tac[c.id] = { f: P.pick(r, AI_FORMS), xi: [], men: 'equ', pre: P.pick(r, ['bai', 'med', 'med', 'alt']), est: P.pick(r, ['equ', 'pos', 'con', 'dir', 'equ']), auto: true };
    }
    g.tac[userCid] = { f: '4-4-2', xi: [], men: 'equ', pre: 'med', est: 'equ', auto: true };
    for (const c of db.clubs) g.tac[c.id].xi = P.autoXI(g, c.id, g.tac[c.id].f);
    g.fixtures = P.makeFixtures(db.clubs.map((c) => c.id), r);
    const club = P.club(g, userCid);
    P.news(g, `${g.manager} é o novo técnico do ${club.name}. A diretoria espera ${P.expectation(g, userCid).toLowerCase()}.`, 'good');
    return g;
  };

  P.expectation = function (g, cid) {
    const ranked = g.db.clubs.map((c) => ({ id: c.id, o: P.clubOvr(g.db, c.id) })).sort((a, b) => b.o - a.o);
    const pos = ranked.findIndex((x) => x.id === cid) + 1;
    const n = ranked.length;
    if (pos <= 2) return 'Brigar pelo título';
    if (pos <= Math.round(n * 0.3)) return 'Vaga na Copa Continental';
    if (pos <= Math.round(n * 0.6)) return 'Meio de tabela tranquilo';
    return 'Evitar o rebaixamento';
  };

  P.endSeason = function (g) {
    g.over = true;
    const tb = P.table(g);
    const champ = P.club(g, tb[0].cid);
    const top = P.scorers(g, 1)[0];
    const myPos = tb.findIndex((x) => x.cid === g.user) + 1;
    g.hist.push({ season: g.season, champ: champ.name, top: top ? `${top.name} (${top.s.g})` : '-', myPos });
    P.news(g, `Fim de temporada! ${champ.name} é o campeão de ${g.season}. Seu time terminou em ${myPos}º.`, 'good');
  };

  P.newSeason = function (g) {
    const r = P.rng(Date.now() & 0xffffffff);
    const used = new Set(Object.values(g.db.players).map((p) => p.name));
    const retired = [];
    for (const p of Object.values(g.db.players)) {
      const avgNote = p.s.j ? p.s.nt / p.s.j : 6.5;
      // aposentadoria
      if (p.age >= 34 && (r() < (p.age - 33) * 0.25 || p.age >= 38)) {
        if (p.clubId) {
          const club = P.club(g, p.clubId);
          const young = P.makePlayer(r, { pos: p.pos, level: P.levelFromRep(club ? club.rep : 65) - 1, age: 17 + Math.floor(r() * 3), clubId: p.clubId, used });
          g.db.players[young.id] = young;
          if (p.clubId === g.user) retired.push(`${p.name} se aposentou; ${young.name} (${young.age} anos) subiu da base`);
        }
        delete g.db.players[p.id];
        continue;
      }
      // evolução
      p.age++;
      let base = p.age <= 21 ? 0.9 : p.age <= 24 ? 0.5 : p.age <= 29 ? 0.1 : p.age <= 32 ? -0.3 : -0.8;
      if (p.age <= 24 && P.ovr(p) / 5 >= p.pot) base = Math.min(base, 0.1);
      if (avgNote >= 7) base += 0.2;
      for (const at of P.ATTRS) {
        if (P.GK_ATTRS.includes(at.k) && p.pos !== 'GOL') continue;
        let d = base + P.gauss(r) * 0.6;
        if (p.age >= 30 && P.PHYS_ATTRS.includes(at.k)) d -= 0.4;
        p.a[at.k] = P.clamp(p.a[at.k] + P.sround(r, d), 1, 20);
      }
      p.s = P.blankStats(); p.cond = 100; p.mor = 70; p.inj = 0; p.susp = 0; p.ylw = 0;
    }
    g.season++; g.round = 0; g.over = false;
    g.fixtures = P.makeFixtures(g.db.clubs.map((c) => c.id), r);
    for (const c of g.db.clubs) P.fixXI(g, c.id);
    P.news(g, `Começa a temporada ${g.season}. Meta da diretoria: ${P.expectation(g, g.user).toLowerCase()}.`, 'good');
    retired.forEach((t) => P.news(g, t + '.', ''));
  };
})(window.PFC);
