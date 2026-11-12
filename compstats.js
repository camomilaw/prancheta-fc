/* Prancheta FC — estatísticas por competição
 * Cada jogador guarda em p.cs os números da temporada separados por competição:
 * lg (Ultraliga), cup (Copa Ultra), po (playoffs), sc (Supercopa).
 * As telas ficam dentro da aba de cada competição na Tabela.
 */
(function (P) {
  const blank = () => ({ j: 0, g: 0, as: 0, nt: 0, ca: 0, cv: 0 });
  const cs = (p, comp) => { p.cs = p.cs || {}; return p.cs[comp] || (p.cs[comp] = blank()); };

  // Chamado pelo motor para cada partida disputada
  P.compStats = function (g, it, r) {
    const comp = it.comp;
    [0, 1].forEach((side) => {
      for (const id of r.played[side]) {
        const p = g.db.players[id]; if (!p) continue;
        const x = cs(p, comp);
        x.j++; x.nt = Math.round((x.nt + (r.notes[id] || 6)) * 10) / 10;
      }
      for (const [id, n] of Object.entries(r.yel[side])) {
        const p = g.db.players[id]; if (!p) continue;
        if (n >= 2) cs(p, comp).cv++; else cs(p, comp).ca++;
      }
    });
    for (const e of r.ev) {
      if (e.t === 'gol') {
        if (g.db.players[e.p]) cs(g.db.players[e.p], comp).g++;
        if (e.as && g.db.players[e.as]) cs(g.db.players[e.as], comp).as++;
      }
      if (e.t === 'vermelho' && !e.two && g.db.players[e.p]) cs(g.db.players[e.p], comp).cv++;
    }
  };

  // Saves antigos: a contagem começa na semana em que a versão nova foi aberta
  P.ensureCompStats = function (g) {
    if (g.csFrom) return;
    g.csFrom = { s: g.season, w: g.week && !g.over ? g.week : 0 };
  };

  const CATS = [
    ['g', 'Gols', (x) => x.g, (x) => x.g, 'G'],
    ['as', 'Assistências', (x) => x.as, (x) => x.as, 'A'],
    ['nt', 'Nota média', (x) => x.nt / x.j, (x) => (x.nt / x.j).toFixed(2).replace('.', ','), 'Nota'],
    ['j', 'Jogos', (x) => x.j, (x) => x.j, 'J'],
    ['ca', 'Cartões', (x) => x.ca + x.cv * 2, (x) => `${x.ca}A ${x.cv}V`, 'Cart.']
  ];

  // Tabela de líderes de uma competição. filter(p) limita os jogadores (ex.: uma divisão).
  P.compStatsView = function (g, comp, filter, opts) {
    const A = P.app, esc = P.esc;
    opts = opts || {};
    const st = A.st.cst || (A.st.cst = { k: 'g' });
    const cat = CATS.find((c) => c[0] === st.k) || CATS[0];
    const minJ = cat[0] === 'nt' ? (opts.minNote || 1) : 1;
    const rows = [];
    for (const p of Object.values(g.db.players)) {
      const x = p.cs && p.cs[comp];
      if (!x || x.j < minJ || (filter && !filter(p))) continue;
      const v = cat[2](x);
      if (v > 0) rows.push({ p, x, v });
    }
    rows.sort((a, b) => b.v - a.v || b.x.j - a.x.j);
    const top = rows.slice(0, opts.n || 20);
    const partial = g.csFrom && g.csFrom.s === g.season && g.csFrom.w > 0;
    const seg = `<div class="seg tabs-x" style="margin-bottom:10px">${CATS.map((c) => `<button class="${c === cat ? 'on' : ''}" data-a="cstK" data-k="${c[0]}">${c[1]}</button>`).join('')}</div>`;
    const table = top.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">#</th><th>Jogador</th><th>Clube</th><th class="n">${cat[4]}</th>${cat[0] === 'j' ? '' : '<th class="n">J</th>'}</tr></thead><tbody>
      ${top.map((r, i) => { const c = P.club(g, r.p.clubId); return `<tr class="click ${r.p.clubId === g.user ? 'me' : ''}" data-a="player" data-id="${r.p.id}"><td class="n">${i + 1}</td><td>${esc(r.p.name)} <span class="muted">${r.p.pos}</span></td><td><span class="club">${P.badge(c, 18)}${c ? esc(c.short) : '-'}</span></td><td class="n"><b>${cat[3](r.x)}</b></td>${cat[0] === 'j' ? '' : `<td class="n">${r.x.j}</td>`}</tr>`; }).join('')}
      </tbody></table></div>` : `<p class="empty">${opts.empty || 'Sem dados ainda.'}</p>`;
    const notes = [];
    if (cat[0] === 'nt' && minJ > 1) notes.push(`Mínimo de ${minJ} jogos.`);
    if (cat[0] === 'ca') notes.push('Ordenado por pontos: amarelo vale 1, vermelho vale 2.');
    if (partial) notes.push(`Contagem por competição a partir da semana ${g.csFrom.w + 1} desta temporada.`);
    return `${opts.title ? `<div class="label" style="margin:16px 0 8px">${opts.title}</div>` : ''}${seg}${table}${notes.length ? `<p class="muted" style="font-size:.8rem;margin:8px 0 0">${notes.join(' ')}</p>` : ''}`;
  };

  if (P.app && P.app.ACT) P.app.ACT.cstK = function (d) { P.app.st.cst = { k: d.k }; P.app.render(); };
})(window.PFC);
