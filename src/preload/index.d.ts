import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      mainRequestFileState: (callback: (...args: any[]) => void) => () => void
      sendFileStateToMain: (fileState: { filePath: string; content: string }) => void
      userData: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<void>
        delete: (key: string) => Promise<void>
        getAll: () => Promise<Record<string, string>>
      }
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
