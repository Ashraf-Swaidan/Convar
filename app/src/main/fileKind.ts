import { extname } from 'path'
import { isSupportedInputFile } from './convert'

export function isPdfFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === '.pdf'
}

export function isIngestSupportedFile(filePath: string): boolean {
  return isSupportedInputFile(filePath) || isPdfFile(filePath)
}

export function partitionIngestPaths(paths: string[]): {
  images: string[]
  pdfs: string[]
} {
  const images: string[] = []
  const pdfs: string[] = []

  for (const path of paths) {
    if (isPdfFile(path)) {
      pdfs.push(path)
    } else if (isSupportedInputFile(path)) {
      images.push(path)
    }
  }

  return { images, pdfs }
}
