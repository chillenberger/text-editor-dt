import { app } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'
import sqlite_vec from 'sqlite-vec';


interface EmbeddingRow {
    id: number;
    content_hash: string;
    embedding_vector: Buffer;
    chunk_index: number;
    created_at: string;
    file_path: string | null;
}

class Embeddings {
    db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    setupTable(): void {
        try {
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS embeddings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content_hash TEXT NOT NULL,
                    embedding_vector BLOB NOT NULL,
                    chunk_index INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    file_path TEXT
                );
            `)
            // Best-effort migrate older DBs missing chunk_index column
            try {
                this.db.exec('ALTER TABLE embeddings ADD COLUMN chunk_index INTEGER NOT NULL DEFAULT 0');
            } catch (migrateError) {
                // Ignore if column already exists
            }
            this.db.exec('CREATE INDEX IF NOT EXISTS idx_embeddings_file_path_chunk ON embeddings(file_path, chunk_index)');
        } catch (error) {
            console.error('Failed to setup embeddings table:', error)
            throw error
        }
    }

    addEmbedding(content_hash: string, embedding_vector: Buffer, file_path: string, chunk_index: number): number {
        try {
            const stmt = this.db.prepare('INSERT INTO embeddings (content_hash, embedding_vector, file_path, chunk_index) VALUES (?, ?, ?, ?)')
            const info = stmt.run(content_hash, embedding_vector, file_path, chunk_index)
            return Number(info.lastInsertRowid)
        } catch (error) {
            console.error('Failed to add embedding:', error)
            throw error
        }
    }

    getEmbeddingByContentHash(content_hash: string): EmbeddingRow | undefined {
        try {
            const stmt = this.db.prepare('SELECT * FROM embeddings WHERE content_hash = ?')
            return stmt.get(content_hash) as EmbeddingRow | undefined
        } catch (error) {
            console.error('Failed to get embedding:', error)
            throw error
        }
    }

    getEmbeddingsByFilePath(file_path: string): EmbeddingRow[] {
        try {
            const stmt = this.db.prepare('SELECT * FROM embeddings WHERE file_path = ? ORDER BY chunk_index ASC')
            return stmt.all(file_path) as EmbeddingRow[]
        } catch (error) {
            console.error('Failed to get embeddings by file path:', error)
            throw error
        }
    }

    insertMany(items: Array<{content_hash: string, embedding_vector: Buffer, file_path: string, chunk_index: number}>): number[] {
        try {
            const ids: number[] = []
            const transaction = this.db.transaction(() => {
                const stmt = this.db.prepare('INSERT INTO embeddings (content_hash, embedding_vector, file_path, chunk_index) VALUES (?, ?, ?, ?)')
                for (const item of items) {
                    const info = stmt.run(item.content_hash, item.embedding_vector, item.file_path, item.chunk_index)
                    ids.push(Number(info.lastInsertRowid))
                }
            })
            transaction()
            return ids
        } catch (error) {
            console.error('Failed to insert embeddings:', error)
            throw error
        }
    }

    updateChunkIndex(id: number, chunk_index: number): number {
        try {
            const stmt = this.db.prepare('UPDATE embeddings SET chunk_index = ? WHERE id = ?')
            const info = stmt.run(chunk_index, id)
            return info.changes
        } catch (error) {
            console.error('Failed to update embedding chunk_index:', error)
            throw error
        }
    }

    deleteEmbeddingById(id: number): number {
        try {
            const stmt = this.db.prepare('DELETE FROM embeddings WHERE id = ?')
            const info = stmt.run(id)
            return info.changes
        } catch (error) {
            console.error('Failed to delete embedding:', error)
            throw error
        }
    }
}

interface UserActionRow {
    id: number;
    action_type: string;
    user_id: string;
    session_id: string | null;
    details: string | null;
    created_at: string;
}

class UserActions {
    db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    setupTable(): void {
        try {
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
        } catch (error) {
            console.error('Failed to setup user_actions table:', error)
            throw error
        }
    }

    addActionEntry(action_type: string, user_id: string, session_id: string, details: string): number {
        try {
            const stmt = this.db.prepare('INSERT INTO user_actions (action_type, user_id, session_id, details) VALUES (?, ?, ?, ?)')
            const info = stmt.run(action_type, user_id, session_id, details)
            return Number(info.lastInsertRowid)
        } catch (error) {
            console.error('Failed to add action entry:', error)
            throw error
        }
    }

    getActionLogsBySessionAndCreatedAt(sessionId: string, createdAt: string): UserActionRow[] {
        try {
            const stmt = this.db.prepare('SELECT action_type, details, created_at FROM user_actions WHERE session_id = ? AND created_at >= ? ORDER BY created_at ASC')
            return stmt.all(sessionId, createdAt) as UserActionRow[]
        } catch (error) {
            console.error('Failed to get action logs:', error)
            throw error
        }
    }

    deleteActionEntryById(id: string): number {
        try {
            const stmt = this.db.prepare('DELETE FROM user_actions WHERE id = ?')
            const info = stmt.run(id)
            return info.changes
        } catch (error) {
            console.error('Failed to delete action entry:', error)
            throw error
        }
    }

    getAllExampleEntries(): UserActionRow[] {
        try {
            const stmt = this.db.prepare('SELECT * FROM user_actions')
            return stmt.all() as UserActionRow[]
        } catch (error) {
            console.error('Failed to get all action entries:', error)
            throw error
        }
    }
}

class LocalStorage {
    db: Database.Database;
    public userActions: UserActions;
    public embeddings: Embeddings;
    private initialized: boolean = false;
    
    constructor() {
        const dbPath = path.join(app.getPath('userData'), 'app_database.sqlite3')
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL")
        this.embeddings = new Embeddings(this.db);
        this.userActions = new UserActions(this.db);
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;
        try {
            this.embeddings.setupTable();
            this.userActions.setupTable();
            sqlite_vec.load(this.db);
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize database:', error)
            throw error
        }
    }

    close(): void {
        try {
            this.db.close()
        } catch (error) {
            console.error('Failed to close database:', error)
            throw error
        }
    }
}

export default LocalStorage;