import { ipcMain, BrowserWindow } from "electron";
import {
  createWorkspace,
  openWorkspace,
  closeWorkspace,
  getCurrentWorkspace,
  showCreateWorkspaceDialog,
  showOpenWorkspaceDialog,
  setOnboardingComplete,
  type WorkspaceInfo,
} from "./workspace-manager";
import {
  listRecentWorkspaces,
  removeRecentWorkspace,
  clearRecentWorkspaces,
  type RecentWorkspace,
} from "./recent-workspaces";

/**
 * Register all workspace-related IPC handlers
 */
export function registerWorkspaceIpcHandlers(): void {
  // Create a new workspace programmatically
  ipcMain.handle(
    "workspace:create",
    async (_event, name: string, path: string): Promise<WorkspaceInfo> => {
      return createWorkspace(name, path);
    },
  );

  // Open an existing workspace
  ipcMain.handle(
    "workspace:open",
    async (_event, path: string): Promise<WorkspaceInfo> => {
      return openWorkspace(path);
    },
  );

  // Close the current workspace
  ipcMain.handle("workspace:close", async (): Promise<void> => {
    await closeWorkspace();
  });

  // Get the current workspace info
  ipcMain.handle("workspace:getCurrent", (): WorkspaceInfo | null => {
    return getCurrentWorkspace();
  });

  // List recent workspaces
  ipcMain.handle("workspace:listRecent", (): RecentWorkspace[] => {
    return listRecentWorkspaces();
  });

  // Remove a workspace from recent list
  ipcMain.handle("workspace:removeRecent", (_event, path: string): void => {
    removeRecentWorkspace(path);
  });

  // Clear all recent workspaces
  ipcMain.handle("workspace:clearRecent", (): void => {
    clearRecentWorkspaces();
  });

  // Show native create dialog
  ipcMain.handle(
    "workspace:showCreateDialog",
    async (): Promise<WorkspaceInfo | null> => {
      return showCreateWorkspaceDialog(BrowserWindow.getFocusedWindow());
    },
  );

  // Show native open dialog
  ipcMain.handle(
    "workspace:showOpenDialog",
    async (): Promise<WorkspaceInfo | null> => {
      return showOpenWorkspaceDialog(BrowserWindow.getFocusedWindow());
    },
  );

  // Mark onboarding as complete
  ipcMain.handle(
    "workspace:setOnboardingComplete",
    (_event, completed: boolean): void => {
      setOnboardingComplete(completed);
    },
  );
}

/**
 * Send workspace events to the renderer
 */
export function notifyWorkspaceOpened(
  window: BrowserWindow,
  workspace: WorkspaceInfo,
): void {
  window.webContents.send("workspace:opened", workspace);
}

export function notifyWorkspaceClosed(window: BrowserWindow): void {
  window.webContents.send("workspace:closed");
}
