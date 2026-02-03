import { eq, and, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { createHash } from "crypto";
import { join } from "path";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import {
  getCurrentWorkspace,
  getCurrentDatabase,
  getCurrentSqlite,
} from "../workspace";
import { events, blobs, type Blob, type NewEvent } from "../database";

/**
 * Input for adding a blob
 */
export interface AddBlobInput {
  data: Buffer | string;
  mime?: string;
  filename?: string;
}

/**
 * Result of adding a blob
 */
export interface AddBlobResult {
  blob: Blob;
  deduplicated: boolean;
}

/**
 * Event payload types
 */
interface BlobAddedPayload {
  path: string;
  mime?: string;
  size: number;
  sha256: string;
}

interface BlobRemovedPayload {
  path: string;
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
 * Calculate SHA256 hash of data
 */
function calculateHash(data: Buffer | string): string {
  const hash = createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}

/**
 * Add a blob (deduplicate by hash)
 */
export async function addBlob(input: AddBlobInput): Promise<AddBlobResult> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const data =
    typeof input.data === "string"
      ? Buffer.from(input.data, "utf-8")
      : input.data;
  const sha256 = calculateHash(data);
  const size = data.length;

  // Check for existing blob with same hash (deduplication)
  const existing = await db
    .select()
    .from(blobs)
    .where(
      and(
        eq(blobs.workspaceId, workspace.manifest.id),
        eq(blobs.sha256, sha256),
      ),
    );

  if (existing.length > 0) {
    return { blob: existing[0], deduplicated: true };
  }

  const id = createId();
  const now = new Date();

  // Generate filename (use provided or hash-based)
  const ext = input.mime ? mimeToExtension(input.mime) : "";
  const filename = input.filename ?? `${id}${ext}`;
  const relativePath = filename;

  // Full path for file storage
  const blobsDir = join(workspace.path, "blobs");
  const fullPath = join(blobsDir, relativePath);

  const payload: BlobAddedPayload = {
    path: relativePath,
    mime: input.mime,
    size,
    sha256,
  };

  // Write file and update database atomically
  sqlite.transaction(() => {
    // Write blob file
    writeFileSync(fullPath, data);

    const event = createEventRecord("blob", id, "added", payload);
    db.insert(events).values(event).run();

    db.insert(blobs)
      .values({
        id,
        workspaceId: workspace.manifest.id,
        path: relativePath,
        mime: input.mime ?? null,
        size,
        sha256,
        createdAt: now,
      })
      .run();
  })();

  const result = await db.select().from(blobs).where(eq(blobs.id, id));
  return { blob: result[0], deduplicated: false };
}

/**
 * Read a blob's content
 */
export async function readBlob(id: string): Promise<Buffer | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const blob = await db
    .select()
    .from(blobs)
    .where(and(eq(blobs.id, id), eq(blobs.workspaceId, workspace.manifest.id)));

  if (blob.length === 0) {
    return null;
  }

  const fullPath = join(workspace.path, "blobs", blob[0].path);

  if (!existsSync(fullPath)) {
    return null;
  }

  return readFileSync(fullPath);
}

/**
 * Delete a blob
 */
export async function deleteBlob(id: string): Promise<void> {
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!db || !sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const existing = await db
    .select()
    .from(blobs)
    .where(and(eq(blobs.id, id), eq(blobs.workspaceId, workspace.manifest.id)));

  if (existing.length === 0) {
    throw new Error(`Blob not found: ${id}`);
  }

  const blob = existing[0];
  const fullPath = join(workspace.path, "blobs", blob.path);

  const payload: BlobRemovedPayload = {
    path: blob.path,
  };

  sqlite.transaction(() => {
    // Delete file if it exists
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }

    const event = createEventRecord("blob", id, "removed", payload);
    db.insert(events).values(event).run();

    db.delete(blobs).where(eq(blobs.id, id)).run();
  })();
}

/**
 * Get a blob by ID (metadata only)
 */
export async function getBlobById(id: string): Promise<Blob | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const result = await db
    .select()
    .from(blobs)
    .where(and(eq(blobs.id, id), eq(blobs.workspaceId, workspace.manifest.id)));

  return result[0] ?? null;
}

/**
 * List all blobs
 */
export async function listBlobs(): Promise<Blob[]> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  return db
    .select()
    .from(blobs)
    .where(eq(blobs.workspaceId, workspace.manifest.id));
}

/**
 * Convert MIME type to file extension
 */
function mimeToExtension(mime: string): string {
  const mimeMap: Record<string, string> = {
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/html": ".html",
    "text/css": ".css",
    "text/javascript": ".js",
    "application/json": ".json",
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
  };

  return mimeMap[mime] ?? "";
}
