/**
 * Workspace manifest stored in manifest.json
 */
export interface WorkspaceManifest {
  id: string
  name: string
  createdAt: string
  schemaVersion: number
}

/**
 * Full workspace info including path
 */
export interface WorkspaceInfo {
  path: string
  manifest: WorkspaceManifest
}

/**
 * Recent workspace entry
 */
export interface RecentWorkspace {
  path: string
  name: string
  lastOpened: string
}
