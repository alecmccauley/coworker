import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type WorkspaceDatabase = BetterSQLite3Database<typeof schema>

/**
 * Open a workspace database with optimal settings.
 * Uses WAL mode for better concurrent read/write performance.
 *
 * Path: dbPath must be absolute. For per-workspace DBs we use the workspace
 * folder; for any future app-level DB use app.getPath('userData') when packaged.
 */
export function openDatabase(dbPath: string): { db: WorkspaceDatabase; sqlite: Database.Database } {
  const sqlite = new Database(dbPath)

  // Enable WAL mode for better performance
  sqlite.pragma('journal_mode = WAL')

  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON')

  // Improve write performance
  sqlite.pragma('synchronous = NORMAL')

  // Create Drizzle ORM instance
  const db = drizzle(sqlite, { schema })

  return { db, sqlite }
}

/**
 * Close a workspace database cleanly
 */
export function closeDatabase(sqlite: Database.Database): void {
  try {
    // Checkpoint WAL to main database file before closing
    sqlite.pragma('wal_checkpoint(TRUNCATE)')
    sqlite.close()
  } catch (error) {
    console.error('[DB] Error closing database:', error)
    // Force close even if checkpoint fails
    try {
      sqlite.close()
    } catch {
      // Ignore secondary close error
    }
  }
}
