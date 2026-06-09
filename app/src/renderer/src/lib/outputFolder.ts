const STORAGE_KEY = 'convar:lastOutputFolder'

export function getRememberedOutputFolder(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function rememberOutputFolder(folderPath: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, folderPath)
  } catch {
    // ignore quota / privacy mode
  }
}
