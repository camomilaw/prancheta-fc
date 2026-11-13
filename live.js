/* Prancheta FC — partida ao vivo
 * O seu jogo é simulado minuto a minuto junto com a animação.
 * Pausa sozinho em expulsão ou lesão do seu time e no intervalo, para substituições
 * (até 5) e mudança de mentalidade. "Pular" termina o jogo direto.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const key = (e) => (e.x ? 90 + e.x : e.m);
  const club = (cid) => A.g.db.clubs.find((c) => c.id === cid);

  A.ACT.play = function () {
    const g = A.g; if (!g || g.over) return;
    const ctx = P.beginWeek(g, true);
    A.st.rd = null; A.st.cupR = null;
    if (!ctx.live) { const res = P.endWeek(g, ctx); A.save(); A.startMatchday(res); return; }
    const step = ctx.step, myDiv = club(g.user).div;
    let others = ctx.results.map(({ it }) => ({
      h: it.m.h, a: it.m.a, div: it.div, comp: it.comp, pen: it.m.pen || null,
      goals: it.m.ev.filter((e) => e.t === 'gol').map((e) => ({ m: e.m, x: e.x, s: e.s }))
    }));
    if (step.t === 'lg') others = others.filter((o) => o.div === myDiv);
    if (step.t === 'po') others = others.filter((o) => o.div === ctx.live.it.div);
    if (step.t === 'rz') others = others.filter((o) => o.comp === ctx.live.it.comp);
    A.live = { ctx, side: ctx.live.side, st: ctx.live.st, m: ctx.live.it.m, ko: ctx.live.it.ko, step, T: 0, speed: 1, pause: null, ht: false, others, sel: {}, done: false, msg: '',
      hlQ: [], hl: null, hlCtl: null, evSeen: 0, hide: [0, 0], pend: new Set(), hlHost: null };
    let el = document.getElementById('md');
    if (!el) { el = document.createElement('div'); el.id = 'md'; el.className = 'md'; document.body.appendChild(el); }
    el.hidden = false; el.scrollTop = 0;
    draw(); tick();
  };

  function tick() {
    clearTimeout(A._lvt);
    const L = A.live;
    if (!L || L.pause || L.done || L.hl) return;
    A._lvt = setTimeout(stepMinute, L.speed === 1 ? 175 : 35);
  }
  function stepMinute() {
    const L = A.live; if (!L || L.pause || L.done) return;
    const st = L.st;
    if (L.T >= st.end) { finish(); return; }
    L.T++;
    const e = P.simAdvance(st, L.T, (x) => x.s === L.side && (x.t === 'vermelho' || x.t === 'lesao'));
    if (e) {
      const p = A.g.db.players[e.p];
      L.pause = { reason: e.t === 'lesao' ? `${p.name} se lesionou` : `${p.name} foi expulso`, t: e.t };
    } else if (L.T === 45 && !L.ht) { L.ht = true; L.pause = { reason: 'Intervalo' }; }
    // melhores momentos: gols, grandes chances e pênaltis viram lances animados (só na velocidade Normal)
    queueHL(L);
    if (L.hlQ.length && !L.hl) { nextHL(); return; }
    if (L.T >= st.end && !L.pause) { finish(); return; }
    draw(); tick();
  }
  const HL_TYPES = ['gol', 'chance', 'penmiss'];
  function queueHL(L) {
    const fresh = L.st.ev.slice(L.evSeen); L.evSeen = L.st.ev.length;
    if (L.speed !== 1 || !P.playHighlight) return;
    for (const e of fresh) {
      if (!HL_TYPES.includes(e.t)) continue;
      L.hlQ.push(e); L.pend.add(e);
      if (e.t === 'gol') L.hide[e.s]++; // o placar só muda quando a bola entra
    }
  }
  function revealHL(L, e) {
    if (!L.pend.has(e)) return;
    L.pend.delete(e);
    if (e.t === 'gol') L.hide[e.s] = Math.max(0, L.hide[e.s] - 1);
  }
  function revealAll(L) { for (const e of Array.from(L.pend)) revealHL(L, e); L.hlQ = []; }
  function nextHL() {
    const L = A.live; if (!L) return;
    const e = L.hlQ.shift();
    if (!e) {
      L.hl = null; L.hlCtl = null;
      draw();
      if (L.pause || L.done) return;
      if (L.T >= L.st.end) finish(); else tick();
      return;
    }
    L.hl = e;
    if (!L.hlHost) { L.hlHost = document.createElement('div'); L.hlHost.className = 'hl-box'; }
    draw();
    L.hlCtl = P.playHighlight(L.hlHost, {
      st: L.st, e, m: L.m,
      onReveal: () => { revealHL(L, e); draw(); },
      onEnd: () => { if (A.live === L && L.hl === e) setTimeout(nextHL, 120); }
    });
  }
  function stopHL(L) {
    if (!L) return;
    const ctl = L.hlCtl; L.hlCtl = null; L.hl = null;
    revealAll(L);
    if (ctl) ctl.skip();
  }
  A.redrawLive = () => draw();
  function finish() {
    const L = A.live; if (!L || L.done) return;
    clearTimeout(A._lvt);
    L.res = P.endWeek(A.g, L.ctx);
    L.done = true; L.pause = null;
    if (L.m.pen && L.m.penSeq && L.speed === 1 && P.playShootout) L.shoot = true;
    A.save();
    draw();
  }

  // Quem ocupa cada posição agora (o último a entrar naquele slot)
  function current(lu) {
    const by = {};
    for (const s of lu.on) if (!s.replaced) by[s.i] = s;
    return by;
  }
  const short = (n) => { const w = n.split(' '); return n.length <= 10 ? n : (w[w.length - 1].length <= 10 ? w[w.length - 1] : w[0].slice(0, 9)); };
  const condC = (c) => (c >= 80 ? '#f3ead2' : c >= 60 ? '#e2b04a' : '#e0645a');

  function pausePanel(L) {
    const g = A.g, lu = L.st.L[L.side];
    const slots = P.slots(lu.t);
    const cur = current(lu);
    const left = 5 - lu.subs;
    const t = g.tac[g.user];
    const outSel = Object.values(cur).find((s) => s.p.id === L.sel.out && (!s.off || s.injured));
    const tgtPos = outSel ? outSel.pos : null;
    const bench = lu.bench.slice().sort((a, b) => tgtPos
      ? P.ovrAt(b, tgtPos) * P.condF(b) - P.ovrAt(a, tgtPos) * P.condF(a)
      : P.ovrAt(b, b.pos) - P.ovrAt(a, a.pos));
    const inSel = lu.bench.find((p) => p.id === L.sel.in);
    const dots = slots.map((sl, i) => {
      const s = cur[i];
      const pos = `left:${sl.x}%;top:${96 - sl.y}%`;
      if (!s) return '';
      const p = s.p;
      if (s.off && !s.injured) return `<div class="slot gone" style="${pos}"><span class="dot red">✕</span><span class="nm">${esc(short(p.name))}</span><span class="ps">Expulso</span></div>`;
      const showP = s.p.id === L.sel.out && inSel ? inSel : p;
      const f = P.fitP(showP, s.pos);
      const mark = s.injured ? '<i class="mk inj">+</i>' : lu.yel[p.id] ? '<i class="mk yc"></i>' : '';
      return `<button class="slot ${L.sel.out === p.id ? 'sel' : ''} ${showP !== p ? 'swap' : ''}" style="${pos}" data-a="lvOut" data-id="${p.id}" ${left <= 0 && s.injured ? 'disabled' : ''} aria-label="${esc(p.name)}, ${s.pos}, ${Math.round(p.cond)}% físico${s.injured ? ', lesionado' : ''}">
          <span class="dot ${s.injured ? 'off' : f < 1 ? 'fit' : ''}" style="--c:${condC(showP.cond)}">${P.ovrAt(showP, s.pos)}${mark}</span>
          <span class="nm">${esc(short(showP.name))}</span><span class="ps">${s.pos}</span></button>`;
    }).join('');
    const benchHTML = bench.map((p) => {
      const pos = tgtPos || p.pos;
      const f = P.fitP(p, pos);
      return `<button class="bn-item ${L.sel.in === p.id ? 'on' : ''}" data-a="lvIn" data-id="${p.id}" ${left <= 0 ? 'disabled' : ''}>
        <span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
        <span class="nm"><b>${esc(p.name)}</b><small data-pos="${p.pos}"><i class="cb" style="--c:${condC(p.cond)}"></i>${Math.round(p.cond)}%</small></span>
        <span class="ovr ${f < 1 ? 'fit' : ''}">${P.ovrAt(p, pos)}</span></button>`;
    }).join('') || '<p class="empty">Banco vazio.</p>';
    let hint;
    if (left <= 0) hint = outSel ? `Toque em outro jogador em campo para trocar de posição com ${esc(outSel.p.name)}.` : 'Substituições esgotadas. Toque em dois jogadores em campo para trocá-los de posição.';
    else if (outSel && inSel) hint = `Sai <b>${esc(outSel.p.name)}</b>, entra <b>${esc(inSel.name)}</b> como ${outSel.pos}.`;
    else if (outSel) hint = `Escolha no banco quem entra como ${outSel.pos}, ou toque em outro jogador em campo para trocar os dois de posição.`;
    else if (inSel) hint = `Toque no campo em quem sai para ${esc(inSel.name)} entrar.`;
    else hint = 'Toque em quem sai no campo e em quem entra no banco. Para trocar posições, toque em dois jogadores em campo.';
    return `<div class="card pause-card">
      <div class="row"><b style="flex:1">${esc(L.pause.reason)}</b><span class="muted" style="font-size:.85rem">Substituições: ${lu.subs}/5</span></div>
      ${L.pause.t === 'lesao' ? '<p class="muted" style="margin:0;font-size:.88rem">Se não trocar o lesionado, seu time segue com um a menos.</p>' : ''}
      <div class="opt"><span class="muted">Mentalidade</span><div class="seg">${[['def', 'Defensiva'], ['equ', 'Equilibrada'], ['ofe', 'Ofensiva']].map(([k, n]) => `<button class="${t.men === k ? 'on' : ''}" data-a="lvMen" data-v="${k}">${n}</button>`).join('')}</div></div>
      <div class="lv-board">
        <div class="pitch lv"><div class="ln mid"></div><div class="ln circ"></div><div class="ln box1"></div><div class="ln box2"></div>${dots}</div>
        <div class="lv-bench"><div class="label">Banco${tgtPos ? ' · nota como ' + tgtPos : ''}</div>${benchHTML}</div>
      </div>
      <p class="muted lv-hint">${hint}</p>
      ${L.msg ? `<div class="msg">${esc(L.msg)}</div>` : ''}
      <div class="row"><button class="btn" data-a="lvSub" ${L.sel.out && L.sel.in && left > 0 ? '' : 'disabled'}>Fazer substituição</button><span class="spacer"></span><button class="btn primary" data-a="lvGo">Continuar</button></div>
    </div>`;
  }

  function draw() {
    const L = A.live, el = document.getElementById('md');
    if (!L || !el) return;
    A.reg = [];
    const st = L.st, m = L.m, done = L.done;
    const tot = st.posAcc[0] + st.posAcc[1];
    const poss = tot ? Math.round(st.posAcc[0] / tot * 100) : 50;
    const clock = done && L.shoot ? 'Disputa de pênaltis' : done ? (m.pen ? `Fim de jogo · pênaltis ${m.pen[0]} × ${m.pen[1]}` : 'Fim de jogo') : L.pause && L.pause.reason === 'Intervalo' ? 'Intervalo' : L.T === 0 ? 'Bola rolando' : L.T <= 90 ? `${L.T}'` : `90+${L.T - 90}'`;
    const evs = st.ev.filter((e) => (e.t !== 'int' || L.T > 45) && !L.pend.has(e)).slice().reverse();
    const Tshow = done ? 96 : L.T;
    const others = L.others.map((o) => {
      let h = 0, a = 0; for (const e of o.goals) if (key(e) <= Tshow) { if (e.s === 0) h++; else a++; }
      const flash = !done && o.goals.some((e) => key(e) <= Tshow && key(e) > Tshow - 3);
      return A.ogRow({ h: o.h, a: o.a }, h, a, { flash, pen: done ? o.pen : null });
    }).join('');
    let verdict = '';
    if (done && L.ko && !L.shoot) verdict = `<p class="verdict ${m.w === A.g.user ? 'good' : 'bad'}">${m.w === A.g.user ? 'Classificado!' : 'Eliminado.'}</p>`;
    const controls = done ? '' : L.pause ? '<span class="chip sus" style="font-size:.75rem">Pausado</span>'
      : `<div class="seg"><button class="${L.speed === 1 ? 'on' : ''}" data-a="lvSpeed" data-s="1">Normal</button><button class="${L.speed === 3 ? 'on' : ''}" data-a="lvSpeed" data-s="3">Rápido</button></div><button class="btn sm" data-a="lvPause">Pausar</button><button class="btn sm" data-a="lvSkip">Pular</button>`;
    const label = L.step.t === 'lg' ? `Outros jogos da ${club(A.g.user).div}ª divisão` : L.step.t === 'cup' || L.step.t === 'sc' ? 'Outros jogos da fase' : L.step.t === 'rz' ? `Outros jogos da ${P.rzStatusName(A.g)}` : 'Playoffs';
    // Manchete do gol: aparece por alguns minutos depois de cada gol
    let goalHead = '';
    const lastGoal = evs.find((e) => e.t === 'gol');
    if (lastGoal && !done && L.T - key(lastGoal) <= 4) {
      const gc = club(lastGoal.s === 0 ? m.h : m.a), gp = A.g.db.players[lastGoal.p];
      const mineG = (lastGoal.s === 0 ? m.h : m.a) === A.g.user;
      const how = { pen: ', de pênalti', fal: ', de falta', esc: ', de cabeça' }[lastGoal.sp] || '';
      const fresh = L._gh !== lastGoal; L._gh = lastGoal;
      goalHead = `<div class="lv-goal ${mineG ? 'mine' : 'theirs'} ${fresh ? 'pop' : ''}" role="status"><span class="lv-goal-k">${lastGoal.x ? '90+' + lastGoal.x : lastGoal.m}' · ${mineG ? 'é do seu time' : 'do adversário'}</span><b>Gol do ${esc(gc.name)}!</b><small>${gp ? esc(gp.name) : ''}${how}</small></div>`;
    }
    el.innerHTML = `<div class="md-in">
      <div class="row md-top"><h2>${esc(P.stepLabel(L.step))}</h2>${controls}</div>
      ${goalHead}
      ${A.boardHTML(m, st.goals[0] - L.hide[0], st.goals[1] - L.hide[1], clock, { pos: poss })}
      ${L.hl ? `<div class="hl-wrap"><div class="row" style="gap:8px"><span class="label" style="flex:1">Melhores momentos · ${L.hl.x ? '90+' + L.hl.x : L.hl.m}'</span><button class="btn sm" data-a="lvHlSkip">Pular lance</button></div><div id="hl-slot"></div></div>` : ''}
      ${verdict}
      ${L.shoot ? '<div id="pen-slot"></div>' : ''}
      ${done && !L.shoot && A.ratingsHTML ? A.ratingsHTML(m) : ''}
      ${L.pause ? pausePanel(L) : ''}
      ${A.matchStatsHTML(A.statsFrom({ pos: poss, sh: st.shots, sot: st.sot, xg: st.xg, fo: st.fouls, co: st.corners }, st.ev))}
      <ul class="feed" aria-live="polite">${evs.map((e) => A.evLine(e, m)).join('')}</ul>
      ${L.others.length ? `<div class="label">${label}</div><div class="others">${others}</div>` : ''}
      ${done && P.teamTalkPanel ? P.teamTalkPanel() : ''}
      ${done ? '<div class="row"><button class="btn" data-a="lvClose" data-v="tabela">Ver tabela</button><span class="spacer"></span><button class="btn primary" data-a="lvClose" data-v="inicio">Continuar</button></div>' : ''}
    </div>`;
    // disputa de pênaltis: o desenho continua vivo mesmo se a tela for redesenhada
    if (L.shoot) {
      const slot = document.getElementById('pen-slot');
      if (L.pkEl) slot.replaceWith(L.pkEl);
      else {
        L.pkEl = slot;
        const names = {}; (L.m.penSeq || []).forEach((k) => { const p = k.p && A.g.db.players[k.p]; if (p) names[k.p] = p.name; });
        P.playShootout(slot, { seq: L.m.penSeq, clubs: [club(L.m.h), club(L.m.a)], names, onDone: () => { if (A.live === L) { L.shoot = false; L.pkEl = null; draw(); } } });
      }
    }
    // o campinho do lance é o mesmo nó a cada redesenho (a animação continua)
    const slot = el.querySelector('#hl-slot');
    if (slot && L.hlHost) slot.appendChild(L.hlHost);
  }

  A.redrawMd = () => { if (A.live) draw(); };
  Object.assign(A.ACT, {
    lvSpeed(d) {
      const L = A.live; L.speed = Number(d.s);
      if (L.speed !== 1 && L.hl) { stopHL(L); draw(); if (!L.pause) { if (L.T >= L.st.end) finish(); else tick(); } return; } // Rápido: sem lances
      draw(); tick();
    },
    lvHlSkip() { const L = A.live; if (L && L.hlCtl) L.hlCtl.skip(); },
    lvPause() { const L = A.live; if (!L || L.done) return; clearTimeout(A._lvt); L.pause = { reason: 'Jogo pausado' }; draw(); },
    lvGo() { const L = A.live; L.pause = null; L.sel = {}; L.msg = ''; draw(); if (L.T >= L.st.end) finish(); else tick(); },
    lvSkip() {
      const L = A.live; if (!L || L.done) return;
      clearTimeout(A._lvt);
      stopHL(L);
      L.st.L[L.side].manual = false; // sem pausas: lesões trocadas automaticamente
      P.simAdvance(L.st, L.st.end);
      L.T = L.st.end;
      finish();
    },
    lvOut(d) {
      const L = A.live;
      // com um jogador de campo já escolhido (e nenhum reserva), tocar em outro troca os dois de posição
      if (L.sel.out && L.sel.out !== d.id && !L.sel.in) {
        const a = A.g.db.players[L.sel.out], b = A.g.db.players[d.id];
        const err = P.simSwap(L.st, L.side, L.sel.out, d.id);
        if (!err) { L.msg = `${a.name} e ${b.name} trocaram de posição.`; L.sel = {}; draw(); return; }
      }
      L.sel.out = L.sel.out === d.id ? null : d.id; L.msg = ''; draw();
    },
    lvIn(d) { const L = A.live; L.sel.in = L.sel.in === d.id ? null : d.id; L.msg = ''; draw(); },
    lvSub() {
      const L = A.live, err = P.simSub(L.st, L.side, L.sel.out, L.sel.in);
      if (err) { L.msg = err; draw(); return; }
      const pin = A.g.db.players[L.sel.in], pout = A.g.db.players[L.sel.out];
      L.msg = `Entrou ${pin.name}, saiu ${pout.name}.`;
      L.sel = {}; draw();
    },
    lvMen(d) { const L = A.live; A.g.tac[A.g.user].men = d.v; L.st.recalc(); draw(); },
    lvClose(d) {
      if (A.live) stopHL(A.live);
      clearTimeout(A._lvt); A.live = null;
      const el = document.getElementById('md'); if (el) { el.hidden = true; el.innerHTML = ''; }
      A.view = d.v || 'inicio'; if (d.v === 'tabela') A.st.div = null;
      A.save(); A.render(); window.scrollTo(0, 0);
    }
  });
})(window.PFC);
