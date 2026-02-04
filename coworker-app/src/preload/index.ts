import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import type {
  CoworkerSdk,
  AuthUser,
  AuthStatusResponse,
} from "@coworker/shared-services";

// Workspace types (matching main process)
export interface WorkspaceManifest {
  id: string;
  name: string;
  createdAt: string;
  schemaVersion: number;
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
  rolePrompt: string | null;
  defaultsJson: string | null;
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
  rolePrompt?: string;
  defaultsJson?: string;
  templateId?: string;
  templateVersion?: number;
  templateDescription?: string;
}

export interface UpdateCoworkerInput {
  name?: string;
  description?: string;
  rolePrompt?: string;
  defaultsJson?: string;
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
export type KnowledgeSourceKind = "text" | "file" | "url";

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
  kind: string;
  name: string | null;
  blobId: string | null;
  extractedTextRef: string | null;
  metadata: string | null;
  createdAt: Date;
}

export interface AddKnowledgeSourceInput {
  kind: KnowledgeSourceKind;
  name?: string;
  blobId?: string;
  extractedTextRef?: string;
  metadata?: string;
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
    listSources: () =>
      ipcRenderer.invoke("knowledge:listSources") as Promise<KnowledgeSource[]>,
    getSourceById: (id: string) =>
      ipcRenderer.invoke(
        "knowledge:getSourceById",
        id,
      ) as Promise<KnowledgeSource | null>,
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
