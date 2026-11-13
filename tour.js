/* Prancheta FC — Modo Torneio
 * Na tela inicial: escolha clubes da Ultraliga e/ou times recebidos de outras pessoas,
 * um formato (mata-mata, pontos corridos ou grupos + mata-mata) e simule rodada a rodada.
 * Usa o mesmo motor de partida da carreira, num "mundo" separado (nada muda no banco).
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const FORMATS = {
    ko: { n: 'Mata-mata', d: 'Jogo único, empate vai para os pênaltis', sizes: [4, 8, 16, 32, 64] },
    liga: { n: 'Pontos corridos', d: 'Todos contra todos; campeão é quem soma mais pontos', min: 3, max: 20 },
    grupos: { n: 'Grupos + mata-mata', d: 'Grupos de 4, os 2 melhores avançam', sizes: [8, 16, 32] }
  };
  const st = () => A.setup.tour || (A.setup.tour = { picks: [], format: 'ko', legs: 1, divF: 1, q: '' });

  // ---------- Entrada na tela inicial ----------
  P.tourEntry = function () {
    const lib = P.teamLib();
    return `<section class="jr-sec"><h2 class="jr-h">Modo torneio</h2>
      <div class="tour-cta"><div style="flex:1;min-width:0"><b>Monte um torneio e simule</b><small>Escolha de 3 a 64 times da Ultraliga${lib.length ? ` ou entre os ${lib.length} ${lib.length === 1 ? 'time recebido' : 'times recebidos'}` : ' ou times recebidos de outras pessoas'}, e o formato.</small></div>
      <button class="btn" data-a="tourOpen">Montar torneio →</button></div></section>`;
  };

  // ---------- Times escolhidos ----------
  function pickInfo(pk) {
    if (pk.src === 'lib') { const t = P.teamLib().find((x) => x.libId === pk.id); return t ? { name: t.name, short: t.short, colors: t.colors, logo: t.logo, ovr: P.teamOvr(t), tag: 'recebido' } : null; }
    const db = A.setup.db, c = db.clubs.find((x) => x.id === pk.id); if (!c) return null;
    return { name: c.name, short: c.short, colors: c.colors, logo: c.logo, ovr: P.clubOvrs(db)[c.id], tag: c.div + 'ª div' };
  }
  const has = (src, id) => st().picks.some((p) => p.src === src && p.id === id);
  function validCount(t) {
    const n = t.picks.length, F = FORMATS[t.format];
    if (F.sizes) return F.sizes.includes(n) ? '' : `${F.n} precisa de ${F.sizes.join(', ')} times (agora: ${n}).`;
    return n >= F.min && n <= F.max ? '' : `${F.n} precisa de ${F.min} a ${F.max} times (agora: ${n}).`;
  }

  // ---------- Tela de montagem ----------
  function pickView() {
    const t = st(), db = A.setup.db, ovrs = P.clubOvrs(db), lib = P.teamLib();
    const q = t.q.trim().toLowerCase();
    let clubs = q ? db.clubs.filter((c) => c.name.toLowerCase().includes(q)) : P.divClubs(db, t.divF);
    clubs = clubs.slice().sort((a, b) => a.div - b.div || ovrs[b.id] - ovrs[a.id]).slice(0, 40);
    const err = validCount(t);
    const chip = (pk, i) => { const x = pickInfo(pk); return x ? `<span class="tour-chip">${P.badge(x, 18)}${esc(x.short || x.name)}<button data-a="tourDel" data-i="${i}" aria-label="Tirar ${esc(x.name)}">×</button></span>` : ''; };
    const row = (src, id, x) => `<button class="jr-club ${has(src, id) ? 'on' : ''}" data-a="tourAdd" data-s="${src}" data-id="${id}">
        <span class="jr-strip" style="background:${esc((x.colors || [])[0] || '#888')};border-right-color:${esc((x.colors || [])[1] || '#ccc')}"></span>
        <span class="jr-rank">${has(src, id) ? '✓' : '+'}</span>
        <span class="jr-club-n"><b>${esc(x.name)}</b><small>${esc(x.tag)}</small></span><span class="jr-ovr">${x.ovr}</span></button>`;
    return `<div class="setup jr">
      <div class="row"><button class="btn" data-a="tourClose">‹ Voltar</button></div>
      <header class="jr-mast"><div class="jr-mast-top"><span>Edição especial</span><span>Modo torneio</span><span>${t.picks.length} times</span></div><h1>Torneio</h1>
        <div class="jr-tag">Escolha os times e o formato. A bola rola num mundo à parte: nada muda nas suas carreiras.</div></header>
      <section class="jr-sec"><h2 class="jr-h">1 · Formato</h2>
        <div class="tour-fmt">${Object.entries(FORMATS).map(([k, f]) => `<button class="${t.format === k ? 'on' : ''}" data-a="tourFmt" data-k="${k}"><b>${f.n}</b><small>${f.d}${f.sizes ? ` · ${f.sizes.join('/')} times` : ` · ${f.min} a ${f.max} times`}</small></button>`).join('')}</div>
        ${t.format !== 'ko' ? `<div class="seg" style="margin-top:8px"><button class="${t.legs === 1 ? 'on' : ''}" data-a="tourLegs" data-k="1">Turno único</button><button class="${t.legs === 2 ? 'on' : ''}" data-a="tourLegs" data-k="2">Ida e volta</button></div>` : ''}
      </section>
      <section class="jr-sec"><h2 class="jr-h">2 · Times escolhidos (${t.picks.length})</h2>
        <div class="tour-chips">${t.picks.map(chip).join('') || '<span class="jr-note">Nenhum ainda. Escolha abaixo.</span>'}</div>
        <div class="row"><button class="btn sm" data-a="tourFill">Completar com sorteio</button><button class="btn sm ghost" data-a="tourClear">Limpar</button></div>
        ${err ? `<p class="jr-warn">${esc(err)}</p>` : ''}
      </section>
      ${lib.length ? `<section class="jr-sec"><h2 class="jr-h">Times recebidos</h2><div class="jr-clubs">${lib.map((tm) => row('lib', tm.libId, { name: tm.name, colors: tm.colors, ovr: P.teamOvr(tm), tag: (tm.manager ? 'de ' + tm.manager + ' · ' : '') + 'temporada ' + (tm.season || '—') })).join('')}</div></section>` : ''}
      <section class="jr-sec"><div class="jr-h jr-h-row"><h2>Clubes da Ultraliga</h2><select class="sel" data-c="tourDiv">${Array.from({ length: P.DIVS }, (_, i) => `<option value="${i + 1}" ${t.divF === i + 1 ? 'selected' : ''}>${i + 1}ª divisão</option>`).join('')}</select></div>
        <input class="jr-search" data-c="tourQ" value="${esc(t.q)}" placeholder="Buscar clube pelo nome…" aria-label="Buscar clube">
        <div class="jr-clubs">${clubs.map((c) => row('db', c.id, { name: c.name, colors: c.colors, ovr: ovrs[c.id], tag: c.div + 'ª divisão · ' + P.countryName(c.country) })).join('')}</div>
        <p class="jr-note">Toque para colocar ou tirar do torneio. "Completar com sorteio" usa clubes da divisão escolhida.</p></section>
      <div class="jr-sign-bar"><button class="jr-stamp" data-a="tourStart" ${err ? 'disabled' : ''}>Apitar o torneio</button><span class="jr-note">${err ? esc(err) : `${FORMATS[t.format].n} com ${t.picks.length} times`}</span></div>
    </div>`;
  }

  // ---------- Montar o mundo do torneio ----------
  function buildWorld(t) {
    const src = A.setup.db, clubs = [], players = {}, tac = {};
    t.picks.forEach((pk, i) => {
      const id = 'tt' + i;
      let c, ps, f = '4-4-2';
      if (pk.src === 'lib') {
        const tm = P.teamLib().find((x) => x.libId === pk.id);
        c = { id, name: tm.name, short: (tm.short || tm.name.slice(0, 3)).toUpperCase(), colors: tm.colors || ['#555', '#eee'], logo: tm.logo || undefined, country: tm.country, div: 1, rep: 70, stadium: tm.stadium };
        ps = tm.players; if (tm.tac && tm.tac.f && P.FORMATIONS[tm.tac.f]) f = tm.tac.f;
      } else {
        const o = src.clubs.find((x) => x.id === pk.id);
        c = Object.assign(JSON.parse(JSON.stringify(o)), { id });
        ps = Object.values(src.players).filter((p) => p.clubId === o.id);
      }
      clubs.push(c);
      ps.forEach((sp) => { const p = JSON.parse(JSON.stringify(sp)); p.id = id + '_' + (p.id || P.uid('p')); p.clubId = id; Object.assign(p, { cond: 100, mor: 75, inj: 0, susp: 0, s: P.blankStats() }); players[p.id] = p; });
      tac[id] = { f, xi: [], men: 'equ', pre: 'med', est: 'equ', auto: true };
    });
    const w = { db: { clubs, players }, tac, user: null, chem: {} };
    clubs.forEach((c) => { tac[c.id].xi = P.autoXI(w, c.id, tac[c.id].f); });
    return w;
  }
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function roundRobin(ids, legs) {
    const a = ids.slice(); if (a.length % 2) a.push(null);
    const n = a.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const rd = [];
      for (let i = 0; i < n / 2; i++) { const h = a[i], aw = a[n - 1 - i]; if (h && aw) rd.push(r % 2 ? [aw, h] : [h, aw]); }
      rounds.push(rd); a.splice(1, 0, a.pop());
    }
    return legs === 2 ? rounds.concat(rounds.map((rd) => rd.map(([h, aw]) => [aw, h]))) : rounds;
  }
  const KO_N = (n) => ({ 2: 'Final', 4: 'Semifinal', 8: 'Quartas de final', 16: 'Oitavas de final', 32: '16-avos de final', 64: '32-avos de final' }[n] || `Fase de ${n}`);

  function startTour(t) {
    const w = buildWorld(t), ids = w.db.clubs.map((c) => c.id);
    const T = { w, format: t.format, legs: t.legs, stages: [], cur: 0, goals: {}, done: false, champ: null, log: [] };
    if (t.format === 'liga') T.stages.push({ kind: 'liga', name: 'Pontos corridos', groups: [{ name: '', ids, rounds: roundRobin(ids, t.legs), r: 0 }] });
    else if (t.format === 'grupos') {
      const sh = shuffle(ids), groups = [];
      for (let i = 0; i < sh.length; i += 4) groups.push({ name: 'Grupo ' + String.fromCharCode(65 + i / 4), ids: sh.slice(i, i + 4), rounds: roundRobin(sh.slice(i, i + 4), t.legs), r: 0 });
      T.stages.push({ kind: 'grupos', name: 'Fase de grupos', groups });
    } else T.stages.push(koStage(shuffle(ids)));
    return T;
  }
  function koStage(ids) { const ties = []; for (let i = 0; i < ids.length; i += 2) ties.push({ h: ids[i], a: ids[i + 1] }); return { kind: 'ko', name: KO_N(ids.length), ties }; }

  // ---------- Simular ----------
  function play(T, h, a) {
    const fx = { h, a, neutral: T.format === 'ko' || T.stages[T.cur].kind === 'ko' };
    const s = P.simInit(T.w, fx); P.simAdvance(s, s.end); const r = P.simFinish(s);
    for (const e of r.ev) if (e.t === 'gol') T.goals[e.p] = (T.goals[e.p] || 0) + 1;
    return r;
  }
  function table(T, g) {
    const rows = {}; g.ids.forEach((id) => { rows[id] = { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 }; });
    (g.res || []).forEach(([h, a, x, y]) => { const H = rows[h], Aw = rows[a]; H.j++; Aw.j++; H.gp += x; H.gc += y; Aw.gp += y; Aw.gc += x; if (x > y) { H.v++; Aw.d++; H.pts += 3; } else if (x < y) { Aw.v++; H.d++; Aw.pts += 3; } else { H.e++; Aw.e++; H.pts++; Aw.pts++; } });
    return Object.values(rows).sort((p, q) => q.pts - p.pts || (q.gp - q.gc) - (p.gp - p.gc) || q.gp - p.gp || Math.random() - 0.5);
  }
  function stepRound(T) {
    if (T.done) return;
    const S = T.stages[T.cur], last = [];
    if (S.kind === 'ko') {
      S.ties.forEach((tie) => {
        const r = play(T, tie.h, tie.a);
        tie.hg = r.hg; tie.ag = r.ag;
        if (r.hg === r.ag) { const pen = P.penalties(r.L); tie.pen = [pen[0], pen[1]]; }
        tie.w = r.hg > r.ag ? tie.h : r.hg < r.ag ? tie.a : (tie.pen[0] > tie.pen[1] ? tie.h : tie.a);
        last.push(tie);
      });
      T.log.unshift({ name: S.name, games: last.map((x) => Object.assign({}, x)) });
      const winners = S.ties.map((x) => x.w);
      if (winners.length === 1) { T.done = true; T.champ = winners[0]; T.runner = S.ties[0].w === S.ties[0].h ? S.ties[0].a : S.ties[0].h; }
      else { T.stages.push(koStage(winners)); T.cur++; }
      return;
    }
    let roundName = '';
    S.groups.forEach((g) => {
      if (g.r >= g.rounds.length) return;
      roundName = `${S.kind === 'grupos' ? 'Grupos · ' : ''}Rodada ${g.r + 1} de ${g.rounds.length}`;
      g.rounds[g.r].forEach(([h, a]) => { const r = play(T, h, a); (g.res = g.res || []).push([h, a, r.hg, r.ag]); last.push({ h, a, hg: r.hg, ag: r.ag }); });
      g.r++;
    });
    T.log.unshift({ name: roundName, games: last });
    if (S.groups.every((g) => g.r >= g.rounds.length)) {
      if (S.kind === 'liga') { const tb = table(T, S.groups[0]); T.done = true; T.champ = tb[0].id; T.runner = tb[1] && tb[1].id; }
      else {
        // cruzamento: 1º do grupo A x 2º do B, 1º do B x 2º do A...
        const tops = S.groups.map((g) => table(T, g).slice(0, 2).map((r) => r.id));
        const ids = [];
        for (let i = 0; i < tops.length; i += 2) { ids.push(tops[i][0], tops[i + 1][1], tops[i + 1][0], tops[i][1]); }
        T.stages.push(koStage(ids)); T.cur++;
      }
    }
  }

  // ---------- Tela do torneio em andamento ----------
  function runView() {
    const t = st(), T = t.T, w = T.w;
    const club = (id) => w.db.clubs.find((c) => c.id === id);
    const nm = (id) => esc(club(id).name);
    const game = (x) => `<div class="og"><span class="hm"><span class="tn">${nm(x.h)}</span> ${P.badge(club(x.h), 18)}</span><span class="s">${x.hg} × ${x.ag}${x.pen ? `<span class="pen">pên. ${x.pen[0]}-${x.pen[1]}</span>` : ''}</span><span class="aw">${P.badge(club(x.a), 18)} <span class="tn">${nm(x.a)}</span></span></div>`;
    const S = T.stages[T.cur];
    const tables = (S.kind !== 'ko' ? S.groups : []).map((g) => `<div class="card"><div class="head"><span class="label">${g.name || 'Classificação'}</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">#</th><th>Clube</th><th class="n">P</th><th class="n">J</th><th class="n">V</th><th class="n">SG</th></tr></thead><tbody>
      ${table(T, g).map((r, i) => `<tr class="${S.kind === 'grupos' && i < 2 ? 'me' : ''}"><td class="n">${i + 1}</td><td><span class="club">${P.badge(club(r.id), 18)}${nm(r.id)}</span></td><td class="n"><b>${r.pts}</b></td><td class="n">${r.j}</td><td class="n">${r.v}</td><td class="n">${r.gp - r.gc}</td></tr>`).join('')}</tbody></table></div></div>`).join('');
    const next = S.kind === 'ko' ? `<div class="card"><div class="head"><span class="label">${esc(S.name)}${T.done ? ' · encerrada' : ' · próximos jogos'}</span></div><div class="others" style="grid-template-columns:1fr">${S.ties.map((x) => x.w ? game(x) : `<div class="og"><span class="hm"><span class="tn">${nm(x.h)}</span> ${P.badge(club(x.h), 18)}</span><span class="s">×</span><span class="aw">${P.badge(club(x.a), 18)} <span class="tn">${nm(x.a)}</span></span></div>`).join('')}</div></div>` : '';
    const scorers = Object.entries(T.goals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const champ = T.done ? club(T.champ) : null;
    return `<div class="setup jr">
      <div class="row"><button class="btn" data-a="tourBack">‹ Montar outro</button><span class="spacer"></span><button class="btn" data-a="tourClose">Sair</button></div>
      <header class="jr-mast"><div class="jr-mast-top"><span>Modo torneio</span><span>${esc(FORMATS[T.format].n)}</span><span>${w.db.clubs.length} times</span></div>
        <h1>${T.done ? 'É campeão!' : esc(S.name)}</h1><div class="jr-tag">${T.done ? `${esc(champ.name)} levanta a taça${T.runner ? ` · vice: ${nm(T.runner)}` : ''}` : 'Simule rodada a rodada ou vá direto ao fim.'}</div></header>
      ${champ ? `<div class="tour-champ">${P.badge(champ, 84)}<div><span class="jr-kick">Campeão</span><b>${esc(champ.name)}</b>${scorers[0] ? `<small>Artilheiro: ${esc(w.db.players[scorers[0][0]].name)} (${scorers[0][1]} gols)</small>` : ''}</div></div>` : `<div class="row"><button class="btn primary" data-a="tourStep">Jogar ${S.kind === 'ko' ? esc(S.name.toLowerCase()) : 'próxima rodada'}</button><button class="btn" data-a="tourAll">Simular até o fim</button></div>`}
      ${next}${tables}
      ${T.log.length ? `<div class="card"><div class="head"><span class="label">Resultados</span></div>${T.log.slice(0, 6).map((l) => `<div class="label" style="margin:8px 0 4px">${esc(l.name)}</div><div class="others" style="grid-template-columns:1fr">${l.games.map(game).join('')}</div>`).join('')}</div>` : ''}
      ${scorers.length ? `<div class="card"><div class="head"><span class="label">Artilharia</span></div><div class="tbl-wrap"><table class="tbl"><tbody>${scorers.map(([id, n], i) => { const p = w.db.players[id]; return `<tr><td class="n">${i + 1}</td><td>${esc(p.name)} <span class="muted">${esc(club(p.clubId).short)}</span></td><td class="n"><b>${n}</b></td></tr>`; }).join('')}</tbody></table></div></div>` : ''}
    </div>`;
  }

  P.tourView = function () { const t = st(); return t.T ? runView() : pickView(); };

  Object.assign(A.ACT, {
    tourOpen() { st(); A.setup.touring = true; A.render(); window.scrollTo(0, 0); },
    tourClose() { A.setup.touring = false; if (A.setup.tour) A.setup.tour.T = null; A.render(); window.scrollTo(0, 0); },
    tourBack() { st().T = null; A.render(); window.scrollTo(0, 0); },
    tourFmt(d) { st().format = d.k; A.render(); },
    tourLegs(d) { st().legs = Number(d.k); A.render(); },
    tourAdd(d) {
      const t = st(), i = t.picks.findIndex((p) => p.src === d.s && p.id === d.id);
      if (i >= 0) t.picks.splice(i, 1); else if (t.picks.length < 64) t.picks.push({ src: d.s, id: d.id }); else A.toast('Máximo de 64 times');
      A.render();
    },
    tourDel(d) { st().picks.splice(Number(d.i), 1); A.render(); },
    tourClear() { st().picks = []; A.render(); },
    tourFill() {
      const t = st(), F = FORMATS[t.format];
      const target = F.sizes ? (F.sizes.find((n) => n >= Math.max(t.picks.length, 1)) || F.sizes[F.sizes.length - 1]) : Math.max(t.picks.length, 8);
      const pool = shuffle(P.divClubs(A.setup.db, t.divF).filter((c) => !has('db', c.id)));
      while (t.picks.length < target && pool.length) t.picks.push({ src: 'db', id: pool.pop().id });
      if (t.picks.length < target) { const more = shuffle(A.setup.db.clubs.filter((c) => !has('db', c.id))); while (t.picks.length < target && more.length) t.picks.push({ src: 'db', id: more.pop().id }); }
      A.render();
    },
    tourStart() { const t = st(); if (validCount(t)) { A.toast(validCount(t)); return; } t.T = startTour(t); A.render(); window.scrollTo(0, 0); },
    tourStep() { const t = st(); if (t.T) { stepRound(t.T); A.render(); } },
    tourAll() { const t = st(); let k = 0; while (t.T && !t.T.done && k++ < 200) stepRound(t.T); A.render(); }
  });
  Object.assign(A.CHG, {
    tourDiv(el) { st().divF = Number(el.value); st().q = ''; A.render(); },
    tourQ(el) { st().q = el.value; A.render(); }
  });
})(window.PFC);
