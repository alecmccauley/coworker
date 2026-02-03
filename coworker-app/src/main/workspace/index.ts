export {
  createWorkspace,
  openWorkspace,
  closeWorkspace,
  getCurrentWorkspace,
  getCurrentDatabase,
  getCurrentSqlite,
  showCreateWorkspaceDialog,
  showOpenWorkspaceDialog,
  getWorkspaceDisplayName,
  getWorkspaceParentDir,
  type WorkspaceManifest,
  type WorkspaceInfo,
} from "./workspace-manager";

export {
  loadRecentWorkspaces,
  addRecentWorkspace,
  removeRecentWorkspace,
  clearRecentWorkspaces,
  listRecentWorkspaces,
  type RecentWorkspace,
} from "./recent-workspaces";

export {
  registerWorkspaceIpcHandlers,
  notifyWorkspaceOpened,
  notifyWorkspaceClosed,
} from "./ipc-handlers";
