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
  updateKnowledgeSource,
  removeKnowledgeSource,
  listKnowledgeSources,
  getKnowledgeSourceById,
  addFileKnowledgeSource,
  type AddKnowledgeItemInput,
  type UpdateKnowledgeItemInput,
  type AddKnowledgeSourceInput,
  type UpdateKnowledgeSourceInput,
  type AddFileKnowledgeSourceInput,
} from "./knowledge-service";
import {
  indexKnowledgeSource,
  indexAllSources,
} from "./indexing/indexing-service";
import {
  searchKnowledgeSources,
  getSourceTextForPrompt,
  type SearchParams,
  type SourceTextResult,
  type RagChunkResult,
} from "./indexing/retrieval";
import { app, dialog } from "electron";
import { createId } from "@paralleldrive/cuid2";
import { readFileSync } from "fs";
import { extname, basename } from "path";
import type {
  KnowledgeItem,
  KnowledgeSource,
  ScopeType,
  SourceScopeType,
} from "../database";

interface ImportProgressPayload {
  batchId: string;
  filePath: string;
  filename: string;
  status: "queued" | "processing" | "success" | "error";
  sourceId?: string;
  error?: string;
}

interface ImportFailure {
  filePath: string;
  filename: string;
  error: string;
}

interface ImportSourcesResult {
  batchId: string;
  createdSources: KnowledgeSource[];
  failures: ImportFailure[];
  canceled: boolean;
  requiresAccess?: boolean;
  defaultPath?: string;
}

const SUPPORTED_EXTENSIONS = [".md", ".pdf", ".docx"] as const;

function isSupportedExtension(extension: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(
    extension.toLowerCase() as (typeof SUPPORTED_EXTENSIONS)[number],
  );
}

