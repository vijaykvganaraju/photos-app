export const loadConfig = () => {
  return {
    appName: process.env.APP_NAME ?? 'Photos',
    maxUploadSizeMb: Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '20', 10),
    enabledProviders: ['local'],
    database: {
      path: process.env.SQLITE_PATH ?? './data/photos.db',
      journalMode: process.env.SQLITE_JOURNAL_MODE ?? 'WAL',
      busyTimeoutMs: Number.parseInt(process.env.SQLITE_BUSY_TIMEOUT_MS ?? '5000', 10)
    },
    local: {
      uploadDir: process.env.LOCAL_UPLOAD_DIR ?? './storage/local'
    }
  }
}
