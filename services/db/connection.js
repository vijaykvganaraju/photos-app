import { SqlitePhotoStore } from './sqlite.js'

export const createPhotoStore = (databaseConfig) => {
  return new SqlitePhotoStore({
    path: databaseConfig.path,
    journalMode: databaseConfig.journalMode,
    busyTimeoutMs: databaseConfig.busyTimeoutMs
  })
}