function fileExtensionToMime(extension: string): string {
  const normalized = extension.toLowerCase();
  const mimeMap: Record<string, string> = {
    ".md": "text/markdown",
    ".pdf": "application/pdf",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  return mimeMap[normalized] ?? "application/octet-stream";
}

async function importFilesInternal(
  filePaths: string[],
  scopeType: SourceScopeType,
  scopeId: string | undefined,
  sender: Electron.WebContents,
): Promise<ImportSourcesResult> {
  const batchId = createBatchId();
  const createdSources: KnowledgeSource[] = [];
  const failures: ImportFailure[] = [];
  let requiresAccess = false;
  let defaultPath: string | undefined;

  for (const filePath of filePaths) {
    const filename = basename(filePath);
    const extension = extname(filename);

    if (!isSupportedExtension(extension)) {
      const error = "Unsupported file type.";
      failures.push({ filePath, filename, error });
      sender.send("knowledge:importProgress", {
        batchId,
        filePath,
        filename,
        status: "error",
        error,
      } satisfies ImportProgressPayload);
      continue;
    }

    sender.send("knowledge:importProgress", {
      batchId,
      filePath,
      filename,
      status: "queued",
    } satisfies ImportProgressPayload);
    sender.send("knowledge:importProgress", {
      batchId,
      filePath,
      filename,
      status: "processing",
    } satisfies ImportProgressPayload);

    try {
      const data = readFileSync(filePath);
      const mime = fileExtensionToMime(extension);
      const sourceInput: AddFileKnowledgeSourceInput = {
        scopeType,
        scopeId,
        filename,
        data,
        mime,
      };
      const source = await addFileKnowledgeSource(sourceInput);
      createdSources.push(source);
      sender.send("knowledge:importProgress", {
        batchId,
        filePath,
        filename,
        status: "success",
        sourceId: source.id,
      } satisfies ImportProgressPayload);
      void indexKnowledgeSource(source.id).catch((error) => {
        console.error("[Knowledge] Indexing failed:", error);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import file.";
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code &&
        ["EACCES", "EPERM"].includes((error as NodeJS.ErrnoException).code ?? "")
      ) {
        requiresAccess = true;
        if (!defaultPath) {
          defaultPath = filePath;
        }
      }
      failures.push({ filePath, filename, error: message });
      sender.send("knowledge:importProgress", {
        batchId,
        filePath,
        filename,
        status: "error",
        error: message,
      } satisfies ImportProgressPayload);
    }
  }

  return {
    batchId,
    createdSources,
    failures,
    canceled: false,
    requiresAccess: requiresAccess || undefined,
    defaultPath,
  };
}

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
      const source = await addKnowledgeSource(input);
      if (source.blobId) {
        void indexKnowledgeSource(source.id).catch((error) => {
          console.error("[Knowledge] Indexing failed:", error);
        });
      }
      return source;
    },
  );

  // Update a knowledge source
  ipcMain.handle(
    "knowledge:updateSource",
    async (
      _event,
      id: string,
      input: UpdateKnowledgeSourceInput,
    ): Promise<KnowledgeSource> => {
      return updateKnowledgeSource(id, input);
    },
  );

  // Remove a knowledge source
  ipcMain.handle(
    "knowledge:removeSource",
    async (_event, id: string): Promise<void> => {
      return removeKnowledgeSource(id);
    },
  );

  // List knowledge sources
  ipcMain.handle(
    "knowledge:listSources",
    async (
      _event,
      scopeType?: SourceScopeType,
      scopeId?: string,
    ): Promise<KnowledgeSource[]> => {
      return listKnowledgeSources(scopeType, scopeId);
    },
  );

  // Get a knowledge source by ID
  ipcMain.handle(
    "knowledge:getSourceById",
    async (_event, id: string): Promise<KnowledgeSource | null> => {
      return getKnowledgeSourceById(id);
    },
  );

  ipcMain.handle(
    "knowledge:extractSource",
    async (_event, id: string, force?: boolean): Promise<void> => {
      await indexKnowledgeSource(id, { force });
    },
  );

  ipcMain.handle(
    "knowledge:searchSources",
    async (_event, params: SearchParams): Promise<RagChunkResult[]> => {
      return searchKnowledgeSources(params);
    },
  );

  ipcMain.handle(
    "knowledge:getSourceText",
    async (
      _event,
      sourceId: string,
      tokenCap: number,
    ): Promise<SourceTextResult | null> => {
      return getSourceTextForPrompt(sourceId, tokenCap);
    },
  );

  ipcMain.handle("knowledge:indexAllSources", async (): Promise<void> => {
    await indexAllSources({ force: true });
  });

  // Import files as knowledge sources
  ipcMain.handle(
    "knowledge:importFiles",
    async (
      event,
      scopeType: SourceScopeType,
      scopeId?: string,
    ): Promise<ImportSourcesResult> => {
      const result = await dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [
          {
            name: "Documents",
            extensions: ["md", "pdf", "docx"],
          },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return {
          batchId: createBatchId(),
          createdSources: [],
          failures: [],
          canceled: true,
          requiresAccess: false,
        };
      }

      return importFilesInternal(result.filePaths, scopeType, scopeId, event.sender);
    },
  );

  ipcMain.handle(
    "knowledge:importFilesByPath",
    async (
      event,
      filePaths: string[],
      scopeType: SourceScopeType,
      scopeId?: string,
    ): Promise<ImportSourcesResult> => {
      if (filePaths.length === 0) {
        return {
          batchId: createBatchId(),
          createdSources: [],
          failures: [],
          canceled: true,
          requiresAccess: false,
        };
      }

      return importFilesInternal(filePaths, scopeType, scopeId, event.sender);
    },
  );

  ipcMain.handle(
    "knowledge:requestFileAccessForDrop",
    async (_event, defaultPath?: string): Promise<string[]> => {
      const result = await dialog.showOpenDialog({
        defaultPath,
        properties: ["openFile", "multiSelections"],
        filters: [
          {
            name: "Documents",
            extensions: ["md", "pdf", "docx"],
          },
        ],
      });

      if (result.canceled) {
        return [];
      }

      return result.filePaths;
    },
  );

  ipcMain.handle(
    "knowledge:requestFolderAccess",
    async (): Promise<{ granted: boolean }> => {
      const documents = app.getPath("documents");
      const downloads = app.getPath("downloads");

      const documentsResult = await dialog.showOpenDialog({
        defaultPath: documents,
        properties: ["openDirectory"],
        buttonLabel: "Grant Access",
      });

      if (documentsResult.canceled) {
        return { granted: false };
      }

      const downloadsResult = await dialog.showOpenDialog({
        defaultPath: downloads,
        properties: ["openDirectory"],
        buttonLabel: "Grant Access",
      });

      if (downloadsResult.canceled) {
        return { granted: false };
      }

      return { granted: true };
    },
  );
}

function createBatchId(): string {
  return createId();
}
