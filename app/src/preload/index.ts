import { contextBridge, ipcRenderer, IpcRendererEvent, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type InputFormat = 'png' | 'jpg' | 'webp' | 'heic' | 'gif' | 'avif' | 'tiff'
type OutputFormat = 'png' | 'jpg' | 'webp' | 'avif' | 'gif' | 'tiff'
type ConversionId = `${InputFormat}-${OutputFormat}`
type OutputLayout = 'flat' | 'mirror'

type AppErrorCode =
  | 'unknown_conversion'
  | 'no_file'
  | 'no_files'
  | 'no_output_folder'
  | 'invalid_input'
  | 'read_failed'
  | 'conversion_failed'
  | 'save_failed'
  | 'preview_failed'

type FailureResult = { ok: false; error: string; code: AppErrorCode }

type FormatOptions = {
  outputFormats: OutputFormat[]
  formatLabels: Record<InputFormat | OutputFormat, string>
  supportedExtensions: string[]
}

type IngestResult = {
  files: string[]
  inputRoot: string | null
  skipped: number
}

type ReadFileResult = { ok: true; byteLength: number } | FailureResult

type PreviewResult =
  | { ok: true; dataUrl: string; fileName: string }
  | FailureResult

type ConvertSaveResult =
  | { ok: true; savedPath: string; outputByteLength: number; copied: boolean }
  | FailureResult
  | { canceled: true }

type BatchFileResult =
  | { inputPath: string; ok: true; savedPath: string; outputByteLength: number; copied: boolean }
  | { inputPath: string; ok: false; error: string; code: AppErrorCode }

type BatchSaveResult = { ok: true; results: BatchFileResult[] } | FailureResult

type BatchProgress = {
  current: number
  total: number
  fileName: string
}

type ConversionHistoryEntry = {
  id: string
  inputPath: string
  outputPath: string
  conversionId: ConversionId
  conversionLabel: string
  outputByteLength: number
  timestamp: number
}

type NewConversionHistoryEntry = Omit<ConversionHistoryEntry, 'id' | 'timestamp'>

const api = {
  getFormatOptions: (): Promise<FormatOptions> =>
    ipcRenderer.invoke('conversions:getFormatOptions'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  selectFiles: (): Promise<string[] | null> => ipcRenderer.invoke('dialog:selectFiles'),
  selectInputFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectInputFolder'),
  expandIngestPaths: (paths: string[]): Promise<IngestResult> =>
    ipcRenderer.invoke('ingest:expandPaths', paths),
  selectOutputFolder: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectOutputFolder', defaultPath),
  openPath: (targetPath: string): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('shell:openPath', targetPath),
  showItemInFolder: (
    fullPath: string
  ): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('shell:showItemInFolder', fullPath),
  loadConversionHistory: (): Promise<ConversionHistoryEntry[]> =>
    ipcRenderer.invoke('history:load'),
  appendConversionHistory: (
    entry: NewConversionHistoryEntry
  ): Promise<ConversionHistoryEntry[]> => ipcRenderer.invoke('history:append', entry),
  replaceConversionHistory: (
    entries: ConversionHistoryEntry[]
  ): Promise<ConversionHistoryEntry[]> => ipcRenderer.invoke('history:replace', entries),
  clearConversionHistory: (): Promise<void> => ipcRenderer.invoke('history:clear'),
  readFile: (filePath: string): Promise<ReadFileResult> =>
    ipcRenderer.invoke('file:read', filePath),
  getFilePreview: (filePath: string): Promise<PreviewResult> =>
    ipcRenderer.invoke('file:getPreview', filePath),
  convertAndSave: (
    filePath: string,
    outputFormat: OutputFormat,
    options?: { saveNextToInput?: boolean }
  ): Promise<ConvertSaveResult> =>
    ipcRenderer.invoke('convert:save', filePath, outputFormat, options),
  convertAndSaveBatch: (
    filePaths: string[],
    outputDir: string,
    outputFormat: OutputFormat,
    options?: { layout?: OutputLayout; inputRoot?: string | null }
  ): Promise<BatchSaveResult> =>
    ipcRenderer.invoke('convert:saveBatch', filePaths, outputDir, outputFormat, options),
  onBatchProgress: (callback: (progress: BatchProgress) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, progress: BatchProgress): void => {
      callback(progress)
    }
    ipcRenderer.on('batch:progress', listener)
    return () => {
      ipcRenderer.removeListener('batch:progress', listener)
    }
  },
  platform: process.platform,
  minimizeWindow: (): void => ipcRenderer.send('window:minimize'),
  toggleMaximizeWindow: (): void => ipcRenderer.send('window:maximize'),
  closeWindow: (): void => ipcRenderer.send('window:close'),
  getPathForFile: (file: File): string => webUtils.getPathForFile(file)
}

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
