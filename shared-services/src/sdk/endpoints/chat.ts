import type { ApiClient } from "../client.js";
import { parseWithSchema } from "../validation.js";
import { chatCompletionRequestSchema } from "../../schemas/chat.js";
import type { ChatCompletionRequest } from "../../types/domain/chat.js";
import { NetworkSdkError, ServerSdkError } from "../errors.js";

export interface ChatStreamChunk {
  type: "chunk";
  text: string;
}

export interface ChatStreamDone {
  type: "done";
  finishReason?: string;
}

export type ChatStreamEvent = ChatStreamChunk | ChatStreamDone;

/**
 * Chat endpoint for streaming AI responses
 */
export class ChatEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Stream chat completions as incremental chunks
   */
  async *stream(
    data: ChatCompletionRequest,
    options?: { signal?: AbortSignal },
  ): AsyncGenerator<ChatStreamEvent> {
    const parsed = parseWithSchema(chatCompletionRequestSchema, data);
    const response = await this.client.postStream("/api/v1/chat", parsed, {
      signal: options?.signal,
    });

    if (!response.body) {
      throw new NetworkSdkError("Chat stream response body was empty");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const dataLine = trimmed.replace(/^data:\s?/, "");
        if (!dataLine) continue;

        if (dataLine === "[DONE]") {
          yield { type: "done", finishReason: "stop" };
          return;
        }

        let payload: unknown;
        try {
          payload = JSON.parse(dataLine);
        } catch {
          continue;
        }

        if (
          typeof payload === "object" &&
          payload &&
          "type" in payload &&
          (payload as { type: string }).type === "text-delta"
        ) {
          const delta =
            "delta" in payload && typeof (payload as { delta: string }).delta === "string"
              ? (payload as { delta: string }).delta
              : "textDelta" in payload && typeof (payload as { textDelta: string }).textDelta === "string"
                ? (payload as { textDelta: string }).textDelta
                : "";
          if (delta) {
            yield { type: "chunk", text: delta };
          }
          continue;
        }

        if (
          typeof payload === "object" &&
          payload &&
          "type" in payload &&
          (payload as { type: string }).type === "finish"
        ) {
          const finishReason =
            "finishReason" in payload && typeof (payload as { finishReason: string }).finishReason === "string"
              ? (payload as { finishReason: string }).finishReason
              : undefined;
          yield { type: "done", finishReason };
          return;
        }

        if (
          typeof payload === "object" &&
          payload &&
          "type" in payload &&
          (payload as { type: string }).type === "error"
        ) {
          const errorMessage =
            "errorText" in payload &&
            typeof (payload as { errorText: string }).errorText === "string"
              ? (payload as { errorText: string }).errorText
              : "error" in payload && typeof (payload as { error: string }).error === "string"
                ? (payload as { error: string }).error
                : "AI stream error";
          throw new ServerSdkError(errorMessage, response.status);
        }
      }
    }

    yield { type: "done" };
  }
}
