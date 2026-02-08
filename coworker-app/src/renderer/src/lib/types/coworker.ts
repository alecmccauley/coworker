/**
 * A coworker entity in the workspace
 */
export interface Coworker {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  rolePrompt: string | null;
  defaultsJson: string | null;
  model: string | null;
  templateId: string | null;
  templateVersion: number | null;
  templateDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

/**
 * Input for creating a coworker
 */
export interface CreateCoworkerInput {
  name: string;
  description?: string;
  shortDescription?: string;
  rolePrompt?: string;
  defaultsJson?: string;
  model?: string;
  templateId?: string;
  templateVersion?: number;
  templateDescription?: string;
}

/**
 * Input for updating a coworker
 */
export interface UpdateCoworkerInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  rolePrompt?: string;
  defaultsJson?: string;
  model?: string | null;
}
