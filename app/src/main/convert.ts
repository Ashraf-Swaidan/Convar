import { extname } from 'path'
import sharp from 'sharp'

export type ConversionId = 'png-webp' | 'png-jpg' | 'jpg-png'

export type InputFileType = 'png' | 'jpg'

export type OutputFormat = 'webp' | 'jpg' | 'png'

type ConverterFn = (input: Buffer) => Promise<Buffer>

export type ConversionMeta = {
  label: string
  inputType: InputFileType
  outputExt: string
  saveFilterName: string
  saveExtensions: string[]
  invalidInputError: string
  conversionFailedError: string
}

export const inputTypeMeta: Record<
  InputFileType,
  { openFilterName: string; openExtensions: string[] }
> = {
  png: { openFilterName: 'PNG Images', openExtensions: ['png'] },
  jpg: { openFilterName: 'JPEG Images', openExtensions: ['jpg', 'jpeg'] }
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
    label: 'PNG → WebP',
    inputType: 'png',
    outputExt: 'webp',
    saveFilterName: 'WebP Images',
    saveExtensions: ['webp'],
    invalidInputError: 'Invalid file type for PNG → WebP. Please select a PNG file.',
    conversionFailedError: 'PNG → WebP conversion failed. The file may not be a valid PNG.'
  },
  'png-jpg': {
    label: 'PNG → JPG',
    inputType: 'png',
    outputExt: 'jpg',
    saveFilterName: 'JPEG Images',
    saveExtensions: ['jpg', 'jpeg'],
    invalidInputError: 'Invalid file type for PNG → JPG. Please select a PNG file.',
    conversionFailedError: 'PNG → JPG conversion failed. The file may not be a valid PNG.'
  },
  'jpg-png': {
    label: 'JPG → PNG',
    inputType: 'jpg',
    outputExt: 'png',
    saveFilterName: 'PNG Images',
    saveExtensions: ['png'],
    invalidInputError: 'Invalid file type for JPG → PNG. Please select a JPG file.',
    conversionFailedError: 'JPG → PNG conversion failed. The file may not be a valid JPG.'
  }
}

export const outputOptionsByInput: Record<InputFileType, OutputFormat[]> = {
  png: ['webp', 'jpg'],
  jpg: ['png']
}

export const formatLabels: Record<InputFileType | OutputFormat, string> = {
  png: 'PNG',
  jpg: 'JPG',
  webp: 'WebP'
}

export const inputFormats: InputFileType[] = ['png', 'jpg']

export type FormatOptions = {
  inputFormats: InputFileType[]
  outputOptionsByInput: Record<InputFileType, OutputFormat[]>
  formatLabels: Record<InputFileType | OutputFormat, string>
}

export function getFormatOptions(): FormatOptions {
  return {
    inputFormats,
    outputOptionsByInput,
    formatLabels
  }
}

export function isConversionId(value: string): value is ConversionId {
  return value in converters
}

export function toConversionId(
  input: InputFileType,
  output: OutputFormat
): ConversionId | null {
  const id = `${input}-${output}`
  return isConversionId(id) ? id : null
}

export function isValidInputFile(filePath: string, inputType: InputFileType): boolean {
  const ext = extname(filePath).toLowerCase()

  if (inputType === 'png') {
    return ext === '.png'
  }

  return ext === '.jpg' || ext === '.jpeg'
}

export function getOpenDialogFilters(inputType: InputFileType): Electron.FileFilter[] {
  const meta = inputTypeMeta[inputType]
  return [{ name: meta.openFilterName, extensions: meta.openExtensions }]
}

export async function runConversion(input: Buffer, conversionId: ConversionId): Promise<Buffer> {
  return converters[conversionId](input)
}
