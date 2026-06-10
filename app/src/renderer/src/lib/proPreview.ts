function extOf(filePath: string): string {
  return filePath.split(/[/\\]/).pop()?.split('.').pop()?.toLowerCase() ?? ''
}

const RAW_EXTENSIONS = new Set([
  'cr2',
  'cr3',
  'nef',
  'nrw',
  'arw',
  'orf',
  'rw2',
  'raf',
  'pef',
  'srw',
  '3fr',
  'fff',
  'rwl',
  'x3f'
])

export function isDngPath(filePath: string): boolean {
  return extOf(filePath) === 'dng'
}

export function isRawPath(filePath: string): boolean {
  return RAW_EXTENSIONS.has(extOf(filePath))
}

export function isPsdPath(filePath: string): boolean {
  return extOf(filePath) === 'psd'
}

function placeholder(label: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#e8e8e8"/><text x="120" y="124" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#666">${label}</text></svg>`
  )}`
}

export const DNG_PREVIEW_PLACEHOLDER = placeholder('DNG')
export const RAW_PREVIEW_PLACEHOLDER = placeholder('RAW')
export const PSD_PREVIEW_PLACEHOLDER = placeholder('PSD')
