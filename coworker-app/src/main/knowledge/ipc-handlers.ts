import { ipcMain } from "electron";
import {
  addKnowledgeItem,
  updateKnowledgeItem,
  pinKnowledgeItem,
  unpinKnowledgeItem,
  removeKnowledgeItem,
  listKnowledgeItems,
  getKnowledgeItemById,
  addKnowledgeSource,
  listKnowledgeSources,
  getKnowledgeSourceById,
  type AddKnowledgeItemInput,
  type UpdateKnowledgeItemInput,
  type AddKnowledgeSourceInput,
} from "./knowledge-service";
import type { KnowledgeItem, KnowledgeSource, ScopeType } from "../database";

/**
 * Register all knowledge-related IPC handlers
 */
export function registerKnowledgeIpcHandlers(): void {
  // Add a knowledge item
  ipcMain.handle(
    "knowledge:add",
    async (_event, input: AddKnowledgeItemInput): Promise<KnowledgeItem> => {
      return addKnowledgeItem(input);
    },
  );

  // Update a knowledge item
  ipcMain.handle(
    "knowledge:update",
    async (
      _event,
      id: string,
      input: UpdateKnowledgeItemInput,
    ): Promise<KnowledgeItem> => {
      return updateKnowledgeItem(id, input);
    },
  );

  // Pin a knowledge item
  ipcMain.handle(
    "knowledge:pin",
    async (_event, id: string): Promise<KnowledgeItem> => {
      return pinKnowledgeItem(id);
    },
  );

  // Unpin a knowledge item
  ipcMain.handle(
    "knowledge:unpin",
    async (_event, id: string): Promise<KnowledgeItem> => {
      return unpinKnowledgeItem(id);
    },
  );

  // Remove a knowledge item
  ipcMain.handle(
    "knowledge:remove",
    async (_event, id: string): Promise<void> => {
      return removeKnowledgeItem(id);
    },
  );

  // List knowledge items
  ipcMain.handle(
    "knowledge:list",
    async (
      _event,
      scopeType?: ScopeType,
      scopeId?: string,
    ): Promise<KnowledgeItem[]> => {
      return listKnowledgeItems(scopeType, scopeId);
    },
  );

  // Get a knowledge item by ID
  ipcMain.handle(
    "knowledge:getById",
    async (_event, id: string): Promise<KnowledgeItem | null> => {
      return getKnowledgeItemById(id);
    },
  );

  // Add a knowledge source
  ipcMain.handle(
    "knowledge:addSource",
    async (
      _event,
      input: AddKnowledgeSourceInput,
    ): Promise<KnowledgeSource> => {
      return addKnowledgeSource(input);
    },
  );

  // List knowledge sources
  ipcMain.handle(
    "knowledge:listSources",
    async (): Promise<KnowledgeSource[]> => {
      return listKnowledgeSources();
    },
  );

  // Get a knowledge source by ID
  ipcMain.handle(
    "knowledge:getSourceById",
    async (_event, id: string): Promise<KnowledgeSource | null> => {
      return getKnowledgeSourceById(id);
    },
  );
}
