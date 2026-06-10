import type { InputFormat } from '@/lib/formatTypes'

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
  return null
}
