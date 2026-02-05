import { eq, isNull, and, desc, sql, ne } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { addBlob, deleteBlob } from "../blob/blob-service";
import {
  getCurrentWorkspace,
  getCurrentDatabase,
  getCurrentSqlite,
} from "../workspace";
import {
  events,
  knowledgeItems,
  knowledgeSources,
  type KnowledgeItem,
  type KnowledgeSource,
  type NewEvent,
  type ScopeType,
  type SourceScopeType,
} from "../database";

/**
 * Input for adding a knowledge item
 */
export interface AddKnowledgeItemInput {
  scopeType: ScopeType;
  scopeId?: string;
  title: string;
  summary?: string;
  contentRef?: string;
  isPinned?: boolean;
  sourceIds?: string[];
}

/**
 * Input for updating a knowledge item
 */
export interface UpdateKnowledgeItemInput {
  title?: string;
  summary?: string;
  contentRef?: string;
  isPinned?: boolean;
  sourceIds?: string[];
}

/**
 * Input for adding a knowledge source
 */
export interface AddKnowledgeSourceInput {
  scopeType: SourceScopeType;
  scopeId?: string;
  kind: "text" | "file" | "url";
  name?: string;
  blobId?: string;
  extractedTextRef?: string;
  metadata?: string;
  notes?: string;
}

/**
 * Input for updating a knowledge source
 */
export interface UpdateKnowledgeSourceInput {
  name?: string;
  notes?: string | null;
}

/**
 * Input for adding a file-based knowledge source
 */
export interface AddFileKnowledgeSourceInput {
  scopeType: SourceScopeType;
  scopeId?: string;
  filename: string;
  data: Buffer;
  mime: string;
  notes?: string;
}

/**
 * Event payload types
 */
interface KnowledgeItemAddedPayload {
  scopeType: string;
  scopeId?: string;
  title: string;
  summary?: string;
  contentRef?: string;
  isPinned?: boolean;
  sourceIds?: string[];
}

interface KnowledgeItemUpdatedPayload {
  title?: string;
  summary?: string;
  contentRef?: string;
  isPinned?: boolean;
  sourceIds?: string[];
}

interface KnowledgeItemRemovedPayload {
  reason?: string;
}

interface KnowledgeSourceAddedPayload {
  scopeType: string;
  scopeId?: string;
  kind: string;
  name?: string;
  blobId?: string;
  extractedTextRef?: string;
  metadata?: string;
  notes?: string;
}

interface KnowledgeSourceUpdatedPayload {
  name?: string;
  notes?: string;
}

interface KnowledgeSourceRemovedPayload {
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
 * Add a new knowledge item
 */
export async function addKnowledgeItem(
  input: AddKnowledgeItemInput,
): Promise<KnowledgeItem> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const id = createId();
  const now = new Date();

  const payload: KnowledgeItemAddedPayload = {
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    title: input.title,
    summary: input.summary,
    contentRef: input.contentRef,
    isPinned: input.isPinned,
    sourceIds: input.sourceIds,
  };

  sqlite.transaction(() => {
    const event = createEventRecord("knowledge", id, "added", payload);
    db.insert(events).values(event).run();

    db.insert(knowledgeItems)
      .values({
        id,
        workspaceId: workspace.manifest.id,
        scopeType: input.scopeType,
        scopeId: input.scopeId ?? null,
        title: input.title,
        summary: input.summary ?? null,
        contentRef: input.contentRef ?? null,
        isPinned: input.isPinned ?? false,
        sourceIds: input.sourceIds ? JSON.stringify(input.sourceIds) : null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  })();

  const result = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.id, id));
  return result[0];
}

/**
 * Update a knowledge item
 */
export async function updateKnowledgeItem(
  id: string,
  input: UpdateKnowledgeItemInput,
): Promise<KnowledgeItem> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(knowledgeItems)
    .where(
      and(
        eq(knowledgeItems.id, id),
        eq(knowledgeItems.workspaceId, workspace.manifest.id),
      ),
    );

  if (existing.length === 0) {
    throw new Error(`Knowledge item not found: ${id}`);
  }

  if (existing[0].archivedAt) {
    throw new Error(`Knowledge item has been removed: ${id}`);
  }

  const payload: KnowledgeItemUpdatedPayload = {};
  const updates: Partial<KnowledgeItem> = { updatedAt: new Date() };

  if (input.title !== undefined) {
    payload.title = input.title;
    updates.title = input.title;
  }
  if (input.summary !== undefined) {
    payload.summary = input.summary;
    updates.summary = input.summary;
  }
  if (input.contentRef !== undefined) {
    payload.contentRef = input.contentRef;
    updates.contentRef = input.contentRef;
  }
  if (input.isPinned !== undefined) {
    payload.isPinned = input.isPinned;
    updates.isPinned = input.isPinned;
  }
  if (input.sourceIds !== undefined) {
    payload.sourceIds = input.sourceIds;
    updates.sourceIds = JSON.stringify(input.sourceIds);
  }

  sqlite.transaction(() => {
    const event = createEventRecord("knowledge", id, "updated", payload);
    db.insert(events).values(event).run();
    db.update(knowledgeItems)
      .set(updates)
      .where(eq(knowledgeItems.id, id))
      .run();
  })();

  const result = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.id, id));
  return result[0];
}

