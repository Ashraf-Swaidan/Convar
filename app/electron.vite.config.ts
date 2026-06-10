import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          'heic-child': resolve('src/main/heic-child.ts')
        },
        external: [
          'heic-convert',
          'heic-decode',
          'libheif-js',
          'bmp-js',
          'to-ico',
          'pdf-lib',
          'pdfjs-dist',
          '@napi-rs/canvas',
          'ag-psd',
          'raw-decoder'
        ]
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
