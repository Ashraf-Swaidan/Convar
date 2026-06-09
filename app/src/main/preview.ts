import sharp from 'sharp'
import { readFileBuffer } from './file'
import { HEIC_PREVIEW_PLACEHOLDER, isHeicPath } from './heic'

export async function createPreviewDataUrl(filePath: string): Promise<string> {
  if (isHeicPath(filePath)) {
    return HEIC_PREVIEW_PLACEHOLDER
  }

  const buffer = await readFileBuffer(filePath)
  const preview = await sharp(buffer)
    .resize({ width: 240, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer()

  return `data:image/jpeg;base64,${preview.toString('base64')}`
}
