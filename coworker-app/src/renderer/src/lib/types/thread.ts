/**
 * A thread entity in the workspace - conversation sessions within channels
 */
export interface Thread {
  id: string;
  workspaceId: string;
  channelId: string;
  title: string | null;
  summaryRef: string | null;
  lastReadAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

/**
 * Input for creating a thread
 */
export interface CreateThreadInput {
  channelId: string;
  title?: string;
}

/**
 * Input for updating a thread
 */
export interface UpdateThreadInput {
  title?: string;
  summaryRef?: string;
}
