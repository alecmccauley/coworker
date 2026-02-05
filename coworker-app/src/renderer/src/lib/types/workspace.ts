/**
 * Workspace manifest stored in manifest.json
 */
export interface WorkspaceManifest {
  id: string;
  name: string;
  createdAt: string;
  schemaVersion: number;
  /** Whether the user has completed the first-run experience */
  hasCompletedOnboarding?: boolean;
  /** ISO timestamp when onboarding was completed */
  onboardingCompletedAt?: string;
}

/**
 * Full workspace info including path
 */
export interface WorkspaceInfo {
  path: string;
  manifest: WorkspaceManifest;
}

/**
 * Recent workspace entry
 */
export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpened: string;
}
