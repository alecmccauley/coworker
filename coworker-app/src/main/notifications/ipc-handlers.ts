import { BrowserWindow, ipcMain } from "electron";
import {
  getUnreadCountsByChannel,
  getUnreadCountsByThread,
  markThreadRead,
} from "./notification-service";

export function registerNotificationIpcHandlers(): void {
  ipcMain.handle(
    "notifications:markThreadRead",
    async (_event, threadId: string, readAt?: string | number): Promise<void> => {
      const date =
        typeof readAt === "string" || typeof readAt === "number"
          ? new Date(readAt)
          : undefined;
      return markThreadRead(threadId, date);
    },
  );

  ipcMain.handle(
    "notifications:getUnreadCounts",
    async (): Promise<Record<string, number>> => {
      return getUnreadCountsByChannel();
    },
  );

  ipcMain.handle(
    "notifications:getUnreadThreads",
    async (_event, channelId: string): Promise<Record<string, number>> => {
      return getUnreadCountsByThread(channelId);
    },
  );

  ipcMain.handle("window:focus", async (): Promise<void> => {
    const focused = BrowserWindow.getFocusedWindow();
    const window = focused ?? BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (!window.isVisible()) {
      window.show();
    }
    window.focus();
  });
}
