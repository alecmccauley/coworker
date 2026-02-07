import { ipcMain, type WebContents } from "electron";
import type {
  ChatCompletionRequest,
  CoworkerSdk,
} from "@coworker/shared-services";
import {
  createMessage,
  updateMessage,
  getThreadMessageCount,
} from "../message";
import {
  buildOrchestratorSystemPrompt,
  convertThreadToChatMessages,
  extractMentionedCoworkerIds,
  gatherRagContext,
  getThreadContext,
  mapCoworkerToContext,
  normalizeMentionsForLlm,
} from "./chat-service";
import { listChannelCoworkers } from "../channel";
import { updateThread } from "../thread";
import { addMemory } from "../memory";

interface ChatChunkPayload {
  messageId: string;
  text: string;
  fullContent: string;
}

interface ChatCompletePayload {
  messageId: string;
  content: string;
}

interface ChatErrorPayload {
  messageId: string;
  error: string;
}

interface ChatStatusPayload {
  threadId: string;
  messageId?: string;
  label: string;
  phase?: "streaming" | "done" | "error";
}

interface ChatMessageCreatedPayload {
  threadId: string;
  message: Awaited<ReturnType<typeof createMessage>>;
}

interface SendMessageResult {
  userMessage: Awaited<ReturnType<typeof createMessage>>;
  responseId: string;
}

const activeStreams = new Map<string, AbortController>();

let getSdk: (() => Promise<CoworkerSdk>) | null = null;

export function setChatSdkGetter(getter: () => Promise<CoworkerSdk>): void {
  getSdk = getter;
}

function safeSend<T>(sender: WebContents, channel: string, payload: T): void {
  if (sender.isDestroyed()) {
    return;
  }
  sender.send(channel, payload);
}

function extractStatusLabelFromInputText(inputText: string): string {
  const trimmed = inputText.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as { label?: unknown };
    if (parsed && typeof parsed.label === "string") {
      return parsed.label;
    }
  } catch {
    // Best-effort parsing for partial JSON.
  }

  const quotedMatch = /"label"\s*:\s*"([^"]+)"/.exec(trimmed);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return trimmed
    .replace(/[{}[\]]/g, "")
    .replace(/\"/g, "")
    .replace(/\s*label\s*:\s*/i, "")
    .replace(/,$/, "")
    .trim();
}

function normalizeStatusLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.length > 120 ? trimmed.slice(0, 120).trim() : trimmed;
}

function extractCoworkerIdFromInputText(inputText: string): string {
  const trimmed = inputText.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as { coworkerId?: unknown };
    if (parsed && typeof parsed.coworkerId === "string") {
      return parsed.coworkerId;
    }
  } catch {
    // Best-effort parsing for partial JSON.
  }

  const quotedMatch = /"coworkerId"\s*:\s*"([^"]+)"/.exec(trimmed);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return trimmed
    .replace(/[{}[\]]/g, "")
    .replace(/\"/g, "")
    .replace(/\s*coworkerId\s*:\s*/i, "")
    .replace(/,$/, "")
    .trim();
}

function extractContentFromInputText(inputText: string): string {
  const trimmed = inputText.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as { content?: unknown };
    if (parsed && typeof parsed.content === "string") {
      return parsed.content;
    }
  } catch {
    // Best-effort parsing for partial JSON.
  }

  const quotedMatch = /"content"\s*:\s*"([^"]*)/s.exec(trimmed);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return trimmed
    .replace(/[{}[\]]/g, "")
    .replace(/\"/g, "")
    .replace(/\s*content\s*:\s*/i, "")
    .replace(/,$/, "")
    .trim();
}

function extractTitleFromInputText(inputText: string): string {
  const trimmed = inputText.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as { title?: unknown };
    if (parsed && typeof parsed.title === "string") {
      return parsed.title;
    }
  } catch {
    // Best-effort parsing for partial JSON.
  }

  const quotedMatch = /"title"\s*:\s*"([^"]+)"/.exec(trimmed);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return trimmed
    .replace(/[{}[\]]/g, "")
    .replace(/\"/g, "")
    .replace(/\s*title\s*:\s*/i, "")
    .replace(/,$/, "")
    .trim();
}