/**
 * Pin a knowledge item
 */
export async function pinKnowledgeItem(id: string): Promise<KnowledgeItem> {
  return updateKnowledgeItem(id, { isPinned: true });
}

/**
 * Unpin a knowledge item
 */
export async function unpinKnowledgeItem(id: string): Promise<KnowledgeItem> {
  return updateKnowledgeItem(id, { isPinned: false });
}

/**
 * Remove a knowledge item (archive)
 */
export async function removeKnowledgeItem(id: string): Promise<void> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(knowledgeItems)
    .where(
      and(
        eq(knowledgeItems.id, id),
        eq(knowledgeItems.workspaceId, workspace.manifest.id),
      ),
    );

  if (existing.length === 0) {
    throw new Error(`Knowledge item not found: ${id}`);
  }

  if (existing[0].archivedAt) {
    return; // Already removed
  }

  const payload: KnowledgeItemRemovedPayload = {};

  sqlite.transaction(() => {
    const event = createEventRecord("knowledge", id, "removed", payload);
    db.insert(events).values(event).run();
    db.update(knowledgeItems)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(knowledgeItems.id, id))
      .run();
  })();
}

/**
 * List knowledge items with optional scope filter
 */
export async function listKnowledgeItems(
  scopeType?: ScopeType,
  scopeId?: string,
): Promise<KnowledgeItem[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  // Build the where conditions based on scope
  const baseConditions = and(
    eq(knowledgeItems.workspaceId, workspace.manifest.id),
    isNull(knowledgeItems.archivedAt),
  );

  let whereCondition = baseConditions;

  if (scopeType) {
    if (scopeId) {
      whereCondition = and(
        eq(knowledgeItems.workspaceId, workspace.manifest.id),
        isNull(knowledgeItems.archivedAt),
        eq(knowledgeItems.scopeType, scopeType),
        eq(knowledgeItems.scopeId, scopeId),
      );
    } else if (scopeType === "workspace") {
      whereCondition = and(
        eq(knowledgeItems.workspaceId, workspace.manifest.id),
        isNull(knowledgeItems.archivedAt),
        eq(knowledgeItems.scopeType, "workspace"),
      );
    }
  }

  return db
    .select()
    .from(knowledgeItems)
    .where(whereCondition)
    .orderBy(desc(knowledgeItems.updatedAt));
}

/**
 * Get a knowledge item by ID
 */
export async function getKnowledgeItemById(
  id: string,
): Promise<KnowledgeItem | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = await db
    .select()
    .from(knowledgeItems)
    .where(
      and(
        eq(knowledgeItems.id, id),
        eq(knowledgeItems.workspaceId, workspace.manifest.id),
      ),
    );

  return result[0] ?? null;
}

/**
 * Add a knowledge source
 */
export async function addKnowledgeSource(
  input: AddKnowledgeSourceInput,
): Promise<KnowledgeSource> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const id = createId();
  const now = new Date();

  const payload: KnowledgeSourceAddedPayload = {
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    kind: input.kind,
    name: input.name,
    blobId: input.blobId,
    extractedTextRef: input.extractedTextRef,
    metadata: input.metadata,
    notes: input.notes,
  };

  sqlite.transaction(() => {
    const event = createEventRecord("knowledge_source", id, "added", payload);
    db.insert(events).values(event).run();

    db.insert(knowledgeSources)
      .values({
        id,
        workspaceId: workspace.manifest.id,
        scopeType: input.scopeType,
        scopeId: input.scopeId ?? null,
        kind: input.kind,
        name: input.name ?? null,
        blobId: input.blobId ?? null,
        extractedTextRef: input.extractedTextRef ?? null,
        metadata: input.metadata ?? null,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  })();

  const result = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, id));
  return result[0];
}

