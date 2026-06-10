import type { InputFormat } from '@/lib/formatTypes'

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

export function detectInputFormat(filePath: string): InputFormat | null {
  const ext = filePath.split(/[/\\]/).pop()?.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
  if (ext === 'webp') return 'webp'
  if (ext === 'heic' || ext === 'heif') return 'heic'
  if (ext === 'gif') return 'gif'
  if (ext === 'avif') return 'avif'
  if (ext === 'tif' || ext === 'tiff') return 'tiff'
  if (ext === 'bmp') return 'bmp'
  if (ext === 'dng') return 'dng'
  if (ext && RAW_EXTENSIONS.has(ext)) return 'raw'
  if (ext === 'psd') return 'psd'
  return null
}
