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
    if (cup.rounds[k]) return true;
    if (k > 0 && (!cup.rounds[k - 1] || cup.rounds[k - 1].ties.some((m) => !m.done))) return false; // fase anterior ainda não acabou
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
    return true;
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
    if (cc.ko[k]) return true;
    if (k === 0 ? cc.gfx.some((rds) => rds.some((rd) => rd.some((m) => !m.done))) : (!cc.ko[k - 1] || cc.ko[k - 1].ties.some((m) => !m.done))) return false;
    let ties = [];
    if (k === 0) {
      const t = cc.groups.map((_, gi) => P.ccTable(g, z, gi).map((x) => x.cid));
      for (let i = 0; i < 8; i += 2) { ties.push({ h: t[i][0], a: t[i + 1][1], done: false }); ties.push({ h: t[i + 1][0], a: t[i][1], done: false }); }
    } else {
      const pool = P.shuffle(Math.random, cc.ko[k - 1].ties.map(koW));
      for (let i = 0; i + 1 < pool.length; i += 2) ties.push({ h: pool[i], a: pool[i + 1], done: false, neutral: k === 3 });
    }
    cc.ko[k] = { ties };
    return true;
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
        if (!ncDraw(g, c, k)) continue;
        cup.rounds[k].ties.forEach((m) => out.push({ m, comp: 'nc', ko: true, ctry: c }));
      }
    } else {
      for (const z of Object.keys(g.cc || {})) {
        const cc = g.cc[z];
        if (step.r < 6) cc.gfx.forEach((rds) => (rds[step.r] || []).forEach((m) => out.push({ m, comp: 'cc', z })));
        else if (ccDraw(g, z, step.r - 6)) { cc.ko[step.r - 6].ties.forEach((m) => out.push({ m, comp: 'cc', z, ko: true })); }
      }
    }
    return out;
  };
  const origLabel = P.stepLabel;
  P.stepLabel = function (step) {
    if (step && step.t === 'lg' && P._W && P.app.g && P.app.g.lg) { // rodada da sua liga (ligas menores têm semanas sem jogo)
      const g = P.app.g, me = P.club(g, g.user), fx = me && g.lg[me.div];
      if (fx) return 'Rodada ' + Math.max(1, fx.slice(0, step.r + 1).filter((x) => x.length).length);
    }
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

  // ---------- Telas (Tabela › Copa nacional / Copas continentais) ----------
  const A = P.app, esc = P.esc;
  const PHASES = ['Final', 'Semifinal', 'Quartas de final', 'Oitavas de final', '3ª fase', '2ª fase', '1ª fase'];
  const phase = (cup, k) => PHASES[cup.n - 1 - k] || 'Fase preliminar';
  const winBox = (g, cid, lbl) => { const c = P.club(g, cid); return c ? `<div class="winner">${P.badge(c, 40)}<div><span class="label">${esc(lbl || 'Campeão')}</span><h3>${esc(c.name)}</h3></div></div>` : ''; };
  const mineFirst = (g, ties) => ties.slice().sort((a, b) => ((b.h === g.user || b.a === g.user) ? 1 : 0) - ((a.h === g.user || a.a === g.user) ? 1 : 0));
  const row = (m, k) => A.ogRow(m, m.done ? m.hg : '', m.done ? m.ag : '', { click: true, pen: m.pen, label: k });
  P.ncView = function (g) {
    const st = A.st, me = P.club(g, g.user);
    const cs = P.worldCountries().filter((c) => P.followed(g, P.topDivOf(c)));
    if (!st.ncC || !cs.includes(st.ncC)) st.ncC = P.divCountry(me.div);
    const c = st.ncC, cup = g.nc && g.nc[c];
    const sel = `<select class="sel" data-c="ncC" aria-label="País">${cs.map((x) => `<option value="${x}" ${x === c ? 'selected' : ''}>${esc(ncName(x))}</option>`).join('')}</select>`;
    if (!cup) return '<p class="empty">Sem copa nesta temporada.</p>';
    const n = g.db.clubs.filter((x) => P.divCountry(x.div) === c).length;
    const info = `<p class="muted" style="font-size:.85rem;margin:0 0 10px">${n} clubes ${esc(P.countryPrep(c))}, jogo único e pênaltis em caso de empate. O time da divisão mais baixa joga em casa; a final é em campo neutro.${cup.byes.length ? ` Os ${cup.byes.length} mais fortes entram direto na 2ª fase.` : ''}</p>`;
    if (!cup.rounds.length) {
      const first = g.cal.findIndex((x) => x.t === 'nc' && x.r === cup.start);
      return `<div class="filters" style="margin-bottom:12px">${sel}</div>${info}<p class="empty">A copa começa na semana ${first + 1} da temporada.</p>`;
    }
    if (st.ncR == null || st.ncR >= cup.rounds.length || st.ncRc !== c) { st.ncR = cup.rounds.length - 1; st.ncRc = c; }
    const rd = cup.rounds[st.ncR];
    const out = cup.rounds.some((r) => r.ties.some((m) => m.done && (m.h === g.user || m.a === g.user) && m.w !== g.user));
    const alive = !out && cup.rounds.length && (cup.rounds[cup.rounds.length - 1].ties.some((m) => m.h === g.user || m.a === g.user) || (cup.rounds.length === 1 && cup.byes.includes(g.user)));
    const myStat = c !== P.divCountry(me.div) ? '' : cup.w === g.user ? 'Campeão!' : out ? 'Eliminado' : alive ? 'Na disputa' : 'Aguardando';
    return `${cup.w ? winBox(g, cup.w) : ''}<div class="filters" style="margin-bottom:12px">${sel}<select class="sel" data-c="ncR" aria-label="Fase">${cup.rounds.map((x, i) => `<option value="${i}" ${i === st.ncR ? 'selected' : ''}>${phase(cup, i)} (${x.ties.length} ${x.ties.length === 1 ? 'jogo' : 'jogos'})</option>`).join('')}</select>${myStat ? `<span class="muted">Seu time: <b>${myStat}</b></span>` : ''}</div>
      ${info}<div class="others">${mineFirst(g, rd.ties).map((m) => row(m, `${ncName(c)} · ${phase(cup, st.ncR)}`)).join('')}</div>`;
  };
  P.ccView = function (g) {
    const st = A.st;
    const mine = P.ccOf(g, g.user);
    if (!st.ccZ || !g.cc[st.ccZ]) st.ccZ = mine || (P.WORLD_DEF.find((w) => w.c === P.divCountry(P.club(g, g.user).div)) || {}).z || 'eu';
    const z = st.ccZ, cc = g.cc[z], def = P.CC[z];
    const seg = `<div class="seg" style="margin-bottom:10px">${Object.keys(P.CC).map((k) => `<button class="${k === z ? 'on' : ''}" data-a="ccZ" data-k="${k}">${esc(P.CC[k].short)}</button>`).join('')}</div>`;
    const info = `<p class="muted" style="font-size:.85rem;margin:0 0 10px">${esc(def.n)}: 32 clubes classificados pela liga do ano anterior (${Object.entries(def.slots).map(([c, k]) => `${esc(P.countryName(c))} ${k}`).join(', ')}). Grupos de 4 em ida e volta; os 2 primeiros vão às oitavas, depois jogo único até a final em campo neutro.${mine === z ? '' : ''}</p>`;
    const ko = cc.ko.map((r, k) => `<h3 class="cup-h">${['Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'][k]}</h3><div class="others">${mineFirst(g, r.ties).map((m) => row(m, `${def.short} · ${['Oitavas', 'Quartas', 'Semifinal', 'Final'][k]}`)).join('')}</div>`).reverse().join('');
    const groups = cc.groups.map((gr, gi) => {
      const tb = P.ccTable(g, z, gi);
      return `<div class="cc-gr"><div class="label">Grupo ${LET[gi]}</div><table class="tbl"><tbody>${tb.map((r, i) => { const c = P.club(g, r.cid); return `<tr class="${r.cid === g.user ? 'me' : ''}"><td class="n"><span class="zone ${i < 2 ? 'z1' : ''}">${i + 1}</span></td><td><button class="club club-btn" data-a="clubInfo" data-id="${c.id}">${P.badge(c, 18)}<span>${esc(c.short)}</span></button> <small class="muted">${esc(c.country)}</small></td><td class="n"><b>${r.pts}</b></td><td class="n">${r.j}</td><td class="n">${r.gp - r.gc}</td></tr>`; }).join('')}</tbody></table></div>`;
    }).join('');
    return `${cc.w ? winBox(g, cc.w) : ''}${seg}${info}${ko}<h3 class="cup-h">Fase de grupos</h3><div class="cc-grid">${groups}</div>`;
  };
  Object.assign(A.CHG, {
    ncC(el) { A.st.ncC = el.value; A.st.ncR = null; A.render(); },
    ncR(el) { A.st.ncR = Number(el.value); A.render(); }
  });
  A.ACT.ccZ = (d) => { A.st.ccZ = d.k; A.render(); };

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

// ---------- Retrospectiva do fim da temporada (Carreira normal) ----------
(function (P) {
  const A = P.app, esc = P.esc;
  P.normalSummary = function (g) {
    const s = g.summary, me = P.club(g, g.user), h = g.hist[g.hist.length - 1];
    const cl = (cid) => P.club(g, cid);
    const myC = P.divCountry(me.div);
    const mine = [];
    if (s.nc && s.nc[myC] === g.user) mine.push('campeão da ' + P.ncName(myC));
    for (const [z, w] of Object.entries(s.cc || {})) if (w === g.user) mine.push('campeão da ' + P.CC[z].n);
    const sq = P.squad(g, g.user).filter((p) => p.s && p.s.g + p.s.cg > 0).sort((a, b) => (b.s.g + b.s.cg) - (a.s.g + a.s.cg));
    const myTop = sq[0];
    const cell = (cid) => { const c = cid && cl(cid); return c ? `<span class="club">${P.badge(c, 18)}<span class="show-sm">${esc(c.short)}</span><span class="nm-long">${esc(c.name)}</span></span>` : '–'; };
    const champs = P.worldCountries().map((c) => {
      const d = P.topDivOf(c), row = s.divs.find((x) => x.d === d);
      return `<tr class="${c === myC ? 'me' : ''}"><td>${esc(P.countryName(c))}</td><td>${cell(row && row.champ)}</td><td>${cell(s.nc && s.nc[c])}</td></tr>`;
    }).join('');
    const mv = (ids, icon) => ids.map((cid) => `<span class="mv">${icon}${esc(cl(cid).short)}</span>`).join(' ');
    const I = { up: '▲ ', down: '▼ ' };
    const followedCs = P.worldCountries().filter((c) => P.followed(g, P.topDivOf(c)));
    const moves = followedCs.map((c) => P.countryDivs(c).map((d) => { const x = s.divs.find((y) => y.d === d); return `<tr class="${d === me.div ? 'me' : ''}"><td>${esc(P.divName(d, 1))}</td><td>${esc(cl(x.champ).short)}</td><td>${mv(x.up, I.up) || '–'}</td><td>${mv(x.down, I.down) || '–'}</td></tr>`; }).join('')).join('');
    const cc = Object.entries(s.cc || {}).map(([z, w]) => { const c = w && cl(w); return `<div class="rt-note">${c ? P.badge(c, 30) : ''}<div><span class="rt-lbl">${esc(P.CC[z].n)}</span><b>${esc(c ? c.name : '-')}</b></div></div>`; }).join('');
    const bdo = g.bdo && g.bdo.length && g.bdo[g.bdo.length - 1].s === g.season && P.ballonTable ? `<h3 class="rt-h">Bola de Ouro ${g.season}</h3>${P.ballonTable(g, g.bdo[g.bdo.length - 1], 5)}` : '';
    return `<section class="rt">
      <div class="rt-band"><span>Retrospectiva</span><b>${g.season}</b></div>
      <div class="rt-me">${P.badge(me, 48)}<div><span class="rt-lbl">O ano do ${esc(me.short || me.name)}</span><b>${esc(h.result)}</b><small>${h.pos}º lugar na ${esc(P.divName(h.div))}${mine.length ? ' · ' + esc(mine.join(' · ')) : ''}${myTop ? ` · artilheiro do time: ${esc(myTop.name)} (${myTop.s.g + myTop.s.cg})` : ''}</small></div></div>
      <h3 class="rt-h">Campeões continentais</h3><div class="rt-notes">${cc}</div>
      ${bdo}
      <h3 class="rt-h">Campeões pelo mundo</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>País</th><th>Liga</th><th>Copa</th></tr></thead><tbody>${champs}</tbody></table></div>
      <h3 class="rt-h">Sobe e desce</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Div</th><th>Campeão</th><th>Sobem</th><th>Descem</th></tr></thead><tbody>${moves}</tbody></table></div>
      ${P.seasonExtra ? P.seasonExtra(g) : ''}
      <p class="rt-foot">Na virada os jogadores envelhecem, jovens evoluem, veteranos caem de rendimento e alguns se aposentam. Os classificados para as copas continentais saem desta tabela final.</p>
      <button class="btn primary" data-a="newSeason">Começar temporada ${g.season + 1}</button></section>`;
  };
})(window.PFC);
