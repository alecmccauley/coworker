import { eq, isNull, and, desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  getCurrentWorkspace,
  getCurrentDatabase,
  getCurrentSqlite,
} from "../workspace";
import { events, threads, type Thread, type NewEvent } from "../database";

/**
 * Input for creating a thread
 */
export interface CreateThreadInput {
  channelId: string;
  title?: string;
}

/**
 * Input for updating a thread
 */
export interface UpdateThreadInput {
  title?: string;
  summaryRef?: string;
}

/**
 * Event payload types
 */
interface ThreadCreatedPayload {
  channelId: string;
  title?: string;
}

interface ThreadUpdatedPayload {
  title?: string;
  summaryRef?: string;
}

interface ThreadArchivedPayload {
  reason?: string;
}

/**
 * Get the next sequence number for events (synchronous for transactions)
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
    actor: "user",
    entityType,
    entityId,
    eventType,
    payloadJson: JSON.stringify(payload),
  };
}

/**
 * Create a new thread
 */
export async function createThread(input: CreateThreadInput): Promise<Thread> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const id = createId();
  const now = new Date();

  const payload: ThreadCreatedPayload = {
    channelId: input.channelId,
    title: input.title,
  };

  sqlite.transaction(() => {
    const event = createEventRecord("thread", id, "created", payload);
    db.insert(events).values(event).run();

    db.insert(threads)
      .values({
        id,
        workspaceId: workspace.manifest.id,
        channelId: input.channelId,
        title: input.title ?? null,
        summaryRef: null,
        lastReadAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  })();

  const result = await db.select().from(threads).where(eq(threads.id, id));
  return result[0];
}

/**
 * Update an existing thread
 */
export async function updateThread(
  id: string,
  input: UpdateThreadInput,
): Promise<Thread> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(threads)
    .where(
      and(eq(threads.id, id), eq(threads.workspaceId, workspace.manifest.id)),
    );

  if (existing.length === 0) {
    throw new Error(`Thread not found: ${id}`);
  }

  if (existing[0].archivedAt) {
    throw new Error(`Thread has been archived: ${id}`);
  }

  const payload: ThreadUpdatedPayload = {};
  const updates: Partial<Thread> = { updatedAt: new Date() };

  if (input.title !== undefined) {
    payload.title = input.title;
    updates.title = input.title;
  }
  if (input.summaryRef !== undefined) {
    payload.summaryRef = input.summaryRef;
    updates.summaryRef = input.summaryRef;
  }

  sqlite.transaction(() => {
    const event = createEventRecord("thread", id, "updated", payload);
    db.insert(events).values(event).run();
    db.update(threads).set(updates).where(eq(threads.id, id)).run();
  })();

  const result = await db.select().from(threads).where(eq(threads.id, id));
  return result[0];
}

/**
 * Archive a thread
 */
export async function archiveThread(id: string): Promise<void> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(threads)
    .where(
      and(eq(threads.id, id), eq(threads.workspaceId, workspace.manifest.id)),
    );

  if (existing.length === 0) {
    throw new Error(`Thread not found: ${id}`);
  }

  if (existing[0].archivedAt) {
    return; // Already archived
  }

  const payload: ThreadArchivedPayload = {};

  sqlite.transaction(() => {
    const event = createEventRecord("thread", id, "archived", payload);
    db.insert(events).values(event).run();
    db.update(threads)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(threads.id, id))
      .run();
  })();
}

/**
 * List all active threads in a channel
 */
export async function listThreads(channelId: string): Promise<Thread[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  return db
    .select()
    .from(threads)
    .where(
      and(
        eq(threads.workspaceId, workspace.manifest.id),
        eq(threads.channelId, channelId),
        isNull(threads.archivedAt),
      ),
    )
    .orderBy(desc(threads.updatedAt));
}

/**
 * Get a thread by ID
 */
export async function getThreadById(id: string): Promise<Thread | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = await db
    .select()
    .from(threads)
    .where(
      and(eq(threads.id, id), eq(threads.workspaceId, workspace.manifest.id)),
    );

  return result[0] ?? null;
}
