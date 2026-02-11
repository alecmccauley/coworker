export {
  buildSystemPrompt,
  convertThreadToChatMessages,
  extractMentionedDocumentIds,
  gatherRagContext,
  gatherMentionedDocumentContext,
  getCoworkerContext,
  getThreadContext,
  resolvePrimaryCoworker,
} from "./chat-service";

export { registerChatIpcHandlers, setChatSdkGetter } from "./ipc-handlers";
