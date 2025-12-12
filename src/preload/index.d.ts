import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      mainRequestFileState: (callback: (...args: any[]) => void) => () => void
      sendFileStateToMain: (fileState: { filePath: string; content: string }) => void
    }
    dragAndDrop: {
      dragAndDropFile: (file: File) => string
    }
    pathAPI: {
      join: (...args: string[]) => string
      basename: (p: string, ext?: string) => string
      dirname: (p: string) => string
      extname: (p: string) => string
      separator: string
    }
  }
}
