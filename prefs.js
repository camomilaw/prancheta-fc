/* Prancheta FC — Preferências (fora da carreira): tema, tela do celular, rádio e banco de dados.
 * Abre pela capa (botão "Preferências") e fica também em Mais › Preferências dentro do jogo.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const KEY = 'prancheta-fc:theme';
  const applyTheme = (t) => { if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); };
  let theme = P.store.get(KEY) || 'auto';
  applyTheme(theme);

  P.prefsBody = function (inGame) {
    const seg = (cur, list, act) => `<div class="seg">${list.map(([k, n]) => `<button class="${cur === k ? 'on' : ''}" data-a="${act}" data-k="${k}">${n}</button>`).join('')}</div>`;
    return `<div class="prefs">
      <section><h3 class="pf-h">Aparência</h3><div class="pf-row"><span class="label">Tema</span>${seg(theme, [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']], 'pfTheme')}</div>
        <p class="pf-note">Automático segue o tema do celular ou do computador.</p>
        ${P.orientPicker ? P.orientPicker() : ''}</section>
      <section><h3 class="pf-h">Rádio Prancheta</h3>${P.radioCard ? P.radioCard() : ''}</section>
      ${inGame ? '' : `<section><h3 class="pf-h">Banco de dados</h3>
        <p class="pf-note">Mude clubes e jogadores antes de começar, ou importe um arquivo (time, patch como o de clubes reais, banco ou carreira).</p>
        <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-a="pfEdit">Editar o banco de dados</button><button class="btn" data-a="pfImport">Importar arquivo</button></div></section>`}
    </div>`;
  };
  A.prefsSheet = function () {
    A.openSheet(`<div class="bar-top"><h2>Preferências</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>${P.prefsBody(false)}`);
  };
  const reopen = () => { if (document.querySelector('.sheet .prefs') && !A.g) A.prefsSheet(); else A.render(); };
  Object.assign(A.ACT, {
    prefsOpen() { A.prefsSheet(); },
    pfTheme(d) { theme = d.k; P.store.set(KEY, theme); applyTheme(theme); reopen(); },
    pfEdit() { A.closeSheet(); A.ACT.setupEdit && A.ACT.setupEdit({}); },
    pfImport() { A.closeSheet(); A.setup.importing = true; A.render(); setTimeout(() => { const el = document.querySelector('.jr-classif'); if (el) el.scrollIntoView({ block: 'start' }); }, 50); }
  });
  // ações da rádio e da tela redesenham a folha de preferências se ela estiver aberta na capa
  ['rdOnOff', 'rdLive', 'orSet'].forEach((k) => { const o = A.ACT[k]; if (!o) return; A.ACT[k] = function () { const r = o.apply(this, arguments); setTimeout(() => { if (!A.g && document.querySelector('.sheet .prefs')) A.prefsSheet(); }, 300); return r; }; });
})(window.PFC);
