import { ipcMain } from "electron";
import {
  addBlob,
  readBlob,
  deleteBlob,
  getBlobById,
  listBlobs,
  type AddBlobInput,
  type AddBlobResult,
} from "./blob-service";
import type { Blob } from "../database";

/**
 * Register all blob-related IPC handlers
 */
export function registerBlobIpcHandlers(): void {
  // Add a blob
  ipcMain.handle(
    "blob:add",
    async (_event, input: AddBlobInput): Promise<AddBlobResult> => {
      return addBlob(input);
    },
  );

  // Read a blob's content
  ipcMain.handle(
    "blob:read",
    async (_event, id: string): Promise<Buffer | null> => {
      return readBlob(id);
    },
  );

  // Delete a blob
  ipcMain.handle("blob:delete", async (_event, id: string): Promise<void> => {
    return deleteBlob(id);
  });

  // Get blob metadata by ID
  ipcMain.handle(
    "blob:getById",
    async (_event, id: string): Promise<Blob | null> => {
      return getBlobById(id);
    },
  );

  // List all blobs
  ipcMain.handle("blob:list", async (): Promise<Blob[]> => {
    return listBlobs();
  });
}
