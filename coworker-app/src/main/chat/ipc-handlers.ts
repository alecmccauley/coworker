import { ipcMain, type WebContents } from "electron";
import type { ChatCompletionRequest, CoworkerSdk } from "@coworker/shared-services";
import { createMessage, updateMessage } from "../message";
import {
  buildSystemPrompt,
  convertThreadToChatMessages,
  gatherRagContext,
  getThreadContext,
  getCoworkerContext,
  resolvePrimaryCoworker,
} from "./chat-service";
import { listChannelCoworkers } from "../channel";

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
): Promise<void> {
  if (!getSdk) {
    throw new Error("Chat SDK is not initialized");
  }

  const controller = new AbortController();
  activeStreams.set(assistantMessageId, controller);

  let fullContent = "";
  let pending = "";
  let lastPersist = Date.now();

  try {
    const threadContext = await getThreadContext(threadId);
    const coworker = await getCoworkerContext(coworkerId);
    const systemPrompt = buildSystemPrompt({
      ...threadContext,
      coworker,
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

      if (event.type === "done") {
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
    safeSend<ChatCompletePayload>(sender, "chat:complete", {
      messageId: assistantMessageId,
      content: fullContent,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to stream response";
    await persistStreamingContent(assistantMessageId, fullContent, "error");
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
