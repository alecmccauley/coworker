import { ipcMain, type WebContents } from "electron";
import type {
  ChatCompletionRequest,
  ChatReplyContext,
  CoworkerSdk,
} from "@coworker/shared-services";
import {
  createMessage,
  updateMessage,
  getThreadMessageCount,
  listMessages,
  getMessageById,
} from "../message";
import {
  buildOrchestratorSystemPrompt,
  convertThreadToChatMessages,
  extractMentionedCoworkerIds,
  extractMentionedDocumentIds,
  extractMentionedSourceIds,
  listThreadDocumentSummaries,
  listMentionedDocumentSummaries,
  listWorkspaceDocumentSummaries,
  buildDocumentContentsMap,
  parseDocumentMetadata,
  gatherRagContext,
  gatherMentionedDocumentContext,
  gatherMentionedSourceContext,
  getThreadContext,
  mapCoworkerToContext,
  normalizeMentionsForLlm,
} from "./chat-service";
import { listChannelCoworkers } from "../channel";
import { updateThread } from "../thread";
import { addMemory } from "../memory";
import { addBlob, readBlob } from "../blob";
import { addDocumentVersion } from "../document-history/document-history-service";
import { fuzzyFindText } from "./fuzzy-match";

interface ChatChunkPayload {
  messageId: string;
  text: string;
  fullContent: string;
}

interface ChatCompletePayload {
  messageId: string;
  content: string;
  status?: "complete" | "suppressed";
}

interface ChatErrorPayload {
  messageId: string;
  error: string;
}

type ExternalEditDecision = "edit" | "copy" | "cancel" | null;

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function createDocumentBlob(title: string, content: string): Promise<string> {
  const filename = `${slugifyTitle(title)}.md`;
  const { blob } = await addBlob({
    data: content,
    mime: "text/markdown",
    filename,
  });
  return blob.id;
}

function parseInterviewDecision(message: unknown, documentId: string): ExternalEditDecision {
  if (!message || typeof message !== "object") return null;
  const data = message as {
    _type?: unknown;
    context?: { documentId?: unknown };
    answers?: Record<string, string> | null;
  };
  if (data._type !== "interview") return null;
  if (!data.context || data.context.documentId !== documentId) return null;
  if (!data.answers) return null;
  const answers = Object.values(data.answers);
  if (answers.includes("Edit original")) return "edit";
  if (answers.includes("Make a copy")) return "copy";
  if (answers.includes("Cancel")) return "cancel";
  return null;
}

async function resolveExternalDocumentDecision(
  threadId: string,
  documentId: string,
): Promise<ExternalEditDecision> {
  const messages = await listMessages(threadId);
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message?.contentShort) continue;
    try {
      const parsed = JSON.parse(message.contentShort) as unknown;
      const decision = parseInterviewDecision(parsed, documentId);
      if (decision) return decision;
    } catch {
      continue;
    }
  }
  return null;
}

