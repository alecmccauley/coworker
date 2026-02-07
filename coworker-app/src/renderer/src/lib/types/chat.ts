export interface ChatChunkPayload {
  messageId: string;
  text: string;
  fullContent: string;
}

export interface ChatCompletePayload {
  messageId: string;
  content: string;
}

export interface ChatErrorPayload {
  messageId: string;
  error: string;
}

export interface ChatStatusPayload {
  messageId: string;
  label: string;
  phase?: "streaming" | "done" | "error";
}
