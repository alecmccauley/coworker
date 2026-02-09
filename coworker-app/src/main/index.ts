import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  dialog,
  type MessageBoxSyncOptions,
} from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import type { CoworkerSdk } from "@coworker/shared-services";
import type { CreateFeedbackInput } from "@coworker/shared-services";
import { authStorage } from "./auth-storage";
import { openWorkspace, registerWorkspaceIpcHandlers } from "./workspace";
import { registerCoworkerIpcHandlers } from "./coworker";
import { registerChannelIpcHandlers } from "./channel";
import { registerThreadIpcHandlers } from "./thread";
import { registerMessageIpcHandlers } from "./message";
import { registerKnowledgeIpcHandlers } from "./knowledge";
import { registerMemoryIpcHandlers } from "./memory";
import { isIndexingInProgress } from "./knowledge/indexing/indexing-service";
import { registerBlobIpcHandlers } from "./blob";
import { registerTemplateIpcHandlers, setTemplateSdkGetter } from "./templates";
import { registerModelIpcHandlers, setModelSdkGetter } from "./models";
import { registerChatIpcHandlers, setChatSdkGetter } from "./chat";
import {
  buildApplicationMenu,
  refreshApplicationMenu,
  setChannelSettingsEnabled,
} from "./menu";
import {
  initUpdates,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getUpdateState,
  setAutoDownload,
  getAutoDownload,
  getCurrentVersion,
} from "./updates";

let sdk: CoworkerSdk | null = null;
let mainWindow: BrowserWindow | null = null;
const pendingOpenPaths: string[] = [];
const WORKSPACE_EXTENSION = ".cowork";

const getSdk = async (): Promise<CoworkerSdk> => {
  if (sdk) return sdk;
  const { createSdk } = await import("@coworker/shared-services");
  sdk = createSdk({
    baseUrl: process.env.COWORKER_API_URL || "http://localhost:3000",
    getAccessToken: async () => {
      const tokens = authStorage.getTokens();
      return tokens?.accessToken ?? null;
    },
    onTokenExpired: async () => {
      // Try to refresh the token
      const tokens = authStorage.getTokens();
      if (!tokens?.refreshToken) return null;

      try {
        const newTokens = await sdk!.auth.refresh(tokens.refreshToken);
        authStorage.saveTokens(newTokens.accessToken, newTokens.refreshToken);
        return newTokens.accessToken;
      } catch {
        // Refresh failed, clear tokens
        authStorage.clearTokens();
        return null;
      }
    },
  });
  return sdk;
};

const getApiUrl = (): string =>
  process.env.COWORKER_API_URL || "http://localhost:3000";

const registerIpcHandlers = (): void => {
  // Config handlers
  ipcMain.handle("config:getApiUrl", () => getApiUrl());

  // Menu handlers
  ipcMain.handle("menu:refresh", () => refreshApplicationMenu());

  // Auth handlers
  ipcMain.handle("auth:requestCode", async (_event, email: string) => {
    return (await getSdk()).auth.requestCode(email);
  });

  ipcMain.handle(
    "auth:verifyCode",
    async (_event, email: string, code: string) => {
      const response = await (await getSdk()).auth.verifyCode(email, code);
      // Store tokens securely
      authStorage.saveTokens(response.accessToken, response.refreshToken);
      // Return user (don't expose tokens to renderer)
      return { user: response.user };
    },
  );

  ipcMain.handle("auth:logout", async () => {
    const tokens = authStorage.getTokens();
    if (tokens?.refreshToken) {
      try {
        await (await getSdk()).auth.logout(tokens.refreshToken);
      } catch {
        // Ignore errors on logout
      }
    }
    authStorage.clearTokens();
    return { success: true };
  });

  ipcMain.handle("auth:me", async () => {
    return (await getSdk()).auth.me();
  });

  ipcMain.handle("auth:isAuthenticated", async () => {
    const tokens = authStorage.getTokens();
    if (!tokens) return { authenticated: false };

    try {
      // Try to get current user (validates access token)
      const user = await (await getSdk()).auth.me();
      return { authenticated: true, user };
    } catch (error) {
      // Check if it's an auth error
      const { AuthenticationSdkError } =
        await import("@coworker/shared-services");
      if (error instanceof AuthenticationSdkError) {
        // Access token expired, try refresh
        try {
          const newTokens = await (
            await getSdk()
          ).auth.refresh(tokens.refreshToken);
          authStorage.saveTokens(newTokens.accessToken, newTokens.refreshToken);
          return { authenticated: true, user: newTokens.user };
        } catch {
          authStorage.clearTokens();
          return { authenticated: false };
        }
      }
      return { authenticated: false };
    }
  });

  ipcMain.handle("auth:isStorageAvailable", () => {
    return authStorage.isAvailable();
  });

  // Hello handlers
  ipcMain.handle("api:hello:sayHello", async (_event, name?: string) =>
    (await getSdk()).hello.sayHello(name ? { name } : undefined),
  );

  // Update handlers
  ipcMain.handle("updates:getState", () => getUpdateState());
  ipcMain.handle("updates:check", async () => checkForUpdates());
  ipcMain.handle("updates:download", async () => downloadUpdate());
  ipcMain.handle("updates:quitAndInstall", () => quitAndInstall());
  ipcMain.handle("updates:setAutoDownload", (_event, value: boolean) =>
    setAutoDownload(Boolean(value)),
  );
  ipcMain.handle("updates:getAutoDownload", () => getAutoDownload());
  ipcMain.handle("updates:getCurrentVersion", () => getCurrentVersion());

  // User handlers
  ipcMain.handle("api:users:list", async () => (await getSdk()).users.list());
  ipcMain.handle("api:users:getById", async (_event, id: string) =>
    (await getSdk()).users.getById(id),
  );
  ipcMain.handle(
    "api:users:create",
    async (_event, data: Parameters<CoworkerSdk["users"]["create"]>[0]) =>
      (await getSdk()).users.create(data),
  );
  ipcMain.handle(
    "api:users:update",
    async (
      _event,
      id: string,
      data: Parameters<CoworkerSdk["users"]["update"]>[1],
    ) => (await getSdk()).users.update(id, data),
  );
  ipcMain.handle("api:users:delete", async (_event, id: string) =>
    (await getSdk()).users.delete(id),
  );

  // Events handlers
  ipcMain.handle("api:events:track", async (_event, data) =>
    (await getSdk()).events.track(data),
  );

  ipcMain.handle(
    "feedback:submit",
    async (_event, payload: CreateFeedbackInput) => {
      const sdkInstance = await getSdk();
      let screenshot: CreateFeedbackInput["screenshot"] | undefined;
      let includeScreenshot = Boolean(payload.includeScreenshot);

      if (includeScreenshot) {
        try {
          const window = getPrimaryWindow();
          const image = await window.webContents.capturePage();
          const pngBuffer = image.toPNG();
          const size = image.getSize();
          screenshot = {
            dataBase64: pngBuffer.toString("base64"),
            mime: "image/png",
            width: size.width,
            height: size.height,
            byteSize: pngBuffer.length,
            capturedAt: new Date().toISOString(),
          };
        } catch (error) {
          console.error("[Feedback] Failed to capture screenshot:", error);
          includeScreenshot = false;
        }
      }

      return sdkInstance.feedback.submit({
        ...payload,
        includeScreenshot,
        screenshot: includeScreenshot ? screenshot : undefined,
      });
    },
  );
};

