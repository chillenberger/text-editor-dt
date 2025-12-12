'use server';
import { ipcMain } from 'electron';

export default function setUpLoggerHandlers(db) {
  ipcMain.handle('log-action', async (_, action: string, details: string, sessionId: string) => {
    await db.addActionEntry(action, 'user123', sessionId, details);
  })
}