import { ElectronAPI } from '@electron-toolkit/preload'

type InputFileType = 'png' | 'jpg'

type ConversionId = 'png-webp' | 'png-jpg' | 'jpg-png'

type ReadFileResult =
  | { ok: true; byteLength: number }
  | { ok: false; error: string }

type ConvertSaveResult =
  | { ok: true; savedPath: string; outputByteLength: number }
  | { ok: false; error: string }
  | { canceled: true }

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFile: (inputType: InputFileType) => Promise<string | null>
      readFile: (filePath: string, inputType: InputFileType) => Promise<ReadFileResult>
      convertAndSave: (filePath: string, conversionId: ConversionId) => Promise<ConvertSaveResult>
    }
  }
}

export {}
