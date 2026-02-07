import { eq, and, asc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  getCurrentWorkspace,
  getCurrentDatabase,
  getCurrentSqlite,
} from "../workspace";
import {
  events,
  messages,
  type Message,
  type NewEvent,
  type AuthorType,
  type MessageStatus,
} from "../database";

/**
 * Input for creating a message
 */
export interface CreateMessageInput {
  threadId: string;
  authorType: AuthorType;
  authorId?: string;
  contentShort?: string;
  contentRef?: string;
  status?: MessageStatus;
}

/**
 * Input for updating a message
 */
export interface UpdateMessageInput {
  contentShort?: string;
  contentRef?: string;
  status?: MessageStatus;
}

/**
 * Event payload types
 */
interface MessageCreatedPayload {
  threadId: string;
  authorType: string;
  authorId?: string;
  contentShort?: string;
  contentRef?: string;
  status?: string;
}

interface MessageUpdatedPayload {
  contentShort?: string;
  contentRef?: string;
  status?: string;
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
 * Create a new message
 */
export async function createMessage(
  input: CreateMessageInput,
): Promise<Message> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const id = createId();
  const now = new Date();

  const payload: MessageCreatedPayload = {
    threadId: input.threadId,
    authorType: input.authorType,
    authorId: input.authorId,
    contentShort: input.contentShort,
    contentRef: input.contentRef,
    status: input.status,
  };

  sqlite.transaction(() => {
    const event = createEventRecord("message", id, "created", payload);
    db.insert(events).values(event).run();

    db.insert(messages)
      .values({
        id,
        workspaceId: workspace.manifest.id,
        threadId: input.threadId,
        authorType: input.authorType,
        authorId: input.authorId ?? null,
        contentShort: input.contentShort ?? null,
        contentRef: input.contentRef ?? null,
        status: input.status ?? "complete",
        createdAt: now,
        updatedAt: now,
      })
      .run();
  })();

  const result = await db.select().from(messages).where(eq(messages.id, id));
  return result[0];
}

/**
 * Update an existing message
 */
export async function updateMessage(
  id: string,
  input: UpdateMessageInput,
): Promise<Message> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(messages)
    .where(
      and(eq(messages.id, id), eq(messages.workspaceId, workspace.manifest.id)),
    );

  if (existing.length === 0) {
    throw new Error(`Message not found: ${id}`);
  }

  const payload: MessageUpdatedPayload = {};
  const updates: Partial<Message> = { updatedAt: new Date() };

  if (input.contentShort !== undefined) {
    payload.contentShort = input.contentShort;
    updates.contentShort = input.contentShort;
  }
  if (input.contentRef !== undefined) {
    payload.contentRef = input.contentRef;
    updates.contentRef = input.contentRef;
  }
  if (input.status !== undefined) {
    payload.status = input.status;
    updates.status = input.status;
  }

  sqlite.transaction(() => {
    const event = createEventRecord("message", id, "updated", payload);
    db.insert(events).values(event).run();
    db.update(messages).set(updates).where(eq(messages.id, id)).run();
  })();

  const result = await db.select().from(messages).where(eq(messages.id, id));
  return result[0];
}

/**
 * List all messages in a thread
 */
export async function listMessages(threadId: string): Promise<Message[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  return db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.workspaceId, workspace.manifest.id),
        eq(messages.threadId, threadId),
      ),
    )
    .orderBy(asc(messages.createdAt));
}

/**
 * Count messages in a thread
 */
export async function getThreadMessageCount(
  threadId: string,
): Promise<number> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(messages)
    .where(
      and(
        eq(messages.workspaceId, workspace.manifest.id),
        eq(messages.threadId, threadId),
      ),
    )
    .get();

  return (result as { count: number } | undefined)?.count ?? 0;
}

/**
 * Get a message by ID
 */
export async function getMessageById(id: string): Promise<Message | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = await db
    .select()
    .from(messages)
    .where(
      and(eq(messages.id, id), eq(messages.workspaceId, workspace.manifest.id)),
    );

  return result[0] ?? null;
}
