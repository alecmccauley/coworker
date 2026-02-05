import { BrowserWindow } from "electron";

export type IndexStatus = "pending" | "processing" | "ready" | "error";

export interface IndexingProgressPayload {
  sourceId: string;
  status: IndexStatus;
  step?: string;
  message?: string;
  updatedAt: number;
}

export function broadcastIndexingProgress(
  payload: IndexingProgressPayload,
): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("knowledge:indexingProgress", payload);
  }
}