/**
 * Add a file-based knowledge source (blob + source)
 */
export async function addFileKnowledgeSource(
  input: AddFileKnowledgeSourceInput,
): Promise<KnowledgeSource> {
  const blobResult = await addBlob({
    data: input.data,
    mime: input.mime,
  });

  return addKnowledgeSource({
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    kind: "file",
    name: input.filename,
    blobId: blobResult.blob.id,
    metadata: JSON.stringify({
      filename: input.filename,
      size: input.data.length,
      mime: input.mime,
    }),
    notes: input.notes,
  });
}

/**
 * Update a knowledge source
 */
export async function updateKnowledgeSource(
  id: string,
  input: UpdateKnowledgeSourceInput,
): Promise<KnowledgeSource> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.id, id),
        eq(knowledgeSources.workspaceId, workspace.manifest.id),
      ),
    );

  if (existing.length === 0) {
    throw new Error(`Knowledge source not found: ${id}`);
  }

  if (existing[0].archivedAt) {
    throw new Error(`Knowledge source has been removed: ${id}`);
  }

  const payload: KnowledgeSourceUpdatedPayload = {};
  const updates: Partial<KnowledgeSource> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    payload.name = input.name;
    updates.name = input.name;
  }

  if (input.notes !== undefined) {
    payload.notes = input.notes ?? undefined;
    updates.notes = input.notes ?? null;
  }

  sqlite.transaction(() => {
    const event = createEventRecord("knowledge_source", id, "updated", payload);
    db.insert(events).values(event).run();
    db.update(knowledgeSources)
      .set(updates)
      .where(eq(knowledgeSources.id, id))
      .run();
  })();

  const result = await db
    .select()
    .from(knowledgeSources)
    .where(eq(knowledgeSources.id, id));
  return result[0];
}

/**
 * Remove a knowledge source (archive)
 */
export async function removeKnowledgeSource(id: string): Promise<void> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.id, id),
        eq(knowledgeSources.workspaceId, workspace.manifest.id),
      ),
    );

  if (existing.length === 0) {
    throw new Error(`Knowledge source not found: ${id}`);
  }

  if (existing[0].archivedAt) {
    return;
  }

  const payload: KnowledgeSourceRemovedPayload = {};
  const blobId = existing[0].blobId;

  sqlite.transaction(() => {
    const event = createEventRecord("knowledge_source", id, "removed", payload);
    db.insert(events).values(event).run();
    db.update(knowledgeSources)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(knowledgeSources.id, id))
      .run();
  })();

  if (blobId) {
    const remaining = await db
      .select({ id: knowledgeSources.id })
      .from(knowledgeSources)
      .where(
        and(
          eq(knowledgeSources.workspaceId, workspace.manifest.id),
          eq(knowledgeSources.blobId, blobId),
          isNull(knowledgeSources.archivedAt),
          ne(knowledgeSources.id, id),
        ),
      );

    if (remaining.length === 0) {
      await deleteBlob(blobId);
    }
  }
}

/**
 * List knowledge sources
 */
export async function listKnowledgeSources(
  scopeType?: SourceScopeType,
  scopeId?: string,
): Promise<KnowledgeSource[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const baseConditions = and(
    eq(knowledgeSources.workspaceId, workspace.manifest.id),
    isNull(knowledgeSources.archivedAt),
  );

  let whereCondition = baseConditions;

  if (scopeType) {
    if (scopeId) {
      whereCondition = and(
        eq(knowledgeSources.workspaceId, workspace.manifest.id),
        isNull(knowledgeSources.archivedAt),
        eq(knowledgeSources.scopeType, scopeType),
        eq(knowledgeSources.scopeId, scopeId),
      );
    } else if (scopeType === "workspace") {
      whereCondition = and(
        eq(knowledgeSources.workspaceId, workspace.manifest.id),
        isNull(knowledgeSources.archivedAt),
        eq(knowledgeSources.scopeType, "workspace"),
      );
    }
  }

  return db
    .select()
    .from(knowledgeSources)
    .where(whereCondition)
    .orderBy(desc(knowledgeSources.updatedAt), desc(knowledgeSources.createdAt));
}

/**
 * Get a knowledge source by ID
 */
export async function getKnowledgeSourceById(
  id: string,
): Promise<KnowledgeSource | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = await db
    .select()
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.id, id),
        eq(knowledgeSources.workspaceId, workspace.manifest.id),
      ),
    );

  return result[0] ?? null;
}
