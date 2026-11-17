/* Prancheta FC — Rádio Prancheta
 * Toca música de fundo enquanto você joga, sem parar ao trocar de tela.
 * Duas fontes:
 *  - Spotify: a playlist oficial da rádio, pelo player oficial do Spotify (música inteira para quem
 *    está logado no Spotify naquele navegador; sem login, trechos de 30 s). Nenhum arquivo fica no jogo.
 *  - Minhas músicas: arquivos de áudio escolhidos no aparelho. Ficam guardados só neste navegador
 *    (IndexedDB) e nunca saem dele.
 * Navegadores só deixam tocar som depois do primeiro toque: a rádio começa no primeiro toque na tela.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const PLAYLIST = 'spotify:playlist:68BRHxxdgk7ybC3vGedOXH';
  const PLAYLIST_URL = 'https://open.spotify.com/playlist/68BRHxxdgk7ybC3vGedOXH';
  const LOGO = 'data:image/jpeg;base64,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';
  const KEY = 'prancheta-fc:radio';

  // ---------- Preferências ----------
  const R = Object.assign({ on: true, src: 'sp', live: 'cont', vol: 0.7, shuffle: true }, (() => { try { return JSON.parse(P.store.get(KEY)) || {}; } catch (e) { return {}; } })());
  const saveR = () => P.store.set(KEY, JSON.stringify({ on: R.on, src: R.src, live: R.live, vol: R.vol, shuffle: R.shuffle }));
  const S = { open: false, started: false, userPaused: false, matchPaused: false, sp: null, spState: 'off', spPlaying: false, spTitle: '', tracks: [], order: [], idx: 0, audio: null, url: null };
  P.radioState = () => ({ R, S });

  // ---------- Minhas músicas (IndexedDB) ----------
  let dbp = null;
  const idb = () => dbp || (dbp = new Promise((res, rej) => {
    try {
      const rq = indexedDB.open('prancheta-radio', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('tracks', { keyPath: 'id' });
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    } catch (e) { rej(e); }
  }));
  const tx = (mode, fn) => idb().then((db) => new Promise((res, rej) => {
    const t = db.transaction('tracks', mode), st = t.objectStore('tracks'); const rq = fn(st);
    t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  }));
  function loadTracks() {
    return tx('readonly', (st) => st.getAll()).then((list) => {
      S.tracks = (list || []).map((t) => ({ id: t.id, name: t.name })).sort((a, b) => a.name.localeCompare(b.name));
      reorder(); draw();
    }).catch(() => { S.tracks = []; draw(); });
  }
  function reorder() {
    S.order = S.tracks.map((_, i) => i);
    if (R.shuffle) for (let i = S.order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [S.order[i], S.order[j]] = [S.order[j], S.order[i]]; }
    S.idx = 0;
  }
  const curTrack = () => S.tracks[S.order[S.idx]];

  function audio() {
    if (S.audio) return S.audio;
    const a = S.audio = new Audio();
    a.preload = 'auto';
    a.addEventListener('ended', () => next());
    a.addEventListener('play', draw); a.addEventListener('pause', draw);
    a.addEventListener('error', () => { if (S.tracks.length > 1) next(); });
    return a;
  }
  const mineVol = () => R.vol * (S.matchDuck ? 0.35 : 1);
  function playMine(restart) {
    const t = curTrack(); if (!t) { draw(); return; }
    const a = audio(); a.volume = mineVol();
    if (!restart && a.src && S.curId === t.id) { a.play().catch(() => {}); return; }
    tx('readonly', (st) => st.get(t.id)).then((rec) => {
      if (!rec) return;
      if (S.url) URL.revokeObjectURL(S.url);
      S.url = URL.createObjectURL(rec.blob); S.curId = t.id;
      a.src = S.url; a.volume = mineVol();
      a.play().catch(() => {});
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({ title: t.name, artist: 'Rádio Prancheta', artwork: [{ src: LOGO, sizes: '192x192', type: 'image/jpeg' }] });
          navigator.mediaSession.setActionHandler('nexttrack', () => next());
          navigator.mediaSession.setActionHandler('previoustrack', () => prev());
        } catch (e) { /* ignora */ }
      }
      draw();
    });
  }
  function next() { if (!S.tracks.length) return; S.idx = (S.idx + 1) % S.order.length; if (S.idx === 0 && R.shuffle) reorder(); playMine(true); }
  function prev() { if (!S.tracks.length) return; S.idx = (S.idx - 1 + S.order.length) % S.order.length; playMine(true); }

  // ---------- Spotify ----------
  function loadSpotify() {
    if (S.spState !== 'off') return;
    S.spState = 'loading'; draw();
    window.onSpotifyIframeApiReady = (API) => {
      const host = document.getElementById('rd-sp'); if (!host) return;
      const el = document.createElement('div'); host.innerHTML = ''; host.appendChild(el);
      API.createController(el, { uri: PLAYLIST, width: '100%', height: 80, theme: 'dark' }, (ctl) => {
        S.sp = ctl; S.spState = 'ready';
        ctl.addListener('playback_update', (e) => { const d = e && e.data; if (d) { S.spPlaying = !d.isPaused; drawPill(); } });
        if (S.started && R.on && R.src === 'sp' && !S.userPaused) { try { ctl.play(); } catch (e) { /* ignora */ } }
        draw();
      });
    };
    const sc = document.createElement('script');
    sc.src = 'https://open.spotify.com/embed/iframe-api/v1'; sc.async = true;
    sc.onerror = () => { S.spState = 'fail'; draw(); };
    document.head.appendChild(sc);
    setTimeout(() => { if (S.spState === 'loading') { S.spState = 'fail'; draw(); } }, 15000);
  }

  // ---------- Controle geral ----------
  const playing = () => (R.src === 'sp' ? S.spPlaying : !!(S.audio && !S.audio.paused));
  function start() {
    if (!R.on) return;
    if (R.src === 'sp') { if (S.sp) { try { S.sp.play(); } catch (e) { /* ignora */ } } else loadSpotify(); }
    else playMine(false);
  }
  function stop() {
    if (S.sp) { try { S.sp.pause(); } catch (e) { /* ignora */ } }
    if (S.audio) S.audio.pause();
  }
  function toggle() {
    if (playing()) { S.userPaused = true; stop(); }
    else { S.userPaused = false; S.started = true; start(); }
    setTimeout(draw, 300);
  }

  // primeiro toque na página: liga a rádio (regra dos navegadores)
  document.addEventListener('pointerdown', (e) => {
    if (S.started || !R.on || S.userPaused) return;
    if (e.target.closest && e.target.closest('#radio')) return; // tocar na própria rádio já resolve
    S.started = true; start();
  }, true);

  // ---------- Partidas ao vivo: pausar, baixar o volume ou continuar ----------
  function matchOn() {
    document.body.classList.add('in-match');
    S.open = false; draw();
    if (R.live === 'pausa' && playing()) { S.matchPaused = true; stop(); }
    if (R.live === 'baixa' && R.src === 'mine') { S.matchDuck = true; if (S.audio) S.audio.volume = mineVol(); }
  }
  function matchOff() {
    document.body.classList.remove('in-match');
    if (S.matchPaused) { S.matchPaused = false; if (!S.userPaused) start(); }
    if (S.matchDuck) { S.matchDuck = false; if (S.audio) S.audio.volume = mineVol(); }
    draw();
  }
  const wrap = (name, after) => { const o = A.ACT[name]; if (!o) return; A.ACT[name] = function () { const r = o.apply(this, arguments); after(); return r; }; };
  wrap('play', () => { if (A.live || A.md) matchOn(); });
  wrap('lvClose', matchOff);
  wrap('mdClose', matchOff);

  // ---------- Tela ----------
  function root() {
    let el = document.getElementById('radio');
    if (!el) {
      el = document.createElement('div'); el.id = 'radio';
      el.innerHTML = `<button class="rd-pill" data-a="rdOpen" aria-label="Abrir a Rádio Prancheta"><img src="${LOGO}" alt=""><i class="rd-live"></i></button>
        <section class="rd-panel" aria-label="Rádio Prancheta" aria-hidden="true">
          <div class="rd-head"><img src="${LOGO}" alt=""><div class="rd-id"><b>Rádio Prancheta</b><span id="rd-sub"></span></div>
            <button class="btn sm" data-a="rdClose" aria-label="Recolher a rádio">▾</button></div>
          <div class="seg rd-src"><button data-a="rdSrc" data-k="sp">Playlist da rádio</button><button data-a="rdSrc" data-k="mine">Minhas músicas</button></div>
          <div id="rd-sp" class="rd-sp"></div>
          <div id="rd-mine" class="rd-mine"></div>
        </section>`;
      document.body.appendChild(el);
    }
    return el;
  }
  function drawPill() {
    const el = document.getElementById('radio'); if (!el) return;
    el.classList.toggle('on', R.on); el.classList.toggle('open', S.open); el.classList.toggle('playing', playing());
  }
  function draw() {
    const el = root();
    drawPill();
    const pn = el.querySelector('.rd-panel'); pn.setAttribute('aria-hidden', S.open ? 'false' : 'true'); pn.inert = !S.open;
    el.querySelectorAll('.rd-src button').forEach((b) => b.classList.toggle('on', b.dataset.k === R.src));
    const sp = el.querySelector('#rd-sp'), mine = el.querySelector('#rd-mine');
    sp.hidden = R.src !== 'sp'; mine.hidden = R.src !== 'mine';
    const sub = el.querySelector('#rd-sub');
    if (R.src === 'sp') {
      sub.textContent = S.spState === 'ready' ? 'Playlist oficial no Spotify' : S.spState === 'fail' ? 'Sem conexão com o Spotify' : 'Conectando ao Spotify…';
      if (S.spState === 'fail' && !sp.querySelector('.rd-fail')) sp.innerHTML = `<p class="rd-fail muted">Não deu para carregar o player do Spotify (sem internet ou bloqueado). <a href="${PLAYLIST_URL}" target="_blank" rel="noopener">Abrir a playlist no Spotify</a> ou use <b>Minhas músicas</b>.</p>`;
      if (S.spState === 'off' && S.open) loadSpotify();
    } else {
      const t = curTrack(), on = !!(S.audio && !S.audio.paused);
      sub.textContent = S.tracks.length ? `${S.tracks.length} música${S.tracks.length === 1 ? '' : 's'} neste aparelho` : 'Nenhuma música adicionada';
      mine.innerHTML = `${t ? `<div class="rd-now"><span class="label">${on ? 'Tocando' : 'Pausado'}</span><b>${esc(t.name)}</b></div>
          <div class="rd-ctl"><button class="btn sm" data-a="rdPrev" aria-label="Anterior">⏮</button><button class="btn sm primary" data-a="rdToggle">${on ? '❚❚ Pausar' : '▶ Tocar'}</button><button class="btn sm" data-a="rdNext" aria-label="Próxima">⏭</button>
            <button class="btn sm ${R.shuffle ? 'on' : ''}" data-a="rdShuffle" aria-pressed="${R.shuffle}" title="Ordem aleatória">🔀</button></div>
          <label class="rd-vol"><span class="label">Volume</span><input type="range" min="0" max="100" value="${Math.round(R.vol * 100)}" data-i="rdVol"></label>` : ''}
        <div class="rd-add"><label class="btn sm">＋ Adicionar músicas<input type="file" accept="audio/*" multiple data-c="rdFiles" hidden></label>
          ${S.tracks.length ? '<button class="btn sm ghost" data-a="rdClear">Apagar todas</button>' : ''}</div>
        <p class="muted rd-note">Os arquivos ficam só neste navegador. Ninguém mais recebe.</p>`;
    }
  }

  // ---------- Ações ----------
  Object.assign(A.ACT, {
    rdOpen() { S.open = true; if (!S.started && R.on) { S.started = true; S.userPaused = false; start(); } draw(); },
    rdClose() { S.open = false; draw(); },
    rdSrc(d) {
      if (R.src === d.k) return;
      stop(); R.src = d.k; saveR();
      if (R.src === 'sp') loadSpotify();
      if (S.started && !S.userPaused) start();
      draw();
    },
    rdToggle() { toggle(); },
    rdNext() { S.userPaused = false; S.started = true; next(); },
    rdPrev() { S.userPaused = false; S.started = true; prev(); },
    rdShuffle() { R.shuffle = !R.shuffle; saveR(); const cur = S.order[S.idx]; reorder(); const i = S.order.indexOf(cur); if (i > 0) { [S.order[0], S.order[i]] = [S.order[i], S.order[0]]; } S.idx = 0; draw(); },
    rdClear() {
      if (!confirm('Apagar todas as músicas da rádio neste aparelho?')) return;
      stop(); if (S.audio) S.audio.removeAttribute('src'); S.curId = null;
      tx('readwrite', (st) => st.clear()).then(loadTracks);
    },
    rdOnOff() {
      R.on = !R.on; saveR();
      if (!R.on) { stop(); S.open = false; } else { S.started = true; S.userPaused = false; start(); }
      draw(); A.render();
    },
    rdLive(d) { R.live = d.k; saveR(); A.render(); }
  });
  A.INP.rdVol = (el) => { R.vol = Number(el.value) / 100; saveR(); if (S.audio) S.audio.volume = mineVol(); };
  A.CHG.rdFiles = (el) => {
    const files = [...(el.files || [])].filter((f) => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f.name));
    if (!files.length) { A.toast('Escolha arquivos de áudio (MP3, M4A, OGG…)'); return; }
    let n = 0;
    const put = (f) => tx('readwrite', (st) => st.put({ id: P.uid('t'), name: f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '), blob: f })).then(() => { n++; });
    files.reduce((pr, f) => pr.then(() => put(f)), Promise.resolve())
      .catch(() => A.toast('Não deu para guardar tudo: o navegador ficou sem espaço.'))
      .then(() => {
        A.toast(`${n} música${n === 1 ? '' : 's'} adicionada${n === 1 ? '' : 's'} à rádio`);
        return loadTracks();
      }).then(() => { if (!S.audio || S.audio.paused) { S.started = true; S.userPaused = false; reorder(); playMine(true); } });
  };

  // Cartão em Mais
  const prevMais = P.maisExtra;
  P.radioCard = () => `<div class="card rd-card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Rádio Prancheta</h2><img src="${LOGO}" alt="" width="44" height="44"></div>
      <p class="muted" style="margin:0">Música de fundo enquanto você joga: a <a href="${PLAYLIST_URL}" target="_blank" rel="noopener">playlist da rádio no Spotify</a> ou músicas do seu aparelho.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn ${R.on ? '' : 'primary'}" data-a="rdOnOff">${R.on ? 'Desligar a rádio' : 'Ligar a rádio'}</button>${R.on ? '<button class="btn" data-a="rdOpen">Abrir a rádio</button>' : ''}</div>
      <div><span class="label">Nas partidas ao vivo</span><div class="seg" style="margin-top:6px">${[['cont', 'Continua tocando'], ['baixa', 'Baixa o volume'], ['pausa', 'Pausa']].map(([k, n]) => `<button class="${R.live === k ? 'on' : ''}" data-a="rdLive" data-k="${k}">${n}</button>`).join('')}</div>
      ${R.live === 'baixa' ? '<small class="muted" style="font-size:.78rem">Baixar o volume só funciona em Minhas músicas: o Spotify não deixa o jogo mexer no volume dele.</small>' : ''}</div></div>`;
  P.maisExtra = () => P.radioCard() + (prevMais ? prevMais() : '');

  // Início
  loadTracks();
  if (R.on && R.src === 'sp') loadSpotify();
  draw();
})(window.PFC);
