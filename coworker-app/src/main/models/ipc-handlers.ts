import { ipcMain } from "electron";
import type { CoworkerSdk, AiModelPublic } from "@coworker/shared-services";

let getSdk: (() => Promise<CoworkerSdk>) | null = null;

export function setModelSdkGetter(getter: () => Promise<CoworkerSdk>): void {
  getSdk = getter;
}

export function registerModelIpcHandlers(): void {
  ipcMain.handle("models:list", async (): Promise<AiModelPublic[]> => {
    if (!getSdk) {
      console.warn("[Models] SDK not initialized, returning empty list");
      return [];
    }
    return (await getSdk()).models.list();
  });
}
