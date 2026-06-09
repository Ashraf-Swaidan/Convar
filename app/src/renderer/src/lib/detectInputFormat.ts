import type { InputFormat } from '@/lib/formatTypes'

export function detectInputFormat(filePath: string): InputFormat | null {
  const ext = filePath.split(/[/\\]/).pop()?.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
  if (ext === 'webp') return 'webp'
  return null
}

export type ResolvedPaths =
  | { ok: true; paths: string[]; skippedUnsupported: number }
  | { ok: false; message: string }

export function resolvePathsToAdd(paths: string[]): ResolvedPaths {
  const entries = paths.map((path) => ({ path, format: detectInputFormat(path) }))
  const skippedUnsupported = entries.filter((entry) => entry.format === null).length
  const supported = entries
    .filter((entry): entry is { path: string; format: InputFormat } => entry.format !== null)
    .map((entry) => entry.path)

  if (supported.length === 0) {
    if (paths.length === 0) {
      return { ok: false, message: 'No files to add.' }
    }
    return { ok: false, message: 'Only PNG, JPG, and WebP files are supported.' }
  }

  return { ok: true, paths: supported, skippedUnsupported }
}
