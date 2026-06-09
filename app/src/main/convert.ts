import { extname } from 'path'
import sharp from 'sharp'

export type InputFileType = 'png' | 'jpg' | 'webp'

export type OutputFormat = 'png' | 'jpg' | 'webp' | 'avif'

export type ConversionId =
  | 'png-webp'
  | 'png-jpg'
  | 'png-avif'
  | 'jpg-png'
  | 'jpg-webp'
  | 'jpg-avif'
  | 'webp-png'
  | 'webp-jpg'
  | 'webp-avif'

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

export const formatLabels: Record<InputFileType | OutputFormat, string> = {
  png: 'PNG',
  jpg: 'JPG',
  webp: 'WebP',
  avif: 'AVIF'
}

export const inputTypeMeta: Record<
  InputFileType,
  { openFilterName: string; openExtensions: string[]; extensions: string[] }
> = {
  png: { openFilterName: 'PNG Images', openExtensions: ['png'], extensions: ['.png'] },
  jpg: {
    openFilterName: 'JPEG Images',
    openExtensions: ['jpg', 'jpeg'],
    extensions: ['.jpg', '.jpeg']
  },
  webp: { openFilterName: 'WebP Images', openExtensions: ['webp'], extensions: ['.webp'] }
}

const outputTypeMeta: Record<
  OutputFormat,
  { saveFilterName: string; saveExtensions: string[]; ext: string }
> = {
  png: { saveFilterName: 'PNG Images', saveExtensions: ['png'], ext: 'png' },
  jpg: { saveFilterName: 'JPEG Images', saveExtensions: ['jpg', 'jpeg'], ext: 'jpg' },
  webp: { saveFilterName: 'WebP Images', saveExtensions: ['webp'], ext: 'webp' },
  avif: { saveFilterName: 'AVIF Images', saveExtensions: ['avif'], ext: 'avif' }
}

export const outputOptionsByInput: Record<InputFileType, OutputFormat[]> = {
  png: ['webp', 'jpg', 'avif'],
  jpg: ['png', 'webp', 'avif'],
  webp: ['png', 'jpg', 'avif']
}

export const inputFormats: InputFileType[] = ['png', 'jpg', 'webp']

function encodeOutput(image: sharp.Sharp, output: OutputFormat): sharp.Sharp {
  switch (output) {
    case 'png':
      return image.png()
    case 'jpg':
      return image.jpeg()
    case 'webp':
      return image.webp()
    case 'avif':
      return image.avif()
  }
}

async function convertToOutput(input: Buffer, output: OutputFormat): Promise<Buffer> {
  return encodeOutput(sharp(input), output).toBuffer()
}

function conversionIdFor(input: InputFileType, output: OutputFormat): ConversionId {
  return `${input}-${output}` as ConversionId
}

function buildConversionMeta(input: InputFileType, output: OutputFormat): ConversionMeta {
  const inputLabel = formatLabels[input]
  const outputLabel = formatLabels[output]
  const out = outputTypeMeta[output]

  return {
    label: `${inputLabel} → ${outputLabel}`,
    inputType: input,
    outputExt: out.ext,
    saveFilterName: out.saveFilterName,
    saveExtensions: out.saveExtensions,
    invalidInputError: `Invalid file type for ${inputLabel} → ${outputLabel}. Please select a ${inputLabel} file.`,
    conversionFailedError: `${inputLabel} → ${outputLabel} conversion failed. The file may not be a valid ${inputLabel}.`
  }
}

function buildRegistry(): {
  converters: Record<ConversionId, ConverterFn>
  conversionMeta: Record<ConversionId, ConversionMeta>
} {
  const converters = {} as Record<ConversionId, ConverterFn>
  const conversionMeta = {} as Record<ConversionId, ConversionMeta>

  for (const input of inputFormats) {
    for (const output of outputOptionsByInput[input]) {
      const id = conversionIdFor(input, output)
      converters[id] = (buffer) => convertToOutput(buffer, output)
      conversionMeta[id] = buildConversionMeta(input, output)
    }
  }

  return { converters, conversionMeta }
}

const registry = buildRegistry()

export const converters = registry.converters
export const conversionMeta = registry.conversionMeta

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
  return inputTypeMeta[inputType].extensions.includes(ext)
}

export function getOpenDialogFilters(inputType: InputFileType): Electron.FileFilter[] {
  const meta = inputTypeMeta[inputType]
  return [{ name: meta.openFilterName, extensions: meta.openExtensions }]
}

export async function runConversion(input: Buffer, conversionId: ConversionId): Promise<Buffer> {
  return converters[conversionId](input)
}
