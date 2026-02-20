import type { z } from "zod";
import type {
  chatCompletionRequestSchema,
  chatCoworkerContextSchema,
  chatDocumentSummarySchema,
  chatMessageSchema,
  chatReplyContextSchema,
  chatThreadContextSchema,
  ragContextItemSchema,
} from "../../schemas/chat.js";

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type RagContextItem = z.infer<typeof ragContextItemSchema>;
export type ChatThreadContext = z.infer<typeof chatThreadContextSchema>;
export type ChatReplyContext = z.infer<typeof chatReplyContextSchema>;
export type ChatCoworkerContext = z.infer<typeof chatCoworkerContextSchema>;
export type ChatDocumentSummary = z.infer<typeof chatDocumentSummarySchema>;
export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>;
