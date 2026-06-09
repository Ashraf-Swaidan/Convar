import { ElectronAPI } from '@electron-toolkit/preload'

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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFile: (conversionId: ConversionId) => Promise<string | null>
      readFile: (filePath: string, conversionId: ConversionId) => Promise<ReadFileResult>
      getFilePreview: (filePath: string, conversionId: ConversionId) => Promise<PreviewResult>
      convertAndSave: (filePath: string, conversionId: ConversionId) => Promise<ConvertSaveResult>
    }
  }
}

export {}
