import { ipcMain } from "electron";
import { addMemory, forgetMemory, listMemoriesForCoworker } from "./memory-service";
import type { MemoryListItem } from "./memory-service";

export function registerMemoryIpcHandlers(): void {
  ipcMain.handle(
    "memory:list",
    async (_event, coworkerId: string): Promise<MemoryListItem[]> => {
      return listMemoriesForCoworker(coworkerId);
    },
  );

  ipcMain.handle(
    "memory:forget",
    async (_event, memoryId: string, coworkerId: string): Promise<void> => {
      return forgetMemory(memoryId, coworkerId);
    },
  );

  ipcMain.handle(
    "memory:add",
    async (
      _event,
      input: { content: string; coworkerIds: string[] },
    ): Promise<void> => {
      await addMemory(input);
    },
  );
}
