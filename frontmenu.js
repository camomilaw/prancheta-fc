/* Prancheta FC — capa estilo menu (PC e celular deitado)
 * Esquerda: menu em ordem (Continuar, Nova carreira, Carreiras salvas, Torneio, Preferências).
 * Direita: a "matéria" da última carreira, como página de jornal.
 * Em pé, a capa continua no formato de jornal empilhado.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const ago = (t) => { if (!t) return ''; const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`; };

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
      right = `<article class="fm-news">
        <div class="fm-kick">${m.div}ª divisão · Temporada ${m.season}${m.over ? ' · fim de temporada' : ''} · Espaço ${last}</div>
        <h2 class="fm-head">${esc(m.head || `${m.club}, de ${m.mgr}`)}</h2>
        <div class="fm-by">Por ${esc(m.mgr)} · última edição ${ago(m.at)}</div>
        <div class="fm-body"><div class="fm-crest">${m.badge || ''}</div><p class="fm-dek">${esc(m.dek || `${m.club} sob o comando de ${m.mgr}.`)}</p></div>
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
