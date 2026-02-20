import type { Message } from "./message";

export interface ChatChunkPayload {
  messageId: string;
  text: string;
  fullContent: string;
}

export interface ChatCompletePayload {
  messageId: string;
  content: string;
  status?: "complete" | "suppressed";
}

export interface ChatErrorPayload {
  messageId: string;
  error: string;
  code?:
    | "stream_incomplete"
    | "stream_timeout"
    | "stream_aborted"
    | "stream_upstream_error";
}

export interface ChatStatusPayload {
  threadId: string;
  messageId?: string;
  label: string;
  phase?: "streaming" | "done" | "error";
}

export interface ChatMessageCreatedPayload {
  threadId: string;
  message: Message;
}

export interface ChatQueuePayload {
  threadId: string;
  messageId: string;
  state: "queued" | "processing";
}
