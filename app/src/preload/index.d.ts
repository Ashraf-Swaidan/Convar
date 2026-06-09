import { ElectronAPI } from '@electron-toolkit/preload'

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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getFormatOptions: () => Promise<FormatOptions>
      selectFile: (conversionId: ConversionId) => Promise<string | null>
      selectFiles: (conversionId: ConversionId) => Promise<string[] | null>
      selectOutputFolder: () => Promise<string | null>
      readFile: (filePath: string, conversionId: ConversionId) => Promise<ReadFileResult>
      getFilePreview: (filePath: string, conversionId: ConversionId) => Promise<PreviewResult>
      convertAndSave: (filePath: string, conversionId: ConversionId) => Promise<ConvertSaveResult>
      convertAndSaveBatch: (
        filePaths: string[],
        outputDir: string,
        conversionId: ConversionId
      ) => Promise<BatchSaveResult>
      onBatchProgress: (callback: (progress: BatchProgress) => void) => () => void
    }
  }
}

export {}
