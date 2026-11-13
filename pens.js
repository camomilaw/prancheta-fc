/* Prancheta FC — disputa de pênaltis animada (mesmo estilo de botões dos melhores momentos)
 * Vista da área: gol, goleiro e batedor como botões nas cores dos clubes. Cada cobrança:
 * o batedor corre, a bola vai num canto, o goleiro pula; gol, defesa ou bola para fora.
 */
(function (P) {
  const esc = P.esc;
  const W = 100, H = 70;              // coordenadas do desenho
  const SPOT = { x: 50, y: 50 }, GOAL_Y = 14;

  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;

  P.playShootout = function (host, opts) {
    // opts: { seq: [{s, p, goal, how}], clubs: [home, away], names: id->name, onDone }
    const seq = opts.seq || [], C = opts.clubs;
    let i = 0, raf = 0, stopped = false;
    const marks = [[], []];
    host.innerHTML = `<div class="pk-box">
      <div class="pk-score"><div class="pk-team">${P.badge(C[0], 22)}<span class="pk-dots" id="pk-d0"></span><b id="pk-s0">0</b></div>
        <div class="pk-team r"><b id="pk-s1">0</b><span class="pk-dots" id="pk-d1"></span>${P.badge(C[1], 22)}</div></div>
      <svg viewBox="0 0 ${W} ${H}" class="pk-svg" aria-hidden="true">
        <rect x="0" y="0" width="${W}" height="${H}" fill="var(--pitch)"/>
        <path d="M18 ${GOAL_Y + 26} L18 ${GOAL_Y} M82 ${GOAL_Y} L82 ${GOAL_Y + 26} M0 ${GOAL_Y + 26} L100 ${GOAL_Y + 26}" stroke="var(--pitch-line)" stroke-width=".6" fill="none"/>
        <path d="M30 ${GOAL_Y} L30 ${GOAL_Y - 9} L70 ${GOAL_Y - 9} L70 ${GOAL_Y}" stroke="#f6f0e1" stroke-width="1.4" fill="rgba(246,240,225,.12)"/>
        <path d="M0 ${GOAL_Y} L100 ${GOAL_Y}" stroke="var(--pitch-line)" stroke-width=".6"/>
        <circle cx="${SPOT.x}" cy="${SPOT.y}" r=".7" fill="var(--pitch-line)"/>
        <g id="pk-gk"><circle r="3.4" stroke="#1d1a16" stroke-width=".6"/></g>
        <g id="pk-tk"><circle r="3.4" stroke="#1d1a16" stroke-width=".6"/></g>
        <circle id="pk-ball" r="1.3" fill="#fff" stroke="#1d1a16" stroke-width=".4"/>
      </svg>
      <div class="pk-cap" id="pk-cap">Disputa de pênaltis</div>
      <div class="row" style="justify-content:flex-end"><button class="btn sm" id="pk-skip">Pular pênaltis</button></div></div>`;
    const $ = (id) => host.querySelector('#' + id);
    const gk = $('pk-gk'), tk = $('pk-tk'), ball = $('pk-ball'), cap = $('pk-cap');
    const put = (el, x, y) => el.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`);
    const color = (el, c) => { const k = el.querySelector('circle'); k.setAttribute('fill', c.colors[0]); k.setAttribute('stroke', c.colors[1] || '#1d1a16'); };
    const score = [0, 0];
    const drawMarks = () => [0, 1].forEach((s) => { $('pk-d' + s).innerHTML = marks[s].map((g) => `<i class="${g ? 'g' : 'x'}"></i>`).join(''); $('pk-s' + s).textContent = score[s]; });

    function finish() {
      if (stopped) return; stopped = true; cancelAnimationFrame(raf);
      // mostra o placar final mesmo se pulou
      for (; i < seq.length; i++) { const k = seq[i]; marks[k.s].push(k.goal); if (k.goal) score[k.s]++; }
      drawMarks();
      const w = score[0] > score[1] ? 0 : 1;
      cap.innerHTML = `<b>${esc(C[w].name)}</b> vence nos pênaltis por ${score[w]} a ${score[1 - w]}`;
      setTimeout(() => opts.onDone && opts.onDone(), 1400);
    }
    $('pk-skip').addEventListener('click', finish);

    function kick() {
      if (stopped) return;
      if (i >= seq.length) { finish(); return; }
      const k = seq[i], att = C[k.s], def = C[1 - k.s];
      color(tk, att); color(gk, def);
      const side = [-1, 0, 1][Math.floor(Math.random() * 3)];
      const aimX = 50 + (side === 0 ? (Math.random() - 0.5) * 8 : side * (11 + Math.random() * 7));
      const aimY = GOAL_Y - 2 - Math.random() * 5;
      // goleiro: na defesa pula no canto certo; no gol, quase sempre erra o lado
      const gkSide = k.goal ? (side === 0 ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.75 ? -side : 0)) : side;
      const miss = !k.goal && k.how === 'miss';
      const endX = miss ? 50 + (side || 1) * (24 + Math.random() * 6) : aimX;
      const endY = miss ? GOAL_Y - 10 - Math.random() * 4 : aimY;
      const gkX = 50 + gkSide * 12, gkY = GOAL_Y - 2;
      cap.innerHTML = `${esc(att.short)} · <b>${esc((opts.names && opts.names[k.p]) || 'Batedor')}</b> na bola`;
      const t0 = performance.now(), RUN = 700, SHOT = 520, HOLD = 900;
      put(gk, 50, GOAL_Y - 2); put(tk, SPOT.x - 6, SPOT.y + 9); put(ball, SPOT.x, SPOT.y);
      ball.setAttribute('transform', `translate(${SPOT.x},${SPOT.y})`);
      function frame(now) {
        if (stopped) return;
        const t = now - t0;
        if (t < RUN) { const u = ease(t / RUN); put(tk, lerp(SPOT.x - 6, SPOT.x - 1.5, u), lerp(SPOT.y + 9, SPOT.y + 2.5, u)); }
        else if (t < RUN + SHOT) {
          const u = ease((t - RUN) / SHOT);
          // defesa: a bola para no goleiro e volta um pouco
          const bx = !k.goal && !miss ? lerp(SPOT.x, gkX, u) : lerp(SPOT.x, endX, u);
          const by = !k.goal && !miss ? lerp(SPOT.y, gkY + 1.5, u) : lerp(SPOT.y, endY, u);
          ball.setAttribute('transform', `translate(${bx.toFixed(2)},${by.toFixed(2)})`);
          const d = Math.min(1, u * 1.6);
          put(gk, lerp(50, gkX, d), lerp(GOAL_Y - 2, gkY, d));
        } else if (t < RUN + SHOT + 40) {
          marks[k.s].push(k.goal); if (k.goal) score[k.s]++; drawMarks();
          cap.innerHTML = k.goal ? `<b class="pk-g">GOL!</b> ${esc(att.short)}` : miss ? `<b class="pk-x">Para fora!</b>` : `<b class="pk-x">Defendeu!</b> ${esc(def.short)}`;
        } else if (t > RUN + SHOT + HOLD) { i++; kick(); return; }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }
    drawMarks();
    setTimeout(kick, 600);
    return { skip: finish };
  };
})(window.PFC);
