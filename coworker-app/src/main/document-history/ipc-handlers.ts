import { ipcMain } from "electron";
import type { DocumentVersion } from "../database";
import {
  addDocumentVersion,
  listDocumentVersions,
  getDocumentVersionById,
  getDocumentVersionContent,
  revertDocumentVersion,
} from "./document-history-service";

export function registerDocumentHistoryIpcHandlers(): void {
  ipcMain.handle(
    "documentHistory:list",
    async (_event, messageId: string): Promise<DocumentVersion[]> => {
      return listDocumentVersions(messageId);
    },
  );

  ipcMain.handle(
    "documentHistory:get",
    async (
      _event,
      versionId: string,
    ): Promise<{ version: DocumentVersion | null; content: string | null }> => {
      const version = await getDocumentVersionById(versionId);
      const content = version ? await getDocumentVersionContent(versionId) : null;
      return { version, content };
    },
  );

  ipcMain.handle(
    "documentHistory:revert",
    async (
      _event,
      input: {
        messageId: string;
        versionId: string;
        commitMessage: string;
        authorType: "user" | "coworker" | "system";
        authorId?: string | null;
      },
    ): Promise<DocumentVersion> => {
      return revertDocumentVersion(input);
    },
  );

  ipcMain.handle(
    "documentHistory:add",
    async (
      _event,
      input: {
        messageId: string;
        blobId: string;
        commitMessage: string;
        authorType: "user" | "coworker" | "system";
        authorId?: string | null;
      },
    ): Promise<DocumentVersion> => {
      return addDocumentVersion(input);
    },
  );
}
