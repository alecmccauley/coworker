import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { readBlob } from "../../blob/blob-service";
import {
  getCurrentDatabase,
  getCurrentSqlite,
  getCurrentWorkspace,
} from "../../workspace";
import {
  blobs,
  knowledgeSources,
  sourceChunks,
  sourceText,
  type SourceChunk,
} from "../../database";
import { chunkText } from "./chunking";
import { embedText, serializeEmbedding } from "./embedding";
import { extractTextFromBlob } from "./extraction";
import {
  broadcastIndexingProgress,
  type IndexStatus,
  type IndexingProgressPayload,
} from "./indexing-events";

const EXTRACTION_VERSION = 1;
const DEFAULT_CHUNK_TOKENS = 600;
const DEFAULT_OVERLAP_TOKENS = 80;

let activeIndexingCount = 0;

export interface IndexingOptions {
  force?: boolean;
}

export function isIndexingInProgress(): boolean {
  return activeIndexingCount > 0;
}

export async function indexAllSources(
  options: IndexingOptions = {},
): Promise<void> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const sources = await db
    .select()
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.workspaceId, workspace.manifest.id),
        eq(knowledgeSources.kind, "file"),
      ),
    );

  for (const source of sources) {
    if (!source.blobId) {
      continue;
    }
    await indexKnowledgeSource(source.id, options);
  }
}

export async function indexKnowledgeSource(
  sourceId: string,
  options: IndexingOptions = {},
): Promise<void> {
  activeIndexingCount += 1;
  const db = getCurrentDatabase();
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  try {
    if (!db || !sqlite || !workspace) {
      throw new Error("No workspace is currently open");
    }

  const source = await db
    .select()
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.id, sourceId),
        eq(knowledgeSources.workspaceId, workspace.manifest.id),
      ),
    );

    if (source.length === 0) {
      throw new Error(`Knowledge source not found: ${sourceId}`);
    }

  const current = source[0];
  const notesBlock = buildNotesBlock(current.notes);

    if (!current.blobId) {
      if (!notesBlock) {
        await clearIndexedData(db, sqlite, workspace.manifest.id, sourceId);
        await updateIndexStatus(sourceId, "ready", undefined);
        return;
      }

      await updateIndexStatus(sourceId, "processing", undefined, "chunking");

      const chunks = chunkText(notesBlock, {
        chunkTokens: DEFAULT_CHUNK_TOKENS,
        overlapTokens: DEFAULT_OVERLAP_TOKENS,
      });

      await updateIndexStatus(sourceId, "processing", undefined, "embedding");

      const chunkRows = persistIndexedText(db, sqlite, workspace.manifest.id, sourceId, {
        text: notesBlock,
        richText: null,
        warningsJson: null,
        chunks,
      });

      insertVectorEmbeddings(sqlite, chunkRows);

      await updateIndexStatus(sourceId, "ready", undefined, "complete");
      return;
    }

  const blobRecord = await db
    .select()
    .from(blobs)
    .where(
      and(
        eq(blobs.id, current.blobId),
        eq(blobs.workspaceId, workspace.manifest.id),
      ),
    );

    if (blobRecord.length === 0) {
      await updateIndexStatus(
        sourceId,
        "error",
        "Missing blob metadata for this source.",
      );
      return;
    }

  const blobMeta = blobRecord[0];

    if (
      !options.force &&
      current.indexStatus === "ready" &&
      current.contentHash === blobMeta.sha256
    ) {
      return;
    }

  await updateIndexStatus(sourceId, "processing", undefined, "extracting");

  const buffer = await readBlob(current.blobId);
    if (!buffer) {
      await updateIndexStatus(sourceId, "error", "Unable to read blob.");
      return;
    }

  const parsedMetadata = parseSourceMetadata(current.metadata);
  const extracted = await extractTextFromBlob({
    buffer,
    mime: blobMeta.mime,
    filename: parsedMetadata?.filename ?? current.name ?? undefined,
  });

  const extractedText = extracted.text.trim();
    if (!extractedText && !notesBlock) {
      await updateIndexStatus(sourceId, "error", "No text could be extracted.");
      return;
    }

    await updateIndexStatus(sourceId, "processing", undefined, "chunking");

  const combinedText = [extractedText, notesBlock].filter(Boolean).join("\n\n");

    const chunks = chunkText(combinedText, {
      chunkTokens: DEFAULT_CHUNK_TOKENS,
      overlapTokens: DEFAULT_OVERLAP_TOKENS,
    });

    await updateIndexStatus(sourceId, "processing", undefined, "embedding");

  const chunkRows = persistIndexedText(db, sqlite, workspace.manifest.id, sourceId, {
    text: combinedText,
    richText: notesBlock ? null : extracted.richText ?? null,
    warningsJson:
      extracted.warnings.length > 0
        ? JSON.stringify(extracted.warnings)
        : null,
    chunks,
  });

  insertVectorEmbeddings(sqlite, chunkRows);

    await db
      .update(knowledgeSources)
      .set({
        contentHash: blobMeta.sha256 ?? null,
        indexStatus: "ready",
        indexError: null,
        indexedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(knowledgeSources.id, sourceId),
          eq(knowledgeSources.workspaceId, workspace.manifest.id),
        ),
      )
      .run();

    broadcastIndexingProgress({
      sourceId,
      status: "ready",
      step: "complete",
      updatedAt: Date.now(),
    });
  } catch (error) {
    await updateIndexStatus(
      sourceId,
      "error",
      error instanceof Error ? error.message : "Indexing failed.",
    );
    throw error;
  } finally {
    activeIndexingCount = Math.max(0, activeIndexingCount - 1);
  }
}

