/* Prancheta FC — tela de título
 * Depois do jogo que garante uma taça (última rodada da liga, finais das copas),
 * aparece uma tela de comemoração com a taça, o escudo, o técnico e o artilheiro.
 */
(function (P) {
  const A = P.app, esc = P.esc;

  // Chamado pelo motor no fim de cada semana: registra os títulos do seu time
  P.titleCheck = function (g, step) {
    const me = P.club(g, g.user); if (!me) return;
    const won = [];
    if (step.t === 'lg' && g.lg[me.div] && step.r === g.lg[me.div].length - 1) {
      const tb = P.table(g, me.div);
      if (tb[0] && tb[0].cid === g.user) won.push({ comp: 'lg', n: me.div === 1 ? 'Ultraliga' : `${me.div}ª divisão da Ultraliga`, big: me.div === 1 });
    }
    if (step.t === 'cup' && step.r === P.CUP_NAMES.length - 1 && g.cup.winner === g.user) won.push({ comp: 'cup', n: 'Copa Ultra', big: true });
    if (step.t === 'sc' && P.SC_NAMES && step.r === P.SC_NAMES.length - 1 && g.scup && g.scup.cur && g.scup.cur.w === g.user) won.push({ comp: 'sc', n: 'Supercopa Ultra', big: true });
    if (step.t === 'rz' && P.RZ_NAMES && step.r === P.RZ_NAMES.length - 1 && P.tierOf) {
      const t = P.tierOf(g), z = t && g.tz && g.tz[t.k];
      if (z && z.w === g.user) won.push({ comp: t.k, n: t.n });
    }
    if (!won.length) return;
    const sq = P.squad(g, g.user);
    for (const w of won) {
      const goals = (p) => (p.cs && p.cs[w.comp] ? p.cs[w.comp].g : w.comp === 'lg' ? p.s.g : 0);
      const top = sq.filter((p) => goals(p) > 0).sort((a, b) => goals(b) - goals(a))[0];
      (g.celebrate = g.celebrate || []).push({ n: w.n, big: !!w.big, s: g.season, cid: g.user, mgr: g.manager, top: top ? { name: top.name, g: goals(top), pos: top.pos } : null });
    }
  };

  // Taça desenhada (SVG), dourada
  const cup = `<svg class="cele-cup" viewBox="0 0 120 140" aria-hidden="true">
    <defs><linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#b8860b"/><stop offset=".45" stop-color="#ffd95a"/><stop offset=".6" stop-color="#fff2b0"/><stop offset="1" stop-color="#c9971c"/></linearGradient></defs>
    <path d="M30 10h60v28c0 22-13 38-30 38S30 60 30 38z" fill="url(#gold)"/>
    <path d="M30 18H14c0 18 8 28 20 30M90 18h16c0 18-8 28-20 30" fill="none" stroke="url(#gold)" stroke-width="7" stroke-linecap="round"/>
    <rect x="53" y="74" width="14" height="22" fill="url(#gold)"/>
    <path d="M38 96h44l6 16H32z" fill="url(#gold)"/>
    <rect x="28" y="112" width="64" height="16" rx="3" fill="#5a3d0c"/>
    <path d="M60 24l4 9 10 1-7.5 7 2 10-8.5-5-8.5 5 2-10-7.5-7 10-1z" fill="#fff8d6" opacity=".9"/>
  </svg>`;

  P.showCelebration = function (g) {
    if (!g || !g.celebrate || !g.celebrate.length) return;
    const md = document.getElementById('md');
    if (A.live || A.md || (md && !md.hidden)) return; // espera a partida fechar
    const c = g.celebrate[0], club = P.club(g, c.cid);
    let el = document.getElementById('cele');
    if (!el) { el = document.createElement('div'); el.id = 'cele'; document.body.appendChild(el); }
    const conf = Array.from({ length: 36 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 9) * 0.25}s;background:${[club.colors[0], club.colors[1], '#ffd95a', '#ffffff'][i % 4]}"></i>`).join('');
    el.innerHTML = `<div class="cele ${c.big ? 'big' : ''}" role="dialog" aria-modal="true" aria-label="Título conquistado" style="--c1:${esc(club.colors[0])}">
      <div class="cele-conf" aria-hidden="true">${conf}</div>
      <div class="cele-in">
        <div class="cele-kicker">Campeão ${c.s}</div>
        ${cup}
        <h2 class="cele-comp">${esc(c.n)}</h2>
        <div class="cele-club">${P.badge(club, 72)}<b>${esc(club.name)}</b></div>
        <div class="cele-facts">
          <div><span class="label">Técnico</span><b>${esc(c.mgr)}</b></div>
          <div><span class="label">Artilheiro</span><b>${c.top ? `${esc(c.top.name)} <small>${c.top.g} ${c.top.g === 1 ? 'gol' : 'gols'}</small>` : '—'}</b></div>
        </div>
        <button class="btn primary cele-btn" data-a="celeClose">${g.celebrate.length > 1 ? 'Próximo título' : 'Comemorar!'}</button>
      </div></div>`;
    el.hidden = false;
  };

  if (A && A.ACT) A.ACT.celeClose = function () {
    const g = A.g; if (g && g.celebrate) g.celebrate.shift();
    const el = document.getElementById('cele');
    if (g && g.celebrate && g.celebrate.length) { A.save(); P.showCelebration(g); return; }
    if (g) delete g.celebrate;
    if (el) { el.hidden = true; el.innerHTML = ''; }
    A.save();
  };
})(window.PFC);
