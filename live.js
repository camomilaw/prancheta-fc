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
      h: it.m.h, a: it.m.a, div: it.div, pen: it.m.pen || null,
      goals: it.m.ev.filter((e) => e.t === 'gol').map((e) => ({ m: e.m, x: e.x, s: e.s }))
    }));
    if (step.t === 'lg') others = others.filter((o) => o.div === myDiv);
    if (step.t === 'po') others = others.filter((o) => o.div === ctx.live.it.div);
    A.live = { ctx, side: ctx.live.side, st: ctx.live.st, m: ctx.live.it.m, ko: ctx.live.it.ko, step, T: 0, speed: 1, pause: null, ht: false, others, sel: {}, done: false, msg: '' };
    let el = document.getElementById('md');
    if (!el) { el = document.createElement('div'); el.id = 'md'; el.className = 'md'; document.body.appendChild(el); }
    el.hidden = false; el.scrollTop = 0;
    draw(); tick();
  };

  function tick() {
    clearTimeout(A._lvt);
    const L = A.live;
    if (!L || L.pause || L.done) return;
    A._lvt = setTimeout(stepMinute, L.speed === 1 ? 140 : 35);
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
    if (L.T >= st.end && !L.pause) { finish(); return; }
    draw(); tick();
  }
  function finish() {
    const L = A.live; if (!L || L.done) return;
    clearTimeout(A._lvt);
    L.res = P.endWeek(A.g, L.ctx);
    L.done = true; L.pause = null;
    A.save();
    draw();
  }

  function pausePanel(L) {
    const g = A.g, lu = L.st.L[L.side];
    const onField = lu.on.filter((s) => !s.off || (s.injured && !s.replaced));
    const bench = lu.bench.slice().sort((a, b) => P.ovr(b) - P.ovr(a));
    const left = 5 - lu.subs;
    const t = g.tac[g.user];
    const item = (p, pos, act, on, extra) => `<button class="sub-item ${on ? 'on' : ''}" data-a="${act}" data-id="${p.id}" ${left <= 0 ? 'disabled' : ''}>
        <span class="pos-tag ${P.LINE[pos]}">${pos}</span><span class="nm"><b>${esc(p.name)}</b><small>${extra || ''}${Math.round(p.cond)}% físico</small></span><span class="ovr" style="font-size:1.05rem">${P.ovrAt(p, pos)}</span></button>`;
    const outSel = onField.find((s) => s.p.id === L.sel.out);
    return `<div class="card pause-card">
      <div class="row"><b style="flex:1">${esc(L.pause.reason)}</b><span class="muted" style="font-size:.85rem">Substituições: ${lu.subs}/5</span></div>
      ${L.pause.t === 'lesao' ? '<p class="muted" style="margin:0;font-size:.88rem">Se não trocar o lesionado, seu time segue com um a menos.</p>' : ''}
      <div class="opt"><span class="muted">Mentalidade</span><div class="seg">${[['def', 'Defensiva'], ['equ', 'Equilibrada'], ['ofe', 'Ofensiva']].map(([k, n]) => `<button class="${t.men === k ? 'on' : ''}" data-a="lvMen" data-v="${k}">${n}</button>`).join('')}</div></div>
      ${left > 0 ? `<div class="sub-cols">
        <div><div class="label">Sai</div>${onField.map((s) => item(s.p, s.pos, 'lvOut', L.sel.out === s.p.id, s.injured ? '<span class="chip inj">Lesionado</span> ' : (lu.yel[s.p.id] ? '<span class="yc" style="width:8px;height:11px"></span> ' : ''))).join('')}</div>
        <div><div class="label">Entra${outSel ? ' como ' + outSel.pos : ''}</div>${bench.map((p) => item(p, outSel ? outSel.pos : p.pos, 'lvIn', L.sel.in === p.id)).join('') || '<p class="empty">Banco vazio.</p>'}</div>
      </div>` : '<p class="muted" style="margin:0">Todas as substituições já foram feitas.</p>'}
      ${L.msg ? `<div class="msg">${esc(L.msg)}</div>` : ''}
      <div class="row"><button class="btn" data-a="lvSub" ${L.sel.out && L.sel.in ? '' : 'disabled'}>Fazer substituição</button><span class="spacer"></span><button class="btn primary" data-a="lvGo">Continuar</button></div>
    </div>`;
  }

  function draw() {
    const L = A.live, el = document.getElementById('md');
    if (!L || !el) return;
    A.reg = [];
    const st = L.st, m = L.m, done = L.done;
    const tot = st.posAcc[0] + st.posAcc[1];
    const poss = tot ? Math.round(st.posAcc[0] / tot * 100) : 50;
    const clock = done ? (m.pen ? `Fim de jogo · pênaltis ${m.pen[0]} × ${m.pen[1]}` : 'Fim de jogo') : L.pause && L.pause.reason === 'Intervalo' ? 'Intervalo' : L.T === 0 ? 'Bola rolando' : L.T <= 90 ? `${L.T}'` : `90+${L.T - 90}'`;
    const evs = st.ev.filter((e) => e.t !== 'int' || L.T > 45).slice().reverse();
    const Tshow = done ? 96 : L.T;
    const others = L.others.map((o) => {
      let h = 0, a = 0; for (const e of o.goals) if (key(e) <= Tshow) { if (e.s === 0) h++; else a++; }
      const flash = !done && o.goals.some((e) => key(e) <= Tshow && key(e) > Tshow - 3);
      return A.ogRow({ h: o.h, a: o.a }, h, a, { flash, pen: done ? o.pen : null });
    }).join('');
    let verdict = '';
    if (done && L.ko) verdict = `<p class="verdict ${m.w === A.g.user ? 'good' : 'bad'}">${m.w === A.g.user ? 'Classificado!' : 'Eliminado.'}</p>`;
    const controls = done ? '' : L.pause ? '<span class="chip sus" style="font-size:.75rem">Pausado</span>'
      : `<div class="seg"><button class="${L.speed === 1 ? 'on' : ''}" data-a="lvSpeed" data-s="1">Normal</button><button class="${L.speed === 3 ? 'on' : ''}" data-a="lvSpeed" data-s="3">Rápido</button></div><button class="btn sm" data-a="lvPause">Pausar</button><button class="btn sm" data-a="lvSkip">Pular</button>`;
    const label = L.step.t === 'lg' ? `Outros jogos da ${club(A.g.user).div}ª divisão` : L.step.t === 'cup' ? 'Outros jogos da fase' : 'Playoffs';
    el.innerHTML = `<div class="md-in">
      <div class="row"><h2 style="flex:1;min-width:0">${esc(P.stepLabel(L.step))}</h2>${controls}</div>
      ${A.boardHTML(m, st.goals[0], st.goals[1], clock, { pos: poss })}
      ${verdict}
      ${L.pause ? pausePanel(L) : ''}
      ${done ? `<div class="kv"><div><span class="label">Finalizações</span><b class="num">${st.shots[0]} × ${st.shots[1]}</b></div><div><span class="label">Posse</span><b class="num">${poss}% × ${100 - poss}%</b></div></div>` : ''}
      <ul class="feed" aria-live="polite">${evs.map((e) => A.evLine(e, m)).join('')}</ul>
      ${L.others.length ? `<div class="label">${label}</div><div class="others">${others}</div>` : ''}
      ${done && P.teamTalkPanel ? P.teamTalkPanel() : ''}
      ${done ? '<div class="row"><button class="btn" data-a="lvClose" data-v="tabela">Ver tabela</button><span class="spacer"></span><button class="btn primary" data-a="lvClose" data-v="inicio">Continuar</button></div>' : ''}
    </div>`;
  }

  A.redrawMd = () => { if (A.live) draw(); };
  Object.assign(A.ACT, {
    lvSpeed(d) { A.live.speed = Number(d.s); draw(); tick(); },
    lvPause() { const L = A.live; if (!L || L.done) return; clearTimeout(A._lvt); L.pause = { reason: 'Jogo pausado' }; draw(); },
    lvGo() { const L = A.live; L.pause = null; L.sel = {}; L.msg = ''; draw(); if (L.T >= L.st.end) finish(); else tick(); },
    lvSkip() {
      const L = A.live; if (!L || L.done) return;
      clearTimeout(A._lvt);
      L.st.L[L.side].manual = false; // sem pausas: lesões trocadas automaticamente
      P.simAdvance(L.st, L.st.end);
      L.T = L.st.end;
      finish();
    },
    lvOut(d) { const L = A.live; L.sel.out = L.sel.out === d.id ? null : d.id; L.msg = ''; draw(); },
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
      clearTimeout(A._lvt); A.live = null;
      const el = document.getElementById('md'); if (el) { el.hidden = true; el.innerHTML = ''; }
      A.view = d.v || 'inicio'; if (d.v === 'tabela') A.st.div = null;
      A.save(); A.render(); window.scrollTo(0, 0);
    }
  });
})(window.PFC);
