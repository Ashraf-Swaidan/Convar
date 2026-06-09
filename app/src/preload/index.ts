import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type ConversionId = 'png-webp' | 'png-jpg' | 'jpg-png'

type ReadFileResult =
  | { ok: true; byteLength: number }
  | { ok: false; error: string }

type PreviewResult =
  | { ok: true; dataUrl: string; fileName: string }
  | { ok: false; error: string }

type ConvertSaveResult =
  | { ok: true; savedPath: string; outputByteLength: number }
  | { ok: false; error: string }
  | { canceled: true }

const api = {
  selectFile: (conversionId: ConversionId): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectFile', conversionId),
  readFile: (filePath: string, conversionId: ConversionId): Promise<ReadFileResult> =>
    ipcRenderer.invoke('file:read', filePath, conversionId),
  getFilePreview: (filePath: string, conversionId: ConversionId): Promise<PreviewResult> =>
    ipcRenderer.invoke('file:getPreview', filePath, conversionId),
  convertAndSave: (filePath: string, conversionId: ConversionId): Promise<ConvertSaveResult> =>
    ipcRenderer.invoke('convert:save', filePath, conversionId)
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
