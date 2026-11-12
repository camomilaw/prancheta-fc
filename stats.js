/* Prancheta FC — estatísticas da temporada e da carreira
 * - Rankings da temporada: meu clube, minha divisão ou Ultraliga inteira
 * - Carreira: totais dos jogadores enquanto estiveram no seu clube e o retrospecto do técnico
 * - Resumo de fim de temporada com números da equipe e destaques do elenco
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const avg = (p) => (p.s.j ? p.s.nt / p.s.j : 0);
  const fmt = (v) => v.toFixed(2).replace('.', ',');

  // Jogos do clube na temporada (liga + copa + playoffs)
  function teamRecord(g, cid) {
    const rec = { j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, big: null };
    const add = (m) => {
      if (!m || !m.done || (m.h !== cid && m.a !== cid)) return;
      const home = m.h === cid, gf = home ? m.hg : m.ag, ga = home ? m.ag : m.hg;
      rec.j++; rec.gp += gf; rec.gc += ga;
      if (gf > ga) rec.v++; else if (gf < ga) rec.d++; else rec.e++;
      if (gf - ga > 0 && (!rec.big || gf - ga > rec.big.d)) rec.big = { d: gf - ga, opp: home ? m.a : m.h, gf, ga };
    };
    const g2 = g;
    for (const d of Object.keys(g2.lg)) g2.lg[d].forEach((rd) => rd.forEach(add));
    (g2.cup.rounds || []).forEach((r) => r.ties.forEach(add));
    if (g2.po) for (const d of Object.keys(g2.po)) { g2.po[d].semi.forEach(add); add(g2.po[d].final); }
    if (P.scTies) P.scTies(g2).forEach(add);
    return rec;
  }

  // Fim de temporada: guarda o resumo e acumula a carreira (antes de zerar as estatísticas)
  P.seasonStats = function (g) {
    const sq = P.squad(g, g.user);
    const top = (f, min) => sq.filter((p) => p.s.j >= (min || 1)).sort((a, b) => f(b) - f(a))[0];
    const pick = (p, v) => (p ? { name: p.name, v } : null);
    const rec = teamRecord(g, g.user);
    const sc = top((p) => p.s.g + p.s.cg), as = top((p) => p.s.as), nt = top(avg, 10), gm = top((p) => p.s.j);
    g.seasonSum = {
      season: g.season, rec,
      scorer: pick(sc, sc ? sc.s.g + sc.s.cg : 0), assists: pick(as, as ? as.s.as : 0),
      rating: pick(nt, nt ? fmt(avg(nt)) : 0), games: pick(gm, gm ? gm.s.j : 0),
      big: rec.big ? `${rec.big.gf} × ${rec.big.ga} contra o ${P.club(g, rec.big.opp).name}` : null,
      fin: Object.values(g.fin.cat).reduce((a, b) => a + b, 0)
    };
    // carreira
    g.career = g.career || { pl: {}, mgr: { j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, seasons: 0 } };
    for (const p of sq) {
      const c = g.career.pl[p.id] || (g.career.pl[p.id] = { name: p.name, pos: p.pos, j: 0, g: 0, as: 0, nt: 0, t: 0 });
      c.name = p.name; c.pos = p.pos; c.j += p.s.j; c.g += p.s.g + p.s.cg; c.as += p.s.as; c.nt += p.s.nt; c.t++;
    }
    const mg = g.career.mgr;
    for (const k of ['j', 'v', 'e', 'd', 'gp', 'gc']) mg[k] += rec[k];
    mg.seasons++;
  };

  P.seasonExtra = function (g) {
    const s = g.seasonSum; if (!s || s.season !== g.season) return '';
    const r = s.rec, row = (label, x) => (x ? `<div><span class="label">${label}</span><b style="font-size:1rem">${esc(x.name)}</b><span class="muted" style="font-size:.8rem">${x.v}</span></div>` : '');
    return `<div class="label" style="margin:14px 0 8px">Sua temporada</div>
      <div class="kv"><div><span class="label">Jogos</span><b>${r.j}</b></div><div><span class="label">Campanha</span><b>${r.v}-${r.e}-${r.d}</b></div>
        <div><span class="label">Gols</span><b>${r.gp} × ${r.gc}</b></div><div><span class="label">Saldo financeiro</span><b class="${s.fin < 0 ? 'v1' : 'v4'}">${P.money(s.fin)}</b></div>
        ${row('Artilheiro', s.scorer)}${row('Garçom', s.assists)}${row('Melhor nota', s.rating)}${row('Mais jogos', s.games)}</div>
      ${s.big ? `<p class="muted" style="margin:8px 0 0">Maior vitória: ${esc(s.big)}.</p>` : ''}`;
  };

  // ---------- Tela ----------
  P.statsView = function () {
    const g = A.g, st = A.st.stx || (A.st.stx = { tab: 'temp', scope: 'club' });
    const me = P.club(g, g.user);
    const tabs = `<div class="seg">${[['temp', 'Temporada'], ['car', 'Carreira']].map(([k, n]) => `<button class="${st.tab === k ? 'on' : ''}" data-a="stxTab" data-k="${k}">${n}</button>`).join('')}</div>`;
    let body = '';
    if (st.tab === 'temp') {
      let pool = Object.values(g.db.players).filter((p) => p.clubId);
      if (st.scope === 'club') pool = pool.filter((p) => p.clubId === g.user);
      if (st.scope === 'div') pool = pool.filter((p) => P.club(g, p.clubId).div === me.div);
      const list = (title, f, show, min) => {
        const top = pool.filter((p) => p.s.j >= (min || 1) && f(p) > 0).sort((a, b) => f(b) - f(a)).slice(0, 8);
        return `<div class="card"><div class="head"><span class="label">${title}</span></div>${top.length ? `<table class="tbl"><tbody>${top.map((p, i) => { const c = P.club(g, p.clubId); return `<tr class="click ${p.clubId === g.user ? 'me' : ''}" data-a="player" data-id="${p.id}"><td class="n">${i + 1}</td><td>${esc(p.name)} <span class="muted">${esc(c.short)}</span></td><td class="n"><b>${show(p)}</b></td></tr>`; }).join('')}</tbody></table>` : '<p class="empty">Sem dados ainda.</p>'}</div>`;
      };
      const rec = teamRecord(g, g.user);
      body = `<div class="filters" style="margin-bottom:12px"><div class="seg">${[['club', 'Meu clube'], ['div', 'Minha divisão'], ['all', 'Ultraliga']].map(([k, n]) => `<button class="${st.scope === k ? 'on' : ''}" data-a="stxScope" data-k="${k}">${n}</button>`).join('')}</div></div>
        <div class="kv" style="margin-bottom:16px"><div><span class="label">Jogos do seu time</span><b>${rec.j}</b></div><div><span class="label">Campanha</span><b>${rec.v}-${rec.e}-${rec.d}</b></div><div><span class="label">Gols pró</span><b>${rec.gp}</b></div><div><span class="label">Gols contra</span><b>${rec.gc}</b></div></div>
        <div class="grid2">
          ${list('Artilheiros (liga + copa)', (p) => p.s.g + p.s.cg, (p) => p.s.g + p.s.cg)}
          ${list('Garçons', (p) => p.s.as, (p) => p.s.as)}
          ${list('Melhor nota média (mín. 5 jogos)', avg, (p) => fmt(avg(p)), 5)}
          ${list('Mais jogos', (p) => p.s.j, (p) => p.s.j)}
          ${list('Mais cartões', (p) => p.s.ca + p.s.cv * 2, (p) => `${p.s.ca}A ${p.s.cv}V`)}
        </div>`;
    } else {
      const c = g.career || { pl: {}, mgr: { j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, seasons: 0 } };
      // soma a temporada em andamento para quem está no elenco
      const pl = {};
      for (const [id, x] of Object.entries(c.pl)) pl[id] = Object.assign({}, x);
      for (const p of P.squad(g, g.user)) {
        const x = pl[p.id] || (pl[p.id] = { name: p.name, pos: p.pos, j: 0, g: 0, as: 0, nt: 0, t: 0 });
        x.j += p.s.j; x.g += p.s.g + p.s.cg; x.as += p.s.as; x.nt += p.s.nt;
      }
      const arr = Object.entries(pl).map(([id, x]) => Object.assign({ id }, x));
      const rec = teamRecord(g, g.user), mg = c.mgr;
      const tot = { j: mg.j + rec.j, v: mg.v + rec.v, e: mg.e + rec.e, d: mg.d + rec.d, gp: mg.gp + rec.gp, gc: mg.gc + rec.gc };
      const titles = (g.hist || []).filter((h) => h.pos === 1).length, cups = (g.hist || []).filter((h) => h.cupMine).length, supers = (g.hist || []).filter((h) => h.scMine).length, ups = (g.hist || []).filter((h) => /Acesso|acesso/.test(h.result)).length;
      const list = (title, f, show) => {
        const top = arr.filter((x) => f(x) > 0).sort((a, b) => f(b) - f(a)).slice(0, 10);
        return `<div class="card"><div class="head"><span class="label">${title}</span></div>${top.length ? `<table class="tbl"><tbody>${top.map((x, i) => `<tr ${g.db.players[x.id] ? `class="click" data-a="player" data-id="${x.id}"` : ''}><td class="n">${i + 1}</td><td>${esc(x.name)} <span class="muted">${x.pos}</span></td><td class="n"><b>${show(x)}</b></td></tr>`).join('')}</tbody></table>` : '<p class="empty">Sem dados ainda.</p>'}</div>`;
      };
      body = `<div class="card" style="margin-bottom:16px"><div class="head"><span class="label">Técnico ${esc(g.manager)}</span></div>
          <div class="kv"><div><span class="label">Jogos</span><b>${tot.j}</b></div><div><span class="label">Vitórias</span><b>${tot.v}</b></div><div><span class="label">Empates</span><b>${tot.e}</b></div><div><span class="label">Derrotas</span><b>${tot.d}</b></div>
            <div><span class="label">Aproveitamento</span><b>${tot.j ? Math.round((tot.v * 3 + tot.e) / (tot.j * 3) * 100) : 0}%</b></div><div><span class="label">Gols</span><b>${tot.gp} × ${tot.gc}</b></div>
            <div><span class="label">Títulos da liga</span><b>${titles}</b></div><div><span class="label">Copas Ultra</span><b>${cups}</b></div><div><span class="label">Supercopas</span><b>${supers}</b></div><div><span class="label">Acessos</span><b>${ups}</b></div></div></div>
        <div class="grid2">
          ${list('Artilheiros pelo clube', (x) => x.g, (x) => x.g)}
          ${list('Garçons pelo clube', (x) => x.as, (x) => x.as)}
          ${list('Mais jogos pelo clube', (x) => x.j, (x) => x.j)}
          ${list('Melhor nota média (mín. 15 jogos)', (x) => (x.j >= 15 ? x.nt / x.j : 0), (x) => fmt(x.nt / x.j))}
        </div>`;
    }
    return `<div class="card" style="margin-bottom:0"><div class="head"><h2>Estatísticas</h2>${tabs}</div><p class="muted" style="margin:0;font-size:.85rem">${st.tab === 'temp' ? `Temporada ${g.season}.` : 'Números desde o início da sua carreira (no clube atual e nos anteriores).'}</p></div>${body}`;
  };

  P.maisExtra = () => `<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Clube e estrutura</h2></div>
      <p class="muted" style="margin:0">Estádio, preço do ingresso, base, centro de treinamento e centro do clube.</p><div><button class="btn primary" data-a="go" data-v="clube">Ver estrutura</button></div></div>
    <div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Estatísticas</h2></div>
      <p class="muted" style="margin:0">Artilheiros, garçons, notas e jogos da temporada e da carreira.</p><div><button class="btn primary" data-a="go" data-v="stats">Ver estatísticas</button></div></div>`;

  Object.assign(A.ACT, {
    stxTab(d) { A.st.stx.tab = d.k; A.render(); },
    stxScope(d) { A.st.stx.scope = d.k; A.render(); }
  });
})(window.PFC);