async function listApprovedDocumentIds(threadId: string): Promise<string[]> {
  const messages = await listMessages(threadId);
  const ids = new Set<string>();
  for (const message of messages) {
    if (!message?.contentShort) continue;
    try {
      const parsed = JSON.parse(message.contentShort) as {
        _type?: unknown;
        context?: { documentId?: unknown };
        answers?: Record<string, string> | null;
      };
      if (parsed._type !== "interview" || !parsed.answers) continue;
      const docId =
        typeof parsed.context?.documentId === "string"
          ? parsed.context.documentId
          : "";
      if (!docId) continue;
      const answers = Object.values(parsed.answers);
      if (answers.includes("Edit original") || answers.includes("Make a copy")) {
        ids.add(docId);
      }
    } catch {
      continue;
    }
  }
  return Array.from(ids);
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

interface ChatQueuePayload {
  threadId: string;
  messageId: string;
  state: "queued" | "processing";
}

interface SendMessageResult {
  userMessage: Awaited<ReturnType<typeof createMessage>>;
  responseId: string;
}

interface ChatSendOptions {
  replyToMessageId?: string;
}

const activeStreams = new Map<string, AbortController>();
const threadQueues = new Map<string, ThreadQueueState>();
const toolRetryCounts = new Map<string, number>();
const MAX_TOOL_RETRIES = 2;
const streamRetryCounts = new Map<string, number>();
const MAX_STREAM_RETRIES = 2;

const MAX_DOCUMENT_RANGE_LINES = 400;
const MAX_MENTIONED_SOURCE_TOKENS = 120000;
const MAX_AI_SIMILARITY_CHECK_PRIORS = 3;

interface SimilaritySignals {
  normalized: string;
  tokens: Set<string>;
  trigrams: Set<string>;
}

function normalizeForSimilarity(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~>#-]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTokenSet(text: string): Set<string> {
  const tokens = text.split(" ").map((item) => item.trim()).filter(Boolean);
  return new Set(tokens);
}

function toTrigramSet(text: string): Set<string> {
  const compact = text.replace(/\s+/g, " ").trim();
  const grams = new Set<string>();
  if (compact.length < 3) {
    if (compact.length > 0) grams.add(compact);
    return grams;
  }
  for (let index = 0; index <= compact.length - 3; index += 1) {
    grams.add(compact.slice(index, index + 3));
  }
  return grams;
}

function setJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  for (const value of smaller) {
    if (larger.has(value)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length] ?? 0;
}

function computeSimilaritySignals(text: string): SimilaritySignals {
  const normalized = normalizeForSimilarity(text);
  return {
    normalized,
    tokens: toTokenSet(normalized),
    trigrams: toTrigramSet(normalized),
  };
}

function buildAlgorithmicSimilarityScore(
  current: SimilaritySignals,
  prior: SimilaritySignals,
): number {
  if (!current.normalized || !prior.normalized) return 0;
  if (current.normalized === prior.normalized) return 1;

  const tokenSimilarity = setJaccard(current.tokens, prior.tokens);
  const trigramSimilarity = setJaccard(current.trigrams, prior.trigrams);
  const editDistance = levenshteinDistance(current.normalized, prior.normalized);
  const maxLength = Math.max(current.normalized.length, prior.normalized.length);
  const editSimilarity = maxLength === 0 ? 1 : 1 - editDistance / maxLength;

  return tokenSimilarity * 0.45 + trigramSimilarity * 0.35 + editSimilarity * 0.2;
}

function shouldRunAiSimilarityJudge(score: number): boolean {
  return score >= 0.58;
}

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

interface QueuedMessage {
  threadId: string;
  content: string;
  responseId: string;
  replyToMessageId?: string;
  sender: WebContents;
  shouldAutoTitle: boolean;
  wasQueued: boolean;
}

interface ThreadQueueState {
  active: boolean;
  queue: QueuedMessage[];
}

function enqueueMessageForStreaming(params: {
  sender: WebContents;
  threadId: string;
  content: string;
  responseId: string;
  replyToMessageId?: string;
  shouldAutoTitle: boolean;
}): void {
  const queue = getThreadQueue(params.threadId);
  const queuedMessage: QueuedMessage = {
    threadId: params.threadId,
    content: params.content,
    responseId: params.responseId,
    replyToMessageId: params.replyToMessageId,
    sender: params.sender,
    shouldAutoTitle: params.shouldAutoTitle,
    wasQueued: queue.active,
  };

  if (queue.active) {
    queue.queue.push(queuedMessage);
    safeSend<ChatQueuePayload>(params.sender, "chat:queueUpdate", {
      threadId: params.threadId,
      messageId: params.responseId,
      state: "queued",
    });
    return;
  }

  void startStreamForMessage(queuedMessage);
}

function getThreadQueue(threadId: string): ThreadQueueState {
  const existing = threadQueues.get(threadId);
  if (existing) {
    return existing;
  }
  const created: ThreadQueueState = { active: false, queue: [] };
  threadQueues.set(threadId, created);
  return created;
}

function handleStreamFinished(threadId: string): void {
  // Clear stale tool retry counts for this thread so past failures
  // don't block future edits in new conversations.
  for (const key of toolRetryCounts.keys()) {
    if (key.startsWith(`${threadId}:`)) {
      toolRetryCounts.delete(key);
    }
  }

  const queue = threadQueues.get(threadId);
  if (!queue) {
    return;
  }
  queue.active = false;
  const next = queue.queue.shift();
  if (!next) {
    return;
  }
  void startStreamForMessage(next);
}

async function triggerToolRetry(params: {
  sender: WebContents;
  threadId: string;
  toolName: string;
  error: string;
  retryKey: string;
}): Promise<void> {
  const count = toolRetryCounts.get(params.retryKey) ?? 0;
  if (count >= MAX_TOOL_RETRIES) {
    safeSend<ChatStatusPayload>(params.sender, "chat:status", {
      threadId: params.threadId,
      label: `${params.toolName} failed after ${MAX_TOOL_RETRIES} attempts`,
      phase: "error",
    });
    return;
  }
  toolRetryCounts.set(params.retryKey, count + 1);

  safeSend<ChatStatusPayload>(params.sender, "chat:status", {
    threadId: params.threadId,
    label: "Retrying...",
    phase: "streaming",
  });

  const retryContent = `Tool error: ${params.toolName}. ${params.error} Retry the last tool call using the error above.`;
  const queue = getThreadQueue(params.threadId);
  const queuedMessage: QueuedMessage = {
    threadId: params.threadId,
    content: retryContent,
    responseId: "",
    sender: params.sender,
    shouldAutoTitle: false,
    wasQueued: false,
  };

  if (queue.active) {
    queue.queue.push(queuedMessage);
  } else {
    void startStreamForMessage(queuedMessage);
  }
}

function shouldRetryStreamError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("gatewayresponseerror") ||
    lower.includes("headers timeout") ||
    lower.includes("headers_timeout") ||
    lower.includes("und_err_headers_timeout") ||
    lower.includes("failed to stream")
  );
}

function enqueueStreamRetry(params: {
  sender: WebContents;
  threadId: string;
  content: string;
  responseId: string;
  replyToMessageId?: string;
}): void {
  const queue = getThreadQueue(params.threadId);
  const queuedMessage: QueuedMessage = {
    threadId: params.threadId,
    content: params.content,
    responseId: params.responseId,
    replyToMessageId: params.replyToMessageId,
    sender: params.sender,
    shouldAutoTitle: false,
    wasQueued: queue.active,
  };

  if (queue.active) {
    queue.queue.push(queuedMessage);
    safeSend<ChatQueuePayload>(params.sender, "chat:queueUpdate", {
      threadId: params.threadId,
      messageId: params.responseId,
      state: "queued",
    });
  } else {
    void startStreamForMessage(queuedMessage);
  }
}

