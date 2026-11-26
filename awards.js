/* Prancheta FC — Bola de Ouro
 * No fim de cada temporada, o jornal elege o melhor jogador do mundo juntando:
 * gols, assistências, nota média e os títulos do clube (título maior pesa mais).
 * Os números valem mais na 1ª divisão do que nas de baixo.
 * Fica guardado em g.bdo (top 10 de cada ano) e aparece em Estatísticas › Bola de Ouro.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const DIV_F = [1, 0.82, 0.68, 0.56, 0.46, 0.38, 0.31, 0.25];
  const LEAGUE_W = [30, 14, 11, 9, 7, 6, 5, 4];
  const W = { cup: 22, sc: 8, po: 4, tier: { as: 8, tv: 6, rz: 5 } };

  // peso pelo nível da divisão (na Carreira normal o nível é fracionado: 1ª da Inglaterra = 1, 1ª do Chile ≈ 4,8)
  const byTier = (arr, d) => { const t = P.divTier ? P.divTier(d) : d, i = Math.max(0, Math.min(arr.length - 1, t - 1)), lo = Math.floor(i), f = i - lo; return lo >= arr.length - 1 ? arr[arr.length - 1] : arr[lo] * (1 - f) + arr[lo + 1] * f; };
  const lw = (d) => byTier(LEAGUE_W, d);
  // Títulos de cada clube na temporada que acabou: [{ n: nome, w: peso }]
  function titles(g) {
    const t = {};
    const add = (cid, n, w) => { if (!cid) return; (t[cid] = t[cid] || []).push({ n, w }); };
    const s = g.summary;
    if (s) s.divs.forEach((d) => add(d.champ, P.leagueTitle ? P.leagueTitle(d.d) : d.d === 1 ? 'Ultraliga' : `${d.d}ª divisão`, lw(d.d)));
    if (P.normalTitles && P.isNormal(g)) { P.normalTitles(g, add, byTier); return t; }
    if (g.cup && g.cup.winner) add(g.cup.winner, 'Copa Ultra', W.cup);
    const sc = g.scup && g.scup.eds && g.scup.eds.find((e) => e.season === g.season);
    if (sc && sc.w) add(sc.w, 'Supercopa', W.sc);
    if (g.po) for (const d of Object.keys(g.po)) if (g.po[d] && g.po[d].w) add(g.po[d].w, `Playoff da ${d}ª`, W.po);
    if (g.tz && P.TIERS) for (const tr of P.TIERS) { const z = g.tz[tr.k]; if (z && z.season === g.season && z.w) add(z.w, tr.short || tr.n, W.tier[tr.k] || 5); }
    return t;
  }

  P.ballonRank = function (g, live) {
    const tt = live ? {} : titles(g);
    const rows = [];
    for (const p of Object.values(g.db.players)) {
      if (!p.clubId || !p.s || p.s.j < 12) continue;
      const c = P.club(g, p.clubId); if (!c) continue;
      const s = p.s, gl = (s.g || 0) + (s.cg || 0), avg = s.j ? s.nt / s.j : 0;
      const tl = tt[p.clubId] || [];
      const tw = tl.reduce((x, y) => x + y.w, 0) * Math.min(1, s.j / 20);
      const ind = (gl * 4 + (s.as || 0) * 2.5 + Math.max(0, avg - 6.2) * 45 * Math.min(1, s.j / 30)) * byTier(DIV_F, c.div);
      rows.push({ id: p.id, n: p.name, c: p.clubId, pos: p.pos, age: p.age, j: s.j, g: gl, as: s.as || 0, nt: Math.round(avg * 10) / 10, t: tl.map((x) => x.n), sc: Math.round((ind + tw) * 10) / 10 });
    }
    return rows.sort((a, b) => b.sc - a.sc).slice(0, 10);
  };

  const origEnd = P.endSeason;
  P.endSeason = function (g) {
    const r = origEnd.apply(this, arguments);
    try {
      const top = P.ballonRank(g);
      if (top.length) {
        (g.bdo = g.bdo || []).push({ s: g.season, top });
        if (g.bdo.length > 40) g.bdo.shift();
        const w = top[0], wc = P.club(g, w.c), p = g.db.players[w.id];
        if (p) (p.bdo = p.bdo || []).push(g.season);
        const mine = top.findIndex((x) => x.c === g.user);
        P.news(g, `Bola de Ouro ${g.season}: ${w.n} (${wc.name}) é o melhor jogador do mundo. ${w.g} gols, ${w.as} assistências e nota média ${String(w.nt).replace('.', ',')}${w.t.length ? `; campeão: ${w.t.join(', ')}` : ''}.`, mine === 0 ? 'good' : '');
        if (mine > 0) P.news(g, `${top[mine].n}, do seu ${P.club(g, g.user).name}, terminou em ${mine + 1}º na Bola de Ouro.`, 'good');
        if (P.flash) P.flash(g, { pri: 3, ttl: 2, kicker: `Bola de Ouro ${g.season}`, head: `${w.n} é o melhor do mundo`, dek: `${wc.name} · ${w.g} gols, ${w.as} assistências, nota ${String(w.nt).replace('.', ',')}${w.t.length ? ` · ${w.t.join(', ')}` : ''}. ${top[1] ? `${top[1].n} foi o 2º e ${top[2] ? top[2].n + ' o 3º' : ''}.` : ''}` });
      }
    } catch (e) { /* prêmio nunca quebra o fim de temporada */ }
    return r;
  };

  // Tabela do top 10 (usada em Estatísticas e no resumo do fim de temporada)
  P.ballonTable = function (g, ed, max) {
    if (!ed) return '';
    const club = (cid) => P.club(g, cid);
    return `<table class="tbl bdo-tbl"><thead><tr><th class="n">#</th><th>Jogador</th><th class="n">G</th><th class="n">A</th><th class="n">Nota</th><th class="hide-sm">Títulos</th><th class="n">Pts</th></tr></thead><tbody>
      ${ed.top.slice(0, max || 10).map((x, i) => { const c = club(x.c); return `<tr class="${x.c === g.user ? 'me' : ''} ${i === 0 ? 'bdo-1' : ''}"><td class="n">${i === 0 ? '★' : i + 1}</td>
        <td><button class="jr-link" data-a="player" data-id="${x.id}"><b>${esc(x.n)}</b></button><small class="muted"> ${x.pos} · ${c ? esc(c.short || c.name) : ''}</small></td>
        <td class="n">${x.g}</td><td class="n">${x.as}</td><td class="n">${String(x.nt).replace('.', ',')}</td><td class="hide-sm">${esc(x.t.join(', ') || '—')}</td><td class="n"><b>${Math.round(x.sc)}</b></td></tr>`; }).join('')}</tbody></table>`;
  };

  // ---------- Estatísticas › Bola de Ouro ----------
  const origStats = P.statsView;
  P.statsView = function () {
    const g = A.g, st = A.st.stx || (A.st.stx = { tab: 'temp', scope: 'club' });
    const btn = `<button class="${st.tab === 'bdo' ? 'on' : ''}" data-a="stxTab" data-k="bdo">Bola de Ouro</button>`;
    if (st.tab !== 'bdo') return origStats.apply(this, arguments).replace('data-k="car">Carreira</button>', 'data-k="car">Carreira</button>' + btn);
    const list = g.bdo || [];
    const sel = st.bdoY && list.find((e) => e.s === st.bdoY) || list[list.length - 1];
    const live = !g.over ? { s: g.season, top: P.ballonRank(g, true) } : null; // corrida da temporada em andamento
    const body = `${live && live.top.length ? `<section class="card"><div class="head"><span class="label">Corrida de ${g.season} (parcial)</span></div>${P.ballonTable(g, live, 5)}
        <p class="muted" style="font-size:.8rem;margin:6px 0 0">Gols, assistências e nota contam desde já; os títulos entram quando forem decididos. Mínimo de 12 jogos.</p></section>` : ''}
      ${sel ? `<section class="card"><div class="head"><span class="label">Bola de Ouro ${sel.s}</span>${list.length > 1 ? `<select class="sel bdo-y" data-c="bdoY">${list.slice().reverse().map((e) => `<option value="${e.s}" ${e === sel ? 'selected' : ''}>${e.s}</option>`).join('')}</select>` : ''}</div>${P.ballonTable(g, sel)}</section>` : '<p class="empty">A primeira Bola de Ouro é entregue no fim desta temporada.</p>'}
      ${list.length ? `<section class="card"><div class="head"><span class="label">Vencedores</span></div><table class="tbl"><tbody>${list.slice().reverse().map((e) => { const w = e.top[0], c = P.club(g, w.c); return `<tr class="${w.c === g.user ? 'me' : ''}"><td>${e.s}</td><td><button class="jr-link" data-a="player" data-id="${w.id}">${esc(w.n)}</button></td><td class="hide-sm">${c ? esc(c.name) : ''}</td><td class="n">${w.g} G · ${w.as} A</td></tr>`; }).join('')}</tbody></table></section>` : ''}
      <p class="muted" style="font-size:.8rem">Como é a conta: gols valem 4, assistências 2,5 e a nota média acima de 6,2 também soma; tudo vale mais na 1ª divisão. Os títulos do clube somam por cima: Ultraliga 30, Copa Ultra 22, divisões de baixo de 14 a 4, Supercopa 8, taças regionais 5 a 8, playoff 4.</p>`;
    return `<div class="tac2 st2"><header class="cad-head"><div class="cad-title"><span class="cad-kicker">Caderno de Números</span><h2>Estatísticas</h2></div>
      <div class="cad-tools"><div class="seg"><button data-a="stxTab" data-k="temp">Temporada</button><button data-a="stxTab" data-k="car">Carreira</button>${btn}</div></div></header>
      <div class="bdo">${body}</div></div>`;
  };
  A.CHG.bdoY = (el) => { A.st.stx.bdoY = Number(el.value); A.render(); };

  // Ficha do jogador: troféus de Bola de Ouro
  P.bdoChip = (p) => (p && p.bdo && p.bdo.length ? `<span class="chip gem" title="Bola de Ouro">★ Bola de Ouro ${p.bdo.join(', ')}</span>` : '');
})(window.PFC);
