/* Prancheta FC — táticas avançadas
 * Posicionamento livre (arraste no campo), função e postura de cada jogador,
 * entrosamento entre jogadores próximos e instruções ofensivas/defensivas.
 * O efeito de tudo isso na partida está em P.strength (engine.js).
 */
(function (P) {
  const A = P.app, esc = P.esc;

  // ---------- Postura e funções ----------
  P.POSTURE = {
    def: { n: 'Defensiva', a: 0.8, m: 0.95, d: 1.2 },
    equ: { n: 'Equilibrada', a: 1, m: 1, d: 1 },
    ofe: { n: 'Ofensiva', a: 1.25, m: 1.03, d: 0.75 }
  };
  const R = (n, desc, a, m, d, extra) => Object.assign({ n, desc, a, m, d }, extra || {});
  const mix = (base, v) => base * 0.5 + v * 0.5;
  const lat = {
    lat: R('Lateral equilibrado', 'Apoia e volta na medida certa.', 1, 1, 1),
    cru: R('Apoia e cruza', 'Vai até a linha de fundo e cruza na área.', 1.25, 1, 0.85, { cross: true, att: (p, r) => mix(r.att, p.a.cru) }),
    inv: R('Cria por dentro', 'Fecha para o meio e ajuda a construir.', 1.05, 1.2, 0.9, { cre: (p, r) => mix(r.cre, (p.a.pas + p.a.vis) / 2) }),
    fix: R('Lateral fixo', 'Quase não sobe; protege o lado.', 0.6, 0.95, 1.15)
  };
  const wing = {
    abe: R('Ponta aberto', 'Joga na linha e cruza para a área.', 1, 1, 1, { cross: true, att: (p, r) => mix(r.att, p.a.cru) }),
    inv: R('Ponta invertido', 'Corta para o meio e finaliza.', 1.08, 1, 1, { att: (p, r) => mix(r.att, (p.a.fin + p.a.dri) / 2) }),
    rec: R('Ponta que recompõe', 'Ajuda a marcar o lateral adversário.', 0.85, 1.05, 1.4)
  };
  P.ROLES = {
    GOL: { gk: R('Goleiro tradicional', 'Fica no gol e foca em defender.', 1, 1, 1), lib: R('Goleiro líbero', 'Sai jogando com os pés e adianta a defesa.', 1, 1.05, 0.97) },
    ZAG: {
      zag: R('Zagueiro', 'Equilibrado entre marcar e sair jogando.', 1, 1, 1),
      con: R('Zagueiro construtor', 'Inicia as jogadas com passes.', 1, 1.15, 0.95, { cre: (p, r) => mix(r.cre, p.a.pas) }),
      xer: R('Xerife', 'Só marca, sem arriscar com a bola.', 1, 0.9, 1.08)
    },
    LD: lat, LE: lat,
    VOL: {
      mar: R('Volante marcador', 'Protege a defesa e desarma.', 0.8, 0.95, 1.15),
      arm: R('Volante construtor', 'Organiza o jogo desde trás.', 1, 1.15, 0.92, { cre: (p, r) => mix(r.cre, p.a.pas) }),
      b2b: R('Box-to-box', 'Vai e volta o jogo todo.', 1.3, 1.03, 0.95)
    },
    MC: {
      arm: R('Armador', 'Dita o ritmo com passes.', 0.95, 1.12, 1),
      b2b: R('Box-to-box', 'Ataca e defende com a mesma intensidade.', 1.1, 1.02, 1.05),
      che: R('Chega na área', 'Infiltra e finaliza.', 1.25, 0.92, 0.9, { att: (p, r) => mix(r.att, p.a.fin) })
    },
    MEI: {
      arm: R('Meia armador', 'Último passe e visão de jogo.', 0.95, 1.15, 1),
      che: R('Meia que chega na área', 'Aparece como um segundo atacante.', 1.2, 0.9, 1, { att: (p, r) => mix(r.att, p.a.fin) }),
      liv: R('Meia livre', 'Flutua pelo campo procurando espaço.', 1.05, 1.05, 0.9)
    },
    PD: wing, PE: wing,
    ATA: {
      ref: R('Centroavante de referência', 'Segura a bola e cabeceia os cruzamentos.', 1, 1, 1, { aerial: true, att: (p, r) => mix(r.att, (p.a.cab + p.a.for) / 2) }),
      fin: R('Finalizador', 'Vive na área esperando a chance.', 1.05, 0.95, 1, { att: (p, r) => mix(r.att, p.a.fin) }),
      f9: R('Falso 9', 'Recua para criar e abre espaço.', 0.85, 1.35, 1, { cre: (p, r) => r.cre })
    }
  };
  P.roleKey = function (tac, i, pos) {
    const map = P.ROLES[pos], keys = Object.keys(map);
    const k = tac.roles && tac.roles[i] && tac.roles[i].fn;
    if (k && map[k]) return k;
    if (pos === 'PD' || pos === 'PE') return P.insOf(tac).wing === 'cor' ? 'inv' : 'abe';
    return keys[0];
  };
  P.roleOf = (tac, i, pos) => (i == null || !P.ROLES[pos] ? null : P.ROLES[pos][P.roleKey(tac, i, pos)]);

  // ---------- Entrosamento ----------
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  P.neighbors = function (t) {
    const sl = P.slots(t), out = [];
    for (let i = 0; i < sl.length; i++) for (let j = i + 1; j < sl.length; j++) {
      const dx = (sl[i].x - sl[j].x) * 0.68, dy = sl[i].y - sl[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < 22) out.push([i, j]);
    }
    return out;
  };
  P.chemVal = function (g, a, b) {
    g.chem = g.chem || {};
    const k = key(a, b);
    if (g.chem[k] != null) return g.chem[k];
    const pa = g.db.players[a], pb = g.db.players[b];
    if (!pa || !pb) return 0;
    const la = (P.COUNTRIES[pa.nat] || {}).lang, lb = (P.COUNTRIES[pb.nat] || {}).lang;
    return 30 + (pa.nat === pb.nat ? 20 : 0) + (la && la === lb ? 10 : 0);
  };
  P.chemMult = function (g, t, i) {
    const id = t.xi[i]; if (!id) return 1;
    const nb = P.neighbors(t).filter(([a, b]) => a === i || b === i).map(([a, b]) => t.xi[a === i ? b : a]).filter(Boolean);
    if (!nb.length) return 1;
    const avg = nb.reduce((s, o) => s + P.chemVal(g, id, o), 0) / nb.length;
    return 1 + 0.06 * (avg - 50) / 50;
  };
  P.chemAfterMatch = function (g, m, r, home) {
    g.chem = g.chem || {};
    const t = g.tac[g.user], side = home ? 0 : 1;
    const played = new Set(r.played[side]);
    const res = Math.sign(home ? m.hg - m.ag : m.ag - m.hg);
    const touched = new Set();
    for (const [i, j] of P.neighbors(t)) {
      const a = t.xi[i], b = t.xi[j];
      if (!a || !b || !played.has(a) || !played.has(b)) continue;
      const k = key(a, b);
      const good = (r.notes[a] || 6) >= 7 && (r.notes[b] || 6) >= 7;
      g.chem[k] = P.clamp(Math.round(P.chemVal(g, a, b) + 4 + (good ? 3 : 0) + res), 0, 100);
      touched.add(k);
    }
    // quem não joga junto vai perdendo entrosamento; remove pares de quem saiu
    for (const k of Object.keys(g.chem)) {
      const [a, b] = k.split('|');
      const pa = g.db.players[a], pb = g.db.players[b];
      if (!pa || !pb || pa.clubId !== g.user || pb.clubId !== g.user) { delete g.chem[k]; continue; }
      if (!touched.has(k)) g.chem[k] = Math.max(0, g.chem[k] - 2);
    }
    // entrosados ficam mais confiantes
    t.xi.forEach((id, i) => { if (id && played.has(id) && P.chemMult(g, t, i) >= 1.024) { const p = g.db.players[id]; p.mor = Math.min(100, p.mor + 2); } });
  };

  // ---------- Tela de tática ----------
  const pl = (id) => A.g.db.players[id];
  const seg = (k, opts, cur) => `<div class="seg">${opts.map(([v, n]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-a="tIns" data-k="${k}" data-v="${v}">${n}</button>`).join('')}</div>`;
  function warnings(s) {
    const w = [];
    if (s.shape.d < 3) w.push(`Só ${s.shape.d} ${s.shape.d === 1 ? 'defensor' : 'defensores'}: a defesa fica exposta.`);
    if (!s.shape.z) w.push('Sem zagueiro: a defesa perde muita força.');
    if (s.shape.m <= 1) w.push(s.shape.m ? 'Só 1 jogador no meio: o meio-campo vai sofrer.' : 'Sem meio-campistas: o adversário vai dominar o meio.');
    return w;
  }
  P.tacticsView = function () {
    const g = A.g, t = g.tac[g.user];
    if (!t.ins) t.ins = P.insOf(t);
    P.fixXI(g, g.user);
    const slots = P.slots(t);
    const s = P.teamPreview(g, g.user);
    const sc = (v) => Math.round(v * 5);
    const xi = new Set(t.xi);
    const bench = A.sortPlayers(P.squad(g, g.user).filter((p) => !xi.has(p.id)), 'pos');
    const lines = P.neighbors(t).map(([i, j]) => {
      const a = t.xi[i], b = t.xi[j]; if (!a || !b) return '';
      const v = P.chemVal(g, a, b);
      if (v < 70) return '';
      return `<line x1="${slots[i].x}" y1="${100 - slots[i].y}" x2="${slots[j].x}" y2="${100 - slots[j].y}" class="chem-line" />`;
    }).join('');
    const warn = warnings(s);
    const ins = t.ins;
    return `<div class="tac">
      <div class="card">
        <div class="head"><h2>Escalação</h2>
          <select class="sel" data-c="tForm" aria-label="Formação">${t.xy ? '<option selected>Personalizada</option>' : ''}${Object.keys(P.FORMATIONS).map((f) => `<option ${!t.xy && t.f === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
        <div class="pitch" id="pitch"><div class="ln mid"></div><div class="ln circ"></div><div class="ln box1"></div><div class="ln box2"></div>
          <svg class="chem" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
          ${slots.map((sl, i) => {
            const p = pl(t.xi[i]);
            const cc = p ? (p.cond >= 80 ? '#4cc27f' : p.cond >= 60 ? '#e5b23a' : '#f0695e') : '#999';
            const name = p ? (p.name.length <= 11 ? p.name : p.name.split(' ')[0].slice(0, 10)) : 'vazio';
            const f = p ? P.fitP(p, sl.pos) : 1;
            const rk = p ? P.ROLES[sl.pos][P.roleKey(t, i, sl.pos)].n : '';
            const post = (t.roles && t.roles[i] && t.roles[i].post) || 'equ';
            return `<button class="slot" style="left:${sl.x}%;top:${100 - sl.y}%" data-a="tSlot" data-i="${i}" ${i ? 'data-drag="1"' : ''} aria-label="${p ? esc(p.name) + ', ' + sl.pos + ', ' + esc(rk) : 'vazio'}">
              <span class="dot ${!p || !P.available(p) ? 'off' : f < 1 ? 'fit' : ''}" style="--c:${cc}">${p ? P.ovrAt(p, sl.pos) : '?'}${post !== 'equ' ? `<i class="post ${post}">${post === 'ofe' ? '▲' : '▼'}</i>` : ''}</span>
              <span class="nm">${esc(name)}</span><span class="ps">${sl.pos}</span></button>`;
          }).join('')}
        </div>
        <p class="muted" style="margin:10px 0 0;font-size:.85rem">Arraste para mudar a posição. Toque para escolher função, postura ou trocar o jogador. Linha verde = jogadores entrosados. ▲▼ = postura ofensiva ou defensiva.</p>
        ${t.xy ? '<div style="margin-top:8px"><button class="btn sm" data-a="tReset">Voltar à formação ' + esc(t.f) + '</button></div>' : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="card"><div class="head"><span class="label">Força do time</span></div>
          <div class="bars">${[['Ataque', s.att], ['Meio', s.mid], ['Defesa', s.def], ['Goleiro', s.gk]].map(([n, v]) => `<div class="bar"><span>${n}</span><span class="tr"><i style="width:${P.clamp(sc(v), 0, 100)}%"></i></span><b class="num">${sc(v)}</b></div>`).join('')}</div>
          ${warn.length ? `<div class="msg" style="margin-top:12px">${warn.map(esc).join('<br>')}</div>` : ''}</div>
        <div class="card" style="display:flex;flex-direction:column;gap:14px">
          <div class="label">Geral</div>
          <div class="opt"><span class="muted">Mentalidade</span>${seg('men', [['def', 'Defensiva'], ['equ', 'Equilibrada'], ['ofe', 'Ofensiva']], t.men)}</div>
          <div class="opt"><span class="muted">Pressão</span>${seg('pre', [['bai', 'Baixa'], ['med', 'Média'], ['alt', 'Alta']], t.pre)}</div>
          <div class="label" style="margin-top:4px">Com a bola</div>
          <div class="opt"><span class="muted">Construção</span>${seg('build', [['pos', 'Posse paciente'], ['equ', 'Equilibrada'], ['con', 'Contra-ataque']], ins.build)}</div>
          <div class="opt"><span class="muted">Passes</span>${seg('pass', [['cur', 'Curtos'], ['equ', 'Mistos'], ['dir', 'Diretos']], ins.pass)}</div>
          <div class="opt"><span class="muted">Pontas</span>${seg('wing', [['cru', 'Abrir e cruzar'], ['cor', 'Cortar pro meio']], ins.wing)}</div>
          <div class="label" style="margin-top:4px">Sem a bola</div>
          <div class="opt"><span class="muted">Linha defensiva</span>${seg('line', [['alt', 'Alta'], ['med', 'Média'], ['bai', 'Bloco baixo']], ins.line)}</div>
          <div class="opt"><span class="muted">Linha de impedimento</span>${seg('trap', [['true', 'Usar'], ['false', 'Não usar']], ins.trap)}</div>
          <p class="muted" style="margin:0;font-size:.85rem">${hint(t)}</p>
          <label class="switch"><input type="checkbox" data-c="auto" ${t.auto ? 'checked' : ''}> Escalar os melhores automaticamente antes de cada jogo</label>
          <div class="row"><button class="btn" data-a="bestXI">Escalar os melhores agora</button></div>
        </div>
        <div class="card"><div class="head"><span class="label">Reservas (${bench.length})</span></div>
          <div class="plist">${bench.map((p) => `<button class="prow" data-a="player" data-id="${p.id}"><span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
            <span class="nm"><b>${esc(p.name)}</b><small>${p.age} anos</small></span><span></span><span class="ovr">${P.ovr(p)}</span></button>`).join('')}</div></div>
      </div></div>`;
  };
  function hint(t) {
    const i = t.ins, h = [];
    if (i.build === 'con') h.push('Contra-ataque castiga quem joga com linha alta ou é ofensivo.');
    if (i.build === 'pos') h.push('Posse paciente domina o meio e finaliza com mais qualidade.');
    if (i.pass === 'dir') h.push('Passes diretos geram mais chutes, com menos precisão.');
    if (i.line === 'alt') h.push('Linha alta ganha o meio, mas sofre contra atacantes rápidos.');
    if (i.line === 'bai') h.push('Bloco baixo fecha a defesa e ataca menos.');
    if (i.trap) h.push(i.line === 'bai' ? 'Com bloco baixo, a linha de impedimento quase não faz efeito.' : 'Linha de impedimento fortalece a defesa, mas falha contra contra-ataque e atacantes velozes.');
    if (i.wing === 'cru') h.push('Pontas abertos rendem mais com um centroavante de referência na área.');
    return h.join(' ') || 'Ajuste equilibrado.';
  }
  // Ficha do jogador no campo: função, postura, entrosamento
  P.tacSheet = function (i) {
    const g = A.g, t = g.tac[g.user], sl = P.slots(t)[i], p = pl(t.xi[i]);
    if (!p) { A.slotSheet(i); return; }
    t.roles = t.roles || [];
    const rk = P.roleKey(t, i, sl.pos), post = (t.roles[i] && t.roles[i].post) || 'equ';
    const nb = P.neighbors(t).filter(([a, b]) => a === i || b === i).map(([a, b]) => t.xi[a === i ? b : a]).filter(Boolean)
      .map((id) => ({ p: pl(id), v: P.chemVal(g, p.id, id) })).sort((a, b) => b.v - a.v);
    A.openSheet(`<div class="bar-top"><span class="pos-tag ${P.LINE[sl.pos]}" style="padding:4px 8px">${sl.pos}</span><h2>${esc(p.name)}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <div class="muted">Jogando como ${esc(P.POS_NAME[sl.pos].toLowerCase())} · força ${P.ovrAt(p, sl.pos)}${p.pos !== sl.pos ? ` (posição de origem: ${p.pos})` : ''}</div>
      <div><div class="label" style="margin-bottom:6px">Função</div>
        <div class="roles">${Object.entries(P.ROLES[sl.pos]).map(([k, r]) => `<button class="role ${k === rk ? 'on' : ''}" data-a="tRole" data-i="${i}" data-k="${k}"><b>${esc(r.n)}</b><span>${esc(r.desc)}</span></button>`).join('')}</div></div>
      ${i ? `<div><div class="label" style="margin-bottom:6px">Postura</div><div class="seg">${Object.entries(P.POSTURE).map(([k, o]) => `<button class="${k === post ? 'on' : ''}" data-a="tPost" data-i="${i}" data-k="${k}">${o.n}</button>`).join('')}</div></div>` : ''}
      <div><div class="label" style="margin-bottom:6px">Entrosamento com quem está perto</div>
        ${nb.length ? nb.map((x) => `<div class="chem-row"><span>${esc(x.p.name)}</span><span class="tr"><i style="width:${x.v}%;background:${x.v >= 70 ? 'var(--good)' : x.v >= 40 ? 'var(--warn)' : 'var(--bad)'}"></i></span><b class="num">${Math.round(x.v)}</b></div>`).join('') : '<p class="muted" style="margin:0">Ninguém perto dele no campo.</p>'}
        <p class="muted" style="font-size:.82rem;margin:6px 0 0">Sobe quando jogam juntos (mais ainda com notas altas e vitórias) e cai quando não jogam. A partir de 70 aparece a linha verde: mais rendimento e moral.</p></div>
      <div class="row"><button class="btn" data-a="player" data-id="${p.id}">Ver ficha</button><span class="spacer"></span><button class="btn primary" data-a="tSwap" data-i="${i}">Trocar jogador</button></div>`);
  };

  // ---------- Arrastar no campo ----------
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('#pitch .slot');
    if (!el) return;
    drag = { el, i: Number(el.dataset.i), x0: e.clientX, y0: e.clientY, moved: false, can: !!el.dataset.drag };
    if (drag.can) el.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || !drag.can) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
    drag.moved = true;
    const rect = document.getElementById('pitch').getBoundingClientRect();
    const x = P.clamp((e.clientX - rect.left) / rect.width * 100, 5, 95);
    const y = P.clamp((e.clientY - rect.top) / rect.height * 100, 5, 88);
    drag.el.style.left = x + '%'; drag.el.style.top = y + '%';
    drag.x = x; drag.y = 100 - y;
    drag.el.classList.add('dragging');
  });
  document.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) return; // toque simples vira clique (tSlot)
    A._noClick = Date.now();
    const g = A.g, t = g.tac[g.user];
    if (!t.xy) t.xy = P.slots(t.f).map((s) => ({ x: s.x, y: s.y }));
    t.xy[d.i] = { x: Math.round(d.x), y: Math.round(d.y) };
    A.save(); A.render();
  });

  // ---------- Ações ----------
  Object.assign(A.ACT, {
    tSlot(d) { if (Date.now() - (A._noClick || 0) < 400) return; P.tacSheet(Number(d.i)); },
    tIns(d) {
      const t = A.g.tac[A.g.user];
      if (d.k === 'men' || d.k === 'pre') t[d.k] = d.v;
      else { t.ins = t.ins || P.insOf(t); t.ins[d.k] = d.k === 'trap' ? d.v === 'true' : d.v; }
      A.save(); A.render();
    },
    tRole(d) { const t = A.g.tac[A.g.user]; t.roles = t.roles || []; t.roles[d.i] = Object.assign({}, t.roles[d.i], { fn: d.k }); A.save(); A.render(); P.tacSheet(Number(d.i)); },
    tPost(d) { const t = A.g.tac[A.g.user]; t.roles = t.roles || []; t.roles[d.i] = Object.assign({}, t.roles[d.i], { post: d.k }); A.save(); A.render(); P.tacSheet(Number(d.i)); },
    tSwap(d) { A.slotSheet(Number(d.i)); },
    tReset() { const g = A.g, t = g.tac[g.user]; delete t.xy; t.xi = P.autoXI(g, g.user, t.f); A.save(); A.render(); A.toast('Formação ' + t.f + ' restaurada'); }
  });
  Object.assign(A.CHG, {
    tForm(el) {
      const g = A.g, t = g.tac[g.user];
      if (!P.FORMATIONS[el.value]) return;
      t.f = el.value; delete t.xy; t.roles = [];
      t.xi = P.autoXI(g, g.user, t.f); A.save(); A.render(); A.toast('Formação ' + t.f);
    }
  });
})(window.PFC);
