import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import type {
  CoworkerSdk,
  AuthUser,
  AuthStatusResponse,
  Feedback,
  CreateFeedbackInput,
} from "@coworker/shared-services";

// Workspace types (matching main process)
export interface WorkspaceManifest {
  id: string;
  name: string;
  createdAt: string;
  schemaVersion: number;
  /** Whether the user has completed the first-run experience */
  hasCompletedOnboarding?: boolean;
  /** ISO timestamp when onboarding was completed */
  onboardingCompletedAt?: string;
}

export interface WorkspaceInfo {
  path: string;
  manifest: WorkspaceManifest;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpened: string;
}

// Coworker types (matching main process)
export interface Coworker {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  rolePrompt: string | null;
  defaultsJson: string | null;
  model: string | null;
  templateId: string | null;
  templateVersion: number | null;
  templateDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface CreateCoworkerInput {
  name: string;
  description?: string;
  shortDescription?: string;
  rolePrompt?: string;
  defaultsJson?: string;
  model?: string;
  templateId?: string;
  templateVersion?: number;
  templateDescription?: string;
}

export interface UpdateCoworkerInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  rolePrompt?: string;
  defaultsJson?: string;
  model?: string | null;
}

export interface AiModel {
  id: string;
  title: string;
  value: string;
  isDefault: boolean;
}

// Channel types
export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  purpose: string | null;
  pinnedJson: string | null;
  isDefault: boolean | null;
  sortOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface CreateChannelInput {
  name: string;
  purpose?: string;
  isDefault?: boolean;
}

export interface UpdateChannelInput {
  name?: string;
  purpose?: string;
  pinnedJson?: string;
  sortOrder?: number;
}

