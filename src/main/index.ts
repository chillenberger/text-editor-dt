import { app, shell, BrowserWindow, ipcMain, Menu, MenuItem } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import dotenv from 'dotenv'
import setUpFileSystemHandlers from './service/file-service'
import { initializeAgent, chatStream } from './service/chat-service'
import LocalStorage from '../db/local';
import setUpLoggerHandlers from './service/logger-service'
import { dialog } from 'electron';
import { updateEmbeddingsForFile, searchEmbeddingsDistinct } from '../lib/embeddings';
import { getFileSystem } from './service/file-service';
import { flattenPathTree } from '../lib/paths';
import { readFileContent } from './service/file-service'

dotenv.config()

function createWindow(): void {
  // Create the browser window.
  const preloadPath = existsSync(join(__dirname, '../preload/index.js'))
    ? join(__dirname, '../preload/index.js')
    : join(__dirname, '../preload/index.mjs')

  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      sandbox: false
    }
  })

  const menu = new Menu()

  // The first submenu needs to be the app menu on macOS
  if (process.platform === 'darwin') {
    const appMenu = new MenuItem({ role: 'appMenu' })
    menu.append(appMenu)
    const viewMenu = new MenuItem({ role: 'viewMenu' })
    menu.append(viewMenu)
    const editMenu = new MenuItem({ role: 'editMenu' })
    menu.append(editMenu)
  }

  const submenu = Menu.buildFromTemplate([{
    label: 'Save File',
    click: () => mainWindow.webContents.send('main-request-file-state'),
    accelerator: 'CommandOrControl+S'
  }])


  menu.append(new MenuItem({ label: 'Custom Menu', submenu }))
  Menu.setApplicationMenu(menu)


  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  const localStorage = new LocalStorage();
  setUpLoggerHandlers(localStorage);
  setUpFileSystemHandlers();
  

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  ipcMain.handle('test-func', (_, data) => {
    console.log("data sent: ", data);

    return localStorage.userActions.getAllExampleEntries();
  })


  ipcMain.handle('embed-file-tree', async (_, folderPath: string) => {
    console.log("Embedding file tree for folder: ", folderPath);
    const dir = await getFileSystem(folderPath);
    const filePaths= flattenPathTree(dir, folderPath);
    for (const path of filePaths) {
      const content = await readFileContent(path);
      await updateEmbeddingsForFile(path, content, localStorage);
    }
  });

  ipcMain.on('chat-stream', async (event, userQuery: string, previousResponseId: string | null, folders: string[], chatSessionFromForm: string, timeLastRequestFromForm: string, agentId: string) => {
    const actionLogs = localStorage.userActions.getActionLogsBySessionAndCreatedAt(chatSessionFromForm, timeLastRequestFromForm);
    console.log("actionLogs: ", actionLogs);
    
    // Re-embed changed files before sending request. 
    for (const log of actionLogs) {
      if (log.action_type === 'file-updated') {
        if (!log.details) continue;
        const details = JSON.parse(log.details);
        const filePath = details.filePath;
        const content = details.content;
        console.log(`Updating embeddings for file: ${filePath}`);
        await updateEmbeddingsForFile(filePath, content, localStorage);
      }
    }

    return await chatStream(event, userQuery, previousResponseId, folders, chatSessionFromForm, timeLastRequestFromForm, agentId);
  })

  ipcMain.handle('search-embeddings', async (_, query: string, topK: number, dirs: string[]) => {
    const allFilePaths: string[] = [];
    for (const dir of dirs) {
      const dirTree = await getFileSystem(dir);
      const filePaths = flattenPathTree(dirTree, dir);
      allFilePaths.push(...filePaths);
    }
    const results = await searchEmbeddingsDistinct(query, localStorage, topK, allFilePaths);
    console.log("search results: ", results);
    return results;
  });

  ipcMain.handle('initialize-agent', async (_, projectName: string, folders: string[], agentId: string) => {
    await initializeAgent(projectName, folders, agentId, localStorage);
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('test-func-a', async (_, data) => {
  console.log('Test function called from renderer process');
  console.log("data: ", data);
  
  const folder = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  console.log("folder: ", folder);


  return 'from the main process';
})
