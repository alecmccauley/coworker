import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Events table - append-only event log for event sourcing
 * This is the source of truth for all workspace data
 */
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  seq: integer("seq").notNull(), // Sequence number within workspace
  ts: integer("ts", { mode: "timestamp_ms" }).notNull(), // Timestamp
  actor: text("actor").notNull(), // Who performed the action (user id or 'system')
  entityType: text("entity_type").notNull(), // 'coworker', 'channel', 'thread', 'message', 'knowledge', 'blob'
  entityId: text("entity_id").notNull(), // ID of the entity being modified
  eventType: text("event_type").notNull(), // 'created', 'updated', 'deleted', 'archived', 'pinned', etc.
  payloadJson: text("payload_json").notNull(), // JSON payload of the event
});

/**
 * Coworkers projection table - materialized view derived from events
 * Extended with role prompt, defaults, and template reference
 */
export const coworkers = sqliteTable("coworkers", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  rolePrompt: text("role_prompt"), // Core behavioral prompt
  defaultsJson: text("defaults_json"), // JSON with tone, formatting, guardrails
  model: text("model"), // AI model identifier (optional override)
  templateId: text("template_id"), // Cloud template reference
  templateVersion: integer("template_version"), // Version of template when created
  templateDescription: text("template_description"), // Snapshot of template description at creation time
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }), // Soft delete (renamed from deletedAt)
});

/**
 * Channels projection table - project containers
 */
export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  purpose: text("purpose"), // 1-line description
  pinnedJson: text("pinned_json"), // JSON array of pinned item refs
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
});

/**
 * Threads projection table - conversation sessions within channels
 */
export const threads = sqliteTable("threads", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  channelId: text("channel_id").notNull(),
  title: text("title"), // Auto-generated or user-set title
  summaryRef: text("summary_ref"), // Blob ref for auto-generated summary
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
});

/**
 * Messages projection table - conversation content
 */
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  threadId: text("thread_id").notNull(),
  authorType: text("author_type").notNull(), // 'user' | 'coworker' | 'system'
  authorId: text("author_id"), // coworker ID if authorType='coworker'
  contentRef: text("content_ref"), // Blob ref for large content
  contentShort: text("content_short"), // Inline content for small messages
  status: text("status").default("complete"), // 'pending' | 'streaming' | 'complete' | 'error'
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Knowledge items projection table - scoped "cards" of extracted/summarized knowledge
 */
export const knowledgeItems = sqliteTable("knowledge_items", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  scopeType: text("scope_type").notNull(), // 'workspace' | 'channel' | 'coworker'
  scopeId: text("scope_id"), // channel/coworker ID (null for workspace scope)
  title: text("title").notNull(),
  summary: text("summary"), // AI-generated summary
  contentRef: text("content_ref"), // Blob ref for full content
  isPinned: integer("is_pinned", { mode: "boolean" }).default(false),
  sourceIds: text("source_ids"), // JSON array of source IDs
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
});

/**
 * Knowledge sources projection table - raw inputs (files, text, URLs)
 */
export const knowledgeSources = sqliteTable("knowledge_sources", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  scopeType: text("scope_type"),
  scopeId: text("scope_id"),
  kind: text("kind").notNull(), // 'text' | 'file' | 'url'
  name: text("name"), // Display name
  blobId: text("blob_id"), // Reference to blobs table
  extractedTextRef: text("extracted_text_ref"), // Blob ref for extracted/processed text
  contentHash: text("content_hash"), // SHA256 of blob at last extraction
  indexStatus: text("index_status"), // 'pending' | 'processing' | 'ready' | 'error'
  indexError: text("index_error"), // Error message from indexing failure
  indexedAt: integer("indexed_at", { mode: "timestamp_ms" }),
  metadata: text("metadata"), // JSON metadata (URL, file info, etc.)
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  notes: text("notes"),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
});

/**
 * Source text table - extracted plain/rich text for a source
 */
export const sourceText = sqliteTable("source_text", {
  sourceId: text("source_id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  text: text("text").notNull(),
  richText: text("rich_text"),
  extractionVersion: integer("extraction_version").notNull(),
  warningsJson: text("warnings_json"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Source chunks table - chunked text for retrieval
 */
export const sourceChunks = sqliteTable("source_chunks", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  sourceId: text("source_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  text: text("text").notNull(),
  startChar: integer("start_char"),
  endChar: integer("end_char"),
  tokenCount: integer("token_count"),
});

/**
 * Blobs projection table - metadata for files stored in blobs/ folder
 */
export const blobs = sqliteTable("blobs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  path: text("path").notNull(), // Relative path within blobs/
  mime: text("mime"), // MIME type
  size: integer("size"), // Size in bytes
  sha256: text("sha256"), // Hash for deduplication
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Channel-Coworker relationship table - which coworkers are assigned to which channels
 */
export const channelCoworkers = sqliteTable("channel_coworkers", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  channelId: text("channel_id").notNull(),
  coworkerId: text("coworker_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// Type exports - Events
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// Type exports - Coworkers
export type Coworker = typeof coworkers.$inferSelect;
export type NewCoworker = typeof coworkers.$inferInsert;

// Type exports - Channels
export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;

// Type exports - Threads
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;

// Type exports - Messages
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

// Type exports - Knowledge Items
export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type NewKnowledgeItem = typeof knowledgeItems.$inferInsert;

// Type exports - Knowledge Sources
export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type NewKnowledgeSource = typeof knowledgeSources.$inferInsert;

// Type exports - Source Text
export type SourceText = typeof sourceText.$inferSelect;
export type NewSourceText = typeof sourceText.$inferInsert;

// Type exports - Source Chunks
export type SourceChunk = typeof sourceChunks.$inferSelect;
export type NewSourceChunk = typeof sourceChunks.$inferInsert;

// Type exports - Blobs
export type Blob = typeof blobs.$inferSelect;
export type NewBlob = typeof blobs.$inferInsert;

// Type exports - Channel Coworkers
export type ChannelCoworker = typeof channelCoworkers.$inferSelect;
export type NewChannelCoworker = typeof channelCoworkers.$inferInsert;

// Entity type enumeration for event sourcing
export type EntityType =
  | "coworker"
  | "channel"
  | "thread"
  | "message"
  | "knowledge"
  | "knowledge_source"
  | "blob";

// Scope type for knowledge items
export type ScopeType = "workspace" | "channel" | "coworker";
export type SourceScopeType = "workspace" | "channel" | "coworker" | "thread";

// Author type for messages
export type AuthorType = "user" | "coworker" | "system";

// Message status
export type MessageStatus = "pending" | "streaming" | "complete" | "error";
