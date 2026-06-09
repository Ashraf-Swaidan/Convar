import sharp from 'sharp'

export type ConversionId = 'png-webp' | 'png-jpg' | 'jpg-png'

export type InputFileType = 'png' | 'jpg'

type ConverterFn = (input: Buffer) => Promise<Buffer>

export type ConversionMeta = {
  inputType: InputFileType
  outputExt: string
  saveFilterName: string
  saveExtensions: string[]
  invalidInputError: string
  conversionFailedError: string
}

export async function convertPngToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input).webp().toBuffer()
}

export async function convertPngToJpg(input: Buffer): Promise<Buffer> {
  return sharp(input).jpeg().toBuffer()
}

export async function convertJpgToPng(input: Buffer): Promise<Buffer> {
  return sharp(input).png().toBuffer()
}

export const converters: Record<ConversionId, ConverterFn> = {
  'png-webp': convertPngToWebp,
  'png-jpg': convertPngToJpg,
  'jpg-png': convertJpgToPng
}

export const conversionMeta: Record<ConversionId, ConversionMeta> = {
  'png-webp': {
    inputType: 'png',
    outputExt: 'webp',
    saveFilterName: 'WebP Images',
    saveExtensions: ['webp'],
    invalidInputError: 'Invalid file type. Please select a PNG file.',
    conversionFailedError: 'Conversion failed. The file may not be a valid PNG.'
  },
  'png-jpg': {
    inputType: 'png',
    outputExt: 'jpg',
    saveFilterName: 'JPEG Images',
    saveExtensions: ['jpg', 'jpeg'],
    invalidInputError: 'Invalid file type. Please select a PNG file.',
    conversionFailedError: 'Conversion failed. The file may not be a valid PNG.'
  },
  'jpg-png': {
    inputType: 'jpg',
    outputExt: 'png',
    saveFilterName: 'PNG Images',
    saveExtensions: ['png'],
    invalidInputError: 'Invalid file type. Please select a JPG file.',
    conversionFailedError: 'Conversion failed. The file may not be a valid JPG.'
  }
}

export async function runConversion(input: Buffer, conversionId: ConversionId): Promise<Buffer> {
  return converters[conversionId](input)
}

export function isConversionId(value: string): value is ConversionId {
  return value in converters
}
