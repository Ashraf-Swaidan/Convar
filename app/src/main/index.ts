import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename, extname, dirname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { readFileBuffer, writeFileBuffer } from './file'
import { convertPngToWebp } from './convert'

function isPngFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === '.png'
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('dialog:selectFile', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openFile'],
      filters: [{ name: 'PNG Images', extensions: ['png'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('file:read', async (_, filePath: string) => {
    if (!filePath) {
      return { ok: false as const, error: 'No file selected.' }
    }

    if (!isPngFile(filePath)) {
      return { ok: false as const, error: 'Invalid file type. Please select a PNG file.' }
    }

    try {
      const buffer = await readFileBuffer(filePath)
      return { ok: true as const, byteLength: buffer.byteLength }
    } catch {
      return { ok: false as const, error: 'Could not read the file.' }
    }
  })

  ipcMain.handle('convert:saveWebp', async (event, inputPath: string) => {
    if (!inputPath) {
      return { ok: false as const, error: 'No file selected.' }
    }

    if (!isPngFile(inputPath)) {
      return { ok: false as const, error: 'Invalid file type. Please select a PNG file.' }
    }

    const window = BrowserWindow.fromWebContents(event.sender)

    let input: Buffer
    try {
      input = await readFileBuffer(inputPath)
    } catch {
      return { ok: false as const, error: 'Could not read the file.' }
    }

    let output: Buffer
    try {
      output = await convertPngToWebp(input)
    } catch {
      return {
        ok: false as const,
        error: 'Conversion failed. The file may not be a valid PNG.'
      }
    }

    const defaultPath = join(
      dirname(inputPath),
      `${basename(inputPath, extname(inputPath))}.webp`
    )

    const result = await dialog.showSaveDialog(window!, {
      defaultPath,
      filters: [{ name: 'WebP Images', extensions: ['webp'] }]
    })

    if (result.canceled || !result.filePath) {
      return { canceled: true as const }
    }

    try {
      await writeFileBuffer(result.filePath, output)
    } catch {
      return { ok: false as const, error: 'Could not save the file.' }
    }

    return {
      ok: true as const,
      savedPath: result.filePath,
      outputByteLength: output.byteLength
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
