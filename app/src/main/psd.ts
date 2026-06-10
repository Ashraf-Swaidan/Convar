import { createRequire } from 'module'
import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas'
import sharp from 'sharp'
import { detectInputType } from './convert'

const require = createRequire(__filename)
const agPsd = require('ag-psd') as {
  initializeCanvas: (factory: typeof createCanvas) => void
  readPsd: (
    buffer: Buffer,
    options?: {
      skipThumbnail?: boolean
      useImageData?: boolean
      logMissingFeatures?: boolean
    }
  ) => PsdDocument
}

type PsdRaster = {
  width: number
  height: number
  data: Uint8ClampedArray
}

type PsdLayer = {
  hidden?: boolean
  left?: number
  top?: number
  children?: PsdLayer[]
  canvas?: Canvas
  imageData?: PsdRaster
}

type PsdDocument = {
  width: number
  height: number
  children?: PsdLayer[]
  canvas?: Canvas
  imageData?: PsdRaster
}

let canvasReady = false

function ensurePsdCanvas(): void {
  if (canvasReady) return
  agPsd.initializeCanvas(createCanvas)
  canvasReady = true
}

export function isPsdPath(filePath: string): boolean {
  return detectInputType(filePath) === 'psd'
}

function canvasToPng(canvas: Canvas): Buffer {
  return canvas.toBuffer('image/png')
}

async function rasterToPng(image: PsdRaster): Promise<Buffer> {
  return sharp(Buffer.from(image.data), {
    raw: { width: image.width, height: image.height, channels: 4 }
  })
    .png()
    .toBuffer()
}

function drawLayers(ctx: SKRSContext2D, layers: PsdLayer[] | undefined): void {
  if (!layers) return

  for (const layer of layers) {
    if (layer.children?.length) {
      drawLayers(ctx, layer.children)
    }
    if (layer.hidden) continue

    const left = layer.left ?? 0
    const top = layer.top ?? 0

    if (layer.canvas) {
      ctx.drawImage(layer.canvas, left, top)
      continue
    }

    if (layer.imageData?.data?.length) {
      const patch = createCanvas(layer.imageData.width, layer.imageData.height)
      patch.getContext('2d').putImageData(layer.imageData as unknown as ImageData, 0, 0)
      ctx.drawImage(patch, left, top)
    }
  }
}

function compositeFromLayers(psd: PsdDocument): Canvas | null {
  if (!psd.width || !psd.height || !psd.children?.length) {
    return null
  }

  const canvas = createCanvas(psd.width, psd.height)
  drawLayers(canvas.getContext('2d'), psd.children)
  return canvas
}

async function rasterFromDocument(psd: PsdDocument): Promise<Buffer | null> {
  if (psd.canvas) {
    return canvasToPng(psd.canvas)
  }

  if (psd.imageData?.width && psd.imageData?.height && psd.imageData.data?.length) {
    return rasterToPng(psd.imageData)
  }

  const composited = compositeFromLayers(psd)
  if (composited) {
    return canvasToPng(composited)
  }

  return null
}

/** Decode PSD to PNG for the conversion pipeline. */
export async function decodePsdToPng(input: Buffer): Promise<Buffer> {
  ensurePsdCanvas()

  let psd: PsdDocument
  try {
    psd = agPsd.readPsd(input, { skipThumbnail: true, logMissingFeatures: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not parse this PSD file.'
    if (/PSB|8BPB/i.test(message) || /large document/i.test(message)) {
      throw new Error('Large PSD (PSB) files are not supported. Save a regular .psd under 2 GB.')
    }
    if (/color mode/i.test(message) || /CMYK|Indexed|Duotone|LAB/i.test(message)) {
      throw new Error(
        'This PSD color mode is not supported. Open it in Photoshop and save a copy as RGB with “Maximize Compatibility”.'
      )
    }
    if (/16 bit|16-bit|bits per channel/i.test(message)) {
      throw new Error('16-bit PSD files are not supported. Save an 8-bit copy from Photoshop.')
    }
    throw new Error(message)
  }

  const png = await rasterFromDocument(psd)
  if (png?.length) {
    return png
  }

  throw new Error(
    'This PSD has no readable image data. Save a copy from Photoshop with “Maximize Compatibility” enabled, or flatten visible layers.'
  )
}
