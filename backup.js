/* Prancheta FC — backup da carreira em arquivo
 * - Ao começar uma nova temporada, baixa sozinho um arquivo .json com a carreira (dá para desligar)
 * - Botão "Baixar backup" no resumo da temporada e em Mais
 * - Mostra quando foi o último backup e avisa se ficou muito tempo sem
 * Para restaurar: Mais › Restaurar backup e escolha o arquivo.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const bk = (g) => (g.bk = g.bk || { auto: true, last: 0, season: 0 });
  const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

  P.backupName = (g) => {
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    return `prancheta-${slug(P.club(g, g.user).name)}-${g.season}${g.over ? '-fim' : ''}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
  };

  // Baixa o arquivo. Precisa vir de um toque/clique para funcionar em todo navegador.
  A.downloadBackup = function (quiet) {
    const g = A.g; if (!g) return false;
    const b = bk(g);
    const prev = { last: b.last, season: b.season };
    b.last = Date.now(); b.season = g.season;
    try {
      const blob = new Blob([JSON.stringify(g)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = P.backupName(g);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      Object.assign(b, prev);
      A.toast('Não deu para baixar o arquivo aqui. Use Mais › Exportar carreira e copie o texto.');
      return false;
    }
    A.save();
    if (!quiet) A.toast('Backup baixado. Se nada aparecer, use Exportar carreira.');
    return true;
  };

  function lastText(g) {
    const b = bk(g);
    if (!b.last) return 'Nenhum backup feito ainda.';
    const d = new Date(b.last);
    const days = Math.floor((Date.now() - b.last) / 864e5);
    const when = days === 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`;
    return `Último backup: ${d.toLocaleDateString('pt-BR')} (${when}), temporada ${b.season}.`;
  }
  // Temporadas desde o último backup (conta a atual se ela já terminou)
  const behind = (g) => { const b = bk(g); return b.season ? g.season - b.season + (g.over && b.season === g.season && b.last < (g.overAt || 0) ? 1 : 0) : g.hist.length; };

  function card(g, compact) {
    const b = bk(g), late = behind(g) >= 2;
    return `<div class="card" style="display:flex;flex-direction:column;gap:12px${compact ? ';margin-top:14px' : ''}"><div class="head" style="margin:0"><h2>Backup</h2>${late ? '<span class="chip inj">Desatualizado</span>' : ''}</div>
      <p class="muted" style="margin:0">${esc(lastText(g))} O arquivo guarda a carreira inteira; se o navegador apagar os dados, é só restaurar.</p>
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" data-c="bkAuto" ${b.auto !== false ? 'checked' : ''}> <span>Baixar backup sozinho ao começar cada temporada</span></label>
      <div class="row"><button class="btn primary" data-a="bkNow">Baixar backup</button>${compact ? '' : '<label class="btn" style="cursor:pointer">Restaurar backup<input type="file" accept=".json,.txt,application/json" data-c="bkFile" hidden></label>'}</div>
    </div>`;
  }

  // Resumo de fim de temporada
  const origSeasonExtra = P.seasonExtra;
  P.seasonExtra = (g) => (origSeasonExtra ? origSeasonExtra(g) : '') + card(g, true);

  // Mais
  const origMais = P.maisExtra;
  P.maisExtra = () => card(A.g, false) + (origMais ? origMais() : '');

  // Marca quando a temporada terminou (para saber se o backup é anterior ao fim)
  const origEndWeek = P.endWeek;
  P.endWeek = function (g, ctx) {
    const wasOver = g.over, r = origEndWeek.apply(this, arguments);
    if (!wasOver && g.over) g.overAt = Date.now();
    return r;
  };

  // Nova temporada: baixa o backup da que acabou antes de virar
  const origNew = A.ACT.newSeason;
  A.ACT.newSeason = function (d) {
    const g = A.g, b = g && bk(g);
    let done = false;
    if (g && g.over && b.auto !== false && !(b.season === g.season && b.last >= (g.overAt || 0))) done = A.downloadBackup(true);
    origNew.call(this, d);
    if (done) A.toast(`Temporada ${A.g.season} começou. Backup da temporada ${A.g.season - 1} baixado.`);
  };

  // Ao abrir uma carreira: lembrete se o backup está velho
  (A.onLoad = A.onLoad || []).push((g) => {
    if (g.hist.length && behind(g) >= 2) setTimeout(() => A.toast(`Faz ${behind(g)} temporadas sem backup. Baixe em Mais › Backup.`), 600);
  });

  A.ACT.bkNow = () => { A.downloadBackup(); A.render(); };
  // Restaurar: lê o arquivo e substitui a carreira atual
  A.CHG.bkFile = (el) => {
    const f = el.files && el.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const g = JSON.parse(rd.result);
        if (!g || !g.db || !g.cal || !g.tac || !g.user) throw new Error('este arquivo não é uma carreira da Ultraliga.');
        g.db = P.normalizeDb(g.db);
        P.ensureEconomy(g);
        A.g = g; A.st.io = ''; A.save(); A.view = 'inicio'; A.render(); window.scrollTo(0, 0);
        A.toast(`Backup restaurado: ${P.club(g, g.user).name}, temporada ${g.season}`);
      } catch (e) { A.toast('Não deu para restaurar: ' + e.message); }
    };
    rd.readAsText(f);
  };
  A.CHG.bkAuto = (el) => { bk(A.g).auto = el.checked; A.save(); };
})(window.PFC);