function buildNotesBlock(notes?: string | null): string {
  const trimmed = notes?.trim();
  return trimmed ? `Notes:\n${trimmed}` : "";
}

function clearIndexedData(
  db: NonNullable<ReturnType<typeof getCurrentDatabase>>,
  sqlite: NonNullable<ReturnType<typeof getCurrentSqlite>>,
  workspaceId: string,
  sourceId: string,
): void {
  sqlite.transaction(() => {
    db.delete(sourceChunks)
      .where(
        and(
          eq(sourceChunks.sourceId, sourceId),
          eq(sourceChunks.workspaceId, workspaceId),
        ),
      )
      .run();

    try {
      sqlite
        .prepare("DELETE FROM source_chunks_vec WHERE source_id = ?")
        .run(sourceId);
    } catch {
      // sqlite-vec not available or table missing
    }

    db.delete(sourceText)
      .where(
        and(
          eq(sourceText.sourceId, sourceId),
          eq(sourceText.workspaceId, workspaceId),
        ),
      )
      .run();
  })();
}

function persistIndexedText(
  db: NonNullable<ReturnType<typeof getCurrentDatabase>>,
  sqlite: NonNullable<ReturnType<typeof getCurrentSqlite>>,
  workspaceId: string,
  sourceId: string,
  payload: {
    text: string;
    richText: string | null;
    warningsJson: string | null;
    chunks: Array<{ text: string; tokenCount: number }>;
  },
): SourceChunk[] {
  let chunkRows: SourceChunk[] = [];

  sqlite.transaction(() => {
    db.delete(sourceChunks)
      .where(
        and(
          eq(sourceChunks.sourceId, sourceId),
          eq(sourceChunks.workspaceId, workspaceId),
        ),
      )
      .run();

    try {
      sqlite
        .prepare("DELETE FROM source_chunks_vec WHERE source_id = ?")
        .run(sourceId);
    } catch {
      // sqlite-vec not available or table missing
    }

    const now = new Date();
    db.insert(sourceText)
      .values({
        sourceId,
        workspaceId,
        text: payload.text,
        richText: payload.richText,
        extractionVersion: EXTRACTION_VERSION,
        warningsJson: payload.warningsJson,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sourceText.sourceId,
        set: {
          text: payload.text,
          richText: payload.richText,
          extractionVersion: EXTRACTION_VERSION,
          warningsJson: payload.warningsJson,
          updatedAt: now,
        },
      })
      .run();

    if (payload.chunks.length > 0) {
      chunkRows = payload.chunks.map((chunk, index) => ({
        id: createId(),
        workspaceId,
        sourceId,
        chunkIndex: index,
        text: chunk.text,
        startChar: null,
        endChar: null,
        tokenCount: chunk.tokenCount,
      }));

      db.insert(sourceChunks).values(chunkRows).run();
    }
  })();

  return chunkRows;
}

function insertVectorEmbeddings(
  sqlite: NonNullable<ReturnType<typeof getCurrentSqlite>>,
  chunkRows: SourceChunk[],
): void {
  if (chunkRows.length === 0) {
    return;
  }

  try {
    const insertVec = sqlite.prepare(
      "INSERT INTO source_chunks_vec(embedding, chunk_id, source_id) VALUES (?, ?, ?)",
    );
    for (const row of chunkRows) {
      const vector = embedText(row.text);
      insertVec.run(serializeEmbedding(vector), row.id, row.sourceId);
    }
  } catch {
    // sqlite-vec not available or insertion failed
  }
}

async function updateIndexStatus(
  sourceId: string,
  status: IndexStatus,
  errorMessage?: string,
  step?: string,
): Promise<void> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const updates = {
    indexStatus: status,
    indexError: errorMessage ?? null,
    updatedAt: new Date(),
    ...(status === "ready" ? { indexedAt: new Date() } : {}),
  };

  await db
    .update(knowledgeSources)
    .set(updates)
    .where(
      and(
        eq(knowledgeSources.id, sourceId),
        eq(knowledgeSources.workspaceId, workspace.manifest.id),
      ),
    )
    .run();

  const payload: IndexingProgressPayload = {
    sourceId,
    status,
    step,
    message: errorMessage,
    updatedAt: Date.now(),
  };

  broadcastIndexingProgress(payload);
}

function parseSourceMetadata(
  metadata?: string | null,
): { filename?: string; mime?: string } | null {
  if (!metadata) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadata) as { filename?: string; mime?: string };
    return parsed;
  } catch {
    return null;
  }
}
