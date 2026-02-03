import { ipcMain } from "electron";
import {
  createThread,
  updateThread,
  archiveThread,
  listThreads,
  getThreadById,
  type CreateThreadInput,
  type UpdateThreadInput,
} from "./thread-service";
import type { Thread } from "../database";

/**
 * Register all thread-related IPC handlers
 */
export function registerThreadIpcHandlers(): void {
  // Create a new thread
  ipcMain.handle(
    "thread:create",
    async (_event, input: CreateThreadInput): Promise<Thread> => {
      return createThread(input);
    },
  );

  // Update an existing thread
  ipcMain.handle(
    "thread:update",
    async (_event, id: string, input: UpdateThreadInput): Promise<Thread> => {
      return updateThread(id, input);
    },
  );

  // Archive a thread
  ipcMain.handle(
    "thread:archive",
    async (_event, id: string): Promise<void> => {
      return archiveThread(id);
    },
  );

  // List all active threads in a channel
  ipcMain.handle(
    "thread:list",
    async (_event, channelId: string): Promise<Thread[]> => {
      return listThreads(channelId);
    },
  );

  // Get a thread by ID
  ipcMain.handle(
    "thread:getById",
    async (_event, id: string): Promise<Thread | null> => {
      return getThreadById(id);
    },
  );
}
