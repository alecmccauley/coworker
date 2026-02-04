import { ipcMain } from "electron";
import type {
  CoworkerSdk,
  CoworkerTemplatePublic,
} from "@coworker/shared-services";

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
  ipcMain.handle(
    "templates:list",
    async (): Promise<CoworkerTemplatePublic[]> => {
      if (!getSdk) {
        console.warn("[Templates] SDK not initialized, returning empty list");
        return [];
      }
      return (await getSdk()).templates.list();
    },
  );
}
