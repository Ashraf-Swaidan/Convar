import { createRequire } from 'module'
import { readFileBuffer } from './file'
import { detectInputType } from './convert'

const require = createRequire(__filename)
const { Decoder } = require('raw-decoder') as {
  Decoder: new (buffer: Buffer) => { extractJpeg: () => Buffer }
}

export function isRawInputPath(filePath: string): boolean {
  const type = detectInputType(filePath)
  return type === 'dng' || type === 'raw'
}

/** Decode camera RAW / DNG via embedded JPEG (full or preview). */
export async function decodeRawFileToJpeg(filePath: string): Promise<Buffer> {
  const buffer = await readFileBuffer(filePath)
  const decoder = new Decoder(buffer)
  const jpeg = decoder.extractJpeg()

  if (!jpeg?.length) {
    throw new Error('No embedded image found in this RAW file.')
  }

  return Buffer.from(jpeg)
}
