import type { InputFormat } from '@/lib/formatTypes'

export function detectInputFormat(filePath: string): InputFormat | null {
  const ext = filePath.split(/[/\\]/).pop()?.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
  return null
}

export type ResolvedDrop =
  | { ok: true; inputFormat: InputFormat; paths: string[] }
  | { ok: false; message: string }

export function resolveDroppedPaths(paths: string[]): ResolvedDrop {
  const supported = paths
    .map((path) => ({ path, format: detectInputFormat(path) }))
    .filter((entry): entry is { path: string; format: InputFormat } => entry.format !== null)

  if (supported.length === 0) {
    return { ok: false, message: 'Only PNG and JPG files are supported.' }
  }

  const formats = new Set(supported.map((entry) => entry.format))
  if (formats.size > 1) {
    return { ok: false, message: 'Drop one format at a time — all PNG or all JPG.' }
  }

  return {
    ok: true,
    inputFormat: supported[0].format,
    paths: supported.map((entry) => entry.path)
  }
}