function createWindow(): BrowserWindow {
  // Create the browser window with premium macOS-native styling
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    // macOS-specific glass effect configuration
    ...(process.platform === "darwin"
      ? {
          frame: false,
          transparent: true,
          titleBarStyle: "hiddenInset",
          vibrancy: "under-window",
          visualEffectState: "active",
          trafficLightPosition: { x: 20, y: 20 },
        }
      : {}),
    // Linux icon
    ...(process.platform === "linux" ? { icon } : {}),
    // Windows frameless with custom title bar
    ...(process.platform === "win32" ? { frame: false } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

function getPrimaryWindow(): BrowserWindow {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused) return focused;
  const existing = BrowserWindow.getAllWindows()[0];
  if (existing) return existing;
  return createWindow();
}

async function handleOpenWorkspacePath(
  workspacePath: string,
): Promise<void> {
  if (!workspacePath.endsWith(WORKSPACE_EXTENSION)) {
    console.warn(
      "[Workspace] Ignoring open-file path without .cowork extension:",
      workspacePath,
    );
    return;
  }

  const workspace = await openWorkspace(workspacePath);
  const window = getPrimaryWindow();
  window.webContents.send("menu:workspace:open", workspace);
}

async function flushPendingOpenPaths(): Promise<void> {
  if (pendingOpenPaths.length === 0) return;
  const paths = pendingOpenPaths.splice(0, pendingOpenPaths.length);
  for (const path of paths) {
    try {
      await handleOpenWorkspacePath(path);
    } catch (error) {
      console.error("[Workspace] Failed to open from pending path:", error);
    }
  }
}

app.on("will-finish-launching", () => {
  app.on("open-file", (event, path) => {
    event.preventDefault();
    if (app.isReady()) {
      handleOpenWorkspacePath(path).catch((error) => {
        console.error("[Workspace] Failed to open workspace:", error);
      });
      return;
    }
    pendingOpenPaths.push(path);
  });
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on("ping", () => console.log("pong"));

  ipcMain.on("menu:setChannelSettingsEnabled", (_event, enabled: boolean) => {
    setChannelSettingsEnabled(Boolean(enabled));
  });

  // Register IPC handlers
  registerIpcHandlers();
  registerWorkspaceIpcHandlers();
  registerCoworkerIpcHandlers();
  registerChannelIpcHandlers();
  registerThreadIpcHandlers();
  registerMessageIpcHandlers();
  registerKnowledgeIpcHandlers();
  registerMemoryIpcHandlers();
  registerBlobIpcHandlers();
  registerTemplateIpcHandlers();
  registerModelIpcHandlers();
  registerChatIpcHandlers();

  // Set SDK getter for templates
  setTemplateSdkGetter(getSdk);
  setModelSdkGetter(getSdk);
  setChatSdkGetter(getSdk);

  // Build application menu
  buildApplicationMenu();

  createWindow();
  initUpdates(() => mainWindow);
  flushPendingOpenPaths().catch((error) => {
    console.error("[Workspace] Failed to process pending open paths:", error);
  });

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", (event) => {
  if (!isIndexingInProgress()) {
    return;
  }

  const window = BrowserWindow.getFocusedWindow() ?? mainWindow;
  const options: MessageBoxSyncOptions = {
    type: "warning",
    buttons: ["Quit Anyway", "Keep Indexing"],
    defaultId: 1,
    cancelId: 1,
    title: "Indexing in Progress",
    message: "Sources are still indexing.",
    detail:
      "If you quit now, indexing will stop and may leave sources partially processed.",
  };

  const response = window
    ? dialog.showMessageBoxSync(window, options)
    : dialog.showMessageBoxSync(options);

  if (response === 1) {
    event.preventDefault();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
