/* Prancheta FC — estatísticas do jogador por temporada
 * Bloco "Temporada" da ficha (qualquer jogador: seu elenco, outros clubes, mercado), com as últimas
 * temporadas guardadas em p.hs, e os números "por jogo" usados no gráfico da comparação.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const fmt1 = (v) => String(Math.round(v * 100) / 100).replace('.', ',');

  // Temporada atual (p.s) ou guardada (p.hs) no mesmo formato
  P.seasonRec = function (p, y) {
    const g = A.g;
    if (!y || (g && y === g.season)) {
      const s = p.s || {};
      return { y: g ? g.season : 0, c: p.clubId, j: s.j || 0, g: (s.g || 0) + (s.cg || 0), cg: s.cg || 0, as: s.as || 0, nt: s.nt || 0, sh: s.sh || 0, sot: s.sot || 0, kp: s.kp || 0, tk: s.tk || 0, sv: s.sv || 0, ca: s.ca || 0, cv: s.cv || 0 };
    }
    const h = (p.hs || []).find((x) => x[0] === y); if (!h) return null;
    return { y: h[0], c: h[1], j: h[2], g: h[3], cg: 0, as: h[4], nt: h[5] / 10, sh: h[6], sot: h[7], kp: h[8], tk: h[9], sv: h[10], ca: h[11], cv: h[12] };
  };

  P.seasonBlock = function (p) {
    const g = A.g; if (!g) return '';
    const sel = (A.st.psY && A.st.psY[p.id]) || g.season;
    const years = [g.season].concat((p.hs || []).map((x) => x[0]));
    const r = P.seasonRec(p, sel) || P.seasonRec(p, g.season);
    const pj = (v) => (r.j ? `<small>${fmt1(v / r.j)}/j</small>` : '');
    const kv = (k, v, cls) => `<div class="${cls || ''}"><span class="label">${k}</span><b>${v}</b></div>`;
    const gk = p.pos === 'GOL';
    const clubTxt = r.c && r.c !== p.clubId && P.club(g, r.c) ? ` <small class="muted">pelo ${esc(P.club(g, r.c).short)}</small>` : '';
    return `<div class="ps-b ps-season"><div class="ps-season-h"><h4 class="label">Temporada${clubTxt}</h4>
        ${years.length > 1 ? `<div class="ps-years">${years.map((y) => `<button class="${y === r.y ? 'on' : ''}" data-a="psSeason" data-id="${p.id}" data-y="${y}">${y}</button>`).join('')}</div>` : ''}</div>
      <div class="kv ps-kv">
        ${kv('Jogos', r.j)}
        ${kv('Gols', `${r.g} ${pj(r.g)}`)}
        ${kv('Assist.', `${r.as} ${pj(r.as)}`)}
        ${kv('Passes decisivos', `${r.kp} ${pj(r.kp)}`)}
        ${gk ? kv('Defesas', `${r.sv} ${pj(r.sv)}`) : kv('Finalizações', `${r.sh} <small>${r.sot} no alvo</small>`)}
        ${kv('Desarmes', `${r.tk} ${pj(r.tk)}`)}
        ${kv('Nota média', r.j ? fmt1(r.nt / r.j) : '–')}
        ${kv('Cartões', `${r.ca}<small> A</small> ${r.cv}<small> V</small>`)}
      </div></div>`;
  };
  A.ACT.psSeason = function (d) { A.st.psY = A.st.psY || {}; A.st.psY[d.id] = Number(d.y); A.playerSheet(d.id); };

  // Números por jogo e percentil contra a liga (para o radar da comparação)
  const METRICS = [['g', 'Gols'], ['as', 'Assist.'], ['kp', 'Passes'], ['sh', 'Chutes'], ['tk', 'Desarmes'], ['nt', 'Nota']];
  let cache = null;
  function pools() {
    const g = A.g, key = g.season * 1000 + g.week;
    if (cache && cache.key === key) return cache;
    const pl = Object.values(g.db.players).filter((p) => p.clubId && p.s && p.s.j >= 3);
    const out = { key };
    for (const [k] of METRICS.concat([['sv']])) {
      out[k] = pl.filter((p) => (k === 'sv' ? p.pos === 'GOL' : p.pos !== 'GOL' || k === 'nt')).map((p) => per(P.seasonRec(p), k)).sort((a, b) => a - b);
    }
    return (cache = out);
  }
  function per(r, k) { return r && r.j ? (k === 'nt' ? r.nt / r.j : r[k] / r.j) : 0; }
  function pct(arr, v) { if (!arr.length) return 0; let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo / arr.length; }
  P.perfAxes = function (p, withGk) {
    const r = P.seasonRec(p), pl = pools();
    const ax = METRICS.map(([k, n]) => [n, pct(pl[k], per(r, k)), per(r, k)]);
    if (withGk) ax.push(['Defesas', p.pos === 'GOL' ? pct(pl.sv, per(r, 'sv')) : 0, per(r, 'sv')]);
    return { ok: r && r.j >= 3, j: r ? r.j : 0, ax };
  };
})(window.PFC);
