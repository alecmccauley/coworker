import { ipcMain } from "electron";
import {
  createMessage,
  updateMessage,
  listMessages,
  getMessageById,
  listDocumentsByChannel,
  listDocumentsByWorkspace,
  type CreateMessageInput,
  type UpdateMessageInput,
  type ChannelDocument,
  type WorkspaceDocument,
} from "./message-service";
import type { Message } from "../database";

/**
 * Register all message-related IPC handlers
 */
export function registerMessageIpcHandlers(): void {
  // Create a new message
  ipcMain.handle(
    "message:create",
    async (_event, input: CreateMessageInput): Promise<Message> => {
      return createMessage(input);
    },
  );

  // Update an existing message
  ipcMain.handle(
    "message:update",
    async (_event, id: string, input: UpdateMessageInput): Promise<Message> => {
      return updateMessage(id, input);
    },
  );

  // List all messages in a thread
  ipcMain.handle(
    "message:list",
    async (_event, threadId: string): Promise<Message[]> => {
      return listMessages(threadId);
    },
  );

  // Get a message by ID
  ipcMain.handle(
    "message:getById",
    async (_event, id: string): Promise<Message | null> => {
      return getMessageById(id);
    },
  );

  // List all documents in a channel
  ipcMain.handle(
    "message:listDocumentsByChannel",
    async (_event, channelId: string): Promise<ChannelDocument[]> => {
      return listDocumentsByChannel(channelId);
    },
  );

  // List all documents in the workspace
  ipcMain.handle(
    "message:listDocumentsByWorkspace",
    async (): Promise<WorkspaceDocument[]> => {
      return listDocumentsByWorkspace();
    },
  );
}