function normalizeTitle(rawTitle: string): string {
  const sanitized = rawTitle
    .replace(/[.!?;:"'“”‘’()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) {
    return "";
  }

  const words = sanitized.split(" ").filter(Boolean);
  const limited = words.slice(0, 6).join(" ");

  if (words.length < 2) {
    return "";
  }

  const capped = limited.length > 80 ? limited.slice(0, 80).trim() : limited;
  return capped.charAt(0).toUpperCase() + capped.slice(1);
}

async function persistStreamingContent(
  messageId: string,
  content: string,
  status: "streaming" | "complete" | "error",
): Promise<void> {
  await updateMessage(messageId, {
    contentShort: content,
    status,
  });
}

async function streamChatResponse(
  sender: WebContents,
  threadId: string,
  content: string,
  responseId: string,
  shouldAutoTitle: boolean,
): Promise<void> {
  if (!getSdk) {
    throw new Error("Chat SDK is not initialized");
  }

  const controller = new AbortController();
  activeStreams.set(responseId, controller);

  let statusClosed = false;
  const statusBuffers = new Map<string, string>();
  const titleBuffers = new Map<string, string>();
  let titleApplied = false;
  const coworkerBuffers = new Map<
    string,
    {
      rawInput: string;
      coworkerId?: string;
      messageId?: string;
      content: string;
      lastPersist: number;
    }
  >();
  const responseMessageByCoworker = new Map<string, string>();
  let activeMessageId: string | null = null;

  const emitStatus = (label: string, phase: ChatStatusPayload["phase"]): void => {
    if (statusClosed) {
      return;
    }
    safeSend<ChatStatusPayload>(sender, "chat:status", {
      threadId,
      messageId: activeMessageId ?? undefined,
      label,
      phase,
    });
    if (phase && phase !== "streaming") {
      statusClosed = true;
    }
  };

  const finalizeStatus = (phase: "done" | "error"): void => {
    if (statusClosed) {
      return;
    }
    statusBuffers.clear();
    emitStatus("", phase);
  };

  try {
    const threadContext = await getThreadContext(threadId);
    const channelCoworkers = await listChannelCoworkers(
      threadContext.channelId,
    );
    if (channelCoworkers.length === 0) {
      const systemMessage = await createMessage({
        threadId,
        authorType: "system",
        contentShort:
          "No co-workers are assigned to this channel yet. Add one to start collaborating.",
        status: "complete",
      });
      safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
        threadId,
        message: systemMessage,
      });
      finalizeStatus("done");
      return;
    }

    emitStatus("Selecting co-workers...", "streaming");

    const normalizedContent = normalizeMentionsForLlm(content);
    const maxCoworkerResponses = 3;
    const systemPrompt = buildOrchestratorSystemPrompt(
      threadContext,
      maxCoworkerResponses,
      shouldAutoTitle,
    );
    const coworkerIds = channelCoworkers.map((coworker) => coworker.id);
    const coworkerNameById = new Map(
      channelCoworkers.map((coworker) => [coworker.id, coworker.name]),
    );
    const ragContext = await gatherRagContext(
      normalizedContent,
      threadId,
      threadContext.channelId,
      coworkerIds,
    );
    const priorMessages = await convertThreadToChatMessages(threadId);
    const messages = [
      ...priorMessages,
      { role: "user", content: normalizedContent },
    ] as ChatCompletionRequest["messages"];
    const mentionedCoworkerIds = extractMentionedCoworkerIds(content);

    const request: ChatCompletionRequest = {
      messages,
      systemPrompt,
      ragContext,
      threadContext,
      channelCoworkers: channelCoworkers.map(mapCoworkerToContext),
      mentionedCoworkerIds,
      maxCoworkerResponses,
    };

    const stream = (await getSdk()).chat.stream(request, {
      signal: controller.signal,
    });

    for await (const event of stream) {
      if (event.type === "chunk") {
        continue;
      }

      if (
        event.type === "tool-input-start" &&
        event.toolName === "report_status"
      ) {
        statusBuffers.set(event.toolCallId, "");
        continue;
      }

      if (
        event.type === "tool-input-delta" &&
        event.toolName === "report_status"
      ) {
        const existing = statusBuffers.get(event.toolCallId) ?? "";
        const next = `${existing}${event.inputTextDelta}`;
        statusBuffers.set(event.toolCallId, next);
        const label = normalizeStatusLabel(extractStatusLabelFromInputText(next));
        if (label) {
          emitStatus(label, "streaming");
        }
        continue;
      }

      if (
        event.type === "tool-input-available" &&
        event.toolName === "report_status"
      ) {
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as { label?: unknown })
            : null;
        const label =
          input && typeof input.label === "string"
            ? normalizeStatusLabel(input.label)
            : normalizeStatusLabel(
                extractStatusLabelFromInputText(
                  statusBuffers.get(event.toolCallId) ?? "",
                ),
              );
        if (label) {
          emitStatus(label, "streaming");
        }
        continue;
      }

      if (
        event.type === "tool-input-start" &&
        event.toolName === "set_conversation_title"
      ) {
        titleBuffers.set(event.toolCallId, "");
        continue;
      }

      if (
        event.type === "tool-input-delta" &&
        event.toolName === "set_conversation_title"
      ) {
        const existing = titleBuffers.get(event.toolCallId) ?? "";
        const next = `${existing}${event.inputTextDelta}`;
        titleBuffers.set(event.toolCallId, next);
        if (shouldAutoTitle && !titleApplied) {
          const title = normalizeTitle(extractTitleFromInputText(next));
          if (title) {
            const updated = await updateThread(threadId, { title });
            safeSend(sender, "thread:updated", updated);
            titleApplied = true;
          }
        }
        continue;
      }

      if (
        event.type === "tool-input-available" &&
        event.toolName === "set_conversation_title"
      ) {
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as { title?: unknown })
            : null;
        const title =
          input && typeof input.title === "string"
            ? normalizeTitle(input.title)
            : normalizeTitle(
                extractTitleFromInputText(
                  titleBuffers.get(event.toolCallId) ?? "",
                ),
              );
        if (shouldAutoTitle && !titleApplied && title) {
          const updated = await updateThread(threadId, { title });
          safeSend(sender, "thread:updated", updated);
          titleApplied = true;
        }
        continue;
      }

      if (
        event.type === "tool-input-available" &&
        event.toolName === "save_memory"
      ) {
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as { content?: unknown; coworkerIds?: unknown })
            : null;
        const content =
          input && typeof input.content === "string" ? input.content : "";
        const coworkerIds =
          input && Array.isArray(input.coworkerIds)
            ? input.coworkerIds.filter((id): id is string => typeof id === "string")
            : [];
        if (content.trim().length > 0 && coworkerIds.length > 0) {
          void addMemory({ content, coworkerIds }).catch((error) => {
            console.error("[Memory] Failed to save memory:", error);
          });
        }
        continue;
      }

      if (
        event.type === "tool-input-start" &&
        event.toolName === "generate_coworker_response"
      ) {
        coworkerBuffers.set(event.toolCallId, {
          rawInput: "",
          content: "",
          lastPersist: Date.now(),
        });
        continue;
      }

      if (
        event.type === "tool-input-delta" &&
        event.toolName === "generate_coworker_response"
      ) {
        const existing =
          coworkerBuffers.get(event.toolCallId) ?? {
            rawInput: "",
            content: "",
            lastPersist: Date.now(),
          };
        const nextInput = `${existing.rawInput}${event.inputTextDelta}`;
        const coworkerId =
          existing.coworkerId || extractCoworkerIdFromInputText(nextInput);
        const updated = {
          ...existing,
          rawInput: nextInput,
          coworkerId: coworkerId || existing.coworkerId,
        };
        coworkerBuffers.set(event.toolCallId, updated);

        if (updated.coworkerId && !responseMessageByCoworker.has(updated.coworkerId)) {
          const created = await createMessage({
            threadId,
            authorType: "coworker",
            authorId: updated.coworkerId,
            contentShort: "",
            status: "streaming",
          });
          responseMessageByCoworker.set(updated.coworkerId, created.id);
          safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
            threadId,
            message: created,
          });
          const name = coworkerNameById.get(updated.coworkerId);
          if (name) {
            safeSend<ChatStatusPayload>(sender, "chat:status", {
              threadId,
              messageId: created.id,
              label: `${name} is thinking...`,
              phase: "streaming",
            });
          }
        }

        if (updated.coworkerId) {
          activeMessageId = responseMessageByCoworker.get(updated.coworkerId) ?? null;
        }
        continue;
      }

      if (
        event.type === "tool-input-available" &&
        event.toolName === "generate_coworker_response"
      ) {
        const existing = coworkerBuffers.get(event.toolCallId);
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as { coworkerId?: unknown })
            : null;
        const coworkerId =
          (input?.coworkerId && typeof input.coworkerId === "string"
            ? input.coworkerId
            : existing?.coworkerId) ?? "";
        if (existing?.coworkerId) {
          activeMessageId = responseMessageByCoworker.get(existing.coworkerId) ?? null;
        }
        if (coworkerId) {
          activeMessageId = responseMessageByCoworker.get(coworkerId) ?? null;
          const name = coworkerNameById.get(coworkerId);
          if (name) {
            emitStatus(`${name} is responding...`, "streaming");
          }
        }
        coworkerBuffers.delete(event.toolCallId);
        continue;
      }

      if (
        event.type === "tool-output-available" &&
        event.toolName === "generate_coworker_response"
      ) {
        const output =
          event.output && typeof event.output === "object"
            ? (event.output as { coworkerId?: unknown })
            : null;
        const coworkerId =
          output?.coworkerId && typeof output.coworkerId === "string"
            ? output.coworkerId
            : "";
        if (coworkerId) {
          activeMessageId = responseMessageByCoworker.get(coworkerId) ?? null;
          const name = coworkerNameById.get(coworkerId);
          if (name) {
            emitStatus(`${name} is responding...`, "streaming");
          }
        }
        continue;
      }

      if (
        event.type === "tool-input-start" &&
        event.toolName === "emit_coworker_message"
      ) {
        coworkerBuffers.set(event.toolCallId, {
          rawInput: "",
          content: "",
          lastPersist: Date.now(),
        });
        continue;
      }

      if (
        event.type === "tool-input-delta" &&
        event.toolName === "emit_coworker_message"
      ) {
        const existing =
          coworkerBuffers.get(event.toolCallId) ?? {
            rawInput: "",
            content: "",
            lastPersist: Date.now(),
          };
        const nextInput = `${existing.rawInput}${event.inputTextDelta}`;
        const coworkerId =
          existing.coworkerId || extractCoworkerIdFromInputText(nextInput);
        const contentValue = extractContentFromInputText(nextInput);
        const previousContent = existing.content;
        const updated = {
          ...existing,
          rawInput: nextInput,
          coworkerId: coworkerId || existing.coworkerId,
          content: contentValue || existing.content,
        };
        coworkerBuffers.set(event.toolCallId, updated);

        if (updated.coworkerId) {
          activeMessageId =
            responseMessageByCoworker.get(updated.coworkerId) ??
            updated.messageId ??
            null;
        }

        if (!updated.messageId && updated.coworkerId) {
          const existingMessageId = responseMessageByCoworker.get(
            updated.coworkerId,
          );
          if (existingMessageId) {
            updated.messageId = existingMessageId;
            coworkerBuffers.set(event.toolCallId, updated);
          }
        }

        if (!updated.messageId && updated.coworkerId) {
          const created = await createMessage({
            threadId,
            authorType: "coworker",
            authorId: updated.coworkerId,
            contentShort: updated.content,
            status: "streaming",
          });
          updated.messageId = created.id;
          coworkerBuffers.set(event.toolCallId, updated);
          safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
            threadId,
            message: created,
          });
          const name = coworkerNameById.get(updated.coworkerId);
          if (name) {
            safeSend<ChatStatusPayload>(sender, "chat:status", {
              threadId,
              messageId: created.id,
              label: `${name} is thinking...`,
              phase: "streaming",
            });
          }
        }

        if (updated.messageId && updated.content) {
          const delta =
            updated.content.startsWith(previousContent)
              ? updated.content.slice(previousContent.length)
              : "";
          safeSend<ChatChunkPayload>(sender, "chat:chunk", {
            messageId: updated.messageId,
            text: delta,
            fullContent: updated.content,
          });

          const shouldPersist =
            Date.now() - updated.lastPersist >= 250 ||
            updated.content.length >= 50;
          if (shouldPersist) {
            await persistStreamingContent(
              updated.messageId,
              updated.content,
              "streaming",
            );
            updated.lastPersist = Date.now();
            coworkerBuffers.set(event.toolCallId, updated);
          }
        }
        continue;
      }

      if (
        event.type === "tool-input-available" &&
        event.toolName === "emit_coworker_message"
      ) {
        const existing = coworkerBuffers.get(event.toolCallId);
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as { coworkerId?: unknown; content?: unknown })
            : null;
        const coworkerId =
          (input?.coworkerId && typeof input.coworkerId === "string"
            ? input.coworkerId
            : existing?.coworkerId) ?? "";
        const contentValue =
          (input?.content && typeof input.content === "string"
            ? input.content
            : existing?.content) ?? "";

        let messageId = existing?.messageId;
        if (!messageId && coworkerId) {
          const existingMessageId = responseMessageByCoworker.get(coworkerId);
          if (existingMessageId) {
            messageId = existingMessageId;
          }
        }

        if (!messageId && coworkerId) {
          const created = await createMessage({
            threadId,
            authorType: "coworker",
            authorId: coworkerId,
            contentShort: contentValue,
            status: "streaming",
          });
          messageId = created.id;
          safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
            threadId,
            message: created,
          });
        }

        if (messageId) {
          await persistStreamingContent(messageId, contentValue, "complete");
          safeSend<ChatCompletePayload>(sender, "chat:complete", {
            messageId,
            content: contentValue,
          });
        }
        coworkerBuffers.delete(event.toolCallId);
        continue;
      }

      if (event.type === "done") {
        finalizeStatus("done");
        return;
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to stream response";
    for (const buffer of coworkerBuffers.values()) {
      if (buffer.messageId) {
        await persistStreamingContent(buffer.messageId, buffer.content, "error");
        safeSend<ChatErrorPayload>(sender, "chat:error", {
          messageId: buffer.messageId,
          error: controller.signal.aborted ? "Message canceled" : message,
        });
      }
    }
    finalizeStatus("error");
    safeSend<ChatErrorPayload>(sender, "chat:error", {
      messageId: responseId,
      error: controller.signal.aborted ? "Message canceled" : message,
    });
  } finally {
    activeStreams.delete(responseId);
  }
}

export function registerChatIpcHandlers(): void {
  ipcMain.handle(
    "chat:sendMessage",
    async (
      event,
      threadId: string,
      content: string,
    ): Promise<SendMessageResult> => {
      const threadContext = await getThreadContext(threadId);
      const messageCount = await getThreadMessageCount(threadId);
      const normalizedTitle = threadContext.threadTitle?.trim() ?? "";
      const isDefaultTitle =
        normalizedTitle.length === 0 || normalizedTitle === "New conversation";
      const shouldAutoTitle = messageCount === 0 && isDefaultTitle;

      const userMessage = await createMessage({
        threadId,
        authorType: "user",
        contentShort: content,
        status: "complete",
      });

      void streamChatResponse(
        event.sender,
        threadId,
        content,
        userMessage.id,
        shouldAutoTitle,
      );

      return { userMessage, responseId: userMessage.id };
    },
  );

  ipcMain.handle(
    "chat:cancelMessage",
    async (_event, responseId: string): Promise<void> => {
      const controller = activeStreams.get(responseId);
      if (!controller) {
        return;
      }
      controller.abort();
    },
  );
}
