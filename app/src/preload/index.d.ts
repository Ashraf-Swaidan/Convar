import { ElectronAPI } from '@electron-toolkit/preload'

type ConversionId =
  | 'png-webp'
  | 'png-jpg'
  | 'png-avif'
  | 'jpg-png'
  | 'jpg-webp'
  | 'jpg-avif'
  | 'webp-png'
  | 'webp-jpg'
  | 'webp-avif'
type InputFormat = 'png' | 'jpg' | 'webp'
type OutputFormat = 'png' | 'jpg' | 'webp' | 'avif'

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
}

type ReadFileResult = { ok: true; byteLength: number } | FailureResult

type PreviewResult = { ok: true; dataUrl: string; fileName: string } | FailureResult

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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getFormatOptions: () => Promise<FormatOptions>
      getAppVersion: () => Promise<string>
      selectFiles: () => Promise<string[] | null>
      selectOutputFolder: (defaultPath?: string) => Promise<string | null>
      openPath: (targetPath: string) => Promise<{ ok: true } | { ok: false; error: string }>
      showItemInFolder: (fullPath: string) => Promise<{ ok: true } | { ok: false; error: string }>
      loadConversionHistory: () => Promise<ConversionHistoryEntry[]>
      appendConversionHistory: (
        entry: NewConversionHistoryEntry
      ) => Promise<ConversionHistoryEntry[]>
      replaceConversionHistory: (
        entries: ConversionHistoryEntry[]
      ) => Promise<ConversionHistoryEntry[]>
      clearConversionHistory: () => Promise<void>
      readFile: (filePath: string) => Promise<ReadFileResult>
      getFilePreview: (filePath: string) => Promise<PreviewResult>
      convertAndSave: (
        filePath: string,
        outputFormat: OutputFormat,
        options?: { saveNextToInput?: boolean }
      ) => Promise<ConvertSaveResult>
      convertAndSaveBatch: (
        filePaths: string[],
        outputDir: string,
        outputFormat: OutputFormat
      ) => Promise<BatchSaveResult>
      onBatchProgress: (callback: (progress: BatchProgress) => void) => () => void
      platform: string
      minimizeWindow: () => void
      toggleMaximizeWindow: () => void
      closeWindow: () => void
      getPathForFile: (file: File) => string
    }
  }
}

export {}
