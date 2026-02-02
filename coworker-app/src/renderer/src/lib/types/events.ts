/**
 * Event entity types
 */
export type EntityType = 'coworker' | 'task' | 'channel'

/**
 * Event types for coworker entities
 */
export type CoworkerEventType = 'created' | 'updated' | 'deleted'

/**
 * Base event structure
 */
export interface BaseEvent {
  id: string
  workspaceId: string
  seq: number
  ts: Date
  actor: string
  entityType: EntityType
  entityId: string
  eventType: string
}

/**
 * Coworker created event payload
 */
export interface CoworkerCreatedPayload {
  name: string
  description?: string
}

/**
 * Coworker updated event payload
 */
export interface CoworkerUpdatedPayload {
  name?: string
  description?: string
}

/**
 * Coworker deleted event payload
 */
export interface CoworkerDeletedPayload {
  reason?: string
}

/**
 * Coworker event union type
 */
export type CoworkerEvent = BaseEvent & {
  entityType: 'coworker'
  eventType: CoworkerEventType
  payload: CoworkerCreatedPayload | CoworkerUpdatedPayload | CoworkerDeletedPayload
}
