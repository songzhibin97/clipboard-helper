const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getClipboardHistory: () => ipcRenderer.invoke('get-clipboard-history'),
    saveClipboardItem: (item) => ipcRenderer.invoke('save-clipboard-item', item),
    clearClipboardHistory: () => ipcRenderer.invoke('clear-clipboard-history'),
    writeClipboard: ({ content, type }) => ipcRenderer.invoke('write-clipboard', { content, type }),
    openPreview: ({ content, type }) => ipcRenderer.invoke('open-preview', { content, type }),
    onHistoryUpdated: (callback) => ipcRenderer.on('history-updated', (event, history) => callback(history)),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
    toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
    getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top')
});