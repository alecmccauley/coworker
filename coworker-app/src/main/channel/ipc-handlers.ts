import { ipcMain } from "electron";
import {
  createChannel,
  updateChannel,
  archiveChannel,
  listChannels,
  getChannelById,
  createDefaultChannels,
  addCoworkerToChannel,
  removeCoworkerFromChannel,
  listChannelCoworkers,
  type CreateChannelInput,
  type UpdateChannelInput,
} from "./channel-service";
import type { Channel, ChannelCoworker, Coworker } from "../database";

/**
 * Register all channel-related IPC handlers
 */
export function registerChannelIpcHandlers(): void {
  // Create a new channel
  ipcMain.handle(
    "channel:create",
    async (_event, input: CreateChannelInput): Promise<Channel> => {
      return createChannel(input);
    },
  );

  // Update an existing channel
  ipcMain.handle(
    "channel:update",
    async (_event, id: string, input: UpdateChannelInput): Promise<Channel> => {
      return updateChannel(id, input);
    },
  );

  // Archive a channel
  ipcMain.handle(
    "channel:archive",
    async (_event, id: string): Promise<void> => {
      return archiveChannel(id);
    },
  );

  // List all active channels
  ipcMain.handle("channel:list", async (): Promise<Channel[]> => {
    return listChannels();
  });

  // Get a channel by ID
  ipcMain.handle(
    "channel:getById",
    async (_event, id: string): Promise<Channel | null> => {
      return getChannelById(id);
    },
  );

  // Create default channels
  ipcMain.handle("channel:createDefaults", async (): Promise<Channel[]> => {
    return createDefaultChannels();
  });

  // Add a coworker to a channel
  ipcMain.handle(
    "channel:addCoworker",
    async (
      _event,
      channelId: string,
      coworkerId: string,
    ): Promise<ChannelCoworker> => {
      return addCoworkerToChannel(channelId, coworkerId);
    },
  );

  // Remove a coworker from a channel
  ipcMain.handle(
    "channel:removeCoworker",
    async (_event, channelId: string, coworkerId: string): Promise<void> => {
      return removeCoworkerFromChannel(channelId, coworkerId);
    },
  );

  // List coworkers assigned to a channel
  ipcMain.handle(
    "channel:listCoworkers",
    async (_event, channelId: string): Promise<Coworker[]> => {
      return listChannelCoworkers(channelId);
    },
  );
}
