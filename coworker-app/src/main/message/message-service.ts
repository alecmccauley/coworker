import { eq, and, asc, desc, isNull, like, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  getCurrentWorkspace,
  getCurrentDatabase,
  getCurrentSqlite,
} from "../workspace";
import {
  events,
  channels,
  messages,
  threads,
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
  replyToMessageId?: string;
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
  replyToMessageId?: string;
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
    replyToMessageId: input.replyToMessageId,
    contentShort: input.contentShort,
    contentRef: input.contentRef,
    status: input.status,
  };

  if (input.replyToMessageId) {
    if (input.replyToMessageId === id) {
      throw new Error("A message cannot reply to itself.");
    }

    const replyTarget = await db
      .select({
        id: messages.id,
        threadId: messages.threadId,
        workspaceId: messages.workspaceId,
      })
      .from(messages)
      .where(
        and(
          eq(messages.id, input.replyToMessageId),
          eq(messages.workspaceId, workspace.manifest.id),
        ),
      )
      .get();

    if (!replyTarget) {
      throw new Error(`Reply target message not found: ${input.replyToMessageId}`);
    }

    if (replyTarget.threadId !== input.threadId) {
      throw new Error("Reply target must belong to the same thread.");
    }
  }

  sqlite.transaction(() => {
    const event = createEventRecord("message", id, "created", payload);
    db.insert(events).values(event).run();

    db.insert(messages)
      .values({
        id,
        workspaceId: workspace.manifest.id,
        threadId: input.threadId,
        replyToMessageId: input.replyToMessageId ?? null,
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

/**
 * A document found within a channel's threads
 */
export interface ChannelDocument {
  messageId: string;
  threadId: string;
  threadTitle: string | null;
  authorId: string | null;
  contentShort: string;
  createdAt: Date;
}

/**
 * A document found within the workspace
 */
export interface WorkspaceDocument {
  messageId: string;
  threadId: string;
  threadTitle: string | null;
  channelId: string;
  channelName: string;
  authorId: string | null;
  contentShort: string;
  createdAt: Date;
}

/**
 * List all completed document messages across threads in a channel
 */
export async function listDocumentsByChannel(
  channelId: string,
): Promise<ChannelDocument[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const results = db
    .select({
      messageId: messages.id,
      threadId: threads.id,
      threadTitle: threads.title,
      authorId: messages.authorId,
      contentShort: messages.contentShort,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .where(
      and(
        eq(threads.channelId, channelId),
        eq(threads.workspaceId, workspace.manifest.id),
        isNull(threads.archivedAt),
        eq(messages.status, "complete"),
        like(messages.contentShort, '%"_type":"document"%'),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .all();

  return results as ChannelDocument[];
}

/**
 * List all completed document messages across the workspace
 */
export async function listDocumentsByWorkspace(): Promise<WorkspaceDocument[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const results = db
    .select({
      messageId: messages.id,
      threadId: threads.id,
      threadTitle: threads.title,
      channelId: threads.channelId,
      channelName: channels.name,
      authorId: messages.authorId,
      contentShort: messages.contentShort,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .innerJoin(channels, eq(threads.channelId, channels.id))
    .where(
      and(
        eq(threads.workspaceId, workspace.manifest.id),
        isNull(threads.archivedAt),
        eq(messages.status, "complete"),
        like(messages.contentShort, '%"_type":"document"%'),
        like(messages.contentShort, '%"blobId"%'),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .all();

  return results as WorkspaceDocument[];
}
