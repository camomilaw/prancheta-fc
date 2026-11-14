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
  // Funções: n/desc, multiplicadores de ataque (a), criação (m) e defesa (d), atributos-chave (k)
  // que definem a maestria (1 a 5 estrelas) e efeitos nos lances (fx). A 1ª de cada posição é a padrão.
  const R = (n, desc, a, m, d, k, extra) => Object.assign({ n, desc, a, m, d, k }, extra || {});
  const mix = (base, v) => base * 0.5 + v * 0.5;
  const lat = {
    lat: R('Lateral equilibrado', 'Apoia e volta na medida certa.', 1, 1, 1, ['des', 'mar', 'vel', 'cru', 'res']),
    cru: R('Apoia e cruza', 'Vai até a linha de fundo e cruza na área.', 1.25, 1, 0.85, ['cru', 'vel', 'res', 'dri'], { cross: true, att: (p, r) => mix(r.att, p.a.cru) }),
    inv: R('Cria por dentro', 'Fecha para o meio e ajuda a construir.', 1.05, 1.2, 0.9, ['pas', 'vis', 'dec', 'com'], { cre: (p, r) => mix(r.cre, (p.a.pas + p.a.vis) / 2), fx: { assist: 1.3 } }),
    fix: R('Lateral fixo', 'Quase não sobe; protege o lado.', 0.6, 0.95, 1.15, ['des', 'mar', 'pos', 'for'], { fx: { tackle: 1.3 } }),
    ala: R('Ala ofensivo', 'Joga quase como ponta; deixa espaço atrás.', 1.35, 1.02, 0.75, ['vel', 'dri', 'res', 'cru', 'fin'], { cross: true, att: (p, r) => mix(r.att, (p.a.dri + p.a.cru) / 2) })
  };
  const wing = {
    abe: R('Ponta aberto', 'Joga na linha e cruza para a área.', 1, 1, 1, ['cru', 'vel', 'dri', 'res'], { cross: true, att: (p, r) => mix(r.att, p.a.cru) }),
    inv: R('Ponta invertido', 'Corta para o meio e finaliza.', 1.08, 1, 1, ['fin', 'dri', 'vel', 'com'], { att: (p, r) => mix(r.att, (p.a.fin + p.a.dri) / 2) }),
    drb: R('Driblador', 'Parte para cima e cria superioridade no um contra um.', 1.15, 1.02, 0.85, ['dri', 'vel', 'com', 'dec'], { att: (p, r) => mix(r.att, p.a.dri), fx: { chance: 1.06 } }),
    ext: R('Atacante pelo lado', 'Pisa na área como segundo atacante.', 1.2, 0.92, 0.85, ['fin', 'vel', 'dec', 'cab'], { att: (p, r) => mix(r.att, p.a.fin), fx: { shot: 1.3 } }),
    rec: R('Ponta que recompõe', 'Ajuda a marcar o lateral adversário.', 0.85, 1.05, 1.4, ['res', 'des', 'mar', 'vel'], { fx: { tackle: 1.3 } })
  };
  P.ROLES = {
    GOL: {
      gk: R('Goleiro tradicional', 'Fica no gol e foca em defender.', 1, 1, 1, ['ref', 'um1', 'aer', 'pos']),
      lib: R('Goleiro líbero', 'Sai jogando com os pés e adianta a defesa.', 1, 1.05, 0.97, ['pas', 'vel', 'dec', 'um1']),
      refl: R('Goleiro de reflexos', 'Vive embaixo das traves; defesas difíceis.', 1, 0.97, 1, ['ref', 'um1', 'com'], { gk: 1.04 }),
      are: R('Dono da área', 'Sai nos cruzamentos e manda na pequena área.', 1, 1, 1, ['aer', 'for', 'pos', 'com'], { fx: { area: 0.75 } })
    },
    ZAG: {
      zag: R('Zagueiro', 'Equilibrado entre marcar e sair jogando.', 1, 1, 1, ['des', 'mar', 'pos', 'cab']),
      con: R('Zagueiro construtor', 'Inicia as jogadas com passes.', 1, 1.15, 0.95, ['pas', 'vis', 'com', 'des'], { cre: (p, r) => mix(r.cre, p.a.pas) }),
      xer: R('Xerife', 'Só marca, sem arriscar com a bola.', 1, 0.9, 1.08, ['des', 'mar', 'for', 'cab'], { fx: { tackle: 1.3 } }),
      lib: R('Líbero', 'Sobra atrás da linha, lê o jogo e sai com a bola.', 1, 1.08, 1.02, ['pos', 'dec', 'pas', 'vel']),
      ofz: R('Zagueiro que sobe', 'Aparece na área nas bolas paradas.', 1.15, 1, 0.95, ['cab', 'for', 'fin'], { fx: { header: 1.8 } })
    },
    LD: lat, LE: lat,
    VOL: {
      mar: R('Volante marcador', 'Protege a defesa e desarma.', 0.8, 0.95, 1.15, ['pos', 'mar', 'des', 'dec'], { fx: { tackle: 1.2 } }),
      pit: R('Volante pitbull', 'Morde o adversário o jogo todo; faz falta.', 0.75, 0.9, 1.22, ['des', 'res', 'for', 'mar'], { fx: { tackle: 1.6, foul: 1.5 } }),
      arm: R('Volante construtor', 'Organiza o jogo desde trás.', 1, 1.15, 0.92, ['pas', 'vis', 'com', 'dec'], { cre: (p, r) => mix(r.cre, p.a.pas), fx: { assist: 1.2 } }),
      reg: R('Regista', 'Lança de trás e dita o ritmo; marca pouco.', 0.95, 1.25, 0.85, ['pas', 'vis', 'com', 'dec'], { cre: (p, r) => mix(r.cre, (p.a.pas + p.a.vis) / 2), fx: { assist: 1.5 } }),
      b2b: R('Box-to-box', 'Vai e volta o jogo todo.', 1.3, 1.03, 0.95, ['res', 'vel', 'des', 'pas', 'fin'])
    },
    MC: {
      arm: R('Armador', 'Dita o ritmo com passes.', 0.95, 1.12, 1, ['pas', 'vis', 'dec', 'com'], { fx: { assist: 1.3 } }),
      b2b: R('Box-to-box', 'Ataca e defende com a mesma intensidade.', 1.1, 1.02, 1.05, ['res', 'des', 'pas', 'fin']),
      che: R('Chega na área', 'Infiltra e finaliza.', 1.25, 0.92, 0.9, ['fin', 'dri', 'vel', 'dec'], { att: (p, r) => mix(r.att, p.a.fin), fx: { shot: 1.3 } }),
      car: R('Carregador', 'Conduz a bola do meio até o ataque.', 1.1, 1.08, 0.9, ['dri', 'vel', 'res', 'pas'], { fx: { chance: 1.04 } }),
      con: R('Meia de contenção', 'Fecha os espaços na frente da zaga.', 0.8, 0.98, 1.15, ['des', 'mar', 'pos', 'res'], { fx: { tackle: 1.3 } })
    },
    MEI: {
      arm: R('Meia armador', 'Último passe e visão de jogo.', 0.95, 1.15, 1, ['pas', 'vis', 'dec', 'com'], { fx: { assist: 1.4 } }),
      che: R('Meia que chega na área', 'Aparece como um segundo atacante.', 1.2, 0.9, 1, ['fin', 'dri', 'dec', 'com'], { att: (p, r) => mix(r.att, p.a.fin), fx: { shot: 1.3 } }),
      liv: R('Meia livre', 'Flutua pelo campo procurando espaço.', 1.05, 1.05, 0.9, ['dri', 'vis', 'dec', 'vel']),
      enc: R('Enganche', 'Clássico camisa 10: toca, pensa e decide.', 1, 1.25, 0.8, ['vis', 'pas', 'com', 'dri'], { cre: (p, r) => mix(r.cre, p.a.vis), fx: { assist: 1.6 } }),
      pre: R('Meia que pressiona', 'Persegue a saída de bola adversária.', 0.95, 1.02, 1.15, ['res', 'des', 'vel', 'dec'], { press: true, fx: { tackle: 1.3 } })
    },
    PD: wing, PE: wing,
    ATA: {
      ref: R('Centroavante de referência', 'Segura a bola e cabeceia os cruzamentos.', 1, 1, 1, ['cab', 'for', 'fin', 'com'], { aerial: true, att: (p, r) => mix(r.att, (p.a.cab + p.a.for) / 2) }),
      fin: R('Finalizador', 'Vive na área esperando a chance.', 1.05, 0.95, 1, ['fin', 'com', 'dec', 'vel'], { att: (p, r) => mix(r.att, p.a.fin), fx: { shot: 1.4 } }),
      vel: R('Atacante de velocidade', 'Ataca o espaço às costas da defesa.', 1.08, 0.95, 1, ['vel', 'fin', 'dri'], { vsHigh: true, att: (p, r) => mix(r.att, (p.a.vel + p.a.fin) / 2) }),
      f9: R('Falso 9', 'Recua para criar e abre espaço.', 0.85, 1.35, 1, ['pas', 'vis', 'dri', 'dec'], { cre: (p, r) => r.cre, fx: { assist: 1.4 } }),
      pre: R('Atacante que pressiona', 'Primeiro defensor do time; incomoda a saída.', 0.95, 1.03, 1.3, ['res', 'des', 'vel', 'dec'], { press: true })
    }
  };
  // Maestria na função: média dos atributos-chave virando estrelas (1 a 5, de meia em meia)
  P.roleMastery = function (p, pos, key) {
    const map = P.ROLES[pos], r = map && map[key];
    if (!p || !r || !r.k) return 3;
    const avg = (ks) => ks.reduce((s, k) => s + (p.a[k] || 0), 0) / ks.length;
    const all = Array.from(new Set(Object.values(map).flatMap((x) => x.k || [])));
    // quanto os atributos da função se destacam no próprio jogador, mais um pouco do nível absoluto
    const v = 2.7 + (avg(r.k) - avg(all)) / 1.4 + (avg(r.k) - 13) / 6;
    return Math.max(1, Math.min(5, Math.round(v * 2) / 2));
  };
  P.starsHTML = (v) => { let h = ''; for (let i = 1; i <= 5; i++) h += v >= i ? '★' : v >= i - 0.5 ? '<span class="half">★</span>' : '<span class="off">★</span>'; return `<span class="stars rm" aria-label="${String(v).replace('.', ',')} de 5 estrelas">${h}</span>`; };
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
  // Quem se entrosa com quem: duplas que se encontram no jogo (não só quem está perto no desenho).
  // Zagueiros entre si e com o goleiro, lateral com o zagueiro do lado e com o ponta do mesmo lado,
  // volantes com zagueiros e com o meio, meio com pontas e atacantes, atacantes entre si.
  P.neighbors = function (t) {
    const sl = P.slots(t), set = new Set(), out = [];
    const add = (i, j) => { if (i == null || j == null || i === j) return; const k = i < j ? i + ':' + j : j + ':' + i; if (!set.has(k)) { set.add(k); out.push(i < j ? [i, j] : [j, i]); } };
    const idx = (list) => sl.map((s, i) => (list.includes(s.pos) ? i : -1)).filter((i) => i >= 0);
    const dist = (i, j) => Math.hypot((sl[i].x - sl[j].x) * 0.68, sl[i].y - sl[j].y);
    const nearest = (i, cands, k) => cands.filter((j) => j !== i).sort((a, b) => dist(i, a) - dist(i, b)).slice(0, k || 1);
    const sideOf = (i) => (sl[i].x < 45 ? 'L' : sl[i].x > 55 ? 'R' : 'C');
    const sameSide = (i, cands) => { const s = sideOf(i); const c = cands.filter((j) => sideOf(j) === s); return c.length ? c : cands; };
    const GOL = idx(['GOL']), ZAG = idx(['ZAG']), LAT = idx(['LD', 'LE']), VOL = idx(['VOL']), MID = idx(['MC', 'MEI']), PON = idx(['PD', 'PE']), ATA = idx(['ATA']);
    const each = (a, f) => a.forEach(f);
    // defesa
    each(GOL, (g) => (ZAG.length ? ZAG : LAT).forEach((z) => add(g, z)));
    each(ZAG, (a) => ZAG.forEach((b) => add(a, b)));
    each(LAT, (l) => { nearest(l, ZAG.length ? ZAG : VOL.concat(MID)).forEach((z) => add(l, z)); nearest(l, sameSide(l, PON.length ? PON : MID)).forEach((p) => add(l, p)); });
    // volantes (ou, sem volante, o meio mais recuado) com a zaga
    const anchors = VOL.length ? VOL : MID.slice().sort((a, b) => sl[a].y - sl[b].y).slice(0, 1);
    each(anchors, (v) => nearest(v, ZAG.length ? ZAG : LAT, 2).forEach((z) => add(v, z)));
    // meio-campo
    each(VOL, (a) => VOL.forEach((b) => add(a, b)));
    each(VOL, (v) => nearest(v, MID, 2).forEach((m) => add(v, m)));
    each(MID, (a) => nearest(a, MID, 2).forEach((b) => add(a, b)));
    each(PON, (p) => nearest(p, sameSide(p, MID.length ? MID : VOL)).forEach((m) => add(p, m)));
    // ataque
    each(ATA, (a) => ATA.forEach((b) => add(a, b)));
    each(PON, (p) => nearest(p, ATA).forEach((a) => add(p, a)));
    each(MID, (m) => { if (sl[m].pos === 'MEI' || !VOL.length) nearest(m, ATA).forEach((a) => add(m, a)); });
    if (!PON.length) each(MID, (m) => nearest(m, ATA).forEach((a) => add(m, a)));
    // e quem está colado no desenho também conversa
    for (let i = 1; i < sl.length; i++) for (let j = i + 1; j < sl.length; j++) if (dist(i, j) < 14) add(i, j);
    return out;
  };
  // Postura no desenho: ofensivo sobe um pouco, defensivo recua um pouco (só no campinho)
  P.postShift = (t, i) => { const p = t.roles && t.roles[i] && t.roles[i].post; return i === 0 ? 0 : p === 'ofe' ? 5 : p === 'def' ? -5 : 0; };
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
    // posições livres antigas: encaixa cada jogador na posição centralizada mais próxima
    if (t.xy && !t.snap) { const out = []; t.xy.forEach((c, i) => { out[i] = P.snapXY(c.x, c.y, out, i); }); t.xy = out; t.snap = true; }
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
      return `<line x1="${slots[i].x}" y1="${100 - slots[i].y - P.postShift(t, i)}" x2="${slots[j].x}" y2="${100 - slots[j].y - P.postShift(t, j)}" class="chem-line" />`;
    }).join('');
    const warn = warnings(s);
    const ins = t.ins;
    const xiP = t.xi.map(pl).filter(Boolean);
    const spAuto = (kind) => xiP.filter((p) => kind === 'cap' || p.pos !== 'GOL').sort((a, b) => P.SP_SKILL[kind](b) - P.SP_SKILL[kind](a))[0];
    const spPick = (kind) => { const want = t.sp && t.sp[kind]; return (want && xiP.find((p) => p.id === want)) || spAuto(kind); };
    const capP = spPick('cap'), capId = capP && capP.id;
    return `<div class="tac">
      <div class="card">
        <div class="head"><h2>Escalação</h2>
          <select class="sel" data-c="tForm" aria-label="Formação">${t.xy ? '<option selected>Personalizada</option>' : ''}${Object.keys(P.FORMATIONS).map((f) => `<option ${!t.xy && t.f === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
        <div class="pitch" id="pitch"><div class="ln mid"></div><div class="ln circ"></div><div class="ln box1"></div><div class="ln box2"></div>
          <svg class="chem" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
          ${slots.map((sl, i) => {
            const p = pl(t.xi[i]);
            const cc = p ? (p.cond >= 80 ? '#f3ead2' : p.cond >= 60 ? '#e2b04a' : '#e0645a') : '#999';
            const name = p ? (p.name.length <= 11 ? p.name : p.name.split(' ')[0].slice(0, 10)) : 'vazio';
            const f = p ? P.fitP(p, sl.pos) : 1;
            const rk = p ? P.ROLES[sl.pos][P.roleKey(t, i, sl.pos)].n : '';
            const post = (t.roles && t.roles[i] && t.roles[i].post) || 'equ';
            return `<button class="slot ${P.postShift(t, i) ? 'shifted' : ''}" style="left:${sl.x}%;top:${100 - sl.y - P.postShift(t, i)}%" data-a="tSlot" data-i="${i}" ${i ? 'data-drag="1"' : ''} aria-label="${p ? esc(p.name) + ', ' + sl.pos + ', ' + esc(rk) : 'vazio'}">
              <span class="dot ${!p || !P.available(p) ? 'off' : f < 1 ? 'fit' : ''}" style="--c:${cc}">${p ? P.ovrAt(p, sl.pos) : '?'}${post !== 'equ' ? `<i class="post ${post}">${post === 'ofe' ? '▲' : '▼'}</i>` : ''}${p && p.id === capId ? '<i class="cap-mark" title="Capitão">C</i>' : ''}</span>
              <span class="nm">${esc(name)}</span><span class="ps">${sl.pos}</span></button>`;
          }).join('')}
        </div>
        <p class="muted" style="margin:10px 0 0;font-size:.85rem">Arraste para mudar a posição. Toque para escolher função, postura ou trocar o jogador. Linha clara = jogadores entrosados. ▲▼ = postura ofensiva ou defensiva.</p>
        ${t.xy ? '<div style="margin-top:8px"><button class="btn sm" data-a="tReset">Voltar à formação ' + esc(t.f) + '</button></div>' : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="card"><div class="head"><span class="label">Força do time</span></div>
          <div class="bars">${[['Ataque', s.att], ['Meio', s.mid], ['Defesa', s.def], ['Goleiro', s.gk]].map(([n, v]) => `<div class="bar"><span>${n}</span><span class="tr str"><i style="width:${P.clamp(sc(v) / 1.3, 0, 100)}%"></i></span><b class="num">${sc(v)}</b></div>`).join('')}</div>
          <p class="str-note">A marca vermelha é o 100: o nível de um setor de elite. Entrosamento, moral, funções e instruções táticas podem levar um setor além disso.</p>
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
        <div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="label">Capitão e bola parada</div>
          ${[['cap', 'Capitão', 'lider'], ['pen', 'Pênaltis', 'penal'], ['fk', 'Faltas', 'faltas'], ['co', 'Escanteios', 'garcom']].map(([k, n, tr]) => {
            const want = t.sp && t.sp[k], auto = spAuto(k), cur = spPick(k);
            const opts = xiP.filter((p) => k === 'cap' || p.pos !== 'GOL').sort((a, b) => P.SP_SKILL[k](b) - P.SP_SKILL[k](a));
            const lbl = (p) => `${esc(p.name)} · ${Math.round(P.SP_SKILL[k](p))}${P.hasT && P.hasT(p, tr) ? ' ★' : ''}`;
            return `<div class="opt sp-opt"><span class="muted">${n}</span><select class="sel" data-c="tSp" data-k="${k}" aria-label="${n}">
              <option value="" ${!want || !xiP.some((p) => p.id === want) ? 'selected' : ''}>Automático${auto ? ' (' + esc(auto.name) + ')' : ''}</option>
              ${opts.map((p) => `<option value="${p.id}" ${want === p.id ? 'selected' : ''}>${lbl(p)}</option>`).join('')}</select></div>`;
          }).join('')}
          <p class="muted" style="margin:0;font-size:.82rem">O número é a habilidade na função; ★ = característica ideal. Se o escolhido sair do jogo, o melhor em campo assume. O capitão melhora um pouco o time, e um <b>Líder</b> melhora mais.${capP ? ` Capitão agora: <b>${esc(capP.name)}</b>.` : ''}</p></div>
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
        <div class="roles">${Object.entries(P.ROLES[sl.pos]).map(([k, r]) => `<button class="role ${k === rk ? 'on' : ''}" data-a="tRole" data-i="${i}" data-k="${k}"><b>${esc(r.n)} ${P.starsHTML(P.roleMastery(p, sl.pos, k))}</b><span>${esc(r.desc)}</span>${r.k ? `<small class="role-k">Pede: ${r.k.map((a) => esc((P.ATTRS.find((x) => x.k === a) || {}).n || a)).join(', ')}</small>` : ''}</button>`).join('')}</div></div>
      ${i ? `<div><div class="label" style="margin-bottom:6px">Postura</div><div class="seg">${Object.entries(P.POSTURE).map(([k, o]) => `<button class="${k === post ? 'on' : ''}" data-a="tPost" data-i="${i}" data-k="${k}">${o.n}</button>`).join('')}</div></div>` : ''}
      <div><div class="label" style="margin-bottom:6px">Entrosamento com quem está perto</div>
        ${nb.length ? nb.map((x) => `<div class="chem-row"><span>${esc(x.p.name)}</span><span class="tr"><i style="width:${x.v}%;background:${x.v >= 70 ? 'var(--good)' : x.v >= 40 ? 'var(--warn)' : 'var(--bad)'}"></i></span><b class="num">${Math.round(x.v)}</b></div>`).join('') : '<p class="muted" style="margin:0">Ninguém perto dele no campo.</p>'}
        <p class="muted" style="font-size:.82rem;margin:6px 0 0">Sobe quando jogam juntos (mais ainda com notas altas e vitórias) e cai quando não jogam. A partir de 70 aparece a linha clara: mais rendimento e moral.</p></div>
      <div class="row"><button class="btn" data-a="player" data-id="${p.id}">Ver ficha</button><span class="spacer"></span><button class="btn primary" data-a="tSwap" data-i="${i}">Trocar jogador</button></div>`);
  };

  // Encaixe: o jogador solto no campo vai para o centro da posição mais próxima (grade fixa)
  const ROWS = [24, 42, 52, 64, 82];          // zaga/laterais, volantes, meio, meias/pontas, ataque
  const COLS = [14, 32, 50, 68, 86];
  P.snapXY = function (x, y, xy, i) {
    if (i === 0) return { x: 50, y: 6 };     // goleiro fica no gol
    const spots = [];
    for (const ry of ROWS) for (const cx of COLS) spots.push({ x: cx, y: ry });
    const taken = (s) => xy.some((c, j) => j !== i && j !== 0 && c && Math.abs(c.x - s.x) < 9 && Math.abs(c.y - s.y) < 8);
    spots.sort((a, b) => Math.hypot(a.x - x, (a.y - y) * 1.3) - Math.hypot(b.x - x, (b.y - y) * 1.3));
    return Object.assign({}, spots.find((s) => !taken(s)) || spots[0]);
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
    if (!t.xy) { const out = []; P.slots(t.f).forEach((sl, i) => { out[i] = P.snapXY(sl.x, sl.y, out, i); }); t.xy = out; }
    t.xy[d.i] = P.snapXY(d.x, d.y, t.xy, d.i); t.snap = true;
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
    tSp(el) {
      const g = A.g, t = g.tac[g.user];
      t.sp = Object.assign({}, t.sp, { [el.dataset.k]: el.value || null });
      A.save(); A.render();
    },
    tForm(el) {
      const g = A.g, t = g.tac[g.user];
      if (!P.FORMATIONS[el.value]) return;
      t.f = el.value; delete t.xy; t.roles = [];
      t.xi = P.autoXI(g, g.user, t.f); A.save(); A.render(); A.toast('Formação ' + t.f);
    }
  });
})(window.PFC);
