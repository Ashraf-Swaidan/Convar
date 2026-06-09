import type { InputFormat } from '@/lib/formatTypes'

export function detectInputFormat(filePath: string): InputFormat | null {
  const ext = filePath.split(/[/\\]/).pop()?.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
  return null
}

export type ResolvedPaths =
  | { ok: true; paths: string[]; inputFormat: InputFormat; skippedUnsupported: number }
  | { ok: false; message: string }

export function resolvePathsToAdd(
  paths: string[],
  requiredFormat?: InputFormat
): ResolvedPaths {
  const entries = paths.map((path) => ({ path, format: detectInputFormat(path) }))
  const skippedUnsupported = entries.filter((entry) => entry.format === null).length
  const supported = entries.filter(
    (entry): entry is { path: string; format: InputFormat } => entry.format !== null
  )

  if (supported.length === 0) {
    if (paths.length === 0) {
      return { ok: false, message: 'No files to add.' }
    }
    return { ok: false, message: 'Only PNG and JPG files are supported.' }
  }

  const formats = new Set(supported.map((entry) => entry.format))
  if (formats.size > 1) {
    return { ok: false, message: 'Add one format at a time — all PNG or all JPG.' }
  }

  const batchFormat = supported[0].format

  if (requiredFormat !== undefined && batchFormat !== requiredFormat) {
    return {
      ok: false,
      message: `Files must match the current input format (${requiredFormat.toUpperCase()}).`
    }
  }

  return {
    ok: true,
    inputFormat: batchFormat,
    paths: supported.map((entry) => entry.path),
    skippedUnsupported
  }
}
