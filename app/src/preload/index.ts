import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type ConversionId = 'png-webp' | 'png-jpg' | 'jpg-png'
type InputFormat = 'png' | 'jpg'
type OutputFormat = 'webp' | 'jpg' | 'png'

type FormatOptions = {
  inputFormats: InputFormat[]
  outputOptionsByInput: Record<InputFormat, OutputFormat[]>
  formatLabels: Record<InputFormat | OutputFormat, string>
}

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

type BatchFileResult =
  | { inputPath: string; ok: true; savedPath: string; outputByteLength: number }
  | { inputPath: string; ok: false; error: string }

type BatchSaveResult =
  | { ok: true; results: BatchFileResult[] }
  | { ok: false; error: string }

type BatchProgress = {
  current: number
  total: number
  fileName: string
}

const api = {
  getFormatOptions: (): Promise<FormatOptions> =>
    ipcRenderer.invoke('conversions:getFormatOptions'),
  selectFile: (conversionId: ConversionId): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectFile', conversionId),
  selectFiles: (conversionId: ConversionId): Promise<string[] | null> =>
    ipcRenderer.invoke('dialog:selectFiles', conversionId),
  selectOutputFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectOutputFolder'),
  readFile: (filePath: string, conversionId: ConversionId): Promise<ReadFileResult> =>
    ipcRenderer.invoke('file:read', filePath, conversionId),
  getFilePreview: (filePath: string, conversionId: ConversionId): Promise<PreviewResult> =>
    ipcRenderer.invoke('file:getPreview', filePath, conversionId),
  convertAndSave: (filePath: string, conversionId: ConversionId): Promise<ConvertSaveResult> =>
    ipcRenderer.invoke('convert:save', filePath, conversionId),
  convertAndSaveBatch: (
    filePaths: string[],
    outputDir: string,
    conversionId: ConversionId
  ): Promise<BatchSaveResult> =>
    ipcRenderer.invoke('convert:saveBatch', filePaths, outputDir, conversionId),
  onBatchProgress: (callback: (progress: BatchProgress) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, progress: BatchProgress): void => {
      callback(progress)
    }
    ipcRenderer.on('batch:progress', listener)
    return () => {
      ipcRenderer.removeListener('batch:progress', listener)
    }
  }
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
