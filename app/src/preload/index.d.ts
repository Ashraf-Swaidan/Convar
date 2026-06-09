import { ElectronAPI } from '@electron-toolkit/preload'

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
      selectFile: () => Promise<string | null>
      readFile: (filePath: string) => Promise<ReadFileResult>
      convertAndSaveWebp: (filePath: string) => Promise<ConvertSaveResult>
    }
  }
}

export {}
