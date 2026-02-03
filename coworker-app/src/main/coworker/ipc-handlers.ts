import { ipcMain } from "electron";
import {
  createCoworker,
  updateCoworker,
  deleteCoworker,
  listCoworkers,
  getCoworkerById,
  type CreateCoworkerInput,
  type UpdateCoworkerInput,
} from "./coworker-service";
import type { Coworker } from "../database";

/**
 * Register all coworker-related IPC handlers
 */
export function registerCoworkerIpcHandlers(): void {
  // Create a new coworker
  ipcMain.handle(
    "coworker:create",
    async (_event, input: CreateCoworkerInput): Promise<Coworker> => {
      return createCoworker(input);
    },
  );

  // Update an existing coworker
  ipcMain.handle(
    "coworker:update",
    async (
      _event,
      id: string,
      input: UpdateCoworkerInput,
    ): Promise<Coworker> => {
      return updateCoworker(id, input);
    },
  );

  // Delete a coworker (soft delete)
  ipcMain.handle(
    "coworker:delete",
    async (_event, id: string): Promise<void> => {
      return deleteCoworker(id);
    },
  );

  // List all active coworkers
  ipcMain.handle("coworker:list", async (): Promise<Coworker[]> => {
    return listCoworkers();
  });

  // Get a coworker by ID
  ipcMain.handle(
    "coworker:getById",
    async (_event, id: string): Promise<Coworker | null> => {
      return getCoworkerById(id);
    },
  );
}
