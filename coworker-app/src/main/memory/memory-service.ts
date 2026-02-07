import { and, eq, isNull, desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { addBlob } from "../blob/blob-service";
import { addKnowledgeSource, removeKnowledgeSource } from "../knowledge";
import { indexKnowledgeSource } from "../knowledge/indexing/indexing-service";
import {
  getCurrentWorkspace,
  getCurrentDatabase,
  getCurrentSqlite,
} from "../workspace";
import {
  events,
  memories,
  memoryCoworkers,
  type Memory,
  type NewEvent,
} from "../database";

export interface AddMemoryInput {
  content: string;
  coworkerIds: string[];
}

export interface MemoryListItem {
  id: string;
  content: string;
  addedAt: Date;
  sourceId: string;
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

function normalizeMemoryContent(content: string): string {
  return content.trim();
}

async function findExistingMemory(
  content: string,
): Promise<Memory | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.workspaceId, workspace.manifest.id),
        eq(memories.content, content),
        isNull(memories.archivedAt),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

async function addMemoryLink(
  memoryId: string,
  coworkerId: string,
  content: string,
): Promise<void> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(memoryCoworkers)
    .where(
      and(
        eq(memoryCoworkers.memoryId, memoryId),
        eq(memoryCoworkers.coworkerId, coworkerId),
        eq(memoryCoworkers.workspaceId, workspace.manifest.id),
      ),
    );

  if (existing.length > 0) {
    return;
  }

  const blobResult = await addBlob({
    data: content,
    mime: "text/plain",
  });

  const source = await addKnowledgeSource({
    scopeType: "coworker",
    scopeId: coworkerId,
    kind: "memory",
    name: "Memory",
    blobId: blobResult.blob.id,
    metadata: JSON.stringify({ memoryId }),
  });

  const id = createId();
  const now = new Date();

  sqlite.transaction(() => {
    const event = createEventRecord("memory_coworker", id, "linked", {
      memoryId,
      coworkerId,
      sourceId: source.id,
    });
    db.insert(events).values(event).run();
    db.insert(memoryCoworkers)
      .values({
        id,
        workspaceId: workspace.manifest.id,
        memoryId,
        coworkerId,
        sourceId: source.id,
        createdAt: now,
      })
      .run();
  })();

  void indexKnowledgeSource(source.id).catch((error) => {
    console.error("[Memory] Indexing failed:", error);
  });
}

export async function addMemory(input: AddMemoryInput): Promise<Memory> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const normalized = normalizeMemoryContent(input.content);
  if (!normalized) {
    throw new Error("Memory content is required");
  }

  const coworkerIds = Array.from(
    new Set(input.coworkerIds.filter((id) => id.trim().length > 0)),
  );
  if (coworkerIds.length === 0) {
    throw new Error("At least one coworker is required");
  }

  let memory = await findExistingMemory(normalized);
  if (!memory) {
    const id = createId();
    const now = new Date();

    sqlite.transaction(() => {
      const event = createEventRecord("memory", id, "added", {
        content: normalized,
      });
      db.insert(events).values(event).run();
      db.insert(memories)
        .values({
          id,
          workspaceId: workspace.manifest.id,
          content: normalized,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    })();

    const result = await db
      .select()
      .from(memories)
      .where(eq(memories.id, id));
    memory = result[0];
  }

  for (const coworkerId of coworkerIds) {
    await addMemoryLink(memory.id, coworkerId, normalized);
  }

  return memory;
}

export async function listMemoriesForCoworker(
  coworkerId: string,
): Promise<MemoryListItem[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const rows = await db
    .select({
      id: memories.id,
      content: memories.content,
      addedAt: memoryCoworkers.createdAt,
      sourceId: memoryCoworkers.sourceId,
    })
    .from(memoryCoworkers)
    .innerJoin(
      memories,
      and(
        eq(memories.id, memoryCoworkers.memoryId),
        eq(memories.workspaceId, workspace.manifest.id),
        isNull(memories.archivedAt),
      ),
    )
    .where(
      and(
        eq(memoryCoworkers.workspaceId, workspace.manifest.id),
        eq(memoryCoworkers.coworkerId, coworkerId),
      ),
    )
    .orderBy(desc(memoryCoworkers.createdAt));

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    addedAt: row.addedAt,
    sourceId: row.sourceId,
  }));
}

export async function forgetMemory(
  memoryId: string,
  coworkerId: string,
): Promise<void> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(memoryCoworkers)
    .where(
      and(
        eq(memoryCoworkers.memoryId, memoryId),
        eq(memoryCoworkers.coworkerId, coworkerId),
        eq(memoryCoworkers.workspaceId, workspace.manifest.id),
      ),
    );

  if (existing.length === 0) {
    return;
  }

  const link = existing[0];

  sqlite.transaction(() => {
    const event = createEventRecord("memory_coworker", link.id, "deleted", {
      memoryId,
      coworkerId,
    });
    db.insert(events).values(event).run();
    db.delete(memoryCoworkers).where(eq(memoryCoworkers.id, link.id)).run();
  })();

  await removeKnowledgeSource(link.sourceId);

  const remaining = await db
    .select({ id: memoryCoworkers.id })
    .from(memoryCoworkers)
    .where(
      and(
        eq(memoryCoworkers.memoryId, memoryId),
        eq(memoryCoworkers.workspaceId, workspace.manifest.id),
      ),
    );

  if (remaining.length === 0) {
    sqlite.transaction(() => {
      const event = createEventRecord("memory", memoryId, "forgotten", {});
      db.insert(events).values(event).run();
      db.update(memories)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(memories.id, memoryId))
        .run();
    })();
  }
}
