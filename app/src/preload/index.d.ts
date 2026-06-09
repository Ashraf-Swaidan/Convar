import { ElectronAPI } from '@electron-toolkit/preload'

type ConversionId = 'png-webp' | 'png-jpg' | 'jpg-png'
type InputFormat = 'png' | 'jpg'
type OutputFormat = 'webp' | 'jpg' | 'png'

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
  inputFormats: InputFormat[]
  outputOptionsByInput: Record<InputFormat, OutputFormat[]>
  formatLabels: Record<InputFormat | OutputFormat, string>
}

type ReadFileResult = { ok: true; byteLength: number } | FailureResult

type PreviewResult = { ok: true; dataUrl: string; fileName: string } | FailureResult

type ConvertSaveResult =
  | { ok: true; savedPath: string; outputByteLength: number }
  | FailureResult
  | { canceled: true }

type BatchFileResult =
  | { inputPath: string; ok: true; savedPath: string; outputByteLength: number }
  | { inputPath: string; ok: false; error: string; code: AppErrorCode }

type BatchSaveResult = { ok: true; results: BatchFileResult[] } | FailureResult

type BatchProgress = {
  current: number
  total: number
  fileName: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getFormatOptions: () => Promise<FormatOptions>
      getAppVersion: () => Promise<string>
      selectFile: (conversionId: ConversionId) => Promise<string | null>
      selectFiles: (conversionId: ConversionId) => Promise<string[] | null>
      selectOutputFolder: (defaultPath?: string) => Promise<string | null>
      openPath: (targetPath: string) => Promise<{ ok: true } | { ok: false; error: string }>
      readFile: (filePath: string, conversionId: ConversionId) => Promise<ReadFileResult>
      getFilePreview: (filePath: string, conversionId: ConversionId) => Promise<PreviewResult>
      convertAndSave: (
        filePath: string,
        conversionId: ConversionId,
        options?: { saveNextToInput?: boolean }
      ) => Promise<ConvertSaveResult>
      convertAndSaveBatch: (
        filePaths: string[],
        outputDir: string,
        conversionId: ConversionId
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
