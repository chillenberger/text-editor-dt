import { app } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'


class LocalStorage {
    db: Database.Database;
    
    constructor() {
        const dbPath = path.join(app.getPath('userData'), 'app_database.sqlite3')
        this.db = new Database(dbPath)
        this.db.pragma("journal_mode = WAL")
        this.setUpDatabase()
    }

    setUpDatabase() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                session_id TEXT,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `)  
    }

    addActionEntry(action_type: string, user_id: string, session_id: string, details: string) {
        const stmt = this.db.prepare('INSERT INTO user_actions (action_type, user_id, session_id, details) VALUES (?, ?, ?, ?)')
        const info = stmt.run(action_type, user_id, session_id, details)
        return info.lastInsertRowid
    }

    getActionLogsBySessionAndCreatedAt(sessionId: string, createdAt: string) {
        const stmt = this.db.prepare('SELECT action_type, details, created_at FROM user_actions WHERE session_id = ? AND created_at >= ? ORDER BY created_at ASC')
        return stmt.all(sessionId, createdAt)
    }

    deleteActionEntryById(id: string) {
        const stmt = this.db.prepare('DELETE FROM user_actions WHERE id = ?')
        const info = stmt.run(id)
        return info.changes
    }

    getAllExampleEntries() {
        const stmt = this.db.prepare('SELECT * FROM user_actions')
        return stmt.all()
    }

    close() {
        this.db.close()
    }
}

export default LocalStorage;