import { ipcMain, type WebContents } from "electron";
import type { ChatCompletionRequest, CoworkerSdk } from "@coworker/shared-services";
import {
  createMessage,
  updateMessage,
  getThreadMessageCount,
} from "../message";
import {
  buildSystemPrompt,
  convertThreadToChatMessages,
  gatherRagContext,
  getThreadContext,
  getCoworkerContext,
  resolvePrimaryCoworker,
} from "./chat-service";
import { listChannelCoworkers } from "../channel";
import { updateThread } from "../thread";

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
  messageId: string;
  label: string;
  phase?: "streaming" | "done" | "error";
}

interface SendMessageResult {
  userMessage: Awaited<ReturnType<typeof createMessage>>;
  assistantMessage: Awaited<ReturnType<typeof createMessage>>;
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
  assistantMessageId: string,
  coworkerId: string | null,
  shouldAutoTitle: boolean,
): Promise<void> {
  if (!getSdk) {
    throw new Error("Chat SDK is not initialized");
  }

  const controller = new AbortController();
  activeStreams.set(assistantMessageId, controller);

  let fullContent = "";
  let pending = "";
  let lastPersist = Date.now();
  let statusClosed = false;
  const statusBuffers = new Map<string, string>();
  const titleBuffers = new Map<string, string>();
  let titleApplied = false;

  const emitStatus = (label: string, phase: ChatStatusPayload["phase"]): void => {
    if (statusClosed) {
      return;
    }
    safeSend<ChatStatusPayload>(sender, "chat:status", {
      messageId: assistantMessageId,
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
    const coworker = await getCoworkerContext(coworkerId);
    const systemPrompt = buildSystemPrompt({
      ...threadContext,
      coworker,
      autoTitle: shouldAutoTitle,
    });

    const channelCoworkers = await listChannelCoworkers(
      threadContext.channelId,
    );
    const coworkerIds = channelCoworkers.map((coworker) => coworker.id);
    const ragContext = await gatherRagContext(
      content,
      threadId,
      threadContext.channelId,
      coworkerIds,
    );
    const priorMessages = await convertThreadToChatMessages(threadId);
    const messages = [
      ...priorMessages,
      { role: "user", content },
    ] as ChatCompletionRequest["messages"];

    const request: ChatCompletionRequest = {
      messages,
      systemPrompt,
      ragContext,
    };

    const stream = (await getSdk()).chat.stream(request, {
      signal: controller.signal,
    });

    for await (const event of stream) {
      if (event.type === "chunk") {
        fullContent += event.text;
        pending += event.text;
        safeSend<ChatChunkPayload>(sender, "chat:chunk", {
          messageId: assistantMessageId,
          text: event.text,
          fullContent,
        });

        const shouldPersist =
          Date.now() - lastPersist >= 250 || pending.length >= 50;
        if (shouldPersist) {
          await persistStreamingContent(
            assistantMessageId,
            fullContent,
            "streaming",
          );
          pending = "";
          lastPersist = Date.now();
        }
      }

      if (event.type === "tool-input-start" && event.toolName === "report_status") {
        statusBuffers.set(event.toolCallId, "");
        continue;
      }

      if (event.type === "tool-input-delta" && event.toolName === "report_status") {
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

      if (event.type === "done") {
        finalizeStatus("done");
        await persistStreamingContent(
          assistantMessageId,
          fullContent,
          "complete",
        );
        safeSend<ChatCompletePayload>(sender, "chat:complete", {
          messageId: assistantMessageId,
          content: fullContent,
        });
        return;
      }
    }

    await persistStreamingContent(
      assistantMessageId,
      fullContent,
      "complete",
    );
    finalizeStatus("done");
    safeSend<ChatCompletePayload>(sender, "chat:complete", {
      messageId: assistantMessageId,
      content: fullContent,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to stream response";
    await persistStreamingContent(assistantMessageId, fullContent, "error");
    finalizeStatus("error");
    safeSend<ChatErrorPayload>(sender, "chat:error", {
      messageId: assistantMessageId,
      error: controller.signal.aborted ? "Message canceled" : message,
    });
  } finally {
    activeStreams.delete(assistantMessageId);
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
      const primaryCoworker = await resolvePrimaryCoworker(
        threadContext.channelId,
      );

      const userMessage = await createMessage({
        threadId,
        authorType: "user",
        contentShort: content,
        status: "complete",
      });

      const assistantMessage = await createMessage({
        threadId,
        authorType: "coworker",
        authorId: primaryCoworker?.id,
        contentShort: "",
        status: "streaming",
      });

      void streamChatResponse(
        event.sender,
        threadId,
        content,
        assistantMessage.id,
        primaryCoworker?.id ?? null,
        shouldAutoTitle,
      );

      return { userMessage, assistantMessage };
    },
  );

  ipcMain.handle(
    "chat:cancelMessage",
    async (_event, messageId: string): Promise<void> => {
      const controller = activeStreams.get(messageId);
      if (!controller) {
        return;
      }
      controller.abort();
    },
  );
}
