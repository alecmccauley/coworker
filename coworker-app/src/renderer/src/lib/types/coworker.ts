/**
 * A coworker entity in the workspace
 */
export interface Coworker {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  rolePrompt: string | null;
  defaultsJson: string | null;
  templateId: string | null;
  templateVersion: number | null;
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
  rolePrompt?: string;
  defaultsJson?: string;
  templateId?: string;
  templateVersion?: number;
}

/**
 * Input for updating a coworker
 */
export interface UpdateCoworkerInput {
  name?: string;
  description?: string;
  rolePrompt?: string;
  defaultsJson?: string;
}
