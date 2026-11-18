/* Prancheta FC — capa estilo menu (PC e celular deitado)
 * Esquerda: menu em ordem (Continuar, Nova carreira, Carreiras salvas, Torneio, Preferências).
 * Direita: a "matéria" da última carreira, como página de jornal.
 * Em pé, a capa continua no formato de jornal empilhado.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const ago = (t) => { if (!t) return ''; const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`; };

  // Dados extras guardados com o save, para a matéria da capa
  P.frontExtra = function (g) {
    const c = P.club(g, g.user), tb = P.table(g, c.div), i = tb.findIndex((r) => r.cid === g.user), r = tb[i] || {};
    const sq = P.squad(g, g.user);
    const top = sq.slice().sort((a, b) => (b.s.g + b.s.cg) - (a.s.g + a.s.cg))[0];
    const star = sq.slice().sort((a, b) => P.ovr(b) - P.ovr(a))[0];
    const nx = !g.over && P.userMatch(g, g.cal[g.week]);
    const lm = P.lastUserMatch ? P.lastUserMatch(g) : null;
    let last = null;
    if (lm) { const m = lm.m, home = m.h === g.user; last = { op: P.club(g, home ? m.a : m.h).name, gf: home ? m.hg : m.ag, ga: home ? m.ag : m.hg }; }
    return {
      pos: r.j ? i + 1 : 0, pts: r.pts || 0, v: r.v || 0, e: r.e || 0, d: r.d || 0, sg: (r.gp || 0) - (r.gc || 0), n: tb.length,
      stad: c.stadium || '', city: c.city || '', bal: c.bal, conf: g.board ? g.board.conf : null, obj: P.expectation ? P.expectation(g, g.user) : '',
      top: top && (top.s.g + top.s.cg) ? { n: top.name, g: top.s.g + top.s.cg } : null, star: star ? { n: star.name, o: P.ovr(star), p: star.pos } : null,
      next: nx ? { op: P.club(g, nx.m.h === g.user ? nx.m.a : nx.m.h).name, home: nx.m.h === g.user, lbl: P.stepLabel(g.cal[g.week]) } : null, last,
      tx: (() => { const t = (g.tx || []).find((x) => x.s === g.season && (x.to === g.user || x.from === g.user)); return t ? { n: t.name, in: t.to === g.user, op: (P.club(g, t.to === g.user ? t.from : t.to) || {}).name || '', fee: t.fee, loan: t.kind === 'loan' } : null; })(),
      badgeL: P.badge(c, 140)
    };
  };

  P.frontMenu = function () {
    const meta = P.slotMeta ? P.slotMeta() : { s: {} };
    const ids = Object.keys(meta.s).map(Number);
    const last = meta.s[meta.active] ? meta.active : ids.sort((a, b) => (meta.s[b].at || 0) - (meta.s[a].at || 0))[0];
    const m = last ? meta.s[last] : null;
    const view = A.setup.fm || 'news';
    const item = (n, t, sub, act, extra, on) => `<button class="fm-item ${on ? 'on' : ''}" data-a="${act}" ${extra || ''}><span class="fm-n">${n}</span><span class="fm-t"><b>${t}</b><small>${sub}</small></span><span class="fm-go">›</span></button>`;
    const menu = `<nav class="fm-menu" aria-label="Menu">
      ${m ? item('1', 'Continuar', `${esc(m.club)} · temporada ${m.season}`, 'slotOpen', `data-n="${last}"`, false) : ''}
      ${item(m ? '2' : '1', 'Nova carreira', 'Técnico, diretoria e clube em 3 passos', 'ncOpen')}
      ${item(m ? '3' : '2', 'Carreiras salvas', `${ids.length} de 3 espaços em uso`, 'fmView', 'data-k="slots"', view === 'slots')}
      ${item(m ? '4' : '3', 'Modo torneio', 'Monte e simule de 3 a 64 times', 'tourOpen')}
      ${item(m ? '5' : '4', 'Preferências', 'Tema, tela, rádio e banco de dados', 'prefsOpen')}
    </nav>`;
    let right;
    if (view === 'slots') {
      right = `<div class="fm-slots"><div class="row" style="align-items:center"><h2 class="jr-h" style="flex:1;margin:0">Carreiras salvas</h2><button class="btn sm ghost" data-a="fmView" data-k="news">‹ Voltar</button></div>${(P.slotsCard && P.slotsCard()) || '<p class="empty">Nenhuma carreira salva ainda.</p>'}</div>`;
    } else if (m) {
      const x = m.x || {};
      const box = (k, v) => (v || v === 0 ? `<div><span>${k}</span><b>${v}</b></div>` : '');
      const body = [
        x.last ? `No último compromisso, o ${esc(m.club)} ${x.last.gf > x.last.ga ? 'venceu' : x.last.gf < x.last.ga ? 'perdeu para' : 'empatou com'} o ${esc(x.last.op)} por ${x.last.gf} a ${x.last.ga}.` : `A temporada ${m.season} ainda não teve bola rolando para o ${esc(m.club)}.`,
        x.pos ? `Na tabela da ${m.div}ª divisão, o time é o ${x.pos}º colocado entre ${x.n}, com ${x.pts} pontos (${x.v} ${x.v === 1 ? 'vitória' : 'vitórias'}, ${x.e} ${x.e === 1 ? 'empate' : 'empates'} e ${x.d} ${x.d === 1 ? 'derrota' : 'derrotas'}) e saldo de ${x.sg > 0 ? '+' : ''}${x.sg}.` : '',
        x.obj ? `A diretoria espera ${esc(x.obj.toLowerCase())}${x.conf != null ? ` e, por ora, dá nota ${x.conf} de 100 à confiança no técnico ${esc(m.mgr)}` : ''}.` : '',
        x.top ? `${esc(x.top.n)} é o artilheiro do elenco, com ${x.top.g} ${x.top.g === 1 ? 'gol' : 'gols'}.` : x.star ? `${esc(x.star.n)} (${x.star.p}, força ${x.star.o}) é a principal referência do elenco.` : '',
        x.tx ? (x.tx.in ? `No mercado, o clube trouxe ${esc(x.tx.n)}${x.tx.op ? ` do ${esc(x.tx.op)}` : ''}${x.tx.loan ? ' por empréstimo' : x.tx.fee ? ` por ${P.money(x.tx.fee)}` : ''}.` : `No mercado, ${esc(x.tx.n)} deixou o clube rumo ao ${esc(x.tx.op)}${x.tx.loan ? ' por empréstimo' : x.tx.fee ? ` por ${P.money(x.tx.fee)}` : ''}.`) : '',
        x.next ? `O próximo desafio é ${x.next.home ? 'em casa, contra' : 'fora, diante d'}o ${esc(x.next.op)}, pela ${esc(x.next.lbl)}${x.next.home && x.stad ? `, no ${esc(x.stad)}` : ''}.` : ''
      ].filter(Boolean).join(' ');
      right = `<article class="fm-news fm-big">
        <div class="fm-kick">${m.div}ª divisão · Temporada ${m.season}${m.over ? ' · fim de temporada' : ''} · Espaço ${last}</div>
        <h2 class="fm-head">${esc(m.head || `${m.club}, de ${m.mgr}`)}</h2>
        <p class="fm-sub">${esc(m.dek || `${m.club} sob o comando de ${m.mgr}.`)}</p>
        <div class="fm-by">Por ${esc(m.mgr)} · última edição ${ago(m.at)}</div>
        <div class="fm-grid">
          <figure class="fm-photo">${x.badgeL || m.badge || ''}<figcaption>${esc(m.club)}${x.stad ? ' · ' + esc(x.stad) : ''}</figcaption></figure>
          <div class="fm-text"><p class="fm-dek">${body}</p></div>
          ${x.pos || x.next ? `<aside class="fm-box"><h4>Em números</h4>${box('Posição', x.pos ? x.pos + 'º' : '')}${box('Pontos', x.pos ? x.pts : '')}${box('Campanha', x.pos ? `${x.v}-${x.e}-${x.d}` : '')}${box('Saldo', x.pos ? (x.sg > 0 ? '+' : '') + x.sg : '')}${x.bal != null ? box('Caixa', P.money(x.bal)) : ''}${x.next ? `<div class="fm-next"><span>Próximo jogo</span><b>${x.next.home ? 'vs.' : '@'} ${esc(x.next.op)}</b></div>` : ''}</aside>` : ''}
        </div>
        <div class="row fm-act"><button class="btn primary" data-a="slotOpen" data-n="${last}">Continuar a leitura →</button></div>
      </article>`;
    } else {
      right = `<article class="fm-news"><div class="fm-kick">Classificados</div><h2 class="fm-head">Procura-se técnico</h2>
        <p class="fm-dek">Clube da Ultraliga contrata. 160 clubes, 17 países, 8 divisões. Paga-se em glória. Três passos: o técnico, a diretoria e o clube.</p>
        <div class="row fm-act"><button class="btn primary" data-a="ncOpen">Começar nova carreira →</button></div></article>`;
    }
    return `<div class="fm">${menu}<div class="fm-right">${right}</div></div>`;
  };
  A.ACT.fmView = (d) => { A.setup.fm = d.k; A.render(); };
})(window.PFC);
