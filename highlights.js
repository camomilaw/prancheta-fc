/* Prancheta FC — melhores momentos (estilo FM mobile)
 * Na partida ao vivo em velocidade Normal, gols, grandes chances e pênaltis do seu
 * jogo viram um lance animado num campinho 2D: bolinhas nas posições da formação,
 * nas cores dos clubes, e a bola percorrendo a jogada até a finalização.
 * O campo tem 105 × 68; o time com a bola ataca para a direita (a cena é espelhada
 * quando é o visitante que ataca).
 */
(function (P) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 105, H = 68;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const short = (n) => { const w = String(n).split(' '); return w.length > 1 && w[w.length - 1].length > 2 ? w[w.length - 1] : n; };
  // cor legível sobre o campo: se as cores dos dois times forem parecidas, o visitante usa a secundária
  const hex = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return [128, 128, 128]; const v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  const dist = (a, b) => { const x = hex(a), y = hex(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

  // Posições no campo de quem ataca (para a direita) e de quem defende
  function layout(lu, attacking) {
    const slots = P.slots(lu.t);
    return lu.on.filter((s) => !s.off).map((s) => {
      const sl = slots[s.i] || { x: 50, y: 50 };
      let x, y;
      if (s.pos === 'GOL') { x = attacking ? 4 : W - 2.5; y = H / 2; }
      else if (attacking) { x = 30 + sl.y * 0.62; y = sl.x / 100 * (H - 8) + 4; }
      else { x = W - (8 + sl.y * 0.55); y = H - (sl.x / 100 * (H - 8) + 4); }
      return { p: s.p, pos: s.pos, x, y, bx: x, by: y };
    });
  }

  // Monta a jogada: lista de etapas { ball: [x,y], dur, cap, who }
  function script(e, A, D) {
    const find = (id) => A.find((o) => o.p.id === id);
    const shooter = find(e.p) || A.filter((o) => o.pos !== 'GOL').sort((a, b) => b.x - a.x)[0];
    const gk = D.find((o) => o.pos === 'GOL');
    const goal = [W, H / 2 + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 2.2)];
    const steps = [];
    const scored = e.t === 'gol';
    const name = (o) => (o ? short(o.p.name) : '');
    if (e.sp === 'pen' || e.t === 'penmiss') {
      const spot = [W - 11, H / 2];
      shooter.x = spot[0] - 2.5; shooter.y = spot[1];
      steps.push({ ball: spot, dur: 900, cap: `Pênalti para o time de ${name(shooter)}`, move: [] });
      steps.push({ ball: spot, dur: 700, cap: `${name(shooter)} ajeita a bola…` });
      if (scored) steps.push({ ball: goal, dur: 450, cap: `${name(shooter)} bate…`, shot: true });
      else steps.push({ ball: [W - 2.5, goal[1]], dur: 450, cap: `${name(shooter)} bate…`, shot: true, gkTo: [W - 2.5, goal[1]] }, { ball: [W - 9, goal[1] + (goal[1] > H / 2 ? 9 : -9)], dur: 500, cap: '' });
    } else if (e.sp === 'fal') {
      const spot = [W - 24, H / 2 + (Math.random() - 0.5) * 16];
      shooter.x = spot[0] - 2; shooter.y = spot[1];
      // barreira
      D.filter((o) => o.pos !== 'GOL').sort((a, b) => b.x - a.x).slice(0, 4).forEach((o, i) => { o.x = spot[0] + 9; o.y = spot[1] + (spot[1] > H / 2 ? -1 : 1) * 2.5 - 3.6 + i * 2.4; });
      steps.push({ ball: spot, dur: 1000, cap: `Falta perigosa. ${name(shooter)} na cobrança` });
      if (scored) steps.push({ ball: goal, dur: 650, cap: `${name(shooter)} cobra direto…`, shot: true, arc: 6 });
      else steps.push({ ball: [W - 2.5, goal[1]], dur: 650, cap: `${name(shooter)} cobra direto…`, shot: true, arc: 6, gkTo: [W - 2.5, goal[1]] }, { ball: [W - 6, goal[1] + 8], dur: 400, cap: '' });
    } else if (e.sp === 'esc') {
      const top = Math.random() < 0.5;
      const flag = [W - 0.5, top ? 0.5 : H - 0.5];
      const taker = find(e.as) || A.filter((o) => o.pos !== 'GOL' && o !== shooter)[0];
      if (taker) { taker.x = flag[0] - 1.5; taker.y = flag[1] + (top ? 1.5 : -1.5); }
      const head = [W - 9, H / 2 + (Math.random() - 0.5) * 8];
      shooter.x = head[0] - 3; shooter.y = head[1];
      D.filter((o) => o.pos !== 'GOL').sort((a, b) => b.x - a.x).slice(0, 4).forEach((o, i) => { o.x = W - 7 - (i % 2) * 4; o.y = H / 2 - 7 + i * 4.5; });
      steps.push({ ball: flag, dur: 900, cap: `Escanteio. ${name(taker)} na bola` });
      steps.push({ ball: head, dur: 800, cap: `${name(taker)} cruza na área…`, arc: 7, who: shooter, runTo: head });
      if (scored) steps.push({ ball: goal, dur: 380, cap: `${name(shooter)} sobe de cabeça…`, shot: true });
      else steps.push({ ball: [W - 2.5, goal[1]], dur: 380, cap: `${name(shooter)} sobe de cabeça…`, shot: true, gkTo: [W - 2.5, goal[1]] }, { ball: [W - 7, goal[1] + 9], dur: 400, cap: '' });
    } else {
      // jogada: sai da defesa ou do meio, passa pelo garçom (se houver) e termina no finalizador
      const outfield = A.filter((o) => o.pos !== 'GOL' && o !== shooter);
      const assist = find(e.as);
      const start = outfield.filter((o) => o !== assist && ['DEF', 'MEI'].includes(P.LINE[o.pos])).sort(() => Math.random() - 0.5)[0] || outfield[0];
      const mid = outfield.filter((o) => o !== assist && o !== start && P.LINE[o.pos] !== 'DEF').sort(() => Math.random() - 0.5)[0];
      const chain = [start, mid, assist].filter(Boolean);
      // o finalizador entra na área
      const shotPos = [W - 13 - Math.random() * 10, H / 2 + (Math.random() - 0.5) * 18];
      let first = true;
      for (const o of chain) {
        steps.push({ ball: [o.x + 1.2, o.y], dur: first ? 700 : 650, cap: first ? `${name(o)} começa a jogada` : `${name(o)} recebe e avança`, who: o, runTo: [Math.min(o.x + 8, W - 16), o.y] });
        first = false;
      }
      steps.push({ ball: shotPos, dur: 650, cap: assist ? `${name(assist)} encontra ${name(shooter)}…` : `${name(shooter)} aparece livre…`, who: shooter, runTo: shotPos });
      if (scored) steps.push({ ball: goal, dur: 420, cap: `${name(shooter)} finaliza…`, shot: true });
      else steps.push({ ball: [W - 2.5, goal[1]], dur: 420, cap: `${name(shooter)} finaliza…`, shot: true, gkTo: [W - 2.5, goal[1]] }, { ball: [W - 8, goal[1] + (goal[1] > H / 2 ? 10 : -10)], dur: 450, cap: '' });
    }
    return { steps, shooter, gk, scored };
  }

  // Toca um lance. opts: { st (estado da simulação), e (evento), m (partida), onReveal, onEnd }
  P.playHighlight = function (host, opts) {
    const { st, e, m } = opts;
    const side = e.s, mirror = side === 1;
    const clubs = [P.club(P.app.g, m.h), P.club(P.app.g, m.a)];
    const colA = clubs[side].colors, colD = clubs[1 - side].colors;
    // cores que aparecem no gramado: evita verde sobre verde e times da mesma cor
    const GRASS = '#2f7d46';
    const pick = (cols, avoid) => [cols[0], cols[1], '#ffffff', '#111111'].find((c) => c && dist(c, GRASS) > 110 && (!avoid || dist(c, avoid) > 110)) || '#ffffff';
    const cA = pick(colA), cD = pick(colD, cA);
    const A = layout(st.L[side], true), D = layout(st.L[1 - side], false);
    const sc = script(e, A, D);
    const X = (x) => (mirror ? W - x : x), Y = (y) => (mirror ? H - y : y);

    host.innerHTML = '';
    const svg = el('svg', { viewBox: `-2 -2 ${W + 4} ${H + 4}`, class: 'hl-pitch', role: 'img', 'aria-label': 'Lance da partida' }, host);
    // gramado e linhas
    el('rect', { x: -2, y: -2, width: W + 4, height: H + 4, fill: 'var(--pitch)' }, svg);
    for (let i = 0; i < 10; i += 2) el('rect', { x: i * W / 10, y: 0, width: W / 10, height: H, fill: 'var(--pitch-2)' }, svg);
    const ln = { fill: 'none', stroke: 'rgba(255,255,255,.6)', 'stroke-width': 0.4 };
    el('rect', Object.assign({ x: 0, y: 0, width: W, height: H }, ln), svg);
    el('line', Object.assign({ x1: W / 2, y1: 0, x2: W / 2, y2: H }, ln), svg);
    el('circle', Object.assign({ cx: W / 2, cy: H / 2, r: 9.15 }, ln), svg);
    for (const gx of [0, W]) {
      const d = gx ? -1 : 1;
      el('rect', Object.assign({ x: gx ? W - 16.5 : 0, y: H / 2 - 20.15, width: 16.5, height: 40.3 }, ln), svg);
      el('rect', Object.assign({ x: gx ? W - 5.5 : 0, y: H / 2 - 9.15, width: 5.5, height: 18.3 }, ln), svg);
      el('rect', { x: gx ? W : -1.6, y: H / 2 - 3.66, width: 1.6, height: 7.32, fill: 'rgba(255,255,255,.85)' }, svg);
      void d;
    }
    const dots = [];
    const mk = (o, fill, ring) => {
      const g = el('g', {}, svg);
      el('circle', { r: 2.1, fill, stroke: ring, 'stroke-width': 0.6 }, g);
      const t = el('text', { y: -2.7, 'text-anchor': 'middle', class: 'hl-nm' }, g);
      t.textContent = '';
      o.node = g; o.label = t; dots.push(o);
      return o;
    };
    const ring = (c) => (dist(c, '#ffffff') < 120 ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.9)');
    D.forEach((o) => mk(o, o.pos === 'GOL' ? '#f2c230' : cD, ring(cD)));
    A.forEach((o) => mk(o, o.pos === 'GOL' ? '#f2c230' : cA, ring(cA)));
    const ball = el('circle', { r: 0.95, fill: '#fff', stroke: '#111', 'stroke-width': 0.25, class: 'hl-ball' }, svg);
    const cap = document.createElement('div'); cap.className = 'hl-cap'; host.appendChild(cap);
    const place = () => { for (const o of dots) o.node.setAttribute('transform', `translate(${X(o.x)},${Y(o.y)})`); };
    place();

    // ponto de partida da bola: primeira etapa
    let bx = sc.steps[0].ball[0] - 3, by = sc.steps[0].ball[1];
    const setBall = (x, y, lift) => { ball.setAttribute('cx', X(x)); ball.setAttribute('cy', Y(y) - (lift || 0)); ball.setAttribute('r', 0.95 + (lift || 0) * 0.08); };
    setBall(bx, by);
    let i = 0, t0 = null, raf = null, finished = false, revealed = false;
    const label = (o, on) => { if (o && o.label) o.label.textContent = on ? short(o.p.name) : ''; };
    const reveal = () => { if (revealed) return; revealed = true; if (opts.onReveal) opts.onReveal(); };
    const end = () => {
      if (finished) return; finished = true; cancelAnimationFrame(raf);
      reveal();
      if (opts.onEnd) opts.onEnd();
    };
    let lastWho = null;
    const frame = (now) => {
      if (finished) return;
      const stp = sc.steps[i];
      if (!stp) {
        // desfecho
        cap.className = 'hl-cap big ' + (sc.scored ? 'goal' : 'save');
        cap.textContent = sc.scored ? 'GOOOL!' : e.t === 'penmiss' ? 'Pênalti perdido!' : `Defende ${sc.gk ? short(sc.gk.p.name) : 'o goleiro'}!`;
        if (sc.scored) reveal();
        setTimeout(end, sc.scored ? 1300 : 1000);
        return;
      }
      if (t0 == null) {
        t0 = now; stp.from = [bx, by];
        if (stp.cap) cap.textContent = stp.cap;
        cap.className = 'hl-cap';
        if (lastWho) label(lastWho, false);
        if (stp.who) { label(stp.who, true); lastWho = stp.who; stp.who0 = [stp.who.x, stp.who.y]; }
        if (stp.shot) { label(sc.shooter, true); lastWho = sc.shooter; }
        if (stp.gkTo && sc.gk) sc.gk0 = [sc.gk.x, sc.gk.y];
      }
      const k = Math.min(1, (now - t0) / stp.dur), q = ease(k);
      const x = lerp(stp.from[0], stp.ball[0], q), y = lerp(stp.from[1], stp.ball[1], q);
      setBall(x, y, stp.arc ? Math.sin(Math.PI * k) * stp.arc : 0);
      if (stp.who && stp.runTo) { stp.who.x = lerp(stp.who0[0], stp.runTo[0] - 1.2, q); stp.who.y = lerp(stp.who0[1], stp.runTo[1], q); }
      if (stp.gkTo && sc.gk) { sc.gk.x = lerp(sc.gk0[0], stp.gkTo[0], q); sc.gk.y = lerp(sc.gk0[1], stp.gkTo[1], q); }
      // os outros acompanham levemente o lance
      for (const o of dots) if (o !== stp.who && o !== sc.gk && o.pos !== 'GOL') o.y += ((y - o.y) * 0.0025);
      place();
      if (k >= 1) { bx = stp.ball[0]; by = stp.ball[1]; i++; t0 = null; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { skip: end, node: svg };
  };
})(window.PFC);