// Thread types
export interface Thread {
  id: string;
  workspaceId: string;
  channelId: string;
  title: string | null;
  summaryRef: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface CreateThreadInput {
  channelId: string;
  title?: string;
}

export interface UpdateThreadInput {
  title?: string;
  summaryRef?: string;
}

// Message types
export type AuthorType = "user" | "coworker" | "system";
export type MessageStatus = "pending" | "streaming" | "complete" | "error";

export interface Message {
  id: string;
  workspaceId: string;
  threadId: string;
  authorType: string;
  authorId: string | null;
  contentRef: string | null;
  contentShort: string | null;
  status: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMessageInput {
  threadId: string;
  authorType: AuthorType;
  authorId?: string;
  contentShort?: string;
  contentRef?: string;
  status?: MessageStatus;
}

export interface UpdateMessageInput {
  contentShort?: string;
  contentRef?: string;
  status?: MessageStatus;
}

// Knowledge types
export type ScopeType = "workspace" | "channel" | "coworker";
export type SourceScopeType = "workspace" | "channel" | "coworker" | "thread";
export type KnowledgeSourceKind = "text" | "file" | "url" | "memory";
export type IndexStatus = "pending" | "processing" | "ready" | "error";

export interface KnowledgeItem {
  id: string;
  workspaceId: string;
  scopeType: string;
  scopeId: string | null;
  title: string;
  summary: string | null;
  contentRef: string | null;
  isPinned: boolean | null;
  sourceIds: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface AddKnowledgeItemInput {
  scopeType: ScopeType;
  scopeId?: string;
  title: string;
  summary?: string;
  contentRef?: string;
  isPinned?: boolean;
  sourceIds?: string[];
}

export interface UpdateKnowledgeItemInput {
  title?: string;
  summary?: string;
  contentRef?: string;
  isPinned?: boolean;
  sourceIds?: string[];
}

export interface KnowledgeSource {
  id: string;
  workspaceId: string;
  scopeType: SourceScopeType | null;
  scopeId: string | null;
  kind: KnowledgeSourceKind;
  name: string | null;
  blobId: string | null;
  extractedTextRef: string | null;
  contentHash: string | null;
  indexStatus: IndexStatus | null;
  indexError: string | null;
  indexedAt: Date | null;
  metadata: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  archivedAt: Date | null;
}

export interface MemoryItem {
  id: string;
  content: string;
  addedAt: Date;
  sourceId: string;
}

export interface AddKnowledgeSourceInput {
  scopeType: SourceScopeType;
  scopeId?: string;
  kind: KnowledgeSourceKind;
  name?: string;
  blobId?: string;
  extractedTextRef?: string;
  metadata?: string;
  notes?: string;
}

export interface UpdateKnowledgeSourceInput {
  name?: string;
  notes?: string | null;
}

export interface ImportProgressPayload {
  batchId: string;
  filePath: string;
  filename: string;
  status: "queued" | "processing" | "success" | "error";
  sourceId?: string;
  error?: string;
}

export interface ImportFailure {
  filePath: string;
  filename: string;
  error: string;
}

export interface ImportSourcesResult {
  batchId: string;
  createdSources: KnowledgeSource[];
  failures: ImportFailure[];
  canceled: boolean;
  requiresAccess?: boolean;
  defaultPath?: string;
}

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  availableVersion?: string;
  progress?: UpdateProgress;
  lastCheckedAt?: string;
  error?: string;
  autoDownload: boolean;
}

export interface IndexingProgressPayload {
  sourceId: string;
  status: IndexStatus;
  step?: string;
  message?: string;
  updatedAt: number;
}

export interface SearchParams {
  query: string;
  limit?: number;
  scopeType?: SourceScopeType;
  scopeId?: string;
}

export type RagMatchType = "fts" | "vec" | "hybrid";

export interface RagChunkResult {
  sourceId: string;
  chunkId: string;
  text: string;
  score: number;
  matchType: RagMatchType;
}

export interface SourceTextResult {
  sourceId: string;
  text: string;
  tokenCount: number;
  truncated: boolean;
  modeUsed: "full" | "selected_chunks";
  selectedChunkIds: string[];
}

// Chat streaming types
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

// Blob types
export interface Blob {
  id: string;
  workspaceId: string;
  path: string;
  mime: string | null;
  size: number | null;
  sha256: string | null;
  createdAt: Date;
}

export interface AddBlobInput {
  data: Buffer | string;
  mime?: string;
  filename?: string;
}

export interface AddBlobResult {
  blob: Blob;
  deduplicated: boolean;
}

// Template types
export interface CoworkerTemplatePublic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  rolePrompt: string;
  defaultBehaviors: {
    tone?: string;
    formatting?: string;
    guardrails?: string[];
  } | null;
  defaultToolsPolicy: {
    allowedCategories?: string[];
    disallowedTools?: string[];
  } | null;
  model: string | null;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Custom APIs for renderer
const api = {
  config: {
    getApiUrl: () => ipcRenderer.invoke("config:getApiUrl") as Promise<string>,
  },
  auth: {
    requestCode: (email: string) =>
      ipcRenderer.invoke("auth:requestCode", email) as Promise<{
        success: boolean;
        message: string;
      }>,
    verifyCode: (email: string, code: string) =>
      ipcRenderer.invoke("auth:verifyCode", email, code) as Promise<{
        user: AuthUser;
      }>,
    logout: () =>
      ipcRenderer.invoke("auth:logout") as Promise<{ success: boolean }>,
    me: () => ipcRenderer.invoke("auth:me") as Promise<AuthUser>,
    isAuthenticated: () =>
      ipcRenderer.invoke("auth:isAuthenticated") as Promise<AuthStatusResponse>,
    isStorageAvailable: () =>
      ipcRenderer.invoke("auth:isStorageAvailable") as Promise<boolean>,
  },
  hello: {
    sayHello: async (name?: string) =>
      ipcRenderer.invoke("api:hello:sayHello", name),
  },
  updates: {
    getState: () => ipcRenderer.invoke("updates:getState") as Promise<UpdateState>,
    check: () => ipcRenderer.invoke("updates:check") as Promise<void>,
    download: () => ipcRenderer.invoke("updates:download") as Promise<void>,
    quitAndInstall: () => ipcRenderer.invoke("updates:quitAndInstall") as Promise<void>,
    setAutoDownload: (value: boolean) =>
      ipcRenderer.invoke("updates:setAutoDownload", value) as Promise<void>,
    getAutoDownload: () =>
      ipcRenderer.invoke("updates:getAutoDownload") as Promise<boolean>,
    getCurrentVersion: () =>
      ipcRenderer.invoke("updates:getCurrentVersion") as Promise<string>,
    onState: (handler: (state: UpdateState) => void): (() => void) => {
      const listener = (_event: unknown, state: unknown): void => {
        handler(state as UpdateState);
      };
      ipcRenderer.on("updates:state", listener);
      return () => {
        ipcRenderer.removeListener("updates:state", listener);
      };
    },
  },
  users: {
    list: async () => ipcRenderer.invoke("api:users:list"),
    getById: async (id: string) => ipcRenderer.invoke("api:users:getById", id),
    create: async (data: Parameters<CoworkerSdk["users"]["create"]>[0]) =>
      ipcRenderer.invoke("api:users:create", data),
    update: async (
      id: string,
      data: Parameters<CoworkerSdk["users"]["update"]>[1],
    ) => ipcRenderer.invoke("api:users:update", id, data),
    delete: async (id: string) => ipcRenderer.invoke("api:users:delete", id),
  },
  workspace: {
    create: (name: string, path: string) =>
      ipcRenderer.invoke(
        "workspace:create",
        name,
        path,
      ) as Promise<WorkspaceInfo>,
    open: (path: string) =>
      ipcRenderer.invoke("workspace:open", path) as Promise<WorkspaceInfo>,
    close: () => ipcRenderer.invoke("workspace:close") as Promise<void>,
    getCurrent: () =>
      ipcRenderer.invoke(
        "workspace:getCurrent",
      ) as Promise<WorkspaceInfo | null>,
    listRecent: () =>
      ipcRenderer.invoke("workspace:listRecent") as Promise<RecentWorkspace[]>,
    removeRecent: (path: string) =>
      ipcRenderer.invoke("workspace:removeRecent", path) as Promise<void>,
    clearRecent: () =>
      ipcRenderer.invoke("workspace:clearRecent") as Promise<void>,
    showCreateDialog: () =>
      ipcRenderer.invoke(
        "workspace:showCreateDialog",
      ) as Promise<WorkspaceInfo | null>,
    showOpenDialog: () =>
      ipcRenderer.invoke(
        "workspace:showOpenDialog",
      ) as Promise<WorkspaceInfo | null>,
    // Menu event listeners
    onMenuNew: (callback: (workspace: WorkspaceInfo) => void) => {
      const handler = (
        _event: IpcRendererEvent,
        workspace: WorkspaceInfo,
      ): void => callback(workspace);
      ipcRenderer.on("menu:workspace:new", handler);
      return () => ipcRenderer.removeListener("menu:workspace:new", handler);
    },
    onMenuOpen: (callback: (workspace: WorkspaceInfo) => void) => {
      const handler = (
        _event: IpcRendererEvent,
        workspace: WorkspaceInfo,
      ): void => callback(workspace);
      ipcRenderer.on("menu:workspace:open", handler);
      return () => ipcRenderer.removeListener("menu:workspace:open", handler);
    },
    onMenuClose: (callback: () => void) => {
      const handler = (): void => callback();
      ipcRenderer.on("menu:workspace:close", handler);
      return () => ipcRenderer.removeListener("menu:workspace:close", handler);
    },
    setOnboardingComplete: (completed: boolean) =>
      ipcRenderer.invoke(
        "workspace:setOnboardingComplete",
        completed,
      ) as Promise<void>,
  },
  settings: {
    onOpenWorkspaceSettings: (callback: () => void) => {
      const handler = (): void => callback();
      ipcRenderer.on("menu:settings:workspace", handler);
      return () =>
        ipcRenderer.removeListener("menu:settings:workspace", handler);
    },
    onOpenChannelsSettings: (callback: () => void) => {
      const handler = (): void => callback();
      ipcRenderer.on("menu:settings:channels", handler);
      return () =>
        ipcRenderer.removeListener("menu:settings:channels", handler);
    },
    onOpenWorkersSettings: (callback: () => void) => {
      const handler = (): void => callback();
      ipcRenderer.on("menu:settings:workers", handler);
      return () =>
        ipcRenderer.removeListener("menu:settings:workers", handler);
    },
    onOpenUpdates: (callback: () => void) => {
      const handler = (): void => callback();
      ipcRenderer.on("menu:updates:open", handler);
      return () => ipcRenderer.removeListener("menu:updates:open", handler);
    },
    setChannelSettingsEnabled: (enabled: boolean): void => {
      ipcRenderer.send("menu:setChannelSettingsEnabled", enabled);
    },
  },
  events: {
    track: (data: { type: string; details?: Record<string, unknown> }) =>
      ipcRenderer.invoke("api:events:track", data) as Promise<unknown>,
  },
  feedback: {
    submit: (input: CreateFeedbackInput) =>
      ipcRenderer.invoke("feedback:submit", input) as Promise<Feedback>,
    onOpenFeedback: (callback: () => void) => {
      const handler = (): void => callback();
      ipcRenderer.on("menu:feedback:open", handler);
      return () => ipcRenderer.removeListener("menu:feedback:open", handler);
    },
  },
  coworker: {
    create: (input: CreateCoworkerInput) =>
      ipcRenderer.invoke("coworker:create", input) as Promise<Coworker>,
    update: (id: string, input: UpdateCoworkerInput) =>
      ipcRenderer.invoke("coworker:update", id, input) as Promise<Coworker>,
    delete: (id: string) =>
      ipcRenderer.invoke("coworker:delete", id) as Promise<void>,
    list: () => ipcRenderer.invoke("coworker:list") as Promise<Coworker[]>,
    getById: (id: string) =>
      ipcRenderer.invoke("coworker:getById", id) as Promise<Coworker | null>,
  },
  channel: {
    create: (input: CreateChannelInput) =>
      ipcRenderer.invoke("channel:create", input) as Promise<Channel>,
    update: (id: string, input: UpdateChannelInput) =>
      ipcRenderer.invoke("channel:update", id, input) as Promise<Channel>,
    archive: (id: string) =>
      ipcRenderer.invoke("channel:archive", id) as Promise<void>,
    list: () => ipcRenderer.invoke("channel:list") as Promise<Channel[]>,
    getById: (id: string) =>
      ipcRenderer.invoke("channel:getById", id) as Promise<Channel | null>,
    createDefaults: () =>
      ipcRenderer.invoke("channel:createDefaults") as Promise<Channel[]>,
    addCoworker: (channelId: string, coworkerId: string) =>
      ipcRenderer.invoke(
        "channel:addCoworker",
        channelId,
        coworkerId,
      ) as Promise<{ id: string; channelId: string; coworkerId: string }>,
    removeCoworker: (channelId: string, coworkerId: string) =>
      ipcRenderer.invoke(
        "channel:removeCoworker",
        channelId,
        coworkerId,
      ) as Promise<void>,
    listCoworkers: (channelId: string) =>
      ipcRenderer.invoke("channel:listCoworkers", channelId) as Promise<
        Coworker[]
      >,
  },
  thread: {
    create: (input: CreateThreadInput) =>
      ipcRenderer.invoke("thread:create", input) as Promise<Thread>,
    update: (id: string, input: UpdateThreadInput) =>
      ipcRenderer.invoke("thread:update", id, input) as Promise<Thread>,
    archive: (id: string) =>
      ipcRenderer.invoke("thread:archive", id) as Promise<void>,
    list: (channelId: string) =>
      ipcRenderer.invoke("thread:list", channelId) as Promise<Thread[]>,
    getById: (id: string) =>
      ipcRenderer.invoke("thread:getById", id) as Promise<Thread | null>,
    onUpdated: (handler: (thread: Thread) => void): (() => void) => {
      const listener = (_event: unknown, payload: unknown): void => {
        handler(payload as Thread);
      };
      ipcRenderer.on("thread:updated", listener);
      return () => {
        ipcRenderer.removeListener("thread:updated", listener);
      };
    },
  },
  message: {
    create: (input: CreateMessageInput) =>
      ipcRenderer.invoke("message:create", input) as Promise<Message>,
    update: (id: string, input: UpdateMessageInput) =>
      ipcRenderer.invoke("message:update", id, input) as Promise<Message>,
    list: (threadId: string) =>
      ipcRenderer.invoke("message:list", threadId) as Promise<Message[]>,
    getById: (id: string) =>
      ipcRenderer.invoke("message:getById", id) as Promise<Message | null>,
  },
  knowledge: {
    add: (input: AddKnowledgeItemInput) =>
      ipcRenderer.invoke("knowledge:add", input) as Promise<KnowledgeItem>,
    update: (id: string, input: UpdateKnowledgeItemInput) =>
      ipcRenderer.invoke(
        "knowledge:update",
        id,
        input,
      ) as Promise<KnowledgeItem>,
    pin: (id: string) =>
      ipcRenderer.invoke("knowledge:pin", id) as Promise<KnowledgeItem>,
    unpin: (id: string) =>
      ipcRenderer.invoke("knowledge:unpin", id) as Promise<KnowledgeItem>,
    remove: (id: string) =>
      ipcRenderer.invoke("knowledge:remove", id) as Promise<void>,
    list: (scopeType?: ScopeType, scopeId?: string) =>
      ipcRenderer.invoke("knowledge:list", scopeType, scopeId) as Promise<
        KnowledgeItem[]
      >,
    getById: (id: string) =>
      ipcRenderer.invoke(
        "knowledge:getById",
        id,
      ) as Promise<KnowledgeItem | null>,
    addSource: (input: AddKnowledgeSourceInput) =>
      ipcRenderer.invoke(
        "knowledge:addSource",
        input,
      ) as Promise<KnowledgeSource>,
    updateSource: (id: string, input: UpdateKnowledgeSourceInput) =>
      ipcRenderer.invoke(
        "knowledge:updateSource",
        id,
        input,
      ) as Promise<KnowledgeSource>,
    removeSource: (id: string) =>
      ipcRenderer.invoke("knowledge:removeSource", id) as Promise<void>,
    listSources: (scopeType?: SourceScopeType, scopeId?: string) =>
      ipcRenderer.invoke(
        "knowledge:listSources",
        scopeType,
        scopeId,
      ) as Promise<KnowledgeSource[]>,
    getSourceById: (id: string) =>
      ipcRenderer.invoke(
        "knowledge:getSourceById",
        id,
      ) as Promise<KnowledgeSource | null>,
    extractSource: (id: string, force?: boolean) =>
      ipcRenderer.invoke("knowledge:extractSource", id, force) as Promise<void>,
    searchSources: (params: SearchParams) =>
      ipcRenderer.invoke(
        "knowledge:searchSources",
        params,
      ) as Promise<RagChunkResult[]>,
    getSourceText: (sourceId: string, tokenCap: number) =>
      ipcRenderer.invoke(
        "knowledge:getSourceText",
        sourceId,
        tokenCap,
      ) as Promise<SourceTextResult | null>,
    indexAllSources: () =>
      ipcRenderer.invoke("knowledge:indexAllSources") as Promise<void>,
    importFiles: (scopeType: SourceScopeType, scopeId?: string) =>
      ipcRenderer.invoke(
        "knowledge:importFiles",
        scopeType,
        scopeId,
      ) as Promise<ImportSourcesResult>,
    importFilesByPath: (
      filePaths: string[],
      scopeType: SourceScopeType,
      scopeId?: string,
    ) =>
      ipcRenderer.invoke(
        "knowledge:importFilesByPath",
        filePaths,
        scopeType,
        scopeId,
      ) as Promise<ImportSourcesResult>,
    requestFileAccessForDrop: (
      defaultPath?: string,
    ): Promise<string[]> =>
      ipcRenderer.invoke(
        "knowledge:requestFileAccessForDrop",
        defaultPath,
      ) as Promise<string[]>,
    requestFolderAccess: (): Promise<{ granted: boolean }> =>
      ipcRenderer.invoke(
        "knowledge:requestFolderAccess",
      ) as Promise<{ granted: boolean }>,
    onImportProgress: (
      handler: (payload: ImportProgressPayload) => void,
    ): (() => void) => {
      const listener = (_event: unknown, payload: unknown): void => {
        handler(payload as ImportProgressPayload);
      };
      ipcRenderer.on("knowledge:importProgress", listener);
      return () => {
        ipcRenderer.removeListener("knowledge:importProgress", listener);
      };
    },
    onIndexingProgress: (
      handler: (payload: IndexingProgressPayload) => void,
    ): (() => void) => {
      const listener = (_event: unknown, payload: unknown): void => {
        handler(payload as IndexingProgressPayload);
      };
      ipcRenderer.on("knowledge:indexingProgress", listener);
      return () => {
        ipcRenderer.removeListener("knowledge:indexingProgress", listener);
      };
    },
  },
  memory: {
    list: (coworkerId: string) =>
      ipcRenderer.invoke("memory:list", coworkerId) as Promise<MemoryItem[]>,
    forget: (memoryId: string, coworkerId: string) =>
      ipcRenderer.invoke("memory:forget", memoryId, coworkerId) as Promise<void>,
  },
  blob: {
    add: (input: AddBlobInput) =>
      ipcRenderer.invoke("blob:add", input) as Promise<AddBlobResult>,
    read: (id: string) =>
      ipcRenderer.invoke("blob:read", id) as Promise<Buffer | null>,
    delete: (id: string) =>
      ipcRenderer.invoke("blob:delete", id) as Promise<void>,
    getById: (id: string) =>
      ipcRenderer.invoke("blob:getById", id) as Promise<Blob | null>,
    list: () => ipcRenderer.invoke("blob:list") as Promise<Blob[]>,
  },
  templates: {
    list: () =>
      ipcRenderer.invoke("templates:list") as Promise<CoworkerTemplatePublic[]>,
  },
  models: {
    list: () => ipcRenderer.invoke("models:list") as Promise<AiModel[]>,
  },
  chat: {
    sendMessage: (threadId: string, content: string) =>
      ipcRenderer.invoke(
        "chat:sendMessage",
        threadId,
        content,
      ) as Promise<{ userMessage: Message; responseId: string }>,
    cancelMessage: (messageId: string) =>
      ipcRenderer.invoke("chat:cancelMessage", messageId) as Promise<void>,
    onMessageCreated: (
      handler: (payload: { threadId: string; message: Message }) => void,
    ): (() => void) => {
      const listener = (_event: unknown, payload: unknown): void => {
        handler(payload as { threadId: string; message: Message });
      };
      ipcRenderer.on("chat:messageCreated", listener);
      return () => {
        ipcRenderer.removeListener("chat:messageCreated", listener);
      };
    },
    onChunk: (handler: (payload: ChatChunkPayload) => void): (() => void) => {
      const listener = (_event: unknown, payload: unknown): void => {
        handler(payload as ChatChunkPayload);
      };
      ipcRenderer.on("chat:chunk", listener);
      return () => {
        ipcRenderer.removeListener("chat:chunk", listener);
      };
    },
    onComplete: (
      handler: (payload: ChatCompletePayload) => void,
    ): (() => void) => {
      const listener = (_event: unknown, payload: unknown): void => {
        handler(payload as ChatCompletePayload);
      };
      ipcRenderer.on("chat:complete", listener);
      return () => {
        ipcRenderer.removeListener("chat:complete", listener);
      };
    },
    onError: (handler: (payload: ChatErrorPayload) => void): (() => void) => {
      const listener = (_event: unknown, payload: unknown): void => {
        handler(payload as ChatErrorPayload);
      };
      ipcRenderer.on("chat:error", listener);
      return () => {
        ipcRenderer.removeListener("chat:error", listener);
      };
    },
    onStatus: (
      handler: (payload: ChatStatusPayload) => void,
    ): (() => void) => {
      const listener = (_event: unknown, payload: unknown): void => {
        handler(payload as ChatStatusPayload);
      };
      ipcRenderer.on("chat:status", listener);
      return () => {
        ipcRenderer.removeListener("chat:status", listener);
      };
    },
  },
};

// Export type for use in type declarations
export type Api = typeof api;

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
