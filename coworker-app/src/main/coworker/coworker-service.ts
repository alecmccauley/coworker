import { eq, isNull, and, desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  getCurrentWorkspace,
  getCurrentDatabase,
  getCurrentSqlite,
} from "../workspace";
import { events, coworkers, type Coworker, type NewEvent } from "../database";

/**
 * Input for creating a coworker
 */
export interface CreateCoworkerInput {
  name: string;
  description?: string;
  rolePrompt?: string;
  defaultsJson?: string;
  templateId?: string;
  templateVersion?: number;
}

/**
 * Input for updating a coworker
 */
export interface UpdateCoworkerInput {
  name?: string;
  description?: string;
  rolePrompt?: string;
  defaultsJson?: string;
}

/**
 * Event payload types
 */
interface CoworkerCreatedPayload {
  name: string;
  description?: string;
  rolePrompt?: string;
  defaultsJson?: string;
  templateId?: string;
  templateVersion?: number;
}

interface CoworkerUpdatedPayload {
  name?: string;
  description?: string;
  rolePrompt?: string;
  defaultsJson?: string;
}

interface CoworkerArchivedPayload {
  reason?: string;
}

/**
 * Get the next sequence number for events in the current workspace (synchronous for transactions)
 */
function getNextSequenceSync(): number {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = db
    .select({ maxSeq: sql<number>`COALESCE(MAX(seq), 0)` })
    .from(events)
    .where(eq(events.workspaceId, workspace.manifest.id))
    .get();

  return ((result as { maxSeq: number } | undefined)?.maxSeq ?? 0) + 1;
}

/**
 * Create event record (used within transactions)
 */
function createEventRecord(
  entityType: string,
  entityId: string,
  eventType: string,
  payload: unknown,
): NewEvent {
  const workspace = getCurrentWorkspace();

  if (!workspace) {
    throw new Error("No workspace is currently open");
  }

  const seq = getNextSequenceSync();

  return {
    id: createId(),
    workspaceId: workspace.manifest.id,
    seq,
    ts: new Date(),
    actor: "user", // TODO: Get actual user ID when auth is integrated
    entityType,
    entityId,
    eventType,
    payloadJson: JSON.stringify(payload),
  };
}

/**
 * Create a new coworker
 * Uses atomic transaction for event + projection update
 */
export async function createCoworker(
  input: CreateCoworkerInput,
): Promise<Coworker> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const id = createId();
  const now = new Date();

  const payload: CoworkerCreatedPayload = {
    name: input.name,
    description: input.description,
    rolePrompt: input.rolePrompt,
    defaultsJson: input.defaultsJson,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
  };

  // Atomic transaction: append event + update projection
  sqlite.transaction(() => {
    const event = createEventRecord("coworker", id, "created", payload);
    db.insert(events).values(event).run();

    db.insert(coworkers)
      .values({
        id,
        workspaceId: workspace.manifest.id,
        name: input.name,
        description: input.description ?? null,
        rolePrompt: input.rolePrompt ?? null,
        defaultsJson: input.defaultsJson ?? null,
        templateId: input.templateId ?? null,
        templateVersion: input.templateVersion ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  })();

  // Return the created coworker
  const result = await db.select().from(coworkers).where(eq(coworkers.id, id));

  return result[0];
}

/**
 * Update an existing coworker
 * Uses atomic transaction for event + projection update
 */
export async function updateCoworker(
  id: string,
  input: UpdateCoworkerInput,
): Promise<Coworker> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  // Verify coworker exists and belongs to current workspace
  const existing = await db
    .select()
    .from(coworkers)
    .where(
      and(
        eq(coworkers.id, id),
        eq(coworkers.workspaceId, workspace.manifest.id),
      ),
    );

  if (existing.length === 0) {
    throw new Error(`Coworker not found: ${id}`);
  }

  if (existing[0].archivedAt) {
    throw new Error(`Coworker has been archived: ${id}`);
  }

  const payload: CoworkerUpdatedPayload = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description;
  if (input.rolePrompt !== undefined) payload.rolePrompt = input.rolePrompt;
  if (input.defaultsJson !== undefined)
    payload.defaultsJson = input.defaultsJson;

  // Build update data
  const updates: Partial<Coworker> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.rolePrompt !== undefined) updates.rolePrompt = input.rolePrompt;
  if (input.defaultsJson !== undefined)
    updates.defaultsJson = input.defaultsJson;

  // Atomic transaction: append event + update projection
  sqlite.transaction(() => {
    const event = createEventRecord("coworker", id, "updated", payload);
    db.insert(events).values(event).run();

    db.update(coworkers).set(updates).where(eq(coworkers.id, id)).run();
  })();

  // Return the updated coworker
  const result = await db.select().from(coworkers).where(eq(coworkers.id, id));

  return result[0];
}

/**
 * Archive a coworker (soft delete)
 * Uses atomic transaction for event + projection update
 */
export async function archiveCoworker(id: string): Promise<void> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  // Verify coworker exists and belongs to current workspace
  const existing = await db
    .select()
    .from(coworkers)
    .where(
      and(
        eq(coworkers.id, id),
        eq(coworkers.workspaceId, workspace.manifest.id),
      ),
    );

  if (existing.length === 0) {
    throw new Error(`Coworker not found: ${id}`);
  }

  if (existing[0].archivedAt) {
    // Already archived, no-op
    return;
  }

  const payload: CoworkerArchivedPayload = {};

  // Atomic transaction: append event + update projection
  sqlite.transaction(() => {
    const event = createEventRecord("coworker", id, "archived", payload);
    db.insert(events).values(event).run();

    db.update(coworkers)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(coworkers.id, id))
      .run();
  })();
}

/**
 * Delete a coworker (alias for archiveCoworker for backward compatibility)
 */
export async function deleteCoworker(id: string): Promise<void> {
  return archiveCoworker(id);
}

/**
 * List all active coworkers in the current workspace
 */
export async function listCoworkers(): Promise<Coworker[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  return db
    .select()
    .from(coworkers)
    .where(
      and(
        eq(coworkers.workspaceId, workspace.manifest.id),
        isNull(coworkers.archivedAt),
      ),
    )
    .orderBy(desc(coworkers.createdAt));
}

/**
 * Get a coworker by ID
 */
export async function getCoworkerById(id: string): Promise<Coworker | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = await db
    .select()
    .from(coworkers)
    .where(
      and(
        eq(coworkers.id, id),
        eq(coworkers.workspaceId, workspace.manifest.id),
      ),
    );

  return result[0] ?? null;
}
