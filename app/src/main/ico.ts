import { createRequire } from 'module'
import sharp from 'sharp'

const require = createRequire(__filename)
const toIco = require('to-ico') as (input: Buffer[]) => Promise<Buffer>

export const ICO_SIZES = [16, 32, 48, 256] as const

export async function encodeIcoFromRaster(input: Buffer): Promise<Buffer> {
  const base = sharp(input)
  const pngBuffers = await Promise.all(
    ICO_SIZES.map((size) =>
      base
        .clone()
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer()
    )
  )

  return toIco(pngBuffers)
}
