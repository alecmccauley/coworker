import { and, eq } from "drizzle-orm";
import {
  getCurrentDatabase,
  getCurrentSqlite,
  getCurrentWorkspace,
} from "../../workspace";
import { sourceChunks, sourceText, type SourceScopeType } from "../../database";
import { embedText, serializeEmbedding } from "./embedding";
import { countTokens } from "./tokenizer";

export interface SearchParams {
  query: string;
  limit?: number;
  scopeType?: SourceScopeType;
  scopeId?: string;
}

export type RagMatchType = "fts" | "vec" | "hybrid";

export interface RagChunkResult {
  sourceId: string;
  chunkId: string;
  text: string;
  score: number;
  matchType: RagMatchType;
}

export interface SourceTextResult {
  sourceId: string;
  text: string;
  tokenCount: number;
  truncated: boolean;
  modeUsed: "full" | "selected_chunks";
  selectedChunkIds: string[];
}

const RRF_K = 60;

export async function searchKnowledgeSources(
  params: SearchParams,
): Promise<RagChunkResult[]> {
  const sqlite = getCurrentSqlite();
  const workspace = getCurrentWorkspace();

  if (!sqlite || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const limit = params.limit ?? 8;

  const scopeFilter = buildScopeFilter(params.scopeType, params.scopeId);
  const ftsQuery = buildFtsQuery(params.query);

  const ftsSql = `
    SELECT
      source_chunks.source_id AS sourceId,
      source_chunks.id AS chunkId,
      source_chunks.text AS text,
      bm25(source_chunks_fts) AS score
    FROM source_chunks_fts
    JOIN source_chunks ON source_chunks_fts.rowid = source_chunks.rowid
    JOIN knowledge_sources ON knowledge_sources.id = source_chunks.source_id
    WHERE source_chunks_fts MATCH ?
      AND knowledge_sources.workspace_id = ?
      AND knowledge_sources.archived_at IS NULL
      ${scopeFilter.clause}
    ORDER BY score
    LIMIT ?
  `;

  let ftsRows: Array<{
    sourceId: string;
    chunkId: string;
    text: string;
    score: number;
  }> = [];

  if (ftsQuery) {
    try {
      ftsRows = sqlite.prepare(ftsSql).all(
        ftsQuery,
        workspace.manifest.id,
        ...scopeFilter.params,
        limit,
      ) as Array<{
        sourceId: string;
        chunkId: string;
        text: string;
        score: number;
      }>;
    } catch {
      ftsRows = [];
    }
  }

  const vecRows = fetchVectorMatches(
    sqlite,
    params.query,
    workspace.manifest.id,
    scopeFilter,
    limit,
  );

  return combineResults(ftsRows, vecRows, limit);
}

export async function getSourceTextForPrompt(
  sourceId: string,
  tokenCap: number,
): Promise<SourceTextResult | null> {
  const db = getCurrentDatabase();
  const workspace = getCurrentWorkspace();

  if (!db || !workspace) {
    throw new Error("No workspace is currently open");
  }

  const sourceRow = await db
    .select()
    .from(sourceText)
    .where(
      and(
        eq(sourceText.sourceId, sourceId),
        eq(sourceText.workspaceId, workspace.manifest.id),
      ),
    );

  if (sourceRow.length === 0) {
    return null;
  }

  const text = sourceRow[0].text;
  const totalTokens = countTokens(text);

  if (totalTokens <= tokenCap) {
    return {
      sourceId,
      text,
      tokenCount: totalTokens,
      truncated: false,
      modeUsed: "full",
      selectedChunkIds: [],
    };
  }

  const chunks = await db
    .select()
    .from(sourceChunks)
    .where(
      and(
        eq(sourceChunks.sourceId, sourceId),
        eq(sourceChunks.workspaceId, workspace.manifest.id),
      ),
    )
    .orderBy(sourceChunks.chunkIndex);

  const selectedChunks: string[] = [];
  let remaining = tokenCap;
  const selectedTexts: string[] = [];

  for (const chunk of chunks) {
    if (remaining <= 0) {
      break;
    }
    const tokenCount = chunk.tokenCount ?? countTokens(chunk.text);
    if (tokenCount > remaining && selectedTexts.length > 0) {
      break;
    }
    selectedChunks.push(chunk.id);
    selectedTexts.push(chunk.text);
    remaining -= tokenCount;
  }

  return {
    sourceId,
    text: selectedTexts.join("\n\n"),
    tokenCount: tokenCap - remaining,
    truncated: true,
    modeUsed: "selected_chunks",
    selectedChunkIds: selectedChunks,
  };
}

function fetchVectorMatches(
  sqlite: NonNullable<ReturnType<typeof getCurrentSqlite>>,
  query: string,
  workspaceId: string,
  scopeFilter: { clause: string; params: Array<string> },
  limit: number,
): Array<{
  sourceId: string;
  chunkId: string;
  text: string;
  score: number;
}> {
  try {
    const vector = embedText(query);
    const vectorBlob = serializeEmbedding(vector);

    const vecSql = `
      SELECT
        source_chunks_vec.chunk_id AS chunkId,
        source_chunks_vec.source_id AS sourceId,
        source_chunks.text AS text,
        source_chunks_vec.distance AS score
      FROM source_chunks_vec
      JOIN source_chunks ON source_chunks.id = source_chunks_vec.chunk_id
      JOIN knowledge_sources ON knowledge_sources.id = source_chunks_vec.source_id
      WHERE source_chunks_vec.embedding MATCH ?
        AND knowledge_sources.workspace_id = ?
        AND knowledge_sources.archived_at IS NULL
        ${scopeFilter.clause}
      ORDER BY source_chunks_vec.distance
      LIMIT ?
    `;

    return sqlite
      .prepare(vecSql)
      .all(vectorBlob, workspaceId, ...scopeFilter.params, limit) as Array<{
      sourceId: string;
      chunkId: string;
      text: string;
      score: number;
    }>;
  } catch {
    return [];
  }
}

function combineResults(
  ftsRows: Array<{
    sourceId: string;
    chunkId: string;
    text: string;
    score: number;
  }>,
  vecRows: Array<{
    sourceId: string;
    chunkId: string;
    text: string;
    score: number;
  }>,
  limit: number,
): RagChunkResult[] {
  const combined = new Map<
    string,
    {
      sourceId: string;
      chunkId: string;
      text: string;
      rrf: number;
      ftsRank?: number;
      vecRank?: number;
    }
  >();

  ftsRows.forEach((row, index) => {
    const rank = index + 1;
    const key = row.chunkId;
    const existing = combined.get(key);
    const rrf = 1 / (RRF_K + rank);
    combined.set(key, {
      sourceId: row.sourceId,
      chunkId: row.chunkId,
      text: row.text,
      rrf: (existing?.rrf ?? 0) + rrf,
      ftsRank: rank,
      vecRank: existing?.vecRank,
    });
  });

  vecRows.forEach((row, index) => {
    const rank = index + 1;
    const key = row.chunkId;
    const existing = combined.get(key);
    const rrf = 1 / (RRF_K + rank);
    combined.set(key, {
      sourceId: row.sourceId,
      chunkId: row.chunkId,
      text: row.text,
      rrf: (existing?.rrf ?? 0) + rrf,
      ftsRank: existing?.ftsRank,
      vecRank: rank,
    });
  });

  return Array.from(combined.values())
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, limit)
    .map((row) => ({
      sourceId: row.sourceId,
      chunkId: row.chunkId,
      text: row.text,
      score: row.rrf,
      matchType: row.ftsRank && row.vecRank ? "hybrid" : row.ftsRank ? "fts" : "vec",
    }));
}

function buildScopeFilter(
  scopeType?: SourceScopeType,
  scopeId?: string,
): { clause: string; params: Array<string> } {
  if (!scopeType) {
    return { clause: "", params: [] };
  }
  if (scopeType === "workspace") {
    return { clause: "AND knowledge_sources.scope_type = ?", params: [scopeType] };
  }
  if (scopeId) {
    return {
      clause: "AND knowledge_sources.scope_type = ? AND knowledge_sources.scope_id = ?",
      params: [scopeType, scopeId],
    };
  }
  return { clause: "AND knowledge_sources.scope_type = ?", params: [scopeType] };
}

function buildFtsQuery(query: string): string | null {
  const tokens = query
    .replace(/["'`]/g, " ")
    .replace(/[^a-zA-Z0-9\\s_-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  const escaped = tokens.map((token) => `"${token.replace(/"/g, '""')}"`);
  return escaped.join(" OR ");
}
