/* Prancheta FC — celular em pé ou deitado
 * Em pé: layout de celular. Deitado: o jogo vira a tela e usa o layout do PC (menu lateral, painéis
 * lado a lado), com a página "afastada" para caber. Escolha na capa e em Mais › Índice.
 * Travar a rotação precisa de tela cheia no navegador (ou do app instalado); no iPhone o navegador
 * não deixa travar, então basta virar o aparelho.
 */
(function (P) {
  const A = P.app;
  const KEY = 'prancheta-fc:orient';
  const DEF_VP = 'width=device-width, initial-scale=1, viewport-fit=cover';
  const LAND_W = 1000; // largura "de PC" usada quando o celular está deitado
  let pref = P.store.get(KEY) || 'auto';

  const isPhone = () => {
    try { return matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 600; } catch (e) { return false; }
  };
  const landscape = () => { try { return matchMedia('(orientation: landscape)').matches; } catch (e) { return innerWidth > innerHeight; } };

  function applyViewport() {
    const meta = document.querySelector('meta[name=viewport]'); if (!meta) return;
    const land = isPhone() && landscape();
    const want = land ? `width=${LAND_W}, viewport-fit=cover` : DEF_VP;
    if (meta.getAttribute('content') !== want) meta.setAttribute('content', want);
    document.documentElement.classList.toggle('phone-land', land);
    document.documentElement.classList.toggle('is-phone', isPhone());
  }
  addEventListener('resize', applyViewport);
  addEventListener('orientationchange', () => setTimeout(applyViewport, 60));
  try { screen.orientation.addEventListener('change', () => setTimeout(applyViewport, 60)); } catch (e) { /* navegador antigo */ }
  applyViewport();

  // Travar a rotação: no navegador só funciona em tela cheia e logo depois de um toque
  async function lock(kind) {
    const so = screen.orientation;
    if (!so || !so.lock) return false;
    try {
      const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
      if (!standalone && !document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      await so.lock(kind);
      return true;
    } catch (e) { return false; }
  }
  P.setOrient = async function (k) {
    pref = k; P.store.set(KEY, k);
    if (k === 'land') {
      if (!(await lock('landscape'))) A.toast('Vire o celular de lado: o jogo muda para o layout de PC.');
    } else if (k === 'port') {
      if (!(await lock('portrait'))) A.toast('Vire o celular em pé.');
    }
    setTimeout(() => { applyViewport(); A.render(); }, 250);
  };
  // escolha salva: no primeiro toque, tenta travar de novo (o navegador esquece ao recarregar)
  let tried = false;
  document.addEventListener('pointerdown', () => {
    if (tried || pref === 'auto' || !isPhone()) return; tried = true;
    const want = pref === 'land' ? 'landscape' : 'portrait';
    const ok = pref === 'land' ? landscape() : !landscape();
    if (!ok || !document.fullscreenElement) lock(want);
  }, true);

  const phoneSvg = (land) => land
    ? '<svg viewBox="0 0 64 40" aria-hidden="true"><rect x="2" y="4" width="60" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="3"/><rect x="10" y="9" width="44" height="22" fill="currentColor" opacity=".18"/><circle cx="57" cy="20" r="1.8" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 40 64" aria-hidden="true"><rect x="4" y="2" width="32" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="3"/><rect x="9" y="10" width="22" height="44" fill="currentColor" opacity=".18"/><circle cx="20" cy="57" r="1.8" fill="currentColor"/></svg>';
  P.orientPicker = function () {
    if (!isPhone()) return '';
    const cur = pref === 'auto' ? (landscape() ? 'land' : 'port') : pref;
    return `<section class="or-pick" aria-label="Como jogar no celular"><span class="label">Tela do celular</span>
      <div class="or-opts">
        <button class="${cur === 'port' ? 'on' : ''}" data-a="orSet" data-k="port">${phoneSvg(false)}<b>Em pé</b><small>Layout de celular</small></button>
        <button class="${cur === 'land' ? 'on' : ''}" data-a="orSet" data-k="land">${phoneSvg(true)}<b>Deitado</b><small>Layout de PC</small></button>
      </div></section>`;
  };
  A.ACT.orSet = (d) => P.setOrient(d.k);
})(window.PFC);
