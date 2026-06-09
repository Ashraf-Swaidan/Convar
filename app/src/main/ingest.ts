import { readdir, stat } from 'fs/promises'
import { dirname, resolve, relative, sep, join, basename, extname } from 'path'
import { isSupportedInputFile, outputExtension, type OutputFormat } from './convert'

export type OutputLayout = 'flat' | 'mirror'

export async function collectImagesRecursive(dirPath: string): Promise<string[]> {
  const results: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile() && isSupportedInputFile(fullPath)) {
        results.push(fullPath)
      }
    }
  }

  await walk(resolve(dirPath))
  return results.sort((a, b) => a.localeCompare(b))
}

function commonAncestorDir(filePaths: string[]): string | null {
  if (filePaths.length === 0) return null

  const dirPaths = filePaths.map((filePath) => dirname(resolve(filePath)))
  const segments = dirPaths.map((dirPath) => dirPath.split(sep))
  const first = segments[0]
  const maxShared = Math.min(...segments.map((parts) => parts.length))
  let shared = 0

  while (
    shared < maxShared &&
    segments.every((parts) => parts[shared] === first[shared])
  ) {
    shared++
  }

  if (shared === 0) return null
  return first.slice(0, shared).join(sep)
}

export async function expandIngestPaths(
  paths: string[]
): Promise<{ files: string[]; inputRoot: string | null; skipped: number }> {
  const files: string[] = []
  let folderRoot: string | null = null
  let skipped = 0

  for (const rawPath of paths) {
    const path = resolve(rawPath)
    let entryStat

    try {
      entryStat = await stat(path)
    } catch {
      skipped++
      continue
    }

    if (entryStat.isDirectory()) {
      if (!folderRoot) folderRoot = path
      const nested = await collectImagesRecursive(path)
      if (nested.length === 0) skipped++
      files.push(...nested)
    } else if (entryStat.isFile() && isSupportedInputFile(path)) {
      files.push(path)
    } else {
      skipped++
    }
  }

  const uniqueFiles = [...new Set(files)]
  const inputRoot = folderRoot ?? commonAncestorDir(uniqueFiles)

  return { files: uniqueFiles, inputRoot, skipped }
}

export function outputPathForInput(
  inputPath: string,
  outputDir: string,
  outputFormat: OutputFormat,
  layout: OutputLayout,
  inputRoot: string | null
): string {
  const fileName = `${basename(inputPath, extname(inputPath))}.${outputExtension(outputFormat)}`

  if (layout !== 'mirror' || !inputRoot) {
    return join(outputDir, fileName)
  }

  const relDir = relative(resolve(inputRoot), dirname(resolve(inputPath)))
  return join(outputDir, relDir === '.' ? '' : relDir, fileName)
}