async function startStreamForMessage(message: QueuedMessage): Promise<void> {
  const queue = getThreadQueue(message.threadId);
  if (queue.active) {
    queue.queue.unshift(message);
    return;
  }
  queue.active = true;
  if (message.wasQueued && message.responseId && message.responseId.length > 0) {
    safeSend<ChatQueuePayload>(message.sender, "chat:queueUpdate", {
      threadId: message.threadId,
      messageId: message.responseId,
      state: "processing",
    });
  }

  void streamChatResponse(
    message.sender,
    message.threadId,
    message.content,
    message.responseId,
    message.replyToMessageId,
    message.shouldAutoTitle,
  )
    .catch((error) => {
      console.error("[Chat] Failed to stream response:", error);
    })
    .finally(() => {
      handleStreamFinished(message.threadId);
    });
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
  status: "streaming" | "complete" | "error" | "suppressed",
): Promise<void> {
  await updateMessage(messageId, {
    contentShort: content,
    status,
  });
}

function formatReplyAuthorLabel(params: {
  authorType: string;
  authorId: string | null;
  coworkerNameById: Map<string, string>;
}): string {
  if (params.authorType === "user") return "You";
  if (params.authorType === "system") return "System";
  if (params.authorType === "coworker" && params.authorId) {
    return params.coworkerNameById.get(params.authorId) ?? "Co-worker";
  }
  return "Unknown";
}

function truncateReplyContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 1200) return trimmed;
  return `${trimmed.slice(0, 1200).trim()}\n…`;
}

async function buildReplyContext(params: {
  threadId: string;
  replyToMessageId?: string;
  coworkerNameById: Map<string, string>;
}): Promise<ChatReplyContext | undefined> {
  if (!params.replyToMessageId) return undefined;

  const replyTarget = await getMessageById(params.replyToMessageId);
  if (!replyTarget) {
    throw new Error("Reply target message was not found.");
  }
  if (replyTarget.threadId !== params.threadId) {
    throw new Error("Reply target must belong to this conversation.");
  }

  const rawContent = (replyTarget.contentShort ?? "").trim();
  if (!rawContent) {
    throw new Error("Reply target has no usable text content.");
  }

  const authorType =
    replyTarget.authorType === "user" ||
    replyTarget.authorType === "coworker" ||
    replyTarget.authorType === "system"
      ? replyTarget.authorType
      : "system";

  return {
    replyToMessageId: replyTarget.id,
    replyToAuthorType: authorType,
    replyToAuthorLabel: formatReplyAuthorLabel({
      authorType: replyTarget.authorType,
      authorId: replyTarget.authorId,
      coworkerNameById: params.coworkerNameById,
    }),
    replyToContent: truncateReplyContent(normalizeMentionsForLlm(rawContent)),
    replyToCreatedAt: new Date(replyTarget.createdAt).toISOString(),
  };
}

