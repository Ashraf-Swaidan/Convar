import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFile: () => Promise<string | null>
      readFile: (filePath: string) => Promise<{ byteLength: number }>
      convertAndSaveWebp: (
        filePath: string
      ) => Promise<
        | { canceled: true }
        | { canceled: false; savedPath: string; outputByteLength: number }
      >
    }
  }
}
