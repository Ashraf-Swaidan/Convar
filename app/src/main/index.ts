import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename, extname, dirname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createPreviewDataUrl } from './preview'
import { convertBatchToOutputDir, readAndConvert, convertBuffer, writeConvertedOutput } from './convertFile'
import {
  getFormatOptions,
  isConversionId,
  isValidInputFile,
  getOpenDialogFilters,
  conversionMeta,
  type ConversionId,
  type ConversionMeta
} from './convert'
import { appError, toFailure, type AppErrorCode } from './errors'
import {
  appendHistory,
  clearHistory,
  loadHistory,
  replaceHistory,
  type ConversionHistoryEntry,
  type NewHistoryEntry
} from './history'

type ResolvedConversion =
  | { ok: true; conversionId: ConversionId; meta: ConversionMeta }
  | { ok: false; error: string; code: AppErrorCode }

function resolveConversion(conversionId: string): ResolvedConversion {
  if (!isConversionId(conversionId)) {
    return toFailure(appError('unknown_conversion', 'Unknown conversion type.'))
  }

  return { ok: true, conversionId, meta: conversionMeta[conversionId] }
}

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

  ipcMain.handle('dialog:selectFile', async (event, conversionId: ConversionId) => {
    const resolved = resolveConversion(conversionId)
    if (!resolved.ok) {
      return null
    }

    const { meta } = resolved
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openFile'],
      filters: getOpenDialogFilters(meta.inputType)
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('dialog:selectFiles', async (event, conversionId: ConversionId) => {
    const resolved = resolveConversion(conversionId)
    if (!resolved.ok) {
      return null
    }

    const { meta } = resolved
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openFile', 'multiSelections'],
      filters: getOpenDialogFilters(meta.inputType)
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

  ipcMain.handle('file:read', async (_, filePath: string, conversionId: ConversionId) => {
    const resolved = resolveConversion(conversionId)
    if (!resolved.ok) {
      return resolved
    }

    const readResult = await readAndConvert(filePath, resolved.conversionId)
    if (!readResult.ok) {
      return toFailure(readResult.error)
    }

    return { ok: true as const, byteLength: readResult.buffer.byteLength }
  })

  ipcMain.handle('file:getPreview', async (_, filePath: string, conversionId: ConversionId) => {
    const resolved = resolveConversion(conversionId)
    if (!resolved.ok) {
      return resolved
    }

    const { meta } = resolved

    if (!filePath) {
      return toFailure(appError('no_file', `No file selected for ${meta.label}.`))
    }

    if (!isValidInputFile(filePath, meta.inputType)) {
      return toFailure(appError('invalid_input', meta.invalidInputError))
    }

    try {
      const dataUrl = await createPreviewDataUrl(filePath)
      return {
        ok: true as const,
        dataUrl,
        fileName: basename(filePath)
      }
    } catch {
      return toFailure(
        appError('preview_failed', `Could not load preview for ${meta.label}.`)
      )
    }
  })

  ipcMain.handle(
    'convert:save',
    async (
      event,
      inputPath: string,
      conversionId: ConversionId,
      options?: { saveNextToInput?: boolean }
    ) => {
      const resolved = resolveConversion(conversionId)
      if (!resolved.ok) {
        return resolved
      }

      const readResult = await readAndConvert(inputPath, resolved.conversionId)
      if (!readResult.ok) {
        return toFailure(readResult.error)
      }

      const convertResult = await convertBuffer(readResult.buffer, resolved.conversionId)
      if (!convertResult.ok) {
        return toFailure(convertResult.error)
      }

      const meta = resolved.meta
      const outputPath = join(
        dirname(inputPath),
        `${basename(inputPath, extname(inputPath))}.${meta.outputExt}`
      )

      let savedPath = outputPath

      if (!options?.saveNextToInput) {
        const window = BrowserWindow.fromWebContents(event.sender)
        const result = await dialog.showSaveDialog(window!, {
          defaultPath: outputPath,
          filters: [{ name: meta.saveFilterName, extensions: meta.saveExtensions }]
        })

        if (result.canceled || !result.filePath) {
          return { canceled: true as const }
        }

        savedPath = result.filePath
      }

      const writeResult = await writeConvertedOutput(
        savedPath,
        convertResult.buffer,
        resolved.conversionId
      )
      if (!writeResult.ok) {
        return toFailure(writeResult.error)
      }

      return {
        ok: true as const,
        savedPath,
        outputByteLength: convertResult.buffer.byteLength
      }
    }
  )

  ipcMain.handle(
    'convert:saveBatch',
    async (event, inputPaths: string[], outputDir: string, conversionId: ConversionId) => {
      const resolved = resolveConversion(conversionId)
      if (!resolved.ok) {
        return resolved
      }

      if (!inputPaths.length) {
        return toFailure(appError('no_files', 'No files selected.'))
      }

      if (!outputDir) {
        return toFailure(appError('no_output_folder', 'No output folder selected.'))
      }

      const sender = event.sender
      const results = await convertBatchToOutputDir(
        inputPaths,
        outputDir,
        resolved.conversionId,
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
