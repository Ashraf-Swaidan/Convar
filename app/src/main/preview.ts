import sharp from 'sharp'
import { readFileBuffer } from './file'
import { HEIC_PREVIEW_PLACEHOLDER, isHeicPath } from './heic'
import { isPdfFile } from './fileKind'

const PDF_PREVIEW_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#e8e8e8"/><text x="120" y="124" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#666">PDF</text></svg>'
)}`

export async function createPreviewDataUrl(filePath: string): Promise<string> {
  if (isHeicPath(filePath) || isPdfFile(filePath)) {
    return isPdfFile(filePath) ? PDF_PREVIEW_PLACEHOLDER : HEIC_PREVIEW_PLACEHOLDER
  }

  const buffer = await readFileBuffer(filePath)
  const preview = await sharp(buffer)
    .resize({ width: 240, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer()

  return `data:image/jpeg;base64,${preview.toString('base64')}`
}
