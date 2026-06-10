import { createRequire } from 'module'
import sharp from 'sharp'
import { detectInputType } from './convert'

const require = createRequire(__filename)
const bmpJs = require('bmp-js') as {
  decode: (buffer: Buffer) => { width: number; height: number; data: Buffer }
  encode: (image: {
    width: number
    height: number
    data: Buffer
  }) => { data: Buffer; width: number; height: number }
}

export function isBmpPath(filePath: string): boolean {
  return detectInputType(filePath) === 'bmp'
}

/** bmp-js uses ABGR; sharp raw buffers are RGBA. */
function rgbaToAbgr(rgba: Buffer, pixels: number): Buffer {
  const abgr = Buffer.alloc(pixels * 4)
  for (let i = 0; i < pixels; i++) {
    const o = i * 4
    abgr[o] = rgba[o + 3]
    abgr[o + 1] = rgba[o + 2]
    abgr[o + 2] = rgba[o + 1]
    abgr[o + 3] = rgba[o]
  }
  return abgr
}

function abgrToRgba(abgr: Buffer, pixels: number): Buffer {
  const rgba = Buffer.alloc(pixels * 4)
  for (let i = 0; i < pixels; i++) {
    const o = i * 4
    rgba[o] = abgr[o + 3]
    rgba[o + 1] = abgr[o + 2]
    rgba[o + 2] = abgr[o + 1]
    rgba[o + 3] = abgr[o]
  }
  return rgba
}

/** Decode BMP to a PNG buffer sharp can consume in the conversion pipeline. */
export async function decodeBmpToPng(input: Buffer): Promise<Buffer> {
  const bmp = bmpJs.decode(input)
  const pixels = bmp.width * bmp.height
  const rgba = abgrToRgba(bmp.data, pixels)
  return sharp(rgba, {
    raw: { width: bmp.width, height: bmp.height, channels: 4 }
  })
    .png()
    .toBuffer()
}

export async function encodeBmpFromRaster(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixels = info.width * info.height
  const abgr = rgbaToAbgr(data, pixels)

  const encoded = bmpJs.encode({
    width: info.width,
    height: info.height,
    data: abgr
  })

  return Buffer.from(encoded.data)
}
