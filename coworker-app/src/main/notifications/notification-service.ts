import { and, eq, isNull, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { getCurrentDatabase, getCurrentSqlite, getCurrentWorkspace } from "../workspace";
import { events, messages, threads, type NewEvent } from "../database";

interface ThreadReadPayload {
  lastReadAt: string;
}

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

export async function markThreadRead(
  threadId: string,
  readAt?: Date,
): Promise<void> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const timestamp = readAt ?? new Date();
  const payload: ThreadReadPayload = { lastReadAt: timestamp.toISOString() };

  sqlite.transaction(() => {
    const event = createEventRecord("thread", threadId, "read", payload);
    db.insert(events).values(event).run();
    db.update(threads)
      .set({
        lastReadAt: timestamp,
      })
      .where(
        and(eq(threads.id, threadId), eq(threads.workspaceId, workspace.manifest.id)),
      )
      .run();
  })();
}

export async function getUnreadCountsByChannel(): Promise<Record<string, number>> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const rows = await db
    .select({
      channelId: threads.channelId,
      count: sql<number>`COUNT(1)`,
    })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .where(
      and(
        eq(messages.workspaceId, workspace.manifest.id),
        eq(messages.authorType, "coworker"),
        eq(messages.status, "complete"),
        isNull(threads.archivedAt),
        sql`${messages.createdAt} > COALESCE(${threads.lastReadAt}, 0)`,
      ),
    )
    .groupBy(threads.channelId);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.channelId] = row.count ?? 0;
  }
  return result;
}

export async function getUnreadCountsByThread(
  channelId: string,
): Promise<Record<string, number>> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const rows = await db
    .select({
      threadId: threads.id,
      count: sql<number>`COUNT(1)`,
    })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .where(
      and(
        eq(messages.workspaceId, workspace.manifest.id),
        eq(messages.authorType, "coworker"),
        eq(messages.status, "complete"),
        isNull(threads.archivedAt),
        eq(threads.channelId, channelId),
        sql`${messages.createdAt} > COALESCE(${threads.lastReadAt}, 0)`,
      ),
    )
    .groupBy(threads.id);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.threadId] = row.count ?? 0;
  }
  return result;
}
