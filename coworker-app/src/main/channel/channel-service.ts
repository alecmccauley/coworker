import { eq, isNull, and, asc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  getCurrentWorkspace,
  getCurrentDatabase,
  getCurrentSqlite,
} from "../workspace";
import { events, channels, type Channel, type NewEvent } from "../database";

/**
 * Input for creating a channel
 */
export interface CreateChannelInput {
  name: string;
  purpose?: string;
  isDefault?: boolean;
}

/**
 * Input for updating a channel
 */
export interface UpdateChannelInput {
  name?: string;
  purpose?: string;
  pinnedJson?: string;
  sortOrder?: number;
}

/**
 * Event payload types
 */
interface ChannelCreatedPayload {
  name: string;
  purpose?: string;
  isDefault?: boolean;
}

interface ChannelUpdatedPayload {
  name?: string;
  purpose?: string;
  pinnedJson?: string;
  sortOrder?: number;
}

interface ChannelArchivedPayload {
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
 * Create a new channel
 */
export async function createChannel(
  input: CreateChannelInput,
): Promise<Channel> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const id = createId();
  const now = new Date();

  // Get max sort order
  const maxOrderResult = db
    .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), 0)` })
    .from(channels)
    .where(eq(channels.workspaceId, workspace.manifest.id))
    .get();

  const sortOrder =
    ((maxOrderResult as { maxOrder: number } | undefined)?.maxOrder ?? 0) + 1;

  const payload: ChannelCreatedPayload = {
    name: input.name,
    purpose: input.purpose,
    isDefault: input.isDefault,
  };

  // Atomic transaction
  sqlite.transaction(() => {
    const event = createEventRecord("channel", id, "created", payload);
    db.insert(events).values(event).run();

    db.insert(channels)
      .values({
        id,
        workspaceId: workspace.manifest.id,
        name: input.name,
        purpose: input.purpose ?? null,
        pinnedJson: null,
        isDefault: input.isDefault ?? false,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  })();

  const result = await db.select().from(channels).where(eq(channels.id, id));
  return result[0];
}

/**
 * Update an existing channel
 */
export async function updateChannel(
  id: string,
  input: UpdateChannelInput,
): Promise<Channel> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(channels)
    .where(
      and(eq(channels.id, id), eq(channels.workspaceId, workspace.manifest.id)),
    );

  if (existing.length === 0) {
    throw new Error(`Channel not found: ${id}`);
  }

  if (existing[0].archivedAt) {
    throw new Error(`Channel has been archived: ${id}`);
  }

  const payload: ChannelUpdatedPayload = {};
  const updates: Partial<Channel> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    payload.name = input.name;
    updates.name = input.name;
  }
  if (input.purpose !== undefined) {
    payload.purpose = input.purpose;
    updates.purpose = input.purpose;
  }
  if (input.pinnedJson !== undefined) {
    payload.pinnedJson = input.pinnedJson;
    updates.pinnedJson = input.pinnedJson;
  }
  if (input.sortOrder !== undefined) {
    payload.sortOrder = input.sortOrder;
    updates.sortOrder = input.sortOrder;
  }

  sqlite.transaction(() => {
    const event = createEventRecord("channel", id, "updated", payload);
    db.insert(events).values(event).run();
    db.update(channels).set(updates).where(eq(channels.id, id)).run();
  })();

  const result = await db.select().from(channels).where(eq(channels.id, id));
  return result[0];
}

/**
 * Archive a channel
 */
export async function archiveChannel(id: string): Promise<void> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(channels)
    .where(
      and(eq(channels.id, id), eq(channels.workspaceId, workspace.manifest.id)),
    );

  if (existing.length === 0) {
    throw new Error(`Channel not found: ${id}`);
  }

  if (existing[0].archivedAt) {
    return; // Already archived
  }

  const payload: ChannelArchivedPayload = {};

  sqlite.transaction(() => {
    const event = createEventRecord("channel", id, "archived", payload);
    db.insert(events).values(event).run();
    db.update(channels)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(channels.id, id))
      .run();
  })();
}

/**
 * List all active channels
 */
export async function listChannels(): Promise<Channel[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  return db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.workspaceId, workspace.manifest.id),
        isNull(channels.archivedAt),
      ),
    )
    .orderBy(asc(channels.sortOrder));
}

/**
 * Get a channel by ID
 */
export async function getChannelById(id: string): Promise<Channel | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = await db
    .select()
    .from(channels)
    .where(
      and(eq(channels.id, id), eq(channels.workspaceId, workspace.manifest.id)),
    );

  return result[0] ?? null;
}

/**
 * Create default channels for a new workspace
 */
export async function createDefaultChannels(): Promise<Channel[]> {
  const defaultChannels = [
    {
      name: "Inbox",
      purpose: "General inbox and quick tasks",
      isDefault: true,
    },
    { name: "Ideas", purpose: "Brainstorming and idea capture" },
    { name: "Active", purpose: "Currently active work" },
  ];

  const created: Channel[] = [];
  for (const channelInput of defaultChannels) {
    const channel = await createChannel(channelInput);
    created.push(channel);
  }

  return created;
}
