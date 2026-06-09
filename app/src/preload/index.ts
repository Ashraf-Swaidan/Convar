import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type InputFileType = 'png' | 'jpg'

type ReadFileResult =
  | { ok: true; byteLength: number }
  | { ok: false; error: string }

type ConvertSaveResult =
  | { ok: true; savedPath: string; outputByteLength: number }
  | { ok: false; error: string }
  | { canceled: true }

const api = {
  selectFile: (inputType: InputFileType): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectFile', inputType),
  readFile: (filePath: string, inputType: InputFileType): Promise<ReadFileResult> =>
    ipcRenderer.invoke('file:read', filePath, inputType),
  convertAndSaveWebp: (filePath: string): Promise<ConvertSaveResult> =>
    ipcRenderer.invoke('convert:saveWebp', filePath),
  convertAndSaveJpg: (filePath: string): Promise<ConvertSaveResult> =>
    ipcRenderer.invoke('convert:saveJpg', filePath),
  convertAndSavePng: (filePath: string): Promise<ConvertSaveResult> =>
    ipcRenderer.invoke('convert:savePng', filePath)
}

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
