import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

export const ragContextItemSchema = z.object({
  sourceId: z.string().min(1),
  chunkId: z.string().min(1),
  text: z.string().min(1),
  score: z.number(),
  sourceName: z.string().min(1),
  matchType: z.enum(["fts", "vec", "hybrid"]),
  scopeType: z.enum(["workspace", "channel", "thread", "coworker"]),
  scopeId: z.string().min(1).optional(),
});

export const chatThreadContextSchema = z.object({
  threadId: z.string().min(1),
  threadTitle: z.string().nullable(),
  channelId: z.string().min(1),
  channelName: z.string().min(1),
  channelPurpose: z.string().nullable(),
  workspaceName: z.string().min(1),
});

export const chatCoworkerContextSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  rolePrompt: z.string().nullable(),
  defaultsJson: z.string().nullable(),
  templateId: z.string().nullable(),
  templateVersion: z.number().int().nullable(),
  templateDescription: z.string().nullable(),
});

export const chatCompletionRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  systemPrompt: z.string().min(1),
  ragContext: z.array(ragContextItemSchema),
  threadContext: chatThreadContextSchema,
  channelCoworkers: z.array(chatCoworkerContextSchema),
  mentionedCoworkerIds: z.array(z.string().min(1)),
  maxCoworkerResponses: z.number().int().positive().max(10),
  model: z.string().min(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});
