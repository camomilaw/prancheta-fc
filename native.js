/* Prancheta FC — app de PC (.exe) e de Android (.apk)
 * No navegador este arquivo não faz nada. Dentro dos apps:
 *  - Pasta de saves, como no Brasfoot: cada carreira também vira um arquivo carreira-N.json
 *    (PC: pasta "saves" ao lado do PranchetaFC.exe; Android: Documentos/PranchetaFC/saves).
 *    Ao abrir o jogo, arquivos novos ou mais recentes da pasta entram nos espaços de carreira,
 *    então dá para copiar saves entre computadores e celulares (ou receber de amigos).
 *  - Android: gira a tela pelo próprio sistema (deitado por padrão) e fica em tela cheia (a barra de status some sozinha depois de um print ou de puxar notificações).
 */
(function (P) {
  const A = P.app;
  const NAME = (n) => `carreira-${n}.json`;
  const RE = /^carreira-([1-9])\.json$/;
  let fs = null;

  // ---------- PC (Electron): o preload expõe window.pfcNative ----------
  if (window.pfcNative) {
    const N = window.pfcNative;
    fs = { kind: 'pc', label: N.savesDir, list: N.list, read: N.read, write: N.write, remove: N.remove, open: N.openSaves };
  }

  // ---------- Android (Capacitor) ----------
  const Cap = window.Capacitor;
  const isAndroidApp = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  if (!fs && isAndroidApp) {
    const plug = (name) => (Cap.Plugins && Cap.Plugins[name]) || (Cap.registerPlugin ? Cap.registerPlugin(name) : null);
    const FS = plug('Filesystem');
    const DIR = 'PranchetaFC/saves';
    let where = 'DOCUMENTS';
    const opt = (path, extra) => Object.assign({ path: path ? `${DIR}/${path}` : DIR, directory: where }, extra || {});
    const ready = (async () => {
      // Documentos (fácil de achar no gerenciador de arquivos); se o sistema não deixar, a pasta do app
      try { if (FS.requestPermissions) await FS.requestPermissions(); } catch (e) { /* Android novo não precisa */ }
      try { await FS.mkdir(opt('', { recursive: true })); } catch (e) { /* já existe */ }
      try { await FS.writeFile(opt('.teste', { data: 'ok', encoding: 'utf8' })); await FS.deleteFile(opt('.teste')); }
      catch (e) { where = 'DATA'; try { await FS.mkdir(opt('', { recursive: true })); } catch (er) { /* já existe */ } }
    })();
    fs = {
      kind: 'android',
      get label() { return where === 'DOCUMENTS' ? 'Documentos/PranchetaFC/saves' : 'pasta interna do app'; },
      list: async () => { await ready; const r = await FS.readdir(opt('')); return (r.files || []).map((f) => (typeof f === 'string' ? { name: f, mtime: 0 } : { name: f.name, mtime: Number(f.mtime) || 0 })); },
      read: async (name) => { await ready; return (await FS.readFile(opt(name, { encoding: 'utf8' }))).data; },
      write: async (name, text) => { await ready; await FS.writeFile(opt(name, { data: text, encoding: 'utf8', recursive: true })); },
      remove: async (name) => { await ready; try { await FS.deleteFile(opt(name)); } catch (e) { /* não existia */ } }
    };
    // tela: deitado por padrão, girada pelo sistema; barra de status escondida
    const SO = plug('ScreenOrientation');
    if (SO) P.nativeLock = async (kind) => { try { await SO.lock({ orientation: kind === 'portrait' ? 'portrait' : 'landscape' }); return true; } catch (e) { return false; } };
    if (P.nativeLock) { let pref = 'land'; try { pref = P.store.get('prancheta-fc:orient') || 'land'; } catch (e) { /* padrão */ } P.nativeLock(pref === 'port' ? 'portrait' : 'landscape'); }
    // botão voltar do Android: fecha a janela aberta em vez de sair do jogo
    const App = plug('App');
    try {
      if (App) App.addListener('backButton', () => {
        if (document.querySelector('.sheet')) { A.closeSheet(); return; }
        if (document.getElementById('radio') && document.getElementById('radio').classList.contains('open')) { A.ACT.rdClose(); return; }
        if (A.g && A.view !== 'inicio') { A.ACT.go({ v: 'inicio' }); return; }
        App.minimizeApp ? App.minimizeApp() : App.exitApp();
      });
    } catch (e) { /* ignora */ }
  }

  // Sair do jogo (só nos apps; no navegador, a aba é fechada pelo próprio navegador)
  P.canQuit = () => !!(window.pfcNative || isAndroidApp);
  A.ACT.appQuit = function () {
    try { A.save(); } catch (e) { /* sem carreira aberta */ }
    Promise.resolve(P.nativeFlush ? P.nativeFlush() : null).catch(() => {}).then(() => {
      if (isAndroidApp) { const App = (Cap.Plugins && Cap.Plugins.App) || (Cap.registerPlugin ? Cap.registerPlugin('App') : null); if (App && App.exitApp) { App.exitApp(); return; } }
      window.close();
    });
  };
  P.native = fs;
  if (!fs) return;
  document.documentElement.classList.add('is-app', 'app-' + fs.kind);

  // ---------- Gravar: cada save também vai para a pasta (no máximo a cada 4 s por espaço) ----------
  const due = {};
  const flushOne = (n) => {
    const d = due[n]; if (!d) return Promise.resolve(); delete due[n]; clearTimeout(d.t);
    const file = `{"pfc":"carreira","v":1,"slot":${n},"meta":${JSON.stringify(d.meta || {})},"game":${d.text}}`;
    return fs.write(NAME(n), file).catch((e) => { if (!fs.warned) { fs.warned = true; A.toast('Não deu para gravar na pasta de saves: ' + (e && e.message ? e.message : e)); } });
  };
  P.onSlotSaved = (n, text, meta) => {
    const d = due[n] || (due[n] = {});
    d.text = text; d.meta = meta;
    if (!d.t) d.t = setTimeout(() => flushOne(n), 4000);
  };
  P.onSlotDeleted = (n) => { delete due[n]; fs.remove(NAME(n)); };
  const flushAll = () => Promise.all(Object.keys(due).map((n) => flushOne(Number(n))));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAll(); });
  addEventListener('pagehide', flushAll);
  P.nativeFlush = flushAll; // o app de PC chama antes de fechar

  // ---------- Abrir o jogo: traz da pasta o que for novo ou mais recente ----------
  async function syncFromFolder() {
    const R = P.slotsRaw; if (!R) return 0;
    let files = []; try { files = await fs.list(); } catch (e) { return 0; }
    let n = 0;
    for (const f of files) {
      const m = RE.exec(f.name); if (!m) continue;
      const slot = Number(m[1]), cur = R.meta().s[slot];
      if (cur && f.mtime && f.mtime <= (cur.at || 0) + 3000) continue; // o jogo já tem esta versão
      try {
        const obj = JSON.parse(await fs.read(f.name));
        const g = obj && obj.game; if (!g || !g.db || !g.cal) continue;
        const meta = obj.meta && obj.meta.club ? obj.meta : (() => { const c = g.db.clubs.find((x) => x.id === g.user); return { mgr: g.manager, club: c ? c.name : '?', badge: c ? P.badge(c, 48) : '', div: c ? c.div : 0, season: g.season, week: g.week, over: !!g.over }; })();
        if (cur && !f.mtime && (cur.at || 0) >= (meta.at || 0)) continue;
        await R.put(slot, JSON.stringify(g));
        R.meta().s[slot] = Object.assign({}, meta, { at: f.mtime || meta.at || Date.now() });
        n++;
      } catch (e) { /* arquivo estragado: ignora */ }
    }
    if (n) R.writeMeta();
    // carreiras que só existem no jogo (de antes do app): também vão para a pasta
    const meta = R.meta().s;
    for (const k of Object.keys(meta)) {
      const slot = Number(k);
      if (files.some((f) => f.name === NAME(slot))) continue;
      try { const text = await R.get(slot); if (text) { P.onSlotSaved(slot, text, meta[slot]); } } catch (e) { /* ignora */ }
    }
    return n;
  }
  const origInit = P.slotsInit;
  P.slotsInit = function () {
    return Promise.resolve(origInit ? origInit() : null).then(syncFromFolder).then((n) => { if (n) setTimeout(() => A.toast(`${n} ${n === 1 ? 'carreira veio' : 'carreiras vieram'} da pasta de saves`), 600); });
  };

  // ---------- Preferências: onde fica a pasta ----------
  const prevBody = P.prefsBody;
  if (prevBody) P.prefsBody = function () {
    const html = prevBody.apply(this, arguments);
    const box = `<section><h3 class="pf-h">Pasta de saves</h3>
      <p class="pf-note">Cada carreira também fica salva como arquivo em <b>${P.esc(fs.label)}</b> (carreira-1.json a carreira-9.json). Copie esses arquivos para levar a carreira a outro computador ou celular: ao abrir o jogo, ele traz da pasta as versões mais recentes.</p>
      ${fs.open ? '<div class="row"><button class="btn" data-a="nativeOpen">Abrir a pasta de saves</button></div>' : ''}</section>`;
    return html.replace(/<\/div>\s*$/, box + '</div>');
  };
  A.ACT.nativeOpen = () => { flushAll().then(() => fs.open && fs.open()); };
})(window.PFC);
