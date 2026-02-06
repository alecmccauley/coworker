import type { z } from "zod";
import type {
  chatCompletionRequestSchema,
  chatMessageSchema,
  ragContextItemSchema,
} from "../../schemas/chat.js";

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type RagContextItem = z.infer<typeof ragContextItemSchema>;
export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>;
