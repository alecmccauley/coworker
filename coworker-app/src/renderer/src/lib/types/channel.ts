/**
 * A channel entity in the workspace - project containers
 */
export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  purpose: string | null;
  pinnedJson: string | null;
  isDefault: boolean | null;
  sortOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

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
