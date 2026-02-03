/**
 * Scope types for knowledge items
 */
export type ScopeType = "workspace" | "channel" | "coworker";

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
export type KnowledgeSourceKind = "text" | "file" | "url";

/**
 * A knowledge source entity - raw inputs (files, text, URLs)
 */
export interface KnowledgeSource {
  id: string;
  workspaceId: string;
  kind: string;
  name: string | null;
  blobId: string | null;
  extractedTextRef: string | null;
  metadata: string | null;
  createdAt: Date;
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
  kind: KnowledgeSourceKind;
  name?: string;
  blobId?: string;
  extractedTextRef?: string;
  metadata?: string;
}
