import Database from 'better-sqlite3'

/**
 * Current schema version
 * Increment this when making schema changes
 */
const CURRENT_SCHEMA_VERSION = 1

/**
 * Run all migrations on a workspace database
 * This uses a simple embedded SQL approach rather than external migration files
 */
export function runMigrations(sqlite: Database.Database): void {
  // Get current schema version
  const currentVersion = getSchemaVersion(sqlite)

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    console.log('[DB] Schema is up to date (version', currentVersion, ')')
    return
  }

  console.log('[DB] Running migrations from version', currentVersion, 'to', CURRENT_SCHEMA_VERSION)

  // Run migrations in a transaction
  sqlite.transaction(() => {
    if (currentVersion < 1) {
      runMigrationV1(sqlite)
    }

    // Add more migrations here as needed:
    // if (currentVersion < 2) { runMigrationV2(sqlite) }

    // Update schema version
    setSchemaVersion(sqlite, CURRENT_SCHEMA_VERSION)
  })()

  console.log('[DB] Migrations complete')
}

/**
 * Get the current schema version from the database
 */
function getSchemaVersion(sqlite: Database.Database): number {
  try {
    const result = sqlite.pragma('user_version') as Array<{ user_version: number }>
    return result[0]?.user_version ?? 0
  } catch {
    return 0
  }
}

/**
 * Set the schema version in the database
 */
function setSchemaVersion(sqlite: Database.Database, version: number): void {
  sqlite.pragma(`user_version = ${version}`)
}

/**
 * Migration V1: Initial schema
 * Creates events and coworkers tables
 */
function runMigrationV1(sqlite: Database.Database): void {
  console.log('[DB] Running migration V1: Initial schema')

  // Events table - append-only event log
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      ts INTEGER NOT NULL,
      actor TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL
    )
  `)

  // Index for querying events by entity
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_entity
    ON events (workspace_id, entity_type, entity_id, seq)
  `)

  // Index for querying events by sequence
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_seq
    ON events (workspace_id, seq)
  `)

  // Coworkers projection table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS coworkers (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )
  `)

  // Index for listing active coworkers
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_coworkers_active
    ON coworkers (workspace_id, deleted_at)
  `)
}
