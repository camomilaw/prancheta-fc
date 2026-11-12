/* Prancheta FC — treinamento individual
 * - Cada grupo (goleiros, defensores, meio-campistas, atacantes) do profissional e do
 *   Sub-20 treina um atributo, ou segue o plano da semana. Cada jogador pode ter o seu.
 * - Treino de posição (independente do atributo): reforça os atributos da posição e,
 *   se for uma posição nova, o jogador ganha maestria nela com o tempo (p.pm).
 */
(function (P) {
  const A = P.app, esc = P.esc;
  P.TRAIN_GROUPS = [['GOL', 'Goleiros'], ['DEF', 'Defensores'], ['MEI', 'Meio-campistas'], ['ATA', 'Atacantes']];
  const OUT = P.ATTRS.filter((a) => !P.GK_ATTRS.includes(a.k)).map((a) => a.k);
  const GK = ['ref', 'aer', 'um1', 'pos', 'com', 'dec', 'pas', 'vel', 'for', 'res'];
  const optsFor = (line) => (line === 'GOL' ? GK : OUT);
  const aName = (k) => (P.ATTRS.find((a) => a.k === k) || { n: k }).n;
  const POS_INT = { des: 0.25, lev: 0.7, nor: 1, int: 1.3 }; // ritmo de aprendizado de posição pela intensidade
  const T = (g) => (g.trn = g.trn || { main: {}, sub: {} });
  const lineOf = (p) => P.LINE[p.pos];

  // Atributos que definem cada posição (os maiores do perfil)
  P.posAttrs = (pos) => Object.entries(P.PROFILE[pos]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);

  // Foco do jogador: individual > grupo > automático
  P.focusOf = function (g, p, sub) {
    if (p.tr && p.tr.at) return { k: p.tr.at, from: 'ind' };
    const k = T(g)[sub ? 'sub' : 'main'][lineOf(p)];
    return { k: k || 'auto', from: k ? 'grp' : 'auto' };
  };

  // Lista [atributo, peso] treinada na semana (usada pelo treino em calendar.js)
  P.trainList = function (g, p, plan, sub) {
    const f = P.focusOf(g, p, sub), w = {};
    const add = (k, v) => { if (p.pos !== 'GOL' && P.GK_ATTRS.includes(k) && !(p.tr && p.tr.pos === 'GOL')) return; w[k] = (w[k] || 0) + v; };
    if (f.k === 'auto') {
      if (!sub && plan) {
        const F = P.TRAIN.foco[plan.foco];
        (p.pos === 'GOL' && plan.foco !== 'fis' ? ['ref', 'aer', 'um1'] : F.at).forEach((k) => add(k, 1));
      }
    } else add(f.k, 2.4); // um atributo só: evolui mais rápido que os 3 do foco da semana
    if (p.tr && p.tr.pos) P.posAttrs(p.tr.pos).forEach((k) => add(k, 0.5));
    const prof = P.hasT && P.hasT(p, 'prof') ? 1.3 : 1; // Profissional evolui mais
    return Object.entries(w).map(([k, v]) => [k, v * prof]);
  };

  // ---------- Maestria de posição ----------
  const mastery = (p, pos) => (p.pos === pos ? 1 : Math.min(1, (p.pm && p.pm[pos]) || 0));
  // Semanas para dominar a posição do zero, em ritmo normal
  P.posBaseWeeks = function (g, p, pos) {
    const f = P.fit(p.pos, pos);
    let w = pos === 'GOL' || p.pos === 'GOL' ? 90 : f >= 0.88 ? 12 : P.LINE[pos] === P.LINE[p.pos] ? 24 : 45; // vizinha, mesma linha, longe, goleiro
    w *= p.age <= 20 ? 0.75 : p.age <= 24 ? 0.9 : p.age <= 29 ? 1 : p.age <= 32 ? 1.25 : 1.5;
    w *= 1.25 - ((p.a.dec + p.a.pos) / 2) * 0.025;            // inteligência tática ajuda
    if (P.facLvl) w *= 1 - (P.facLvl(g, 'ct') - 3) * 0.06;      // centro de treinamento
    if (P.staffStars) w *= 1 - 0.04 * P.staffStars(g, 'aux');  // auxiliar técnico
    return Math.max(4, w);
  };
  P.posWeeksLeft = (g, p, pos) => Math.ceil(P.posBaseWeeks(g, p, pos) * (1 - mastery(p, pos)));

  function progress(g, p, intKey, out) {
    const pos = p.tr && p.tr.pos;
    if (!pos || mastery(p, pos) >= 1 || p.inj) return;
    p.pm = p.pm || {};
    p.pm[pos] = Math.min(1, Math.round(((p.pm[pos] || 0) + POS_INT[intKey] / P.posBaseWeeks(g, p, pos)) * 1000) / 1000);
    if (p.pm[pos] >= 1) out.push(`${p.name} agora domina a posição de ${P.POS_NAME[pos].toLowerCase()}`);
  }

  // Semana de treino: o profissional segue o original; aqui entram posição e Sub-20
  const orig = P.trainWeek;
  P.trainWeek = function (g, step) {
    if (orig) orig(g, step);
    const plan = P.planOf ? P.planOf(g, g.week) : { int: 'nor' };
    const done = [];
    for (const p of P.squad(g, g.user)) progress(g, p, plan.int, done);
    if (g.y && g.y.squad) {
      const r = Math.random;
      const tsub = P.staffStars ? 1 + 0.08 * P.staffStars(g, 'tsub') : 1;
      for (const p of Object.values(g.y.squad)) {
        progress(g, p, 'nor', done);
        const potF = P.ovr(p) / 5 < p.pot ? 1 : 0.25;
        for (const [k, w] of P.trainList(g, p, null, true)) if (p.a[k] < 20 && r() < 0.014 * w * potF * tsub * (P.adF ? P.adF(g, p) : 1)) p.a[k]++;
      }
    }
    if (done.length) P.news(g, done.join('. ') + '.', 'good');
  };

  // ---------- Tela ----------
  const fmtWeeks = (w) => (w <= 0 ? 'dominada' : w > 51 ? `≈ ${(w / 51).toFixed(1).replace('.', ',')} temporadas` : `≈ ${w} ${w === 1 ? 'semana' : 'semanas'}`);
  const findP = (g, id) => g.db.players[id] || (g.y && g.y.squad[id]);
  const isSub = (g, p) => !!(g.y && g.y.squad[p.id]);

  function posChip(g, p) {
    const pos = p.tr && p.tr.pos; if (!pos) return '';
    const m = mastery(p, pos);
    return `<span class="chip tr-pos">${pos}${m >= 1 ? ' ✓' : ` ${Math.round(m * 100)}%`}</span>`;
  }
  function row(g, p, sub) {
    const f = P.focusOf(g, p, sub);
    const learned = Object.entries(p.pm || {}).filter(([, v]) => v >= 1).map(([k]) => k);
    return `<button class="tr-row" data-a="trOpen" data-id="${p.id}">
      <span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
      <span class="nm"><b>${esc(p.name)}</b><small>${p.age} anos${learned.length ? ' · também ' + learned.join(', ') : ''}${p.inj ? ' · <span class="v1">lesionado</span>' : ''}</small></span>
      <span class="tr-chips"><span class="chip ${f.from === 'ind' ? 'tr-ind' : 'tr-grp'}">${f.k === 'auto' ? (sub ? 'Natural' : 'Plano') : esc(aName(f.k))}</span>${posChip(g, p)}</span>
      <span class="ovr">${P.ovr(p)}</span></button>`;
  }

  P.trainingView = function () {
    const g = A.g, st = A.st.trn || (A.st.trn = { sq: 'main' });
    const sub = st.sq === 'sub';
    if (sub && !g.y && P.ensureYouth) P.ensureYouth(g);
    const players = sub ? Object.values((g.y && g.y.squad) || {}) : P.squad(g, g.user);
    const plan = P.planOf ? P.planOf(g, g.week) : null;
    const tabs = `<div class="seg">${[['main', 'Principal'], ['sub', 'Sub-20']].map(([k, n]) => `<button class="${st.sq === k ? 'on' : ''}" data-a="trSq" data-k="${k}">${n}</button>`).join('')}</div>`;
    const autoLbl = sub ? 'Evolução natural' : 'Plano da semana';
    const groups = P.TRAIN_GROUPS.map(([line, name]) => {
      const list = players.filter((p) => lineOf(p) === line).sort((a, b) => P.ovr(b) - P.ovr(a));
      if (!list.length) return '';
      const cur = T(g)[st.sq][line] || 'auto';
      const sel = `<select class="sel" data-c="trGrp" data-l="${line}" aria-label="Treino dos ${name.toLowerCase()}"><option value="auto" ${cur === 'auto' ? 'selected' : ''}>${autoLbl}</option>${optsFor(line).map((k) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${esc(aName(k))}</option>`).join('')}</select>`;
      return `<div class="card"><div class="head"><span class="label">${name} (${list.length})</span>${sel}</div>
        <div class="tr-list">${list.map((p) => row(g, p, sub)).join('')}</div></div>`;
    }).join('');
    const intro = sub
      ? 'Sem treino escolhido, os jovens evoluem naturalmente pelo potencial. Escolher um atributo concentra a evolução nele toda semana.'
      : `Esta semana: <b>${plan ? esc(P.TRAIN.int[plan.int].n) : '-'}</b>${plan && plan.int !== 'des' ? ` · foco <b>${esc(P.TRAIN.foco[plan.foco].n.toLowerCase())}</b>` : ''}${plan && plan.auto ? ' (adjunto)' : ''}. A intensidade vale para todos; quem segue o "plano da semana" treina o foco dela. Um atributo escolhido evolui mais rápido que os três do foco.`;
    return `<div class="card"><div class="head"><h2>Treinamento</h2>${tabs}</div>
        <p class="muted" style="margin:0;font-size:.88rem">${intro} Toque num jogador para escolher o atributo dele e uma posição para treinar.</p>
        ${sub ? '' : '<div style="margin-top:10px"><button class="btn sm" data-a="go" data-v="calendario">Planejar intensidade e foco por semana</button></div>'}</div>
      ${groups || '<div class="card"><p class="empty">Nenhum jogador aqui.</p></div>'}`;
  };

  function sheet(id) {
    const g = A.g, p = findP(g, id); if (!p) return;
    const sub = isSub(g, p), f = P.focusOf(g, p, sub);
    const grp = T(g)[sub ? 'sub' : 'main'][lineOf(p)] || 'auto';
    const grpName = grp === 'auto' ? (sub ? 'evolução natural' : 'plano da semana') : aName(grp).toLowerCase();
    const sel = `<select class="sel" data-c="trInd" data-id="${p.id}" aria-label="Atributo treinado"><option value="" ${f.from !== 'ind' ? 'selected' : ''}>Seguir o grupo (${esc(grpName)})</option>${optsFor(lineOf(p)).map((k) => `<option value="${k}" ${f.from === 'ind' && f.k === k ? 'selected' : ''}>${esc(aName(k))} · ${p.a[k]}</option>`).join('')}</select>`;
    const tp = p.tr && p.tr.pos;
    const cells = P.POS.map((pos) => {
      const m = mastery(p, pos);
      const status = pos === p.pos ? 'Natural' : m >= 1 ? 'Dominada' : m > 0 ? `${Math.round(m * 100)}% · ${fmtWeeks(P.posWeeksLeft(g, p, pos)).replace('≈ ', '')}` : fmtWeeks(P.posWeeksLeft(g, p, pos)).replace('≈ ', '~');
      return `<button class="tr-pos-btn ${tp === pos ? 'on' : ''}" data-a="trPos" data-id="${p.id}" data-pos="${pos}">
        <span class="pos-tag ${P.LINE[pos]}">${pos}</span><b>${P.ovrAt(p, pos)}</b><small>${status}</small></button>`;
    }).join('');
    let info = '<p class="muted" style="margin:0;font-size:.86rem">Escolha uma posição para ele treinar. Isso não muda o atributo acima: os dois treinos acontecem juntos.</p>';
    if (tp) {
      const m = mastery(p, tp), left = P.posWeeksLeft(g, p, tp);
      const attrs = P.posAttrs(tp).map(aName).join(', ').toLowerCase();
      const now = P.ovrAt(p, tp), full = Math.round(now / P.fitP(p, tp));
      info = `<div class="msg">${tp === p.pos
        ? `<b>${P.POS_NAME[tp]}</b> já é a posição dele. O treino reforça ${esc(attrs)}.`
        : m >= 1 ? `<b>${esc(p.name)}</b> já domina a posição de ${P.POS_NAME[tp].toLowerCase()} e joga nela como na de origem. O treino segue reforçando ${esc(attrs)}.`
          : `Maestria como <b>${P.POS_NAME[tp].toLowerCase()}</b> em <b>${fmtWeeks(left)}</b> de treino (${Math.round(m * 100)}% hoje). Força na posição: ${now} agora, cerca de ${Math.min(99, full)} com maestria. O treino também reforça ${esc(attrs)}.<br><span class="muted" style="font-size:.82rem">Semanas de descanso ou leves atrasam; intensas adiantam. Jovens, jogadores com boas decisões e posicionamento, o centro de treinamento e o auxiliar técnico aceleram.</span>`}</div>
        <div><button class="btn sm" data-a="trPos" data-id="${p.id}" data-pos="">Parar treino de posição</button></div>`;
    }
    A.openSheet(`<div class="bar-top"><h2>${esc(p.name)}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <div class="muted" style="margin:-4px 0 12px">${P.POS_NAME[p.pos]} · ${p.age} anos · força ${P.ovr(p)}${sub ? ' · Sub-20' : ''}</div>
      <div class="field" style="margin-bottom:16px"><span class="label">Atributo em treino</span>${sel}</div>
      <div class="label" style="margin-bottom:6px">Treino de posição</div>
      <div class="tr-pos-grid">${cells}</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">${info}</div>`);
  }

  Object.assign(A.ACT, {
    trSq(d) { A.st.trn = { sq: d.k }; A.render(); },
    trOpen(d) { sheet(d.id); },
    trPos(d) {
      const p = findP(A.g, d.id); if (!p) return;
      p.tr = p.tr || {};
      p.tr.pos = d.pos || null;
      A.save(); sheet(d.id); A.render();
    }
  });
  Object.assign(A.CHG, {
    trGrp(el) {
      const g = A.g, st = A.st.trn || { sq: 'main' }, line = el.dataset.l;
      T(g)[st.sq][line] = el.value === 'auto' ? null : el.value;
      // o grupo inteiro passa a treinar a mesma coisa
      const list = st.sq === 'sub' ? Object.values((g.y && g.y.squad) || {}) : P.squad(g, g.user);
      let n = 0;
      for (const p of list) if (lineOf(p) === line && p.tr && p.tr.at) { p.tr.at = null; n++; }
      A.save(); A.render();
      if (n && A.toast) A.toast(`${n} ${n === 1 ? 'jogador voltou' : 'jogadores voltaram'} a seguir o grupo`);
    },
    trInd(el) {
      const p = findP(A.g, el.dataset.id); if (!p) return;
      p.tr = p.tr || {};
      p.tr.at = el.value || null;
      A.save(); sheet(p.id); A.render();
    }
  });
})(window.PFC);
