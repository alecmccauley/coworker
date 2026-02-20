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

export interface ChatStreamToolInputStart {
  type: "tool-input-start";
  toolCallId: string;
  toolName: string;
}

export interface ChatStreamToolInputDelta {
  type: "tool-input-delta";
  toolCallId: string;
  toolName: string;
  inputTextDelta: string;
}

export interface ChatStreamToolInputAvailable {
  type: "tool-input-available";
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export interface ChatStreamToolOutputAvailable {
  type: "tool-output-available";
  toolCallId: string;
  toolName: string;
  output: unknown;
}

export type ChatStreamEvent =
  | ChatStreamChunk
  | ChatStreamDone
  | ChatStreamToolInputStart
  | ChatStreamToolInputDelta
  | ChatStreamToolInputAvailable
  | ChatStreamToolOutputAvailable;

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

    const parseEventData = (rawEvent: string): string | null => {
      const lines = rawEvent.split(/\r?\n/);
      const dataLines: string[] = [];
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        dataLines.push(line.replace(/^data:\s?/, ""));
      }
      if (dataLines.length === 0) return null;
      return dataLines.join("\n");
    };

    const emitFromDataLine = async function* (
      dataLine: string,
    ): AsyncGenerator<ChatStreamEvent, boolean> {
      if (!dataLine) {
        return false;
      }

      if (dataLine === "[DONE]") {
        yield { type: "done", finishReason: "stop" };
        return true;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(dataLine);
      } catch {
        return false;
      }

      if (typeof payload === "object" && payload && "type" in payload) {
        const payloadType = (payload as { type: string }).type;

        if (payloadType === "text-start" || payloadType === "text-end") {
          return false;
        }

        if (payloadType === "text-delta" || payloadType === "text") {
          const delta =
            "delta" in payload &&
            typeof (payload as { delta: string }).delta === "string"
              ? (payload as { delta: string }).delta
              : "textDelta" in payload &&
                  typeof (payload as { textDelta: string }).textDelta ===
                    "string"
                ? (payload as { textDelta: string }).textDelta
                : "text" in payload &&
                    typeof (payload as { text: string }).text === "string"
                  ? (payload as { text: string }).text
                  : "";
          if (delta) {
            yield { type: "chunk", text: delta };
          }
          return false;
        }
      }

      if (
        typeof payload === "object" &&
        payload &&
        "type" in payload &&
        (payload as { type: string }).type === "finish"
      ) {
        const finishReason =
          "finishReason" in payload &&
          typeof (payload as { finishReason: string }).finishReason === "string"
            ? (payload as { finishReason: string }).finishReason
            : undefined;
        yield { type: "done", finishReason };
        return true;
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
            : "error" in payload &&
                typeof (payload as { error: string }).error === "string"
              ? (payload as { error: string }).error
              : "AI stream error";
        throw new ServerSdkError(errorMessage, response.status);
      }

      if (typeof payload === "object" && payload && "type" in payload) {
        const payloadType = (payload as { type: string }).type;
        const toolCallId =
          "toolCallId" in payload &&
          typeof (payload as { toolCallId: string }).toolCallId === "string"
            ? (payload as { toolCallId: string }).toolCallId
            : null;
        const toolName =
          "toolName" in payload &&
          typeof (payload as { toolName: string }).toolName === "string"
            ? (payload as { toolName: string }).toolName
            : null;

        if (
          (payloadType === "tool-input-start" ||
            payloadType === "tool-call-streaming-start") &&
          toolCallId &&
          toolName
        ) {
          yield { type: "tool-input-start", toolCallId, toolName };
          return false;
        }

        if (
          (payloadType === "tool-input-delta" ||
            payloadType === "tool-call-delta") &&
          toolCallId &&
          toolName
        ) {
          const inputTextDelta =
            "inputTextDelta" in payload &&
            typeof (payload as { inputTextDelta: string }).inputTextDelta ===
              "string"
              ? (payload as { inputTextDelta: string }).inputTextDelta
              : "argsTextDelta" in payload &&
                  typeof (payload as { argsTextDelta: string }).argsTextDelta ===
                    "string"
                ? (payload as { argsTextDelta: string }).argsTextDelta
                : "";
          if (inputTextDelta) {
            yield {
              type: "tool-input-delta",
              toolCallId,
              toolName,
              inputTextDelta,
            };
          }
          return false;
        }

        if (payloadType === "tool-input-available" && toolCallId && toolName) {
          const input =
            "input" in payload ? (payload as { input: unknown }).input : undefined;
          yield {
            type: "tool-input-available",
            toolCallId,
            toolName,
            input,
          };
          return false;
        }

        if (
          (payloadType === "tool-output-available" ||
            payloadType === "tool-result") &&
          toolCallId &&
          toolName
        ) {
          const output =
            "output" in payload
              ? (payload as { output: unknown }).output
              : undefined;
          yield {
            type: "tool-output-available",
            toolCallId,
            toolName,
            output,
          };
          return false;
        }
      }

      return false;
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        const dataLine = parseEventData(rawEvent);
        if (!dataLine) continue;

        const emitter = emitFromDataLine(dataLine);
        while (true) {
          const next = await emitter.next();
          if (next.done) {
            if (next.value) return;
            break;
          }
          yield next.value;
        }
      }
    }

    const trailingData = parseEventData(buffer);
    if (trailingData) {
      const emitter = emitFromDataLine(trailingData);
      while (true) {
        const next = await emitter.next();
        if (next.done) {
          if (next.value) return;
          break;
        }
        yield next.value;
      }
    }

    yield { type: "done", finishReason: "eof" };
  }
}
