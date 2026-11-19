// Prancheta FC — app de PC (Electron)
// Abre o jogo da pasta "www" e guarda os saves na pasta "saves", ao lado do PranchetaFC.exe (como no Brasfoot).
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// pasta de saves: ao lado do .exe (versão zip/portátil); se não der para escrever ali, na pasta do usuário
function savesDir() {
  const base = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'));
  const dirs = [path.join(base, 'saves'), path.join(app.getPath('documents'), 'Prancheta FC', 'saves')];
  for (const d of dirs) {
    try { fs.mkdirSync(d, { recursive: true }); fs.accessSync(d, fs.constants.W_OK); return d; } catch (e) { /* tenta a próxima */ }
  }
  return app.getPath('userData');
}
let SAVES = null;
const safe = (name) => {
  if (!/^[\w.-]+$/.test(name)) throw new Error('nome de arquivo inválido');
  return path.join(SAVES, name);
};

ipcMain.handle('pfc:list', () => fs.readdirSync(SAVES).map((name) => {
  try { const st = fs.statSync(path.join(SAVES, name)); return st.isFile() ? { name, mtime: st.mtimeMs } : null; } catch (e) { return null; }
}).filter(Boolean));
ipcMain.handle('pfc:read', (e, name) => fs.readFileSync(safe(name), 'utf8'));
ipcMain.handle('pfc:write', (e, name, text) => {
  const f = safe(name), tmp = f + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8'); fs.renameSync(tmp, f); // grava inteiro ou nada
  return true;
});
ipcMain.handle('pfc:remove', (e, name) => { try { fs.unlinkSync(safe(name)); } catch (er) { /* não existia */ } return true; });
ipcMain.handle('pfc:open', () => shell.openPath(SAVES));
ipcMain.on('pfc:dir', (e) => { e.returnValue = SAVES; });

function createWindow() {
  const win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 900, minHeight: 600,
    backgroundColor: '#16130f', title: 'Prancheta FC', autoHideMenuBar: true,
    icon: path.join(__dirname, 'www', 'icons', 'icon-512.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  // links externos abrem no navegador
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (/^https?:/.test(url)) { e.preventDefault(); shell.openExternal(url); } });
  // F11: tela cheia
  win.webContents.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
  // antes de fechar: termina de gravar os saves pendentes
  let closing = false;
  win.on('close', (e) => {
    if (closing) return;
    e.preventDefault(); closing = true;
    win.webContents.executeJavaScript('window.PFC && window.PFC.nativeFlush ? window.PFC.nativeFlush() : null', true)
      .catch(() => {}).finally(() => setTimeout(() => win.destroy(), 100));
    setTimeout(() => { if (!win.isDestroyed()) win.destroy(); }, 4000);
  });
}

app.whenReady().then(() => { SAVES = savesDir(); createWindow(); });
app.on('window-all-closed', () => app.quit());
