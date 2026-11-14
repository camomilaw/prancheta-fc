/* Prancheta FC — perfil do treinador
 * Registro partida a partida da carreira do técnico: passagens por clube, campanha,
 * títulos e números de cada jogador sob o seu comando (base do Hall da Fama).
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const blankRec = () => ({ j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 });
  const pct = (r) => (r.j ? Math.round((r.v * 3 + r.e) / (r.j * 3) * 100) : 0);
  const ord = (n) => n + 'º';
  // Monograma com cara de gravura: anel duplo, ramos de louro e as iniciais
  const leaf = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="5" transform="rotate(${r} ${x} ${y})"/>`;
  const branch = (side) => [[-38, 18, 35], [-41, 8, 20], [-41, -3, 5], [-38, -14, -12], [-32, -24, -30]].map(([x, y, r]) => leaf(side * x, y, side * r)).join('');
  const monogram = (ini) => `<svg viewBox="-50 -50 100 100" width="64" height="64" aria-hidden="true">
    <circle r="47" fill="none" stroke="currentColor" stroke-width="1.2"/><circle r="43" fill="none" stroke="currentColor" stroke-width=".6"/>
    <g fill="currentColor" opacity=".85">${branch(1)}${branch(-1)}</g>
    <text y="10" text-anchor="middle" font-family="Playfair Display, Georgia, serif" font-style="italic" font-weight="900" font-size="${ini.length > 1 ? 30 : 38}" fill="currentColor">${esc(ini)}</text>
    <path d="M-12 22h24" stroke="currentColor" stroke-width=".8"/></svg>`;
  const clubOf = (g, cid) => cid && P.club(g, cid);
  // Critérios do Hall da Fama (números sob o seu comando)
  P.HOF = { j: 150, g: 60, as: 50 };
  const TITLE_N = { lg: 'Ultraliga', div: 'Título de divisão', cup: 'Copa Ultra', sc: 'Supercopa Ultra', rz: 'Copa Meir Afrayat', tv: 'Taça Júnior Maestro', as: 'Taça Orton Barrera', up: 'Acesso' };

  const cur = (g) => g.mgr.stints[g.mgr.stints.length - 1];

  // Cria o registro (também em saves antigos, a partir do que já existia)
  P.ensureMgr = function (g) {
    if (g.mgr) return;
    const old = g.career && g.career.mgr;
    const rec = blankRec(), pl = {};
    if (old) for (const k of Object.keys(rec)) rec[k] += old[k] || 0;
    if (g.career) for (const [id, x] of Object.entries(g.career.pl)) pl[id] = { name: x.name, pos: x.pos, j: x.j, g: x.g, as: x.as, nt: x.nt, cids: [g.user] };
    // temporada em andamento (o fim de temporada ainda não somou)
    if (!g.over && P.teamRecord && g.lg) {
      const t = P.teamRecord(g, g.user);
      for (const k of Object.keys(rec)) rec[k] += t[k];
      for (const p of P.squad(g, g.user)) {
        if (!p.s || !p.s.j) continue;
        const x = pl[p.id] || (pl[p.id] = { name: p.name, pos: p.pos, j: 0, g: 0, as: 0, nt: 0, cids: [g.user] });
        x.j += p.s.j; x.g += p.s.g + p.s.cg; x.as += p.s.as; x.nt += p.s.nt;
      }
    }
    const first = (g.hist && g.hist.length) ? g.hist[0].season : g.season;
    const titles = [];
    for (const h of g.hist || []) {
      if (h.pos === 1) titles.push({ s: h.season, t: h.div === 1 ? 'lg' : 'div', div: h.div, cid: h.cid || null });
      if (h.cupMine) titles.push({ s: h.season, t: 'cup', cid: h.cid || null });
      if (h.scMine) titles.push({ s: h.season, t: 'sc', cid: h.cid || null });
      if (h.rzMine || h.tzMine) titles.push({ s: h.season, t: h.tzMine || 'rz', cid: h.cid || null });
      if (/acesso/i.test(h.result) && h.pos !== 1) titles.push({ s: h.season, t: 'up', div: h.div, cid: h.cid || null });
    }
    g.mgr = {
      stints: [Object.assign({ cid: g.user, from: first, to: null, why: null, seeded: !!(old || (g.hist && g.hist.length) || g.week) }, rec)],
      titles, pl, best: null
    };
  };

  // Cada partida do seu time
  P.mgrMatch = function (g, it, r) {
    const m = it.m, side = m.h === g.user ? 0 : m.a === g.user ? 1 : -1;
    if (side < 0) return;
    P.ensureMgr(g);
    const st = cur(g);
    const gf = side === 0 ? r.hg : r.ag, ga = side === 0 ? r.ag : r.hg;
    st.j++; st.gp += gf; st.gc += ga;
    if (gf > ga) st.v++; else if (gf < ga) st.d++; else st.e++;
    const b = g.mgr.best;
    if (gf > ga && (!b || gf - ga > b.gf - b.ga || (gf - ga === b.gf - b.ga && gf > b.gf))) {
      g.mgr.best = { gf, ga, opp: side === 0 ? m.a : m.h, cid: g.user, s: g.season, l: P.stepLabel(g.cal[g.week]) };
    }
    const pl = g.mgr.pl;
    const rowOf = (id) => {
      const p = g.db.players[id]; if (!p) return null;
      const x = pl[id] || (pl[id] = { name: p.name, pos: p.pos, j: 0, g: 0, as: 0, nt: 0, cids: [] });
      x.name = p.name; x.pos = p.pos;
      if (!x.cids.includes(g.user)) x.cids.push(g.user);
      return x;
    };
    for (const id of r.played[side]) { const x = rowOf(id); if (x) { x.j++; x.nt = Math.round((x.nt + (r.notes[id] || 6)) * 10) / 10; } }
    for (const e of r.ev) {
      if (e.t !== 'gol' || e.s !== side) continue;
      const x = rowOf(e.p); if (x) x.g++;
      if (e.as) { const y = rowOf(e.as); if (y) y.as++; }
    }
  };

  // Fim de temporada: títulos e clube no histórico (chamado depois da Supercopa)
  P.mgrSeasonEnd = function (g) {
    P.ensureMgr(g);
    const h = g.hist[g.hist.length - 1];
    if (!h || h.season !== g.season) return;
    h.cid = g.user;
    const T = g.mgr.titles, add = (t, extra) => T.push(Object.assign({ s: g.season, t, cid: g.user }, extra || {}));
    if (h.pos === 1) add(h.div === 1 ? 'lg' : 'div', { div: h.div });
    else if (/acesso/i.test(h.result)) add('up', { div: h.div });
    if (h.cupMine) add('cup');
    if (h.tzMine) add(h.tzMine);
    if (h.scMine) add('sc');
  };

  // Troca de clube: fecha a passagem atual e abre outra
  const prevSwitch = P.switchClub;
  if (prevSwitch) P.switchClub = function (g, cid) {
    P.ensureMgr(g);
    const st = cur(g);
    st.to = g.season; st.why = g.fired ? 'Demitido' : 'Saiu para outro clube';
    const from = g.over ? g.season + 1 : g.season; // na virada, o novo trabalho começa no ano seguinte
    prevSwitch(g, cid);
    g.mgr.stints.push(Object.assign({ cid, from, to: null, why: null }, blankRec()));
  };

  // ---------- Tela ----------
  const titleName = (t) => (t.t === 'div' ? `${t.div}ª divisão` : t.t === 'up' ? `Acesso da ${t.div}ª divisão` : TITLE_N[t.t]);

  function resumo(g, M, tot) {
    const counts = {};
    for (const t of M.titles) counts[t.t] = (counts[t.t] || 0) + 1;
    const big = M.best && clubOf(g, M.best.opp);
    const clubs = new Set(M.stints.map((s) => s.cid)).size;
    const seasons = (g.hist || []).length;
    const bestH = (g.hist || []).slice().sort((a, b) => a.div - b.div || a.pos - b.pos)[0];
    const cups = ['lg', 'cup', 'sc', 'as', 'tv', 'rz', 'div'].filter((k) => counts[k]);
    return `<div class="kv" style="margin-bottom:14px">
        <div><span class="label">Temporadas</span><b>${seasons}${g.over ? '' : ` + atual`}</b></div>
        <div><span class="label">Clubes</span><b>${clubs}</b></div>
        <div><span class="label">Jogos</span><b>${tot.j}</b></div>
        <div><span class="label">Campanha</span><b>${tot.v}-${tot.e}-${tot.d}</b></div>
        <div><span class="label">Aprov.</span><b>${pct(tot)}%</b></div>
        <div><span class="label">Gols</span><b>${tot.gp} × ${tot.gc}</b></div>
        <div><span class="label">Títulos</span><b>${cups.reduce((s, k) => s + counts[k], 0)}</b></div>
        <div><span class="label">Acessos</span><b>${(counts.up || 0) + (counts.div || 0)}</b></div>
      </div>
      ${cups.length ? `<div class="mg-trophies">${cups.map((k) => `<div class="mg-trophy t-${k}"><span class="ic">🏆</span><b>${counts[k]}×</b><small>${esc(TITLE_N[k])}</small></div>`).join('')}</div>` : ''}
      <div class="mg-facts">
        ${big ? `<p><span class="label">Maior vitória</span>${M.best.gf} × ${M.best.ga} contra o ${esc(big.name)} <span class="muted">(${esc(clubOf(g, M.best.cid) ? clubOf(g, M.best.cid).short : '')}, ${M.best.s})</span></p>` : ''}
        ${bestH ? `<p><span class="label">Melhor campanha na liga</span>${ord(bestH.pos)} na ${bestH.div}ª divisão em ${bestH.season}${clubOf(g, bestH.cid) ? ` com o ${esc(clubOf(g, bestH.cid).name)}` : ''}</p>` : ''}
      </div>`;
  }

  function clubes(g, M) {
    const rows = M.stints.slice().reverse().map((s) => {
      const c = clubOf(g, s.cid);
      const tt = M.titles.filter((t) => t.cid === s.cid && t.t !== 'up' && t.s >= s.from && (s.to == null || t.s <= s.to)).length;
      return `<div class="mg-stint ${s.to == null ? 'me' : ''}">${P.badge(c, 30)}
        <span class="nm"><b>${esc(c.name)}</b><small>${s.from}–${s.to == null ? 'atual' : s.to}${s.why ? ' · ' + esc(s.why) : ''}${tt ? ` · ${tt} ${tt === 1 ? 'título' : 'títulos'}` : ''}</small></span>
        <span class="mg-rec"><span><b>${s.j}</b>J</span><span><b>${s.v}-${s.e}-${s.d}</b>V-E-D</span><span><b>${pct(s)}%</b>Aprov.</span></span></div>`;
    }).join('');
    const hist = (g.hist || []).slice().reverse().map((h) => {
      const c = clubOf(g, h.cid);
      const extra = [h.cupMine ? 'Copa Ultra' : '', h.scMine ? 'Supercopa' : ''].filter(Boolean).join(' · ');
      return `<tr><td>${h.season}</td><td>${c ? `<span class="club">${P.badge(c, 18)}${esc(c.short)}</span>` : '<span class="muted">–</span>'}</td><td>${h.div}ª</td><td class="n">${ord(h.pos)}</td><td>${esc(h.result.replace(' · Supercopa', ''))}${extra ? `<small class="muted" style="display:block;font-size:.72rem">${extra}</small>` : ''}</td></tr>`;
    }).join('');
    return `<div class="mg-stints">${rows}</div>
      <div class="label" style="margin:16px 0 6px">Temporada a temporada</div>
      ${hist ? `<div class="tbl-wrap"><table class="tbl mg-season"><thead><tr><th>Ano</th><th>Clube</th><th>Div</th><th class="n">Pos</th><th>Resultado</th></tr></thead><tbody>${hist}</tbody></table></div>` : '<p class="empty" style="padding:0">Aparece ao fim da primeira temporada.</p>'}`;
  }

  function titulos(g, M) {
    if (!M.titles.length) return '<p class="empty">Nenhum título ou acesso ainda. A primeira taça está esperando.</p>';
    const order = ['sc', 'lg', 'cup', 'as', 'tv', 'rz', 'div', 'up'];
    return order.filter((k) => M.titles.some((t) => t.t === k)).map((k) => {
      const list = M.titles.filter((t) => t.t === k).sort((a, b) => b.s - a.s);
      return `<div class="label" style="margin:12px 0 6px">${esc(TITLE_N[k] === 'Título de divisão' ? 'Títulos de divisão' : TITLE_N[k] === 'Acesso' ? 'Acessos' : TITLE_N[k])} (${list.length})</div>
        <div class="mg-tlist">${list.map((t) => { const c = clubOf(g, t.cid); return `<div class="mg-t t-${k}"><b>${t.s}</b>${c ? P.badge(c, 22) : ''}<span>${c ? esc(c.name) : '<span class="muted">clube não registrado</span>'}${k === 'div' || k === 'up' ? ` <span class="muted">· ${esc(titleName(t))}</span>` : ''}</span></div>`; }).join('')}</div>`;
    }).join('');
  }

  function hall(g, M) {
    const arr = Object.entries(M.pl).map(([id, x]) => Object.assign({ id }, x));
    const hof = arr.filter((x) => x.j >= P.HOF.j || x.g >= P.HOF.g || x.as >= P.HOF.as)
      .sort((a, b) => (b.g * 2 + b.as + b.j / 3) - (a.g * 2 + a.as + a.j / 3));
    const status = (x) => {
      const p = g.db.players[x.id];
      if (!p) return 'Aposentado';
      if (p.clubId === g.user) return 'No seu elenco';
      const c = clubOf(g, p.clubId);
      return c ? `Hoje no ${c.short}` : 'Sem clube';
    };
    const why = (x) => [x.j >= P.HOF.j ? `${x.j} jogos` : '', x.g >= P.HOF.g ? `${x.g} gols` : '', x.as >= P.HOF.as ? `${x.as} assist.` : ''].filter(Boolean).join(' · ');
    const card = (x) => {
      const clubs = x.cids.map((cid) => clubOf(g, cid)).filter(Boolean);
      const p = g.db.players[x.id];
      return `<${p ? `button class="mg-hof" data-a="player" data-id="${x.id}"` : 'div class="mg-hof"'}>
        <span class="star">★</span>
        <span class="nm"><b>${esc(x.name)}</b><small>${x.pos} · ${clubs.map((c) => esc(c.short)).join(', ')} · ${esc(status(x))}</small><em>${esc(why(x))}</em></span>
        <span class="nums"><span><b>${x.j}</b>J</span><span><b>${x.g}</b>G</span><span><b>${x.as}</b>A</span></span></${p ? 'button' : 'div'}>`;
    };
    const list = (title, f, show, min) => {
      const top = arr.filter((x) => x.j >= (min || 1) && f(x) > 0).sort((a, b) => f(b) - f(a)).slice(0, 10);
      return `<div class="card"><div class="head"><span class="label">${title}</span></div>${top.length ? `<table class="tbl"><tbody>${top.map((x, i) => `<tr ${g.db.players[x.id] ? `class="click" data-a="player" data-id="${x.id}"` : ''}><td class="n">${i + 1}</td><td>${esc(x.name)} <span class="muted">${x.pos}${g.db.players[x.id] ? '' : ' · aposentado'}</span></td><td class="n"><b>${show(x)}</b></td></tr>`).join('')}</tbody></table>` : '<p class="empty">Sem dados ainda.</p>'}</div>`;
    };
    return `<p class="muted" style="margin:0 0 10px;font-size:.88rem">Entra no Hall da Fama quem chegou a ${P.HOF.j} jogos, ${P.HOF.g} gols ou ${P.HOF.as} assistências sob o seu comando, em qualquer clube que você treinou.</p>
      ${hof.length ? `<div class="mg-hofs">${hof.map(card).join('')}</div>` : '<p class="empty">Ninguém chegou lá ainda. Os mais perto aparecem nas listas abaixo.</p>'}
      <div class="grid2" style="margin-top:16px">
        ${list('Artilheiros', (x) => x.g, (x) => x.g)}
        ${list('Mais jogos', (x) => x.j, (x) => x.j)}
        ${list('Garçons', (x) => x.as, (x) => x.as)}
        ${list('Melhor nota média (mín. 30 jogos)', (x) => x.nt / x.j, (x) => (x.nt / x.j).toFixed(2).replace('.', ','), 30)}
      </div>`;
  }

  P.managerView = function () {
    const g = A.g;
    P.ensureMgr(g);
    const M = g.mgr, st = A.st.mg || (A.st.mg = { tab: 'res' });
    const tot = blankRec();
    for (const s of M.stints) for (const k of Object.keys(tot)) tot[k] += s[k];
    const me = P.club(g, g.user);
    const tabs = `<div class="seg tabs-x">${[['res', 'Resumo'], ['clu', 'Clubes'], ['tit', 'Títulos'], ['hof', 'Hall da Fama']].map(([k, n]) => `<button class="${st.tab === k ? 'on' : ''}" data-a="mgTab" data-k="${k}">${n}</button>`).join('')}</div>`;
    const body = st.tab === 'clu' ? clubes(g, M) : st.tab === 'tit' ? titulos(g, M) : st.tab === 'hof' ? hall(g, M) : resumo(g, M, tot);
    const note = M.stints[0].seeded ? '<p class="muted" style="font-size:.78rem;margin:12px 0 0">Carreira iniciada antes deste registro: números anteriores vêm do resumo de cada temporada, e o clube dos anos antigos pode não aparecer.</p>' : '';
    return `<div class="card"><div class="mg-head"><div class="mg-avatar">${monogram((g.manager || 'T').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase())}</div>
        <div style="flex:1;min-width:0"><h2 style="margin:0">${esc(g.manager)}</h2><div class="muted" style="font-size:.88rem">Técnico do ${esc(me.name)} · ${me.div}ª divisão</div></div></div>
        ${P.coachCard ? P.coachCard(g) : ''}
        <div class="head" style="margin:14px 0 12px">${tabs}</div>${body}${note}</div>`;
  };

  // Cartão no menu Mais
  const prevMais = P.maisExtra;
  P.maisExtra = () => `<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Treinador</h2></div>
      <p class="muted" style="margin:0">Suas estatísticas, os clubes que você comandou, seus títulos e o Hall da Fama dos jogadores que marcaram sua carreira.</p><div><button class="btn primary" data-a="go" data-v="tecnico">Ver perfil</button></div></div>` + (prevMais ? prevMais() : '');

  if (A && A.ACT) A.ACT.mgTab = function (d) { A.st.mg = { tab: d.k }; A.render(); };
})(window.PFC);
