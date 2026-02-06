import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '../types/solution';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  solutions: {
    getAll: () => ipcRenderer.invoke('solutions:getAll'),
    add: (solution) => ipcRenderer.invoke('solutions:add', solution),
    update: (id, solution) => ipcRenderer.invoke('solutions:update', id, solution),
    delete: (id) => ipcRenderer.invoke('solutions:delete', id),
  },

  processes: {
    start: (solutionId) => ipcRenderer.invoke('processes:start', solutionId),
    stop: (solutionId) => ipcRenderer.invoke('processes:stop', solutionId),
    restart: (solutionId) => ipcRenderer.invoke('processes:restart', solutionId),
    getState: (solutionId) => ipcRenderer.invoke('processes:getState', solutionId),
    getAllStates: () => ipcRenderer.invoke('processes:getAllStates'),
    startAll: () => ipcRenderer.invoke('processes:startAll'),
    stopAll: () => ipcRenderer.invoke('processes:stopAll'),
    onStateChange: (callback) => {
      ipcRenderer.on('process:state-change', (_event, id, state) => callback(id, state));
    },
    onLog: (callback) => {
      ipcRenderer.on('process:log', (_event, id, log) => callback(id, log));
    },
  },

  ports: {
    check: (port) => ipcRenderer.invoke('ports:check', port),
    findAvailable: (startPort) => ipcRenderer.invoke('ports:findAvailable', startPort),
  },

  shell: {
    openBrowser: (url) => ipcRenderer.invoke('shell:openBrowser', url),
    openFolder: (path) => ipcRenderer.invoke('shell:openFolder', path),
    selectFolder: () => ipcRenderer.invoke('shell:selectFolder'),
  },

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  profiles: {
    getAll: () => ipcRenderer.invoke('profiles:getAll'),
    getActive: () => ipcRenderer.invoke('profiles:getActive'),
    setActive: (profileId) => ipcRenderer.invoke('profiles:setActive', profileId),
  },

  config: {
    resetToDefaults: () => ipcRenderer.invoke('config:resetToDefaults'),
    validatePath: (path) => ipcRenderer.invoke('config:validatePath', path),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
