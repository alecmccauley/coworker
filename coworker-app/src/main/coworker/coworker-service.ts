import { eq, isNull, and, desc, sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { getCurrentWorkspace, getCurrentDatabase } from '../workspace'
import { events, coworkers, type Coworker, type NewEvent } from '../database'

/**
 * Input for creating a coworker
 */
export interface CreateCoworkerInput {
  name: string
  description?: string
}

/**
 * Input for updating a coworker
 */
export interface UpdateCoworkerInput {
  name?: string
  description?: string
}

/**
 * Event payload types
 */
interface CoworkerCreatedPayload {
  name: string
  description?: string
}

interface CoworkerUpdatedPayload {
  name?: string
  description?: string
}

interface CoworkerDeletedPayload {
  reason?: string
}

/**
 * Get the next sequence number for events in the current workspace
 */
async function getNextSequence(): Promise<number> {
  const db = getCurrentDatabase()
  const workspace = getCurrentWorkspace()

  if (!db || !workspace) {
    throw new Error('No workspace is currently open')
  }

  const result = await db
    .select({ maxSeq: sql<number>`COALESCE(MAX(seq), 0)` })
    .from(events)
    .where(eq(events.workspaceId, workspace.manifest.id))

  return (result[0]?.maxSeq ?? 0) + 1
}

/**
 * Append an event to the event log
 */
async function appendEvent(
  entityType: string,
  entityId: string,
  eventType: string,
  payload: unknown
): Promise<void> {
  const db = getCurrentDatabase()
  const workspace = getCurrentWorkspace()

  if (!db || !workspace) {
    throw new Error('No workspace is currently open')
  }

  const seq = await getNextSequence()

  const event: NewEvent = {
    id: createId(),
    workspaceId: workspace.manifest.id,
    seq,
    ts: new Date(),
    actor: 'user', // TODO: Get actual user ID when auth is integrated
    entityType,
    entityId,
    eventType,
    payloadJson: JSON.stringify(payload)
  }

  await db.insert(events).values(event)
}

/**
 * Create a new coworker
 */
export async function createCoworker(input: CreateCoworkerInput): Promise<Coworker> {
  const db = getCurrentDatabase()
  const workspace = getCurrentWorkspace()

  if (!db || !workspace) {
    throw new Error('No workspace is currently open')
  }

  const id = createId()
  const now = new Date()

  const payload: CoworkerCreatedPayload = {
    name: input.name,
    description: input.description
  }

  // Append event first (source of truth)
  await appendEvent('coworker', id, 'created', payload)

  // Update projection
  await db.insert(coworkers).values({
    id,
    workspaceId: workspace.manifest.id,
    name: input.name,
    description: input.description ?? null,
    createdAt: now,
    updatedAt: now
  })

  // Return the created coworker
  const result = await db.select().from(coworkers).where(eq(coworkers.id, id))

  return result[0]
}

/**
 * Update an existing coworker
 */
export async function updateCoworker(id: string, input: UpdateCoworkerInput): Promise<Coworker> {
  const db = getCurrentDatabase()
  const workspace = getCurrentWorkspace()

  if (!db || !workspace) {
    throw new Error('No workspace is currently open')
  }

  // Verify coworker exists and belongs to current workspace
  const existing = await db
    .select()
    .from(coworkers)
    .where(and(eq(coworkers.id, id), eq(coworkers.workspaceId, workspace.manifest.id)))

  if (existing.length === 0) {
    throw new Error(`Coworker not found: ${id}`)
  }

  if (existing[0].deletedAt) {
    throw new Error(`Coworker has been deleted: ${id}`)
  }

  const payload: CoworkerUpdatedPayload = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.description !== undefined) payload.description = input.description

  // Append event first (source of truth)
  await appendEvent('coworker', id, 'updated', payload)

  // Update projection
  const updates: Partial<Coworker> = {
    updatedAt: new Date()
  }
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description

  await db.update(coworkers).set(updates).where(eq(coworkers.id, id))

  // Return the updated coworker
  const result = await db.select().from(coworkers).where(eq(coworkers.id, id))

  return result[0]
}

/**
 * Soft delete a coworker
 */
export async function deleteCoworker(id: string): Promise<void> {
  const db = getCurrentDatabase()
  const workspace = getCurrentWorkspace()

  if (!db || !workspace) {
    throw new Error('No workspace is currently open')
  }

  // Verify coworker exists and belongs to current workspace
  const existing = await db
    .select()
    .from(coworkers)
    .where(and(eq(coworkers.id, id), eq(coworkers.workspaceId, workspace.manifest.id)))

  if (existing.length === 0) {
    throw new Error(`Coworker not found: ${id}`)
  }

  if (existing[0].deletedAt) {
    // Already deleted, no-op
    return
  }

  const payload: CoworkerDeletedPayload = {}

  // Append event first (source of truth)
  await appendEvent('coworker', id, 'deleted', payload)

  // Update projection (soft delete)
  await db
    .update(coworkers)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(coworkers.id, id))
}

/**
 * List all active coworkers in the current workspace
 */
export async function listCoworkers(): Promise<Coworker[]> {
  const db = getCurrentDatabase()
  const workspace = getCurrentWorkspace()

  if (!db || !workspace) {
    throw new Error('No workspace is currently open')
  }

  return db
    .select()
    .from(coworkers)
    .where(and(eq(coworkers.workspaceId, workspace.manifest.id), isNull(coworkers.deletedAt)))
    .orderBy(desc(coworkers.createdAt))
}

/**
 * Get a coworker by ID
 */
export async function getCoworkerById(id: string): Promise<Coworker | null> {
  const db = getCurrentDatabase()
  const workspace = getCurrentWorkspace()

  if (!db || !workspace) {
    throw new Error('No workspace is currently open')
  }

  const result = await db
    .select()
    .from(coworkers)
    .where(and(eq(coworkers.id, id), eq(coworkers.workspaceId, workspace.manifest.id)))

  return result[0] ?? null
}
