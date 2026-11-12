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

  // Monta a jogada como etapas do estilo FM mobile:
  //  hold  (parado, com a bola no pé)  · carry (conduz a bola até um ponto)
  //  pass  (a bola vai ao ponto de encontro e o companheiro corre até lá)
  //  shot  (finalização; o goleiro pula quando for defesa)
  function script(e, A, D) {
    const find = (id) => A.find((o) => o.p.id === id);
    const R = Math.random;
    const shooter = find(e.p) || A.filter((o) => o.pos !== 'GOL').sort((a, b) => b.x - a.x)[0];
    const gk = D.find((o) => o.pos === 'GOL');
    const scored = e.t === 'gol';
    const goalY = H / 2 + (R() < 0.5 ? -1 : 1) * (1 + R() * 2.3);
    const name = (o) => (o ? short(o.p.name) : '');
    const steps = [];
    const shot = (who, cap, dur, arc) => {
      steps.push({ k: 'shot', who, to: scored ? [W + 1.2, goalY] : [W - 2.2, goalY], dur, arc, cap, save: !scored });
      if (!scored) steps.push({ k: 'loose', to: [W - 9, goalY + (goalY > H / 2 ? 9 : -9)], dur: 650, cap: '' });
    };
    let holder;
    if (e.sp === 'pen' || e.t === 'penmiss') {
      holder = shooter; holder.x = W - 13; holder.y = H / 2;
      D.forEach((o) => { if (o.pos !== 'GOL' && o.x > W - 20) o.x = W - 21 - R() * 6; });
      A.forEach((o) => { if (o !== holder && o.x > W - 20) o.x = W - 21 - R() * 6; });
      steps.push({ k: 'hold', who: holder, ball: [W - 11, H / 2], dur: 1400, cap: `Pênalti! ${name(holder)} vai para a cobrança` });
      steps.push({ k: 'carry', who: holder, to: [W - 11.8, H / 2], dur: 700, cap: `${name(holder)} corre para a bola…` });
      shot(holder, `${name(holder)} bate…`, 650);
    } else if (e.sp === 'fal') {
      holder = shooter;
      const spot = [W - 24, H / 2 + (R() - 0.5) * 16];
      holder.x = spot[0] - 2; holder.y = spot[1];
      D.filter((o) => o.pos !== 'GOL').sort((a, b) => b.x - a.x).slice(0, 4).forEach((o, i) => { o.x = spot[0] + 9; o.y = spot[1] + (spot[1] > H / 2 ? -1 : 1) * 2 - 3 + i * 2; o.lock = true; });
      steps.push({ k: 'hold', who: holder, ball: spot, dur: 1500, cap: `Falta perigosa. ${name(holder)} na cobrança` });
      steps.push({ k: 'carry', who: holder, to: [spot[0] - 0.6, spot[1]], dur: 600, cap: `${name(holder)} cobra direto…` });
      shot(holder, `${name(holder)} cobra direto…`, 950, 5);
    } else if (e.sp === 'esc') {
      const top = R() < 0.5;
      const flag = [W - 0.6, top ? 0.6 : H - 0.6];
      holder = find(e.as) || A.filter((o) => o.pos !== 'GOL' && o !== shooter).sort((a, b) => b.x - a.x)[0];
      holder.x = flag[0] - 1.6; holder.y = flag[1] + (top ? 1.6 : -1.6);
      // área cheia: atacantes e defensores dentro da área
      A.filter((o) => o.pos !== 'GOL' && o !== holder).sort((a, b) => b.x - a.x).slice(0, 5).forEach((o, i) => { o.x = W - 8 - (i % 3) * 3.5; o.y = H / 2 - 8 + i * 4; });
      D.filter((o) => o.pos !== 'GOL').sort((a, b) => b.x - a.x).slice(0, 5).forEach((o, i) => { o.x = W - 6 - (i % 2) * 4; o.y = H / 2 - 9 + i * 4.3; });
      const head = [W - 9, H / 2 + (R() - 0.5) * 9];
      shooter.x = head[0] - 5; shooter.y = head[1] + (R() - 0.5) * 4;
      steps.push({ k: 'hold', who: holder, ball: flag, dur: 1300, cap: `Escanteio. ${name(holder)} na bola` });
      steps.push({ k: 'pass', who: holder, to: shooter, meet: head, dur: 1100, arc: 7, cap: `${name(holder)} cruza na área…` });
      shot(shooter, `${name(shooter)} sobe de cabeça…`, 500);
    } else {
      // jogada trabalhada: sai da defesa ou do meio, passa pelo garçom (se houver) e chega no finalizador
      const outfield = A.filter((o) => o.pos !== 'GOL' && o !== shooter);
      const assist = find(e.as);
      const pool = (lines) => outfield.filter((o) => o !== assist && lines.includes(P.LINE[o.pos]));
      holder = pool(['DEF', 'MEI']).sort(() => R() - 0.5)[0] || outfield[0];
      const mid = pool(['MEI', 'ATA']).filter((o) => o !== holder).sort(() => R() - 0.5)[0];
      const chain = [mid, assist].filter((o) => o && o !== holder);
      const fwd = (o, d) => [Math.min(o.x + d, W - 20), P.clamp(o.y + (R() - 0.5) * 8, 4, H - 4)];
      steps.push({ k: 'hold', who: holder, ball: [holder.x + 1, holder.y], dur: 700, cap: `${name(holder)} com a bola` });
      steps.push({ k: 'carry', who: holder, to: fwd(holder, 7 + R() * 5), dur: 1100, cap: `${name(holder)} avança` });
      let cur = holder;
      for (const o of chain) {
        const meet = fwd(o, 4 + R() * 4);
        steps.push({ k: 'pass', who: cur, to: o, meet, dur: 900, cap: `${name(cur)} toca para ${name(o)}` });
        steps.push({ k: 'carry', who: o, to: fwd({ x: meet[0], y: meet[1] }, 7 + R() * 6), dur: 1100, cap: `${name(o)} conduz…` });
        cur = o;
      }
      const shotPos = [W - 12 - R() * 9, H / 2 + (R() - 0.5) * 16];
      if (cur !== shooter) steps.push({ k: 'pass', who: cur, to: shooter, meet: shotPos, dur: 950, cap: `${name(cur)} encontra ${name(shooter)}…` });
      else steps.push({ k: 'carry', who: shooter, to: shotPos, dur: 1000, cap: `${name(shooter)} parte para cima…` });
      steps.push({ k: 'carry', who: shooter, to: [shotPos[0] + 1.5, shotPos[1] + (H / 2 - shotPos[1]) * 0.15], dur: 450, cap: `${name(shooter)} ajeita…` });
      shot(shooter, `${name(shooter)} finaliza…`, 650);
    }
    const mode = e.sp === 'pen' || e.t === 'penmiss' ? 'pen' : e.sp === 'fal' ? 'fk' : e.sp === 'esc' ? 'corner' : 'open';
    return { steps, shooter, gk, scored, holder, goalY, mode };
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
    for (const o of A.concat(D)) { o.bx = o.x; o.by = o.y; }
    const X = (x) => (mirror ? W - x : x), Y = (y) => (mirror ? H - y : y);

    host.innerHTML = '';
    const svg = el('svg', { viewBox: `-2 -2 ${W + 4} ${H + 4}`, class: 'hl-pitch', role: 'img', 'aria-label': 'Lance da partida' }, host);
    el('rect', { x: -2, y: -2, width: W + 4, height: H + 4, fill: 'var(--pitch)' }, svg);
    for (let i = 0; i < 10; i += 2) el('rect', { x: i * W / 10, y: 0, width: W / 10, height: H, fill: 'var(--pitch-2)' }, svg);
    const ln = { fill: 'none', stroke: 'rgba(255,255,255,.6)', 'stroke-width': 0.35 };
    el('rect', Object.assign({ x: 0, y: 0, width: W, height: H }, ln), svg);
    el('line', Object.assign({ x1: W / 2, y1: 0, x2: W / 2, y2: H }, ln), svg);
    el('circle', Object.assign({ cx: W / 2, cy: H / 2, r: 9.15 }, ln), svg);
    for (const gx of [0, W]) {
      el('rect', Object.assign({ x: gx ? W - 16.5 : 0, y: H / 2 - 20.15, width: 16.5, height: 40.3 }, ln), svg);
      el('rect', Object.assign({ x: gx ? W - 5.5 : 0, y: H / 2 - 9.15, width: 5.5, height: 18.3 }, ln), svg);
      el('circle', { cx: gx ? W - 11 : 11, cy: H / 2, r: 0.35, fill: 'rgba(255,255,255,.7)' }, svg);
      el('rect', { x: gx ? W : -1.6, y: H / 2 - 3.66, width: 1.6, height: 7.32, fill: 'rgba(255,255,255,.85)' }, svg);
    }
    const dots = [];
    const ring = (c) => (dist(c, '#ffffff') < 120 ? 'rgba(0,0,0,.75)' : 'rgba(255,255,255,.9)');
    const mk = (o, fill, rg) => {
      const g = el('g', {}, svg);
      el('circle', { r: 1.35, fill, stroke: rg, 'stroke-width': 0.35 }, g);
      o.label = el('text', { y: -2, 'text-anchor': 'middle', class: 'hl-nm' }, g);
      o.node = g; dots.push(o);
    };
    D.forEach((o) => mk(o, o.pos === 'GOL' ? '#f2c230' : cD, ring(cD)));
    A.forEach((o) => mk(o, o.pos === 'GOL' ? '#f2c230' : cA, ring(cA)));
    const ball = el('circle', { r: 0.7, fill: '#fff', stroke: '#111', 'stroke-width': 0.2, class: 'hl-ball' }, svg);
    const cap = document.createElement('div'); cap.className = 'hl-cap'; host.appendChild(cap);
    const place = () => { for (const o of dots) o.node.setAttribute('transform', `translate(${X(o.x).toFixed(2)},${Y(o.y).toFixed(2)})`); };
    const setBall = (x, y, lift) => { ball.setAttribute('cx', X(x).toFixed(2)); ball.setAttribute('cy', (Y(y) - (lift || 0)).toFixed(2)); ball.setAttribute('r', (0.7 + (lift || 0) * 0.06).toFixed(2)); };
    const label = (o, on) => { if (o && o.label) o.label.textContent = on ? short(o.p.name) : ''; };
    // a bola no pé: um pouco à frente, na direção do gol
    // direção para onde cada jogador está virado (segue o movimento, com um pouco de atraso)
    const setHead = (o) => {
      const sp = Math.hypot(o.vx || 0, o.vy || 0);
      if (o.hx == null) { o.hx = 1; o.hy = 0; }
      if (sp > 0.5) { o.hx = lerp(o.hx, o.vx / sp, 0.22); o.hy = lerp(o.hy, o.vy / sp, 0.22); const n = Math.hypot(o.hx, o.hy) || 1; o.hx /= n; o.hy /= n; }
    };
    // a bola fica na frente do jogador, para onde ele está correndo
    const atFeet = (o) => { if (o.hx == null) { o.hx = 1; o.hy = 0; } return [o.x + o.hx * 1.45, o.y + o.hy * 1.45]; };
    let nowT = 0;

    let ballPos = sc.steps[0].ball || atFeet(sc.holder);
    let carrier = sc.holder;
    label(carrier, true); place(); setBall(ballPos[0], ballPos[1]);

    let i = 0, t0 = null, last = null, raf = null, finished = false, revealed = false, ended = false;
    const reveal = () => { if (revealed) return; revealed = true; if (opts.onReveal) opts.onReveal(); };
    const end = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); reveal(); if (opts.onEnd) opts.onEnd(); };
    // ---------- movimento sem a bola ----------
    // cada jogador tem um alvo a cada quadro e corre até ele com velocidade limitada
    const SPEED = { att: 10, def: 9, press: 11, gk: 7 }; // unidades do campo por segundo
    const seed = new Map(dots.map((o) => [o, Math.random() * 6.28])); // cada um com seu "balanço" próprio
    const nextPass = () => { for (let j = i; j < sc.steps.length; j++) { const st2 = sc.steps[j]; if (st2.k === 'pass') return st2; if (st2.k === 'shot') return null; } return null; };
    // movimento com inércia: acelera e desacelera suave, e chega sem frear de uma vez
    const ACCEL = 22; // unidades/s²
    const moveTo = (o, tx, ty, v, dt) => {
      const s2 = dt / 1000, dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
      const want = d < 0.05 ? 0 : v * Math.min(1, d / 6); // freia aos poucos nos últimos metros
      // corrida com curvas: a direção desejada oscila um pouco enquanto ele ainda está longe
      if (o.ws == null) o.ws = Math.random() * 6.28;
      const ang = (Math.sin(nowT * 1.6 + o.ws) * 0.6 + Math.sin(nowT * 0.7 + o.ws * 2) * 0.3) * Math.min(1, d / 6), ca = Math.cos(ang), sa = Math.sin(ang);
      const ux = d ? dx / d : 0, uy = d ? dy / d : 0;
      const wx = (ux * ca - uy * sa) * want, wy = (ux * sa + uy * ca) * want;
      o.vx = o.vx || 0; o.vy = o.vy || 0;
      let ax = wx - o.vx, ay = wy - o.vy;
      const a = Math.hypot(ax, ay), maxA = ACCEL * s2;
      if (a > maxA) { ax = ax / a * maxA; ay = ay / a * maxA; }
      o.vx += ax; o.vy += ay;
      o.x += o.vx * s2; o.y += o.vy * s2;
      setHead(o);
    };
    // quando um movimento é guiado pela jogada (conduzir, receber), guarda a velocidade para a transição ser suave
    const track = (o, nx, ny, dt) => { if (dt > 0) { o.vx = (nx - o.x) / dt * 1000; o.vy = (ny - o.y) / dt * 1000; } o.x = nx; o.y = ny; setHead(o); };
    // caminho em curva com zigue-zague de drible entre dois pontos
    const curve = (a, b, bend, weave, cycles) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len;
      const c = [(a[0] + b[0]) / 2 + px * bend * len, (a[1] + b[1]) / 2 + py * bend * len];
      return (k) => { const u = 1 - k, w = Math.sin(k * Math.PI * 2 * cycles) * weave * (1 - k * 0.4);
        return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0] + px * w, u * u * a[1] + 2 * u * k * c[1] + k * k * b[1] + py * w]; };
    };
    const drift = (dt, bx, by, now) => {
      const t = now / 1000;
      const sway = (o, amp) => Math.sin(t * 1.7 + seed.get(o)) * amp;
      // trote: ninguém fica parado esperando; todos ajustam a posição em volta do alvo, sem parar
      const jogX = (o) => Math.sin(t * 0.8 + seed.get(o)) * 1.8, jogY = (o) => Math.cos(t * 0.65 + seed.get(o) * 1.3) * 2.2;
      const outA = A.filter((o) => o.pos !== 'GOL'), outD = D.filter((o) => o.pos !== 'GOL');
      if (sc.mode === 'pen' || sc.mode === 'fk') {
        // bola parada: todos quase parados, só ajeitando a posição
        for (const o of dots) if (o !== carrier && o.pos !== 'GOL' && !o.run) { o.x = o.bx + sway(o, 0.25); o.y = o.by + sway(o, 0.35); }
        return;
      }
      const cur = sc.steps[i];
      const held = cur && (cur.k === 'carry' || cur.k === 'hold') ? cur.who : null; // só quem está com a bola no pé fica preso à jogada
      const np = nextPass();
      const late = P.clamp((bx - 45) / 45, 0, 1); // quanto o ataque já avançou
      // ataque
      for (const o of outA) {
        if (o === held || o.run || o.lock) continue;
        let tx, ty;
        if (np && np.to === o) {
          // o próximo a receber já se desmarca rumo ao ponto do passe
          tx = np.meet[0] - 1.25 - 3; ty = np.meet[1];
        } else if (sc.mode === 'corner') {
          tx = o.bx + sway(o, 1.4); ty = o.by + sway(o, 1.8); // empurra-empurra na área
        } else {
          const line = P.LINE[o.pos];
          if (line === 'ATA') {
            // infiltração: corre para as costas da defesa e fecha rumo à área no fim
            tx = Math.min(bx + 12 + (o.bx - 70) * 0.3, W - 9);
            ty = lerp(o.by, H / 2 + (o.by - H / 2) * 0.45, late) + sway(o, 1.2);
          } else if (line === 'MEI') {
            // aproximação: dá opção de passe ao lado ou atrás da bola
            tx = Math.min(bx - 5 + (o.bx - 55) * 0.4, W - 16);
            ty = lerp(o.by, by + (o.by - by) * 0.55, 0.6) + sway(o, 1);
          } else {
            // laterais e zagueiros sobem acompanhando
            const wide = o.pos === 'LD' || o.pos === 'LE';
            tx = Math.min(o.bx + (bx - 40) * (wide ? 0.7 : 0.45), wide ? W - 22 : W - 50);
            ty = o.by + sway(o, 0.6);
          }
        }
        const isNext = np && np.to === o;
        moveTo(o, tx + (isNext ? 0 : jogX(o)), P.clamp(ty + (isNext ? 0 : jogY(o)), 2, H - 2), SPEED.att, dt);
      }
      // defesa: um pressiona a bola, os outros marcam quem está mais perto do gol
      const presser = outD.filter((o) => !o.lock).sort((p1, p2) => Math.hypot(p1.x - bx, p1.y - by) - Math.hypot(p2.x - bx, p2.y - by))[0];
      const free = outA.filter((o) => o !== held).sort((p1, p2) => p2.x - p1.x);
      const taken = new Set();
      for (const o of outD) {
        if (o.lock) continue;
        if (o === presser && sc.mode !== 'corner') { moveTo(o, bx + 2.2, by + (H / 2 - by) * 0.08, SPEED.press, dt); continue; }
        // marca o atacante livre mais próximo, ficando entre ele e o gol
        // marcação fiel: continua no mesmo atacante enquanto ele estiver por perto
        let mark = null, best = 1e9;
        if (o.mark && free.includes(o.mark) && !taken.has(o.mark)) { const d = Math.hypot(o.mark.x - o.x, o.mark.y - o.y); if (d < 26) { mark = o.mark; best = d; } }
        if (!mark) for (const a of free) { if (taken.has(a)) continue; const d = Math.hypot(a.x - o.x, a.y - o.y); if (d < best) { best = d; mark = a; } }
        o.mark = mark && best < 22 ? mark : null;
        let tx, ty;
        if (mark && best < 22) {
          taken.add(mark);
          tx = mark.x + (W - mark.x) * 0.12 + 1.5; ty = mark.y + (H / 2 - mark.y) * 0.15;
        } else {
          // sem ninguém por perto: recua e fecha o meio
          tx = Math.max(o.bx + (bx - 60) * 0.25, W - 45); ty = o.by + (by - o.by) * 0.3;
        }
        moveTo(o, Math.min(tx + jogX(o) * 0.8, W - 3), P.clamp(ty + jogY(o) * 0.8, 2, H - 2), SPEED.def, dt);
      }
      // goleiro acompanha a bola na linha
      if (sc.gk && !sc.gk.run) moveTo(sc.gk, W - 2.5 - late * 1.2, H / 2 + (by - H / 2) * 0.22, SPEED.gk, dt);
    };
    const frame = (now) => {
      if (finished) return;
      const dt = last == null ? 16 : now - last; last = now; nowT = now / 1000;
      const stp = sc.steps[i];
      if (!stp) {
        if (!ended) {
          ended = true;
          cap.className = 'hl-cap big ' + (sc.scored ? 'goal' : 'save');
          cap.textContent = sc.scored ? 'GOOOL!' : e.t === 'penmiss' ? 'Pênalti perdido!' : `Defende ${sc.gk ? short(sc.gk.p.name) : 'o goleiro'}!`;
          if (sc.scored) reveal();
          setTimeout(end, sc.scored ? 1700 : 1300);
        }
        drift(dt, ballPos[0], ballPos[1], now); place();
        raf = requestAnimationFrame(frame);
        return;
      }
      if (t0 == null) {
        t0 = now;
        stp.from = ballPos.slice();
        if (stp.cap) { cap.textContent = stp.cap; cap.className = 'hl-cap'; }
        if (stp.who) { stp.w0 = [stp.who.x, stp.who.y]; }
        if (stp.k === 'carry') {
          // quase sempre reto (só uma curva leve); de vez em quando, drible em zigue-zague (mais em quem dribla bem)
          const zig = sc.mode === 'open' && Math.random() < P.clamp(0.12 + (stp.who.p.a.dri - 10) * 0.03, 0.08, 0.4);
          stp.path = curve(stp.w0, stp.to, zig ? (Math.random() - 0.5) * 0.6 : (Math.random() - 0.5) * 0.15, zig ? 0.85 : 0, 1.5 + Math.random());
          if (zig && stp.cap && !/dribla/.test(stp.cap)) { stp.cap = stp.cap.replace(/avança|conduz…/, 'dribla…'); cap.textContent = stp.cap; }
        }
        if (stp.k === 'pass') {
          stp.r0 = [stp.to.x, stp.to.y]; stp.to.run = true; label(stp.to, true);
          // o companheiro chega ao ponto do passe virado para a bola, que encosta na frente dele
          const ddx = stp.meet[0] - stp.r0[0], ddy = stp.meet[1] - stp.r0[1], dl = Math.hypot(ddx, ddy) || 1;
          const end = [stp.meet[0] - ddx / dl * 1.45, stp.meet[1] - ddy / dl * 1.45];
          stp.rpath = curve(stp.r0, end, (Math.random() - 0.5) * 0.5, 0, 1);
        }
        if (stp.k === 'shot' && stp.save && sc.gk) { sc.gk.run = true; stp.g0 = [sc.gk.x, sc.gk.y]; }
      }
      const k = Math.min(1, (now - t0) / stp.dur), q = ease(k), lin = k;
      if (stp.k === 'hold') {
        if (sc.mode === 'open') {
          const tt = (now - t0) / 1000; // domina e protege a bola, mexendo-se no lugar
          track(stp.who, stp.w0[0] + Math.sin(tt * 2.4) * 0.8, stp.w0[1] + Math.sin(tt * 1.7 + 1) * 0.7, dt);
          ballPos = atFeet(stp.who);
        } else ballPos = stp.ball;
        setBall(ballPos[0], ballPos[1]);
      } else if (stp.k === 'carry') {
        // o jogador corre com a bola no pé, em curva e driblando
        const pt = stp.path(lin);
        track(stp.who, pt[0], pt[1], dt);
        ballPos = atFeet(stp.who); setBall(ballPos[0], ballPos[1]);
      } else if (stp.k === 'pass') {
        // a bola vai ao ponto de encontro; o companheiro chega lá junto com ela
        const rp = stp.rpath(lin); track(stp.to, rp[0], rp[1], dt);
        const qb = 1 - Math.pow(1 - k, 1.6); // a bola sai forte e perde velocidade
        ballPos = [lerp(stp.from[0], stp.meet[0], qb), lerp(stp.from[1], stp.meet[1], qb)];
        setBall(ballPos[0], ballPos[1], stp.arc ? Math.sin(Math.PI * k) * stp.arc : 0);
      } else if (stp.k === 'shot' || stp.k === 'loose') {
        ballPos = [lerp(stp.from[0], stp.to[0], q), lerp(stp.from[1], stp.to[1], q)];
        setBall(ballPos[0], ballPos[1], stp.arc ? Math.sin(Math.PI * k) * stp.arc : 0);
        if (stp.g0 && sc.gk) { sc.gk.x = lerp(stp.g0[0], W - 2.2, q); sc.gk.y = lerp(stp.g0[1], stp.to[1], q); }
      }
      drift(dt, ballPos[0], ballPos[1], now);
      place();
      if (k >= 1) {
        if (stp.k === 'pass') { label(carrier, false); carrier = stp.to; stp.to.run = false; }
        if (stp.k === 'shot') { label(carrier, false); carrier = null; }
        i++; t0 = null;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { skip: end, node: svg };
  };
})(window.PFC);
