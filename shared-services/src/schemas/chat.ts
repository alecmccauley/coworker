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

export const chatCompletionRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  systemPrompt: z.string().min(1),
  ragContext: z.array(ragContextItemSchema),
  model: z.string().min(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});
