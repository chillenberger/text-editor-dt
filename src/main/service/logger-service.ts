import { ipcMain } from 'electron'
import LocalStorage from '../../db/local'

export default function setUpLoggerHandlers(db: LocalStorage) {
  ipcMain.handle('log-action', async (_, action: string, details: string, sessionId: string) => {
    await db.userActions.addActionEntry(action, 'user123', sessionId, details)
  })
}
