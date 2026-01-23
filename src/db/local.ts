import { app } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'

interface EmbeddingRow {
  id: number
  content_hash: string
  embedding_vector: number[]
  chunk_index: number
  file_path: string | null
}

class Embeddings {
  db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  setupTable(): void {
    try {
      this.db.exec(`
                CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content_hash TEXT NOT NULL,
                    file_path TEXT,
                    chunk_index FLOAT,
                    embedding_vector float[1536]
                )
            `)
    } catch (error) {
      console.error('Failed to setup embeddings table:', error)
      throw error
    }
  }

  addEmbedding(
    content_hash: string,
    embedding_vector: number[],
    file_path: string,
    chunk_index: number
  ): number {
    // Bind as a single blob so vec0 sees one vector, not 1536 parameters
    const vectorBuffer = Buffer.from(new Float32Array(embedding_vector).buffer)
    try {
      const stmt = this.db.prepare(
        'INSERT INTO embeddings (content_hash, file_path, chunk_index, embedding_vector) VALUES (?, ?, ?, ?)'
      )
      const info = stmt.run(content_hash, file_path, chunk_index, vectorBuffer)
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
      const stmt = this.db.prepare(
        'SELECT * FROM embeddings WHERE file_path = ? ORDER BY chunk_index ASC'
      )
      return stmt.all(file_path) as EmbeddingRow[]
    } catch (error) {
      console.error('Failed to get embeddings by file path:', file_path, error)
      throw error
    }
  }

  insertMany(
    items: Array<{
      content_hash: string
      embedding_vector: number[]
      file_path: string
      chunk_index: number
    }>
  ): number[] {
    try {
      const ids: number[] = []
      const transaction = this.db.transaction(() => {
        const stmt = this.db.prepare(
          'INSERT INTO embeddings (content_hash, file_path, chunk_index, embedding_vector) VALUES (?, ?, ?, ?)'
        )
        for (const item of items) {
          const vectorBuffer = Buffer.from(new Float32Array(item.embedding_vector).buffer)
          const chunkIndexInt = Math.trunc(item.chunk_index)
          const info = stmt.run(item.content_hash, item.file_path, chunkIndexInt, vectorBuffer)
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
      const info = stmt.run(Math.trunc(chunk_index), id)
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

  deleteEmbeddingsByFilePath(filePath: string): number {
    try {
      const stmt = this.db.prepare('DELETE FROM embeddings WHERE file_path = ?')
      const info = stmt.run(filePath)
      return info.changes
    } catch (error) {
      console.error('Failed to delete embeddings by file path:', error)
      throw error
    }
  }

  getTopKSimilarEmbeddings(
    embedding_vector: number[],
    topK: number,
    filePaths: string[]
  ): Array<{ file_path: string; score: number }> {
    const vectorBuffer = Buffer.from(new Float32Array(embedding_vector).buffer)
    try {
      const stmt = this.db.prepare(`
                SELECT file_path, vec_distance_cosine(embedding_vector, ?) AS score
                FROM embeddings
                WHERE file_path IN (${filePaths.map(() => '?').join(',')})
                ORDER BY score ASC
                LIMIT ?
            `)
      return stmt.all(vectorBuffer, ...filePaths, topK) as Array<{
        file_path: string
        score: number
      }>
    } catch (error) {
      console.error('Failed to get top K similar embeddings:', error)
      throw error
    }
  }

  getTopKDistinctFilePaths(
    embedding_vector: number[],
    topK: number,
    filePaths: string[],
    maxScore: number = 0.5
  ): Array<{ file_path: string; score: number }> {
    const vectorBuffer = Buffer.from(new Float32Array(embedding_vector).buffer)
    try {
      const stmt = this.db.prepare(`
                SELECT file_path, MIN(vec_distance_cosine(embedding_vector, ?)) AS score
                FROM embeddings
                WHERE file_path IN (${filePaths.map(() => '?').join(',')})
                GROUP BY file_path
                HAVING score <= ?
                ORDER BY score ASC
                LIMIT ?
            `)
      return stmt.all(vectorBuffer, ...filePaths, maxScore, topK) as Array<{
        file_path: string
        score: number
      }>
    } catch (error) {
      console.error('Failed to get top K distinct file paths:', error)
      throw error
    }
  }
}

interface UserActionRow {
  id: number
  action_type: string
  user_id: string
  session_id: string | null
  details: string | null
  created_at: string
}

class UserActions {
  db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
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

  addActionEntry(
    action_type: string,
    user_id: string,
    session_id: string,
    details: string
  ): number {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO user_actions (action_type, user_id, session_id, details) VALUES (?, ?, ?, ?)'
      )
      const info = stmt.run(action_type, user_id, session_id, details)
      return Number(info.lastInsertRowid)
    } catch (error) {
      console.error('Failed to add action entry:', error)
      throw error
    }
  }

  getActionLogsBySessionAndCreatedAt(sessionId: string, createdAt: string): UserActionRow[] {
    try {
      const stmt = this.db.prepare(
        'SELECT action_type, details, created_at FROM user_actions WHERE session_id = ? AND created_at >= DATETIME(?) ORDER BY created_at ASC'
      )
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

class UserData {
  db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  setupTable(): void {
    try {
      this.db.exec(`
                CREATE TABLE IF NOT EXISTS user_data (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `)
    } catch (error) {
      console.error('Failed to setup user_data table:', error)
      throw error
    }
  }

  get(key: string): string | null {
    try {
      const stmt = this.db.prepare('SELECT value FROM user_data WHERE key = ?')
      const row = stmt.get(key) as { value: string } | undefined
      return row ? row.value : null
    } catch (error) {
      console.error('Failed to get user data:', error)
      throw error
    }
  }

  set(key: string, value: string): void {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO user_data (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP'
      )
      stmt.run(key, value)
    } catch (error) {
      console.error('Failed to set user data:', error)
      throw error
    }
  }

  delete(key: string): void {
    try {
      const stmt = this.db.prepare('DELETE FROM user_data WHERE key = ?')
      stmt.run(key)
    } catch (error) {
      console.error('Failed to delete user data:', error)
      throw error
    }
  }

  getAll(): Record<string, string> {
    try {
      const stmt = this.db.prepare('SELECT key, value FROM user_data')
      const rows = stmt.all() as { key: string; value: string }[]
      const result: Record<string, string> = {}
      for (const row of rows) {
        result[row.key] = row.value
      }
      return result
    } catch (error) {
      console.error('Failed to get all user data:', error)
      throw error
    }
  }
}

class LocalStorage {
  db: Database.Database
  public userActions: UserActions
  public embeddings: Embeddings
  public userData: UserData
  private initialized: boolean = false

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'app_database.sqlite3')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.embeddings = new Embeddings(this.db)
    this.userActions = new UserActions(this.db)
    this.userData = new UserData(this.db)
    this.initialize()
  }

  async initialize(): Promise<void> {
    if (this.initialized) return
    try {
      sqliteVec.load(this.db)
      this.embeddings.setupTable()
      this.userActions.setupTable()
      this.userData.setupTable()
      this.initialized = true
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

export default LocalStorage
