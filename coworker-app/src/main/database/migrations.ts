import Database from "better-sqlite3";

/**
 * Current schema version
 * Increment this when making schema changes
 */
const CURRENT_SCHEMA_VERSION = 3;

/**
 * Run all migrations on a workspace database
 * This uses a simple embedded SQL approach rather than external migration files
 */
export function runMigrations(sqlite: Database.Database): void {
  // Get current schema version
  const currentVersion = getSchemaVersion(sqlite);

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    console.log("[DB] Schema is up to date (version", currentVersion, ")");
    return;
  }

  console.log(
    "[DB] Running migrations from version",
    currentVersion,
    "to",
    CURRENT_SCHEMA_VERSION,
  );

  // Run migrations in a transaction
  sqlite.transaction(() => {
    if (currentVersion < 1) {
      runMigrationV1(sqlite);
    }

    if (currentVersion < 2) {
      runMigrationV2(sqlite);
    }

    if (currentVersion < 3) {
      runMigrationV3(sqlite);
    }

    // Update schema version
    setSchemaVersion(sqlite, CURRENT_SCHEMA_VERSION);
  })();

  console.log("[DB] Migrations complete");
}

/**
 * Get the current schema version from the database
 */
function getSchemaVersion(sqlite: Database.Database): number {
  try {
    const result = sqlite.pragma("user_version") as Array<{
      user_version: number;
    }>;
    return result[0]?.user_version ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Set the schema version in the database
 */
function setSchemaVersion(sqlite: Database.Database, version: number): void {
  sqlite.pragma(`user_version = ${version}`);
}

/**
 * Migration V1: Initial schema
 * Creates events and coworkers tables
 */
function runMigrationV1(sqlite: Database.Database): void {
  console.log("[DB] Running migration V1: Initial schema");

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
  `);

  // Index for querying events by entity
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_entity
    ON events (workspace_id, entity_type, entity_id, seq)
  `);

  // Index for querying events by sequence
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_seq
    ON events (workspace_id, seq)
  `);

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
  `);

  // Index for listing active coworkers
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_coworkers_active
    ON coworkers (workspace_id, deleted_at)
  `);
}

/**
 * Migration V2: Extended schema
 * Adds channels, threads, messages, knowledge, and blob tables
 * Extends coworkers with role prompt and template fields
 */
function runMigrationV2(sqlite: Database.Database): void {
  console.log("[DB] Running migration V2: Extended schema");

  // Extend coworkers table with new columns
  sqlite.exec(`
    ALTER TABLE coworkers ADD COLUMN role_prompt TEXT
  `);
  sqlite.exec(`
    ALTER TABLE coworkers ADD COLUMN defaults_json TEXT
  `);
  sqlite.exec(`
    ALTER TABLE coworkers ADD COLUMN template_id TEXT
  `);
  sqlite.exec(`
    ALTER TABLE coworkers ADD COLUMN template_version INTEGER
  `);

  // Rename deleted_at to archived_at for consistency
  sqlite.exec(`
    ALTER TABLE coworkers RENAME COLUMN deleted_at TO archived_at
  `);

  // Channels projection table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      purpose TEXT,
      pinned_json TEXT,
      is_default INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER
    )
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_channels_workspace
    ON channels (workspace_id, archived_at)
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_channels_sort
    ON channels (workspace_id, sort_order)
  `);

  // Threads projection table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      title TEXT,
      summary_ref TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER
    )
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_threads_channel
    ON threads (channel_id, archived_at)
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_threads_workspace
    ON threads (workspace_id, archived_at)
  `);

  // Messages projection table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      author_type TEXT NOT NULL,
      author_id TEXT,
      content_ref TEXT,
      content_short TEXT,
      status TEXT DEFAULT 'complete',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_thread
    ON messages (thread_id, created_at)
  `);

  // Knowledge items projection table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_items (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      scope_id TEXT,
      title TEXT NOT NULL,
      summary TEXT,
      content_ref TEXT,
      is_pinned INTEGER DEFAULT 0,
      source_ids TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER
    )
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_items_workspace
    ON knowledge_items (workspace_id, archived_at)
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_items_scope
    ON knowledge_items (scope_type, scope_id, archived_at)
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_items_pinned
    ON knowledge_items (workspace_id, is_pinned, archived_at)
  `);

  // Knowledge sources projection table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_sources (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      name TEXT,
      blob_id TEXT,
      extracted_text_ref TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_sources_workspace
    ON knowledge_sources (workspace_id)
  `);

  // Blobs projection table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS blobs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      path TEXT NOT NULL,
      mime TEXT,
      size INTEGER,
      sha256 TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_blobs_workspace
    ON blobs (workspace_id)
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_blobs_hash
    ON blobs (sha256)
  `);
}

/**
 * Migration V3: Add template_description to coworkers
 */
function runMigrationV3(sqlite: Database.Database): void {
  console.log("[DB] Running migration V3: Add template_description to coworkers");
  sqlite.exec(`
    ALTER TABLE coworkers ADD COLUMN template_description TEXT
  `);
}
