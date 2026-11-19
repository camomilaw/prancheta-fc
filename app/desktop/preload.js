// Ponte segura entre o jogo e a pasta de saves
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pfcNative', {
  savesDir: ipcRenderer.sendSync('pfc:dir'),
  list: () => ipcRenderer.invoke('pfc:list'),
  read: (name) => ipcRenderer.invoke('pfc:read', name),
  write: (name, text) => ipcRenderer.invoke('pfc:write', name, text),
  remove: (name) => ipcRenderer.invoke('pfc:remove', name),
  openSaves: () => ipcRenderer.invoke('pfc:open')
});
