import { ipcMain } from "electron";
import type {
  CoworkerSdk,
  CoworkerTemplatePublic,
  TemplateVersionInfo,
} from "@coworker/shared-services";
import {
  syncTemplates,
  syncTemplatesIfNeeded,
  getTemplates,
  type TemplateSyncResult,
} from "./template-sync";
import {
  getCachedTemplates,
  getCachedVersionInfo,
  clearTemplateCache,
} from "./template-cache";

// SDK getter will be injected from main
let getSdk: (() => Promise<CoworkerSdk>) | null = null;

/**
 * Set the SDK getter function
 */
export function setTemplateSdkGetter(getter: () => Promise<CoworkerSdk>): void {
  getSdk = getter;
}

/**
 * Register all template-related IPC handlers
 */
export function registerTemplateIpcHandlers(): void {
  // Get cached templates (no network)
  ipcMain.handle(
    "templates:listCached",
    async (): Promise<CoworkerTemplatePublic[]> => {
      return getCachedTemplates();
    },
  );

  // Get cached version info
  ipcMain.handle(
    "templates:versionInfo",
    async (): Promise<TemplateVersionInfo | null> => {
      return getCachedVersionInfo();
    },
  );

  // Sync templates from cloud (force refresh)
  ipcMain.handle("templates:sync", async (): Promise<TemplateSyncResult> => {
    if (!getSdk) {
      throw new Error("SDK not initialized");
    }
    return syncTemplates(await getSdk());
  });

  // Get templates (sync if needed)
  ipcMain.handle(
    "templates:list",
    async (): Promise<CoworkerTemplatePublic[]> => {
      if (!getSdk) {
        // Return cached templates if SDK not ready
        return getCachedTemplates();
      }
      return getTemplates(await getSdk());
    },
  );

  // Sync templates only if cache is stale
  ipcMain.handle(
    "templates:syncIfNeeded",
    async (): Promise<TemplateSyncResult> => {
      if (!getSdk) {
        return {
          success: false,
          templates: getCachedTemplates(),
          versionInfo: getCachedVersionInfo(),
          fromCache: true,
          error: "SDK not initialized",
        };
      }
      return syncTemplatesIfNeeded(await getSdk());
    },
  );

  // Clear template cache
  ipcMain.handle("templates:clearCache", async (): Promise<void> => {
    clearTemplateCache();
  });
}
