import { ElectronAPI } from '@electron-toolkit/preload'

type InputFileType = 'png' | 'jpg'

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
      convertAndSaveWebp: (filePath: string) => Promise<ConvertSaveResult>
      convertAndSaveJpg: (filePath: string) => Promise<ConvertSaveResult>
      convertAndSavePng: (filePath: string) => Promise<ConvertSaveResult>
    }
  }
}

export {}
