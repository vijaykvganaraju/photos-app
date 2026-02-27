import fs from 'node:fs/promises'
import path from 'node:path'
import Database from 'better-sqlite3'

const ALLOWED_JOURNAL_MODES = new Set(['DELETE', 'TRUNCATE', 'PERSIST', 'MEMORY', 'WAL', 'OFF'])

export class SqlitePhotoStore {
  constructor(config) {
    this.databasePath = path.resolve(config.path)
    const requestedMode = (config.journalMode ?? 'WAL').toUpperCase()
    this.journalMode = ALLOWED_JOURNAL_MODES.has(requestedMode) ? requestedMode : 'WAL'
    this.busyTimeoutMs = Number.isFinite(config.busyTimeoutMs) ? config.busyTimeoutMs : 5000
    this.db = null
    this.insertPhotoStmt = null
    this.insertManyTx = null
    this.getPhotoByIdStmt = null
    this.listPhotosStmt = null
  }

  async initialize() {
    await fs.mkdir(path.dirname(this.databasePath), { recursive: true })

    this.db = new Database(this.databasePath)
    this.db.pragma(`journal_mode = ${this.journalMode}`)
    this.db.pragma(`busy_timeout = ${this.busyTimeoutMs}`)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        checksum_sha256 TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_photos_created_at
      ON photos (created_at DESC);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_provider_key
      ON photos (provider, storage_key);
    `)

    this.insertPhotoStmt = this.db.prepare(`
      INSERT INTO photos (
        id,
        provider,
        storage_key,
        original_filename,
        mime_type,
        size_bytes,
        checksum_sha256,
        created_at
      ) VALUES (
        @id,
        @provider,
        @storageKey,
        @originalFilename,
        @mimeType,
        @sizeBytes,
        @checksumSha256,
        @createdAt
      )
    `)

    this.insertManyTx = this.db.transaction((rows) => {
      for (const row of rows) {
        this.insertPhotoStmt.run(row)
      }
    })

    this.getPhotoByIdStmt = this.db.prepare(`
      SELECT
        id,
        provider,
        storage_key AS storageKey,
        original_filename AS originalFilename,
        mime_type AS mimeType,
        size_bytes AS sizeBytes,
        checksum_sha256 AS checksumSha256,
        created_at AS createdAt
      FROM photos
      WHERE id = ?
    `)

    this.listPhotosStmt = this.db.prepare(`
      SELECT
        id,
        provider,
        storage_key AS storageKey,
        original_filename AS originalFilename,
        mime_type AS mimeType,
        size_bytes AS sizeBytes,
        checksum_sha256 AS checksumSha256,
        created_at AS createdAt
      FROM photos
      ORDER BY datetime(created_at) DESC
    `)
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  insertPhotos(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return
    }

    this.insertManyTx(rows)
  }

  getPhotoById(id) {
    return this.getPhotoByIdStmt.get(id)
  }

  listPhotos() {
    return this.listPhotosStmt.all()
  }
}
