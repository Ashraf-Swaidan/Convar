import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename, extname, dirname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createPreviewDataUrl } from './preview'
import {
  convertBatchToOutputDir,
  processFileToPath,
  readSupportedFile
} from './convertFile'
import {
  getFormatOptions,
  isOutputFormat,
  isSupportedInputFile,
  getCombinedOpenDialogFilters,
  getSaveDialogFilters,
  outputExtension,
  type OutputFormat
} from './convert'
import { expandIngestPaths } from './ingest'
import type { OutputLayout } from './ingest'
import { appError, toFailure } from './errors'
import {
  appendHistory,
  clearHistory,
  loadHistory,
  replaceHistory,
  type ConversionHistoryEntry,
  type NewHistoryEntry
} from './history'

function createWindow(): void {
  const isMac = process.platform === 'darwin'

  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    title: 'Convar',
    autoHideMenuBar: true,
    backgroundColor: '#fdfdfd',
    ...(isMac
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 14, y: 14 } }
      : { frame: false }),
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.convar.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('conversions:getFormatOptions', () => getFormatOptions())

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('history:load', () => loadHistory())

  ipcMain.handle('history:append', (_, entry: NewHistoryEntry) => appendHistory(entry))

  ipcMain.handle('history:replace', (_, entries: ConversionHistoryEntry[]) =>
    replaceHistory(entries)
  )

  ipcMain.handle('history:clear', () => clearHistory())

  ipcMain.handle('shell:showItemInFolder', (_, fullPath: string) => {
    if (!fullPath) {
      return { ok: false as const, error: 'No file path provided.' }
    }
    shell.showItemInFolder(fullPath)
    return { ok: true as const }
  })

  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('dialog:selectInputFolder', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openDirectory'],
      title: 'Select image folder'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('ingest:expandPaths', async (_, paths: string[]) => {
    if (!Array.isArray(paths) || paths.length === 0) {
      return { files: [], inputRoot: null, skipped: 0 }
    }

    return expandIngestPaths(paths)
  })

  ipcMain.handle('dialog:selectFiles', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openFile', 'multiSelections'],
      filters: getCombinedOpenDialogFilters()
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths
  })

  ipcMain.handle('dialog:selectOutputFolder', async (event, defaultPath?: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openDirectory', 'createDirectory'],
      ...(defaultPath ? { defaultPath } : {})
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('shell:openPath', async (_, targetPath: string) => {
    if (!targetPath) {
      return { ok: false as const, error: 'No folder path provided.' }
    }

    const error = await shell.openPath(targetPath)
    if (error) {
      return { ok: false as const, error }
    }

    return { ok: true as const }
  })

  ipcMain.handle('file:read', async (_, filePath: string) => {
    const readResult = await readSupportedFile(filePath)
    if (!readResult.ok) {
      return toFailure(readResult.error)
    }

    return { ok: true as const, byteLength: readResult.byteLength }
  })

  ipcMain.handle('file:getPreview', async (_, filePath: string) => {
    if (!filePath) {
      return toFailure(appError('no_file', 'No file selected.'))
    }

    if (!isSupportedInputFile(filePath)) {
      return toFailure(
        appError(
          'invalid_input',
          'Unsupported image type. Use PNG, JPG, WebP, HEIC, GIF, AVIF, or TIFF.'
        )
      )
    }

    try {
      const dataUrl = await createPreviewDataUrl(filePath)
      return {
        ok: true as const,
        dataUrl,
        fileName: basename(filePath)
      }
    } catch (err) {
      console.error('preview_failed', filePath, err)
      return toFailure(appError('preview_failed', 'Could not load preview.'))
    }
  })

  ipcMain.handle(
    'convert:save',
    async (
      event,
      inputPath: string,
      outputFormat: OutputFormat,
      options?: { saveNextToInput?: boolean }
    ) => {
      if (!isOutputFormat(outputFormat)) {
        return toFailure(appError('unknown_conversion', 'Unknown output format.'))
      }

      const defaultPath = join(
        dirname(inputPath),
        `${basename(inputPath, extname(inputPath))}.${outputExtension(outputFormat)}`
      )

      let savedPath = defaultPath

      if (!options?.saveNextToInput) {
        const window = BrowserWindow.fromWebContents(event.sender)
        const result = await dialog.showSaveDialog(window!, {
          defaultPath,
          filters: getSaveDialogFilters(outputFormat)
        })

        if (result.canceled || !result.filePath) {
          return { canceled: true as const }
        }

        savedPath = result.filePath
      }

      const processResult = await processFileToPath(inputPath, savedPath, outputFormat)
      if (!processResult.ok) {
        return toFailure(processResult.error)
      }

      return {
        ok: true as const,
        savedPath,
        outputByteLength: processResult.outputByteLength,
        copied: processResult.copied
      }
    }
  )

  ipcMain.handle(
    'convert:saveBatch',
    async (
      event,
      inputPaths: string[],
      outputDir: string,
      outputFormat: OutputFormat,
      options?: { layout?: OutputLayout; inputRoot?: string | null }
    ) => {
      if (!isOutputFormat(outputFormat)) {
        return toFailure(appError('unknown_conversion', 'Unknown output format.'))
      }

      if (!inputPaths.length) {
        return toFailure(appError('no_files', 'No files selected.'))
      }

      if (!outputDir) {
        return toFailure(appError('no_output_folder', 'No output folder selected.'))
      }

      const layout: OutputLayout = options?.layout === 'mirror' ? 'mirror' : 'flat'
      const inputRoot = options?.inputRoot ?? null

      const sender = event.sender
      const results = await convertBatchToOutputDir(
        inputPaths,
        outputDir,
        outputFormat,
        { layout, inputRoot },
        (progress) => {
          sender.send('batch:progress', progress)
        }
      )

      return { ok: true as const, results }
    }
  )

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
