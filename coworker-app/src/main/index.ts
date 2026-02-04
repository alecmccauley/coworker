import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import type { CoworkerSdk } from "@coworker/shared-services";
import { authStorage } from "./auth-storage";
import { registerWorkspaceIpcHandlers } from "./workspace";
import { registerCoworkerIpcHandlers } from "./coworker";
import { registerChannelIpcHandlers } from "./channel";
import { registerThreadIpcHandlers } from "./thread";
import { registerMessageIpcHandlers } from "./message";
import { registerKnowledgeIpcHandlers } from "./knowledge";
import { registerBlobIpcHandlers } from "./blob";
import { registerTemplateIpcHandlers, setTemplateSdkGetter } from "./templates";
import { buildApplicationMenu, setChannelSettingsEnabled } from "./menu";

let sdk: CoworkerSdk | null = null;

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
};

function createWindow(): void {
  // Create the browser window with premium macOS-native styling
  const mainWindow = new BrowserWindow({
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
    mainWindow.show();
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
}

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
  registerBlobIpcHandlers();
  registerTemplateIpcHandlers();

  // Set SDK getter for templates
  setTemplateSdkGetter(getSdk);

  // Build application menu
  buildApplicationMenu();

  createWindow();

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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
