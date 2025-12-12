import { contextBridge, webUtils, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import path from 'path';

// Custom APIs for renderer
const api = {
  mainRequestFileState: (callback) => {
    const listener = (_event, ...args) => callback(...args);
    ipcRenderer.on('main-request-file-state', listener);
    // Return cleanup function to remove listener
    return () => ipcRenderer.removeListener('main-request-file-state', listener);
  },
}

const dragAndDropApi = {
  dragAndDropFile(file: File) {
    console.log("Preload dragAndDropFile called with file: ", file);
    const path = webUtils.getPathForFile(file)
    // Do something with the path, e.g., send it over IPC to the main process.
    // It's best not to expose the full file path to the web content if possible.
    return path;
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('dragAndDrop', dragAndDropApi)
    contextBridge.exposeInMainWorld('pathAPI', {
      join: (...args) => path.join(...args),
      basename: (p, ext) => path.basename(p, ext),
      dirname: (p) => path.dirname(p),
      extname: (p) => path.extname(p),
      separator: path.sep
      // Expose other path methods as needed
    });
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.dragAndDrop = dragAndDropApi
}
