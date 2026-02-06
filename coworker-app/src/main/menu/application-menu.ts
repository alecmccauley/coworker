import {
  app,
  Menu,
  shell,
  BrowserWindow,
  type MenuItemConstructorOptions,
} from "electron";
import {
  showCreateWorkspaceDialog,
  showOpenWorkspaceDialog,
  openWorkspace,
  closeWorkspace,
  listRecentWorkspaces,
  clearRecentWorkspaces,
} from "../workspace";

const isMac = process.platform === "darwin";

let channelSettingsEnabled = true;

/**
 * Build and set the application menu
 * Call this on app ready and whenever recent workspaces change
 */
export function buildApplicationMenu(): void {
  const template = buildMenuTemplate();
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Build the menu template
 */
function buildMenuTemplate(): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [];

  // macOS app menu
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Check for Updates...",
          click: handleCheckForUpdates,
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }

  // File menu
  template.push({
    label: "File",
    submenu: [
      {
        label: "New Workspace...",
        accelerator: "CmdOrCtrl+N",
        click: handleNewWorkspace,
      },
      {
        label: "Open Workspace...",
        accelerator: "CmdOrCtrl+O",
        click: handleOpenWorkspace,
      },
      buildRecentWorkspacesMenu(),
      { type: "separator" },
      {
        label: "Close Workspace",
        accelerator: "CmdOrCtrl+W",
        click: handleCloseWorkspace,
      },
      { type: "separator" },
      isMac ? { role: "close" } : { role: "quit" },
    ],
  });

  // Edit menu
  template.push({
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? [
            { role: "pasteAndMatchStyle" } as MenuItemConstructorOptions,
            { role: "delete" } as MenuItemConstructorOptions,
            { role: "selectAll" } as MenuItemConstructorOptions,
            { type: "separator" } as MenuItemConstructorOptions,
            {
              label: "Speech",
              submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
            } as MenuItemConstructorOptions,
          ]
        : [
            { role: "delete" } as MenuItemConstructorOptions,
            { type: "separator" } as MenuItemConstructorOptions,
            { role: "selectAll" } as MenuItemConstructorOptions,
          ]),
    ],
  });

  // View menu
  template.push({
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  });

  // Settings menu
  template.push({
    label: "Settings",
    submenu: [
      {
        label: "Workspace Settings",
        click: handleOpenWorkspaceSettings,
      },
      {
        label: "Channels Settings",
        enabled: channelSettingsEnabled,
        click: handleOpenChannelsSettings,
      },
      {
        label: "Coworker Settings",
        click: handleOpenWorkersSettings,
      },
    ],
  });

  // Window menu
  template.push({
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...(isMac
        ? [
            { type: "separator" } as MenuItemConstructorOptions,
            { role: "front" } as MenuItemConstructorOptions,
            { type: "separator" } as MenuItemConstructorOptions,
            { role: "window" } as MenuItemConstructorOptions,
          ]
        : [{ role: "close" } as MenuItemConstructorOptions]),
    ],
  });

  // Help menu
  template.push({
    label: "Help",
    submenu: [
      {
        label: "Learn More",
        click: async (): Promise<void> => {
          await shell.openExternal("https://coworker.app");
        },
      },
      {
        label: "Documentation",
        click: async (): Promise<void> => {
          await shell.openExternal("https://docs.coworker.app");
        },
      },
      { type: "separator" },
      {
        label: "Report Issue",
        click: async (): Promise<void> => {
          await shell.openExternal(
            "https://github.com/coworker/coworker-app/issues",
          );
        },
      },
    ],
  });

  return template;
}

/**
 * Build the "Open Recent" submenu
 */
function buildRecentWorkspacesMenu(): MenuItemConstructorOptions {
  const recentWorkspaces = listRecentWorkspaces();

  const submenu: MenuItemConstructorOptions[] = [];

  if (recentWorkspaces.length > 0) {
    recentWorkspaces.forEach((workspace) => {
      submenu.push({
        label: workspace.name,
        sublabel: workspace.path,
        click: async (): Promise<void> => {
          await handleOpenRecentWorkspace(workspace.path);
        },
      });
    });

    submenu.push({ type: "separator" });
    submenu.push({
      label: "Clear Recent Workspaces",
      click: handleClearRecentWorkspaces,
    });
  } else {
    submenu.push({
      label: "No Recent Workspaces",
      enabled: false,
    });
  }

  return {
    label: "Open Recent",
    submenu,
  };
}

/**
 * Handle New Workspace menu item
 */
async function handleNewWorkspace(): Promise<void> {
  const window = BrowserWindow.getFocusedWindow();
  try {
    const workspace = await showCreateWorkspaceDialog(window);
    if (workspace && window) {
      window.webContents.send("menu:workspace:new", workspace);
    }
  } catch (error) {
    console.error("[Menu] Failed to create workspace:", error);
  }
}

/**
 * Handle Open Workspace menu item
 */
async function handleOpenWorkspace(): Promise<void> {
  const window = BrowserWindow.getFocusedWindow();
  try {
    const workspace = await showOpenWorkspaceDialog(window);
    if (workspace && window) {
      window.webContents.send("menu:workspace:open", workspace);
    }
  } catch (error) {
    console.error("[Menu] Failed to open workspace:", error);
  }
}

/**
 * Handle opening a recent workspace
 */
async function handleOpenRecentWorkspace(path: string): Promise<void> {
  const window = BrowserWindow.getFocusedWindow();
  try {
    const workspace = await openWorkspace(path);
    if (window) {
      window.webContents.send("menu:workspace:open", workspace);
    }
    // Rebuild menu to update recent list order
    buildApplicationMenu();
  } catch (error) {
    console.error("[Menu] Failed to open recent workspace:", error);
  }
}

/**
 * Handle Close Workspace menu item
 */
async function handleCloseWorkspace(): Promise<void> {
  const window = BrowserWindow.getFocusedWindow();
  try {
    await closeWorkspace();
    if (window) {
      window.webContents.send("menu:workspace:close");
    }
  } catch (error) {
    console.error("[Menu] Failed to close workspace:", error);
  }
}

/**
 * Handle Clear Recent Workspaces menu item
 */
function handleClearRecentWorkspaces(): void {
  clearRecentWorkspaces();
  buildApplicationMenu(); // Rebuild menu to update recent list
}

/**
 * Handle Check for Updates menu item
 */
function handleCheckForUpdates(): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send("menu:updates:open");
  }
}

/**
 * Handle Workspace Settings menu item
 */
function handleOpenWorkspaceSettings(): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send("menu:settings:workspace");
  }
}

/**
 * Handle Channels Settings menu item
 */
function handleOpenChannelsSettings(): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send("menu:settings:channels");
  }
}

/**
 * Handle Workers Settings menu item
 */
function handleOpenWorkersSettings(): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send("menu:settings:workers");
  }
}

/**
 * Set whether the Channels Settings menu item is enabled and rebuild the menu.
 * Called by the renderer when workspace/channel selection changes.
 */
export function setChannelSettingsEnabled(enabled: boolean): void {
  channelSettingsEnabled = enabled;
  buildApplicationMenu();
}

/**
 * Refresh the application menu (call after workspace changes)
 */
export function refreshApplicationMenu(): void {
  buildApplicationMenu();
}
