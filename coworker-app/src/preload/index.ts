import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { CoworkerSdk, AuthUser, AuthStatusResponse } from '@coworker/shared-services'

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
