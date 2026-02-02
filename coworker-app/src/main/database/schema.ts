import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * Events table - append-only event log for event sourcing
 * This is the source of truth for all workspace data
 */
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  seq: integer('seq').notNull(), // Sequence number within workspace
  ts: integer('ts', { mode: 'timestamp_ms' }).notNull(), // Timestamp
  actor: text('actor').notNull(), // Who performed the action (user id or 'system')
  entityType: text('entity_type').notNull(), // 'coworker', 'task', etc.
  entityId: text('entity_id').notNull(), // ID of the entity being modified
  eventType: text('event_type').notNull(), // 'created', 'updated', 'deleted'
  payloadJson: text('payload_json').notNull() // JSON payload of the event
})

/**
 * Coworkers projection table - materialized view derived from events
 * This table is rebuilt from events and used for fast queries
 */
export const coworkers = sqliteTable('coworkers', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }) // Soft delete
})

// Type exports
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type Coworker = typeof coworkers.$inferSelect
export type NewCoworker = typeof coworkers.$inferInsert