async function streamChatResponse(
  sender: WebContents,
  threadId: string,
  content: string,
  responseId: string,
  replyToMessageId: string | undefined,
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
  const interviewBuffers = new Map<string, string>();
  const documentBuffers = new Map<
    string,
    {
      rawInput: string;
      coworkerId: string;
      title: string;
      content: string;
      messageId?: string;
    }
  >();
  const pendingDocumentMessages = new Map<string, string>();
  const editedDocuments = new Set<string>();
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
  const emittedCoworkerContent = new Map<string, SimilaritySignals>();
  const pendingJudgeCandidateByToolCall = new Map<string, SimilaritySignals>();
  const aiJudgeDecisionsByNormalizedCandidate = new Map<
    string,
    { isDuplicate: boolean; addsMaterialValue: boolean; similarityScore: number }
  >();
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
    const mentionedCoworkerIds = extractMentionedCoworkerIds(content);
    const maxCoworkerResponses =
      mentionedCoworkerIds.length > 1
        ? Math.min(mentionedCoworkerIds.length, 3)
        : 1;
    const systemPrompt = buildOrchestratorSystemPrompt(
      threadContext,
      maxCoworkerResponses,
      shouldAutoTitle,
    );
    const coworkerIds = channelCoworkers.map((coworker) => coworker.id);
    const coworkerNameById = new Map(
      channelCoworkers.map((coworker) => [coworker.id, coworker.name]),
    );
    const replyContext = await buildReplyContext({
      threadId,
      replyToMessageId,
      coworkerNameById,
    });
    const mentionedDocumentIds = extractMentionedDocumentIds(content);
    const mentionedSourceIds = extractMentionedSourceIds(content);
    const approvedDocumentIds = await listApprovedDocumentIds(threadId);
    const threadDocuments = await listThreadDocumentSummaries(threadId);
    const mentionedDocuments = await listMentionedDocumentSummaries(
      mentionedDocumentIds,
    );
    const workspaceDocuments = await listWorkspaceDocumentSummaries();
    const documentContents = await buildDocumentContentsMap([
      ...threadDocuments.map((doc) => doc.messageId),
      ...mentionedDocuments.map((doc) => doc.messageId),
      ...approvedDocumentIds,
    ]);
    const mentionedDocumentContext = await gatherMentionedDocumentContext(
      mentionedDocumentIds,
    );
    const mentionedSourceContextResult = await gatherMentionedSourceContext(
      mentionedSourceIds,
    );
    if (mentionedSourceContextResult.totalTokens > MAX_MENTIONED_SOURCE_TOKENS) {
      throw new Error(
        `Mentioned sources exceed the ${MAX_MENTIONED_SOURCE_TOKENS.toLocaleString()} token context limit. Remove one or more @sources and try again.`,
      );
    }
    if (mentionedSourceContextResult.skipped.length > 0) {
      const skippedLines = mentionedSourceContextResult.skipped.map((item) => {
        const reason =
          item.reason === "not_found"
            ? "source not found"
            : "source text is not available yet";
        return `- ${item.sourceName} (${reason})`;
      });
      const warningMessage = await createMessage({
        threadId,
        authorType: "system",
        contentShort: `Some @mentioned sources were skipped:\n${skippedLines.join("\n")}`,
        status: "complete",
      });
      safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
        threadId,
        message: warningMessage,
      });
    }
    const ragContext = [
      ...mentionedSourceContextResult.contextItems,
      ...mentionedDocumentContext,
      ...(await gatherRagContext(
        normalizedContent,
        threadId,
        threadContext.channelId,
        coworkerIds,
      )),
    ];
    const priorMessages = await convertThreadToChatMessages(threadId);
    const messages = [
      ...priorMessages,
      { role: "user", content: normalizedContent },
    ] as ChatCompletionRequest["messages"];

    const request: ChatCompletionRequest = {
      messages,
      systemPrompt,
      ragContext,
      threadDocuments,
      mentionedDocuments,
      workspaceDocuments,
      documentContents,
      threadContext,
      replyContext,
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
        event.type === "tool-input-available" &&
        event.toolName === "start_document_draft"
      ) {
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as { coworkerId?: unknown; title?: unknown })
            : null;
        const coworkerId =
          input?.coworkerId && typeof input.coworkerId === "string"
            ? input.coworkerId
            : "";
        const title =
          input?.title && typeof input.title === "string"
            ? input.title
            : "";

        if (coworkerId && title) {
          const documentJson = JSON.stringify({
            _type: "document",
            coworkerId,
            title,
          });
          const created = await createMessage({
            threadId,
            authorType: "coworker",
            authorId: coworkerId,
            contentShort: documentJson,
            status: "streaming",
          });
          safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
            threadId,
            message: created,
          });
          pendingDocumentMessages.set(coworkerId, created.id);
          activeMessageId = created.id;
          const name = coworkerNameById.get(coworkerId);
          if (name) {
            emitStatus(`${name} is drafting ${title}...`, "streaming");
          }
        }
        continue;
      }

      if (
        event.type === "tool-input-start" &&
        event.toolName === "emit_document"
      ) {
        documentBuffers.set(event.toolCallId, {
          rawInput: "",
          coworkerId: "",
          title: "",
          content: "",
        });
        continue;
      }

      if (
        event.type === "tool-input-delta" &&
        event.toolName === "emit_document"
      ) {
        const existing = documentBuffers.get(event.toolCallId);
        if (existing) {
          existing.rawInput += event.inputTextDelta;
          const coworkerId =
            existing.coworkerId || extractCoworkerIdFromInputText(existing.rawInput);
          const title =
            existing.title || extractTitleFromInputText(existing.rawInput);
          const content = extractContentFromInputText(existing.rawInput);
          existing.coworkerId = coworkerId || existing.coworkerId;
          existing.title = title || existing.title;
          existing.content = content || existing.content;

          if (existing.coworkerId && existing.title && !existing.messageId) {
            const pendingId = pendingDocumentMessages.get(existing.coworkerId);
            if (pendingId) {
              existing.messageId = pendingId;
            } else {
              const documentJson = JSON.stringify({
                _type: "document",
                coworkerId: existing.coworkerId,
                title: existing.title,
              });
              const created = await createMessage({
                threadId,
                authorType: "coworker",
                authorId: existing.coworkerId,
                contentShort: documentJson,
                status: "streaming",
              });
              existing.messageId = created.id;
              safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
                threadId,
                message: created,
              });
              activeMessageId = created.id;
              const name = coworkerNameById.get(existing.coworkerId);
              if (name) {
                emitStatus(`${name} is drafting ${existing.title}...`, "streaming");
              }
            }
          }
        }
        continue;
      }

      if (
          event.type === "tool-input-available" &&
          event.toolName === "emit_document"
        ) {
        const existing = documentBuffers.get(event.toolCallId);
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as { coworkerId?: unknown; title?: unknown; content?: unknown })
            : null;
        const coworkerId =
          (input?.coworkerId && typeof input.coworkerId === "string"
            ? input.coworkerId
            : existing?.coworkerId) ?? "";
        const title =
          (input?.title && typeof input.title === "string"
            ? input.title
            : existing?.title) ?? "";
        const content =
          (input?.content && typeof input.content === "string"
            ? input.content
            : existing?.content) ?? "";

          const editKey = `${coworkerId}:${title}`;
          if (coworkerId && title && editedDocuments.has(editKey)) {
            const draftMessageId =
              existing?.messageId ?? pendingDocumentMessages.get(coworkerId);
            if (draftMessageId) {
              await persistStreamingContent(
                draftMessageId,
                JSON.stringify({ _type: "system_removed" }),
                "complete",
              );
            }
            pendingDocumentMessages.delete(coworkerId);
            documentBuffers.delete(event.toolCallId);
            continue;
          }

          if (coworkerId && title && content) {
            const slug = title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 60);
            const filename = `${slug}.md`;
            const { blob } = await addBlob({
              data: content,
              mime: "text/markdown",
              filename,
            });
            const finalContentShort = JSON.stringify({
              _type: "document",
              coworkerId,
              title,
              blobId: blob.id,
            });

          const messageId =
            existing?.messageId ?? pendingDocumentMessages.get(coworkerId);

          if (messageId) {
            await persistStreamingContent(
              messageId,
              finalContentShort,
              "complete",
            );
            await addDocumentVersion({
              messageId,
              blobId: blob.id,
              commitMessage: "Initial draft",
              authorType: "coworker",
              authorId: coworkerId,
            });
            safeSend<ChatCompletePayload>(sender, "chat:complete", {
              messageId,
              content: finalContentShort,
            });
          } else {
            const documentMessage = await createMessage({
              threadId,
              authorType: "coworker",
              authorId: coworkerId,
              contentShort: finalContentShort,
              status: "complete",
            });
            await addDocumentVersion({
              messageId: documentMessage.id,
              blobId: blob.id,
              commitMessage: "Initial draft",
              authorType: "coworker",
              authorId: coworkerId,
            });
            safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
              threadId,
              message: documentMessage,
            });
          }
        }
        pendingDocumentMessages.delete(coworkerId);
        documentBuffers.delete(event.toolCallId);
        continue;
      }

      if (
        event.type === "tool-input-available" &&
        event.toolName === "find_document"
      ) {
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as {
                messageId?: unknown;
                query?: unknown;
                caseSensitive?: unknown;
                maxHits?: unknown;
              })
            : null;
        const messageId =
          input?.messageId && typeof input.messageId === "string"
            ? input.messageId
            : "";
        const query =
          input?.query && typeof input.query === "string" ? input.query : "";
        const caseSensitive =
          typeof input?.caseSensitive === "boolean" ? input.caseSensitive : false;
        const maxHits =
          typeof input?.maxHits === "number" ? Math.min(input.maxHits, 50) : 20;

        if (!messageId || !query) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "find_document",
            error: `Missing required fields: ${[!messageId && "messageId", !query && "query"].filter(Boolean).join(", ")}.`,
            retryKey: `${threadId}:find_document`,
          });
          continue;
        }

        const message = await getMessageById(messageId);
        if (!message) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "find_document",
            error: "Document not found. Re-list documents and verify the id.",
            retryKey: `${threadId}:find_document`,
          });
          continue;
        }

        const metadata = parseDocumentMetadata(message.contentShort ?? null);
        if (!metadata) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "find_document",
            error: "Message is not a document. Choose a valid document id.",
            retryKey: `${threadId}:find_document`,
          });
          continue;
        }

        const blob = await readBlob(metadata.blobId);
        if (!blob) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "find_document",
            error: "Document content unavailable.",
            retryKey: `${threadId}:find_document`,
          });
          continue;
        }

        const docContent = blob.toString("utf-8");
        const lines = docContent.split("\n");
        const search = caseSensitive ? query : query.toLowerCase();
        const hits: Array<{ line: number; preview: string }> = [];
        for (let i = 0; i < lines.length; i += 1) {
          const lineText = lines[i] ?? "";
          const haystack = caseSensitive ? lineText : lineText.toLowerCase();
          if (haystack.includes(search)) {
            hits.push({ line: i + 1, preview: lineText.trim().slice(0, 160) });
            if (hits.length >= maxHits) break;
          }
        }
        // find_document result is informational — no state change needed
        continue;
      }

      if (
        event.type === "tool-input-available" &&
        event.toolName === "read_document_range"
      ) {
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as {
                messageId?: unknown;
                startLine?: unknown;
                endLine?: unknown;
              })
            : null;
        const messageId =
          input?.messageId && typeof input.messageId === "string"
            ? input.messageId
            : "";
        const startLine =
          typeof input?.startLine === "number" ? input.startLine : 0;
        const endLine =
          typeof input?.endLine === "number" ? input.endLine : 0;

        if (!messageId || startLine < 1 || endLine < 1) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "read_document_range",
            error: `Missing required fields: ${[!messageId && "messageId", startLine < 1 && "startLine", endLine < 1 && "endLine"].filter(Boolean).join(", ")}.`,
            retryKey: `${threadId}:read_document_range`,
          });
          continue;
        }

        const message = await getMessageById(messageId);
        if (!message) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "read_document_range",
            error: "Document not found. Re-list documents and verify the id.",
            retryKey: `${threadId}:read_document_range`,
          });
          continue;
        }

        const metadata = parseDocumentMetadata(message.contentShort ?? null);
        if (!metadata) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "read_document_range",
            error: "Message is not a document. Choose a valid document id.",
            retryKey: `${threadId}:read_document_range`,
          });
          continue;
        }

        const blob = await readBlob(metadata.blobId);
        if (!blob) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "read_document_range",
            error: "Document content unavailable.",
            retryKey: `${threadId}:read_document_range`,
          });
          continue;
        }

        const docContent = blob.toString("utf-8");
        const lines = docContent.split("\n");
        const totalLines = lines.length;
        const safeStart = Math.max(1, Math.min(startLine, totalLines));
        const safeEnd = Math.max(safeStart, Math.min(endLine, totalLines));
        const span = safeEnd - safeStart + 1;
        if (span > MAX_DOCUMENT_RANGE_LINES) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "read_document_range",
            error: `Requested range is too large (${span} lines). Maximum is ${MAX_DOCUMENT_RANGE_LINES} lines.`,
            retryKey: `${threadId}:read_document_range`,
          });
          continue;
        }

        const numberedLines = lines
          .slice(safeStart - 1, safeEnd)
          .map((line, idx) => `${safeStart + idx}: ${line}`);
        const rangeContent = numberedLines.join("\n");
        // read_document_range result is informational — no state change needed
        void rangeContent;
        continue;
      }

      if (
        event.type === "tool-input-available" &&
        event.toolName === "edit_document"
      ) {
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as {
                coworkerId?: unknown;
                messageId?: unknown;
                edits?: unknown;
                commitMessage?: unknown;
              })
            : null;
        const coworkerId =
          input?.coworkerId && typeof input.coworkerId === "string"
            ? input.coworkerId
            : "";
        const messageId =
          input?.messageId && typeof input.messageId === "string"
            ? input.messageId
            : "";
        const edits = Array.isArray(input?.edits)
          ? (input.edits as Array<{ search?: unknown; replace?: unknown }>)
          : [];
        const commitMessage =
          input?.commitMessage && typeof input.commitMessage === "string"
            ? input.commitMessage.trim()
            : "";

        if (!coworkerId || !messageId || edits.length === 0 || !commitMessage) {
          const missing = [
            !coworkerId && "coworkerId",
            !messageId && "messageId",
            edits.length === 0 && "edits",
            !commitMessage && "commitMessage",
          ].filter(Boolean).join(", ");
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "edit_document",
            error: `Missing required fields: ${missing}.`,
            retryKey: `${threadId}:edit_document`,
          });
          continue;
        }

        const message = await getMessageById(messageId);
        if (!message) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "edit_document",
            error: "Document not found. Re-list documents and verify the id.",
            retryKey: `${threadId}:${messageId}:edit_document`,
          });
          continue;
        }

        const metadata = parseDocumentMetadata(message.contentShort ?? null);
        if (!metadata) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "edit_document",
            error: "Message is not a document. Choose a valid document id.",
            retryKey: `${threadId}:${messageId}:edit_document`,
          });
          continue;
        }

        const blob = await readBlob(metadata.blobId);
        if (!blob) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "edit_document",
            error: "Document content unavailable.",
            retryKey: `${threadId}:${messageId}:edit_document`,
          });
          continue;
        }

        let currentContent = blob.toString("utf-8");
        const originalContent = currentContent;
        const originalLength = currentContent.length;
        let editFailed = false;

        for (const edit of edits) {
          const search = typeof edit.search === "string" ? edit.search : "";
          const replace = typeof edit.replace === "string" ? edit.replace : "";

          if (!search) {
            await triggerToolRetry({
              sender,
              threadId,
              toolName: "edit_document",
              error: "An edit has an empty search string. Each edit must have a non-empty search value.",
              retryKey: `${threadId}:${messageId}:edit_document`,
            });
            editFailed = true;
            break;
          }

          const matchOutcome = fuzzyFindText(currentContent, search);

          if (!matchOutcome.ok) {
            await triggerToolRetry({
              sender,
              threadId,
              toolName: "edit_document",
              error: matchOutcome.error.message,
              retryKey: `${threadId}:${messageId}:edit_document`,
            });
            editFailed = true;
            break;
          }

          const { startIndex, endIndex } = matchOutcome.result;
          currentContent =
            currentContent.slice(0, startIndex) +
            replace +
            currentContent.slice(endIndex);
        }

        if (editFailed) {
          continue;
        }

        // No-op detection: edits resolved but produced no actual change
        if (currentContent === originalContent) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "edit_document",
            error: "The edits matched text in the document but produced no changes. Verify the replacement text differs from the search text.",
            retryKey: `${threadId}:${messageId}:edit_document`,
          });
          continue;
        }

        // Post-edit validation
        if (originalLength > 0 && currentContent.length === 0) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "edit_document",
            error: "Edit would result in an empty document. This is likely an error.",
            retryKey: `${threadId}:${messageId}:edit_document`,
          });
          continue;
        }

        if (
          originalLength > 0 &&
          currentContent.length < originalLength * 0.2
        ) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "edit_document",
            error: "Edit would remove more than 80% of the document content. Use smaller, targeted edits.",
            retryKey: `${threadId}:${messageId}:edit_document`,
          });
          continue;
        }

        // Handle external documents
        const isExternalDocument = message.threadId !== threadId;
        if (isExternalDocument) {
          const decision = await resolveExternalDocumentDecision(
            threadId,
            messageId,
          );
          if (!decision || decision === "cancel") {
            const systemMessage = await createMessage({
              threadId,
              authorType: "system",
              contentShort:
                "I need permission to edit that document. Want to edit the original or make a copy?",
              status: "complete",
            });
            safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
              threadId,
              message: systemMessage,
            });
            continue;
          }

          if (decision === "copy") {
            const blobId = await createDocumentBlob(metadata.title, currentContent);
            const documentJson = JSON.stringify({
              _type: "document",
              coworkerId,
              title: metadata.title,
              blobId,
            });
            const copyMessage = await createMessage({
              threadId,
              authorType: "coworker",
              authorId: coworkerId,
              contentShort: documentJson,
              status: "complete",
            });
            await addDocumentVersion({
              messageId: copyMessage.id,
              blobId,
              commitMessage,
              authorType: "coworker",
              authorId: coworkerId,
            });
            safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
              threadId,
              message: copyMessage,
            });
            continue;
          }
        }

        const blobId = await createDocumentBlob(metadata.title, currentContent);
        const updatedContentShort = JSON.stringify({
          _type: "document",
          coworkerId: metadata.coworkerId ?? coworkerId,
          title: metadata.title,
          blobId,
        });

        await updateMessage(messageId, { contentShort: updatedContentShort });
        await addDocumentVersion({
          messageId,
          blobId,
          commitMessage,
          authorType: "coworker",
          authorId: coworkerId,
        });
        editedDocuments.add(`${coworkerId}:${metadata.title}`);
        safeSend<ChatCompletePayload>(sender, "chat:complete", {
          messageId,
          content: updatedContentShort,
        });

        if (isExternalDocument) {
          const linkMessage = await createMessage({
            threadId,
            authorType: "coworker",
            authorId: coworkerId,
            contentShort: updatedContentShort,
            status: "complete",
          });
          await addDocumentVersion({
            messageId: linkMessage.id,
            blobId,
            commitMessage: `Linked: ${commitMessage}`,
            authorType: "coworker",
            authorId: coworkerId,
          });
          safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
            threadId,
            message: linkMessage,
          });
        }

        continue;
      }

      if (
        event.type === "tool-input-available" &&
        event.toolName === "create_document_copy"
      ) {
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as {
                coworkerId?: unknown;
                messageId?: unknown;
                title?: unknown;
                commitMessage?: unknown;
              })
            : null;
        const coworkerId =
          input?.coworkerId && typeof input.coworkerId === "string"
            ? input.coworkerId
            : "";
        const messageId =
          input?.messageId && typeof input.messageId === "string"
            ? input.messageId
            : "";
        const overrideTitle =
          input?.title && typeof input.title === "string" ? input.title : "";
        const commitMessage =
          input?.commitMessage && typeof input.commitMessage === "string"
            ? input.commitMessage.trim()
            : "Initial copy";

        if (!coworkerId || !messageId) {
          const missing = [
            !coworkerId && "coworkerId",
            !messageId && "messageId",
          ].filter(Boolean).join(", ");
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "create_document_copy",
            error: `Missing required fields: ${missing}.`,
            retryKey: `${threadId}:create_document_copy`,
          });
          continue;
        }

        const message = await getMessageById(messageId);
        if (!message) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "create_document_copy",
            error: "Document not found. Re-list documents and verify the id.",
            retryKey: `${threadId}:${messageId}:create_document_copy`,
          });
          continue;
        }
        const metadata = parseDocumentMetadata(message.contentShort ?? null);
        if (!metadata) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "create_document_copy",
            error: "Message is not a document. Choose a valid document id.",
            retryKey: `${threadId}:${messageId}:create_document_copy`,
          });
          continue;
        }
        const blob = await readBlob(metadata.blobId);
        if (!blob) {
          await triggerToolRetry({
            sender,
            threadId,
            toolName: "create_document_copy",
            error: "Document content unavailable.",
            retryKey: `${threadId}:${messageId}:create_document_copy`,
          });
          continue;
        }

        const content = blob.toString("utf-8");
        const title = overrideTitle.trim().length > 0 ? overrideTitle : metadata.title;
        const blobId = await createDocumentBlob(title, content);
        const documentJson = JSON.stringify({
          _type: "document",
          coworkerId,
          title,
          blobId,
        });
        const copyMessage = await createMessage({
          threadId,
          authorType: "coworker",
          authorId: coworkerId,
          contentShort: documentJson,
          status: "complete",
        });
        await addDocumentVersion({
          messageId: copyMessage.id,
          blobId,
          commitMessage,
          authorType: "coworker",
          authorId: coworkerId,
        });
        safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
          threadId,
          message: copyMessage,
        });
        continue;
      }

      if (
        event.type === "tool-input-start" &&
        event.toolName === "request_interview"
      ) {
        interviewBuffers.set(event.toolCallId, "");
        continue;
      }

      if (
        event.type === "tool-input-delta" &&
        event.toolName === "request_interview"
      ) {
        const existing = interviewBuffers.get(event.toolCallId) ?? "";
        interviewBuffers.set(event.toolCallId, `${existing}${event.inputTextDelta}`);
        continue;
      }

      if (
        event.type === "tool-input-available" &&
        event.toolName === "request_interview"
      ) {
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as {
                coworkerId?: unknown;
                context?: unknown;
                questions?: unknown;
              })
            : null;
        const coworkerId =
          input?.coworkerId && typeof input.coworkerId === "string"
            ? input.coworkerId
            : "";
        const context =
          input?.context && typeof input.context === "object"
            ? (input.context as {
                documentId?: unknown;
                documentTitle?: unknown;
              })
            : null;
        const questions = Array.isArray(input?.questions)
          ? input.questions
          : [];

        if (coworkerId && questions.length > 0) {
          const interviewJson = JSON.stringify({
            _type: "interview",
            coworkerId,
            context: context ?? undefined,
            questions,
            answers: null,
          });
          const interviewMessage = await createMessage({
            threadId,
            authorType: "coworker",
            authorId: coworkerId,
            contentShort: interviewJson,
            status: "complete",
          });
          safeSend<ChatMessageCreatedPayload>(sender, "chat:messageCreated", {
            threadId,
            message: interviewMessage,
          });
          const name = coworkerNameById.get(coworkerId);
          if (name) {
            emitStatus(`${name} has a few questions...`, "streaming");
          }
        }
        interviewBuffers.delete(event.toolCallId);
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
        event.type === "tool-input-available" &&
        event.toolName === "judge_coworker_similarity"
      ) {
        const input =
          event.input && typeof event.input === "object"
            ? (event.input as { candidate?: unknown })
            : null;
        const candidate =
          input?.candidate && typeof input.candidate === "string"
            ? input.candidate
            : "";
        if (candidate.trim().length > 0) {
          pendingJudgeCandidateByToolCall.set(
            event.toolCallId,
            computeSimilaritySignals(candidate),
          );
        }
        continue;
      }

      if (
        event.type === "tool-output-available" &&
        event.toolName === "judge_coworker_similarity"
      ) {
        const candidate = pendingJudgeCandidateByToolCall.get(event.toolCallId);
        const output =
          event.output && typeof event.output === "object"
            ? (event.output as {
                isDuplicate?: unknown;
                addsMaterialValue?: unknown;
                similarityScore?: unknown;
              })
            : null;

        if (candidate && output) {
          const isDuplicate = Boolean(output.isDuplicate);
          const addsMaterialValue = Boolean(output.addsMaterialValue);
          const similarityScore =
            typeof output.similarityScore === "number"
              ? Math.max(0, Math.min(1, output.similarityScore))
              : 0;
          aiJudgeDecisionsByNormalizedCandidate.set(candidate.normalized, {
            isDuplicate,
            addsMaterialValue,
            similarityScore,
          });
        }
        pendingJudgeCandidateByToolCall.delete(event.toolCallId);
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
          const candidateSignals = computeSimilaritySignals(contentValue);
          let shouldSuppress = false;
          let strongestScore = 0;

          if (candidateSignals.normalized.length > 0) {
            const recentEmitted = Array.from(emittedCoworkerContent.values()).slice(
              -MAX_AI_SIMILARITY_CHECK_PRIORS,
            );
            for (const priorSignals of recentEmitted) {
              if (priorSignals.normalized === candidateSignals.normalized) {
                shouldSuppress = true;
                strongestScore = 1;
                break;
              }

              const score = buildAlgorithmicSimilarityScore(
                candidateSignals,
                priorSignals,
              );
              strongestScore = Math.max(strongestScore, score);
            }

            if (!shouldSuppress) {
              const aiDecision = aiJudgeDecisionsByNormalizedCandidate.get(
                candidateSignals.normalized,
              );
              if (
                aiDecision &&
                aiDecision.isDuplicate &&
                !aiDecision.addsMaterialValue
              ) {
                shouldSuppress = true;
                strongestScore = Math.max(
                  strongestScore,
                  aiDecision.similarityScore,
                );
              } else if (
                shouldRunAiSimilarityJudge(strongestScore) &&
                strongestScore >= 0.84
              ) {
                shouldSuppress = true;
              }
            }
          }

          if (shouldSuppress) {
            await persistStreamingContent(messageId, "", "suppressed");
            safeSend<ChatCompletePayload>(sender, "chat:complete", {
              messageId,
              content: "",
              status: "suppressed",
            });
            coworkerBuffers.delete(event.toolCallId);
            continue;
          }

          await persistStreamingContent(messageId, contentValue, "complete");
          if (candidateSignals.normalized.length > 0) {
            emittedCoworkerContent.set(coworkerId || messageId, candidateSignals);
          }
          safeSend<ChatCompletePayload>(sender, "chat:complete", {
            messageId,
            content: contentValue,
            status: "complete",
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
    const retryKey = `${threadId}:${responseId}`;
    const retryCount = streamRetryCounts.get(retryKey) ?? 0;
    const shouldRetry =
      !controller.signal.aborted &&
      retryCount < MAX_STREAM_RETRIES &&
      shouldRetryStreamError(message);

    if (shouldRetry) {
      streamRetryCounts.set(retryKey, retryCount + 1);
      emitStatus("Retrying...", "streaming");
      enqueueStreamRetry({
        sender,
        threadId,
        content,
        responseId,
        replyToMessageId,
      });
      return;
    }

    for (const buffer of coworkerBuffers.values()) {
      if (buffer.messageId) {
        await persistStreamingContent(buffer.messageId, buffer.content, "error");
        safeSend<ChatErrorPayload>(sender, "chat:error", {
          messageId: buffer.messageId,
          error: controller.signal.aborted ? "Message canceled" : message,
        });
      }
    }
    for (const buffer of documentBuffers.values()) {
      if (buffer.messageId) {
        safeSend<ChatErrorPayload>(sender, "chat:error", {
          messageId: buffer.messageId,
          error: controller.signal.aborted ? "Message canceled" : message,
        });
      }
    }
    for (const pendingMessageId of pendingDocumentMessages.values()) {
      safeSend<ChatErrorPayload>(sender, "chat:error", {
        messageId: pendingMessageId,
        error: controller.signal.aborted ? "Message canceled" : message,
      });
    }
    pendingDocumentMessages.clear();
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
      options?: ChatSendOptions,
    ): Promise<SendMessageResult> => {
      const threadContext = await getThreadContext(threadId);
      const messageCount = await getThreadMessageCount(threadId);
      const normalizedTitle = threadContext.threadTitle?.trim() ?? "";
      const isDefaultTitle =
        normalizedTitle.length === 0 || normalizedTitle === "New conversation";
      const shouldAutoTitle = messageCount === 0 && isDefaultTitle;
      const replyToMessageId =
        typeof options?.replyToMessageId === "string" &&
        options.replyToMessageId.trim().length > 0
          ? options.replyToMessageId.trim()
          : undefined;

      const userMessage = await createMessage({
        threadId,
        authorType: "user",
        replyToMessageId,
        contentShort: content,
        status: "complete",
      });
      enqueueMessageForStreaming({
        sender: event.sender,
        threadId,
        content,
        responseId: userMessage.id,
        replyToMessageId,
        shouldAutoTitle,
      });

      return { userMessage, responseId: userMessage.id };
    },
  );

  ipcMain.handle(
    "chat:retryMessage",
    async (event, threadId: string, messageId: string): Promise<void> => {
      const message = await getMessageById(messageId);
      if (!message) {
        throw new Error("Cannot retry: message not found.");
      }
      if (message.threadId !== threadId) {
        throw new Error("Cannot retry: message does not belong to this conversation.");
      }
      if (message.authorType !== "user") {
        throw new Error("Cannot retry: only user messages can be retried.");
      }

      const content = message.contentShort?.trim() ?? "";
      if (content.length === 0) {
        throw new Error("Cannot retry: original message content is empty.");
      }

      await updateMessage(message.id, { status: "complete" });
      streamRetryCounts.delete(`${threadId}:${message.id}`);

      enqueueMessageForStreaming({
        sender: event.sender,
        threadId,
        content,
        responseId: message.id,
        replyToMessageId: message.replyToMessageId ?? undefined,
        shouldAutoTitle: false,
      });
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
