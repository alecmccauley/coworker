import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { CoworkerSdk, AuthUser, AuthStatusResponse } from '@coworker/shared-services'

// Workspace types (matching main process)
export interface WorkspaceManifest {
  id: string
  name: string
  createdAt: string
  schemaVersion: number
}

export interface WorkspaceInfo {
  path: string
  manifest: WorkspaceManifest
}

export interface RecentWorkspace {
  path: string
  name: string
  lastOpened: string
}

// Coworker types (matching main process)
export interface Coworker {
  id: string
  workspaceId: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface CreateCoworkerInput {
  name: string
  description?: string
}

export interface UpdateCoworkerInput {
  name?: string
  description?: string
}

// Custom APIs for renderer
const api = {
  config: {
    getApiUrl: () => ipcRenderer.invoke('config:getApiUrl') as Promise<string>
  },
  auth: {
    requestCode: (email: string) =>
      ipcRenderer.invoke('auth:requestCode', email) as Promise<{ success: boolean; message: string }>,
    verifyCode: (email: string, code: string) =>
      ipcRenderer.invoke('auth:verifyCode', email, code) as Promise<{ user: AuthUser }>,
    logout: () => ipcRenderer.invoke('auth:logout') as Promise<{ success: boolean }>,
    me: () => ipcRenderer.invoke('auth:me') as Promise<AuthUser>,
    isAuthenticated: () =>
      ipcRenderer.invoke('auth:isAuthenticated') as Promise<AuthStatusResponse>,
    isStorageAvailable: () => ipcRenderer.invoke('auth:isStorageAvailable') as Promise<boolean>
  },
  hello: {
    sayHello: async (name?: string) => ipcRenderer.invoke('api:hello:sayHello', name)
  },
  users: {
    list: async () => ipcRenderer.invoke('api:users:list'),
    getById: async (id: string) => ipcRenderer.invoke('api:users:getById', id),
    create: async (data: Parameters<CoworkerSdk['users']['create']>[0]) =>
      ipcRenderer.invoke('api:users:create', data),
    update: async (id: string, data: Parameters<CoworkerSdk['users']['update']>[1]) =>
      ipcRenderer.invoke('api:users:update', id, data),
    delete: async (id: string) => ipcRenderer.invoke('api:users:delete', id)
  },
  workspace: {
    create: (name: string, path: string) =>
      ipcRenderer.invoke('workspace:create', name, path) as Promise<WorkspaceInfo>,
    open: (path: string) => ipcRenderer.invoke('workspace:open', path) as Promise<WorkspaceInfo>,
    close: () => ipcRenderer.invoke('workspace:close') as Promise<void>,
    getCurrent: () => ipcRenderer.invoke('workspace:getCurrent') as Promise<WorkspaceInfo | null>,
    listRecent: () => ipcRenderer.invoke('workspace:listRecent') as Promise<RecentWorkspace[]>,
    removeRecent: (path: string) =>
      ipcRenderer.invoke('workspace:removeRecent', path) as Promise<void>,
    clearRecent: () => ipcRenderer.invoke('workspace:clearRecent') as Promise<void>,
    showCreateDialog: () =>
      ipcRenderer.invoke('workspace:showCreateDialog') as Promise<WorkspaceInfo | null>,
    showOpenDialog: () =>
      ipcRenderer.invoke('workspace:showOpenDialog') as Promise<WorkspaceInfo | null>,
    // Menu event listeners
    onMenuNew: (callback: (workspace: WorkspaceInfo) => void) => {
      const handler = (_event: IpcRendererEvent, workspace: WorkspaceInfo): void =>
        callback(workspace)
      ipcRenderer.on('menu:workspace:new', handler)
      return () => ipcRenderer.removeListener('menu:workspace:new', handler)
    },
    onMenuOpen: (callback: (workspace: WorkspaceInfo) => void) => {
      const handler = (_event: IpcRendererEvent, workspace: WorkspaceInfo): void =>
        callback(workspace)
      ipcRenderer.on('menu:workspace:open', handler)
      return () => ipcRenderer.removeListener('menu:workspace:open', handler)
    },
    onMenuClose: (callback: () => void) => {
      const handler = (): void => callback()
      ipcRenderer.on('menu:workspace:close', handler)
      return () => ipcRenderer.removeListener('menu:workspace:close', handler)
    }
  },
  coworker: {
    create: (input: CreateCoworkerInput) =>
      ipcRenderer.invoke('coworker:create', input) as Promise<Coworker>,
    update: (id: string, input: UpdateCoworkerInput) =>
      ipcRenderer.invoke('coworker:update', id, input) as Promise<Coworker>,
    delete: (id: string) => ipcRenderer.invoke('coworker:delete', id) as Promise<void>,
    list: () => ipcRenderer.invoke('coworker:list') as Promise<Coworker[]>,
    getById: (id: string) => ipcRenderer.invoke('coworker:getById', id) as Promise<Coworker | null>
  }
}

// Export type for use in type declarations
export type Api = typeof api

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
