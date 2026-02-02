/**
 * A coworker entity in the workspace
 */
export interface Coworker {
  id: string
  workspaceId: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

/**
 * Input for creating a coworker
 */
export interface CreateCoworkerInput {
  name: string
  description?: string
}

/**
 * Input for updating a coworker
 */
export interface UpdateCoworkerInput {
  name?: string
  description?: string
}
