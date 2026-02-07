/**
 * Scope types for knowledge items
 */
export type ScopeType = "workspace" | "channel" | "coworker";
export type SourceScopeType = "workspace" | "channel" | "coworker" | "thread";

/**
 * A knowledge item entity - scoped "cards" of extracted/summarized knowledge
 */
export interface KnowledgeItem {
  id: string;
  workspaceId: string;
  scopeType: string;
  scopeId: string | null;
  title: string;
  summary: string | null;
  contentRef: string | null;
  isPinned: boolean | null;
  sourceIds: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

/**
 * Knowledge source types
 */
export type KnowledgeSourceKind = "text" | "file" | "url" | "memory";
export type IndexStatus = "pending" | "processing" | "ready" | "error";

/**
 * A knowledge source entity - raw inputs (files, text, URLs)
 */
export interface KnowledgeSource {
  id: string;
  workspaceId: string;
  scopeType: SourceScopeType | null;
  scopeId: string | null;
  kind: KnowledgeSourceKind;
  name: string | null;
  blobId: string | null;
  extractedTextRef: string | null;
  contentHash: string | null;
  indexStatus: IndexStatus | null;
  indexError: string | null;
  indexedAt: Date | null;
  metadata: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  archivedAt: Date | null;
}

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
  kind: KnowledgeSourceKind;
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

export interface ImportProgressPayload {
  batchId: string;
  filePath: string;
  filename: string;
  status: "queued" | "processing" | "success" | "error";
  sourceId?: string;
  error?: string;
}

export interface ImportFailure {
  filePath: string;
  filename: string;
  error: string;
}

export interface ImportSourcesResult {
  batchId: string;
  createdSources: KnowledgeSource[];
  failures: ImportFailure[];
  canceled: boolean;
  requiresAccess?: boolean;
  defaultPath?: string;
}

export interface IndexingProgressPayload {
  sourceId: string;
  status: IndexStatus;
  step?: string;
  message?: string;
  updatedAt: number;
}

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
