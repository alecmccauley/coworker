/**
 * A blob entity - metadata for files stored in blobs/ folder
 */
export interface Blob {
  id: string;
  workspaceId: string;
  path: string;
  mime: string | null;
  size: number | null;
  sha256: string | null;
  createdAt: Date;
}

/**
 * Input for adding a blob
 */
export interface AddBlobInput {
  path: string;
  mime?: string;
  size?: number;
  sha256?: string;
}
