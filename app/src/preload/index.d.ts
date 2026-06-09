import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFile: () => Promise<string | null>
      readFile: (filePath: string) => Promise<{ byteLength: number }>
      convertPngToWebp: (filePath: string) => Promise<{ outputByteLength: number }>
    }
  }
}
