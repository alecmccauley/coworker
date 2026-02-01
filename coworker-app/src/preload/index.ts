import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { CoworkerSdk } from '@coworker/shared-services'

// Custom APIs for renderer
const api = {
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
