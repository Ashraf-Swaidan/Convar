import { extname } from 'path'
import sharp from 'sharp'
import { decodeBmpToPng, encodeBmpFromRaster } from './bmp'
import { encodeIcoFromRaster } from './ico'

export type InputFileType =
  | 'png'
  | 'jpg'
  | 'webp'
  | 'heic'
  | 'gif'
  | 'avif'
  | 'tiff'
  | 'bmp'
  | 'dng'
  | 'raw'
  | 'psd'

export type OutputFormat = 'png' | 'jpg' | 'webp' | 'avif' | 'gif' | 'tiff' | 'bmp' | 'ico' | 'pdf'

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
  heic: 'HEIC',
  tiff: 'TIFF',
  bmp: 'BMP',
  dng: 'DNG',
  raw: 'RAW',
  psd: 'PSD',
  ico: 'ICO',
  pdf: 'PDF'
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
  avif: { openFilterName: 'AVIF Images', openExtensions: ['avif'], extensions: ['.avif'] },
  tiff: {
    openFilterName: 'TIFF Images',
    openExtensions: ['tif', 'tiff'],
    extensions: ['.tif', '.tiff']
  },
  bmp: { openFilterName: 'BMP Images', openExtensions: ['bmp'], extensions: ['.bmp'] },
  dng: { openFilterName: 'DNG Images', openExtensions: ['dng'], extensions: ['.dng'] },
  raw: {
    openFilterName: 'RAW Images',
    openExtensions: ['cr2', 'cr3', 'nef', 'nrw', 'arw', 'orf', 'rw2', 'raf', 'pef', 'srw'],
    extensions: [
      '.cr2',
      '.cr3',
      '.nef',
      '.nrw',
      '.arw',
      '.orf',
      '.rw2',
      '.raf',
      '.pef',
      '.srw',
      '.3fr',
      '.fff',
      '.rwl',
      '.x3f'
    ]
  },
  psd: { openFilterName: 'Photoshop PSD', openExtensions: ['psd'], extensions: ['.psd'] }
}

const outputTypeMeta: Record<
  OutputFormat,
  { saveFilterName: string; saveExtensions: string[]; ext: string }
> = {
  png: { saveFilterName: 'PNG Images', saveExtensions: ['png'], ext: 'png' },
  jpg: { saveFilterName: 'JPEG Images', saveExtensions: ['jpg', 'jpeg'], ext: 'jpg' },
  webp: { saveFilterName: 'WebP Images', saveExtensions: ['webp'], ext: 'webp' },
  avif: { saveFilterName: 'AVIF Images', saveExtensions: ['avif'], ext: 'avif' },
  gif: { saveFilterName: 'GIF Images', saveExtensions: ['gif'], ext: 'gif' },
  tiff: { saveFilterName: 'TIFF Images', saveExtensions: ['tif', 'tiff'], ext: 'tiff' },
  bmp: { saveFilterName: 'BMP Images', saveExtensions: ['bmp'], ext: 'bmp' },
  ico: { saveFilterName: 'ICO Icons', saveExtensions: ['ico'], ext: 'ico' },
  pdf: { saveFilterName: 'PDF Documents', saveExtensions: ['pdf'], ext: 'pdf' }
}

const rasterOutputs: OutputFormat[] = ['webp', 'jpg', 'png', 'ico', 'tiff', 'bmp', 'avif', 'gif']

export const outputOptionsByInput: Record<InputFileType, OutputFormat[]> = {
  png: rasterOutputs.filter((f) => f !== 'png'),
  jpg: rasterOutputs.filter((f) => f !== 'jpg'),
  webp: rasterOutputs.filter((f) => f !== 'webp'),
  heic: rasterOutputs,
  gif: rasterOutputs.filter((f) => f !== 'gif'),
  avif: rasterOutputs.filter((f) => f !== 'avif'),
  tiff: rasterOutputs.filter((f) => f !== 'tiff'),
  bmp: rasterOutputs.filter((f) => f !== 'bmp'),
  dng: rasterOutputs,
  raw: rasterOutputs,
  psd: rasterOutputs
}

export const inputFormats: InputFileType[] = [
  'png',
  'jpg',
  'webp',
  'heic',
  'gif',
  'avif',
  'tiff',
  'bmp',
  'dng',
  'raw',
  'psd'
]

function encodeOutput(
  image: sharp.Sharp,
  output: Exclude<OutputFormat, 'bmp' | 'ico' | 'pdf'>
): sharp.Sharp {
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
    case 'tiff':
      return image.tiff()
  }
}

async function convertInputToOutput(
  input: Buffer,
  inputType: InputFileType,
  output: OutputFormat
): Promise<Buffer> {
  let working = input
  if (inputType === 'bmp') {
    working = await decodeBmpToPng(input)
  }
  if (output === 'bmp') {
    return encodeBmpFromRaster(working)
  }
  if (output === 'ico') {
    return encodeIcoFromRaster(working)
  }
  if (output === 'pdf') {
    throw new Error('PDF output uses the document pipeline, not raster encoders.')
  }
  return encodeOutput(sharp(working), output).toBuffer()
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
      converters[id] = (buffer) => convertInputToOutput(buffer, input, output)
      conversionMeta[id] = buildConversionMeta(input, output)
    }
  }

  return { converters, conversionMeta }
}

const registry = buildRegistry()

export const converters = registry.converters
export const conversionMeta = registry.conversionMeta

export const allOutputFormats: OutputFormat[] = [
  'webp',
  'jpg',
  'png',
  'ico',
  'pdf',
  'tiff',
  'bmp',
  'avif',
  'gif'
]

export type FormatOptions = {
  outputFormats: OutputFormat[]
  formatLabels: Record<InputFileType | OutputFormat, string>
  supportedExtensions: string[]
}

export function getFormatOptions(): FormatOptions {
  return {
    outputFormats: allOutputFormats,
    formatLabels,
    supportedExtensions: [
      'png',
      'jpg',
      'jpeg',
      'webp',
      'heic',
      'heif',
      'gif',
      'avif',
      'tif',
      'tiff',
      'bmp',
      'dng',
      'cr2',
      'cr3',
      'nef',
      'nrw',
      'arw',
      'orf',
      'rw2',
      'raf',
      'pef',
      'srw',
      'psd',
      'pdf'
    ]
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
  'avif',
  'tif',
  'tiff',
  'bmp',
  'dng',
  'cr2',
  'cr3',
  'nef',
  'nrw',
  'arw',
  'orf',
  'rw2',
  'raf',
  'pef',
  'srw',
  'psd',
  'pdf'
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
