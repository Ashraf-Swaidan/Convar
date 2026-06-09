import { extname } from 'path'
import sharp from 'sharp'

export type InputFileType = 'png' | 'jpg' | 'webp' | 'heic' | 'gif' | 'avif'

export type OutputFormat = 'png' | 'jpg' | 'webp' | 'avif' | 'gif'

export type ConversionId = `${InputFileType}-${OutputFormat}`

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
  avif: 'AVIF',
  gif: 'GIF',
  heic: 'HEIC'
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
  webp: { openFilterName: 'WebP Images', openExtensions: ['webp'], extensions: ['.webp'] },
  heic: {
    openFilterName: 'HEIC Images',
    openExtensions: ['heic', 'heif'],
    extensions: ['.heic', '.heif']
  },
  gif: { openFilterName: 'GIF Images', openExtensions: ['gif'], extensions: ['.gif'] },
  avif: { openFilterName: 'AVIF Images', openExtensions: ['avif'], extensions: ['.avif'] }
}

const outputTypeMeta: Record<
  OutputFormat,
  { saveFilterName: string; saveExtensions: string[]; ext: string }
> = {
  png: { saveFilterName: 'PNG Images', saveExtensions: ['png'], ext: 'png' },
  jpg: { saveFilterName: 'JPEG Images', saveExtensions: ['jpg', 'jpeg'], ext: 'jpg' },
  webp: { saveFilterName: 'WebP Images', saveExtensions: ['webp'], ext: 'webp' },
  avif: { saveFilterName: 'AVIF Images', saveExtensions: ['avif'], ext: 'avif' },
  gif: { saveFilterName: 'GIF Images', saveExtensions: ['gif'], ext: 'gif' }
}

const rasterOutputs: OutputFormat[] = ['webp', 'jpg', 'png', 'avif', 'gif']

export const outputOptionsByInput: Record<InputFileType, OutputFormat[]> = {
  png: rasterOutputs.filter((f) => f !== 'png'),
  jpg: rasterOutputs.filter((f) => f !== 'jpg'),
  webp: rasterOutputs.filter((f) => f !== 'webp'),
  heic: rasterOutputs,
  gif: rasterOutputs.filter((f) => f !== 'gif'),
  avif: rasterOutputs.filter((f) => f !== 'avif')
}

export const inputFormats: InputFileType[] = ['png', 'jpg', 'webp', 'heic', 'gif', 'avif']

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
    case 'gif':
      return image.gif()
  }
}

async function convertToOutput(input: Buffer, output: OutputFormat): Promise<Buffer> {
  return encodeOutput(sharp(input), output).toBuffer()
}

function conversionIdFor(input: InputFileType, output: OutputFormat): ConversionId {
  return `${input}-${output}`
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

export const allOutputFormats: OutputFormat[] = ['webp', 'jpg', 'png', 'avif', 'gif']

export type FormatOptions = {
  outputFormats: OutputFormat[]
  formatLabels: Record<InputFileType | OutputFormat, string>
  supportedExtensions: string[]
}

export function getFormatOptions(): FormatOptions {
  return {
    outputFormats: allOutputFormats,
    formatLabels,
    supportedExtensions: ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif', 'gif', 'avif']
  }
}

export function detectInputType(filePath: string): InputFileType | null {
  for (const inputType of inputFormats) {
    if (isValidInputFile(filePath, inputType)) return inputType
  }
  return null
}

export function isSupportedInputFile(filePath: string): boolean {
  return detectInputType(filePath) !== null
}

export function inputMatchesOutput(input: InputFileType, output: OutputFormat): boolean {
  return input === output
}

const DIALOG_IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'heic',
  'heif',
  'gif',
  'avif'
] as const

/** Windows matches dialog extensions case-sensitively; iPhone exports use `.HEIC`. */
function openDialogExtensions(extensions: readonly string[]): string[] {
  const variants: string[] = []
  for (const ext of extensions) {
    variants.push(ext, ext.toUpperCase())
  }
  return variants
}

export function getCombinedOpenDialogFilters(): Electron.FileFilter[] {
  return [
    {
      name: 'Images',
      extensions: openDialogExtensions(DIALOG_IMAGE_EXTENSIONS)
    },
    { name: 'All Files', extensions: ['*'] }
  ]
}

export function getSaveDialogFilters(output: OutputFormat): Electron.FileFilter[] {
  const meta = outputTypeMeta[output]
  return [{ name: meta.saveFilterName, extensions: meta.saveExtensions }]
}

export function outputExtension(output: OutputFormat): string {
  return outputTypeMeta[output].ext
}

export function isConversionId(value: string): value is ConversionId {
  return value in converters
}

export function isOutputFormat(value: string): value is OutputFormat {
  return allOutputFormats.includes(value as OutputFormat)
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

export async function runConversion(input: Buffer, conversionId: ConversionId): Promise<Buffer> {
  return converters[conversionId](input)
}
