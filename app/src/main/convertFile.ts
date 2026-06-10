import { mkdir, stat } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { readFileBuffer, writeFileBuffer, copyFileToPath } from './file'
import { outputPathForInput, type OutputLayout } from './ingest'
import {
  runConversion,
  conversionMeta,
  detectInputType,
  inputMatchesOutput,
  toConversionId,
  formatLabels,
  type ConversionId,
  type OutputFormat
} from './convert'
import { decodeBmpToPng } from './bmp'
import { isPdfFile, partitionIngestPaths } from './fileKind'
import { decodeHeicFileToJpeg } from './heic'
import {
  assertPdfOutputCompatible,
  imagesToPdf,
  pdfOutputBaseName,
  pdfToRasterPages
} from './pdf'
import { appError, fsErrorMessage, type AppError, type AppErrorCode } from './errors'

export async function readSupportedFile(
  filePath: string
): Promise<{ ok: true; byteLength: number } | { ok: false; error: AppError }> {
  if (!filePath) {
    return { ok: false, error: appError('no_file', 'No file selected.') }
  }

  if (!detectInputType(filePath) && !isPdfFile(filePath)) {
    return {
      ok: false,
      error: appError(
        'invalid_input',
        'Unsupported file type. Use images (PNG, JPG, WebP, HEIC, GIF, AVIF, TIFF, BMP) or PDF.'
      )
    }
  }

  try {
    if (detectInputType(filePath) === 'heic' || isPdfFile(filePath)) {
      const { size } = await stat(filePath)
      return { ok: true, byteLength: size }
    }

    const buffer = await readFileBuffer(filePath)
    return { ok: true, byteLength: buffer.byteLength }
  } catch (err) {
    return {
      ok: false,
      error: appError('read_failed', fsErrorMessage(err, 'Could not read the file.'))
    }
  }
}

async function readAndConvert(
  inputPath: string,
  conversionId: ConversionId
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: AppError }> {
  const meta = conversionMeta[conversionId]

  const inputType = detectInputType(inputPath)
  if (!inputType) {
    return { ok: false, error: appError('invalid_input', meta.invalidInputError) }
  }

  try {
    let buffer: Buffer
    if (inputType === 'heic') {
      buffer = await decodeHeicFileToJpeg(inputPath)
    } else if (inputType === 'bmp') {
      buffer = await decodeBmpToPng(await readFileBuffer(inputPath))
    } else {
      buffer = await readFileBuffer(inputPath)
    }
    return { ok: true, buffer }
  } catch (err) {
    const readHint =
      inputType === 'heic'
        ? 'Could not decode this HEIC file.'
        : inputType === 'bmp'
          ? 'Could not decode this BMP file.'
          : `Could not read the file for ${meta.label}.`
    return {
      ok: false,
      error: appError('read_failed', fsErrorMessage(err, readHint))
    }
  }
}

async function convertBuffer(
  input: Buffer,
  conversionId: ConversionId
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: AppError }> {
  const meta = conversionMeta[conversionId]

  try {
    const buffer = await runConversion(input, conversionId)
    return { ok: true, buffer }
  } catch {
    return {
      ok: false,
      error: appError('conversion_failed', meta.conversionFailedError)
    }
  }
}

export type BatchConvertOptions = {
  layout: OutputLayout
  inputRoot: string | null
}

async function ensureParentDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
}

export function batchFailure(
  inputPath: string,
  error: AppError
): { inputPath: string; ok: false; error: string; code: AppErrorCode } {
  return { inputPath, ok: false, error: error.message, code: error.code }
}

export async function processFileToPath(
  inputPath: string,
  outputPath: string,
  outputFormat: OutputFormat
): Promise<
  { ok: true; outputByteLength: number; copied: boolean } | { ok: false; error: AppError }
> {
  const inputType = detectInputType(inputPath)
  if (!inputType) {
    return {
      ok: false,
      error: appError(
        'invalid_input',
        'Unsupported image type. Use PNG, JPG, WebP, HEIC, GIF, AVIF, TIFF, or BMP.'
      )
    }
  }

  if (inputMatchesOutput(inputType, outputFormat)) {
    try {
      await ensureParentDir(outputPath)
      await copyFileToPath(inputPath, outputPath)
      const { size } = await stat(outputPath)
      return { ok: true, outputByteLength: size, copied: true }
    } catch (err) {
      return {
        ok: false,
        error: appError('save_failed', fsErrorMessage(err, 'Could not copy the file.'))
      }
    }
  }

  const conversionId = toConversionId(inputType, outputFormat)
  if (!conversionId) {
    return {
      ok: false,
      error: appError('conversion_failed', 'This conversion is not supported.')
    }
  }

  const readResult = await readAndConvert(inputPath, conversionId)
  if (!readResult.ok) return readResult

  const convertResult = await convertBuffer(readResult.buffer, conversionId)
  if (!convertResult.ok) return convertResult

  try {
    await ensureParentDir(outputPath)
    await writeFileBuffer(outputPath, convertResult.buffer)
    return { ok: true, outputByteLength: convertResult.buffer.byteLength, copied: false }
  } catch (err) {
    return {
      ok: false,
      error: appError(
        'save_failed',
        fsErrorMessage(err, `Could not save the ${formatLabels[outputFormat]} output.`)
      )
    }
  }
}

export async function exportPdfToImages(
  inputPath: string,
  outputDir: string,
  outputFormat: OutputFormat
): Promise<
  { ok: true; savedPath: string; outputByteLength: number } | { ok: false; error: AppError }
> {
  try {
    const base = pdfOutputBaseName(inputPath)
    const { paths, totalBytes } = await pdfToRasterPages(inputPath, outputDir, outputFormat, base)
    return { ok: true, savedPath: paths[0], outputByteLength: totalBytes }
  } catch (err) {
    return {
      ok: false,
      error: appError('conversion_failed', fsErrorMessage(err, 'Could not export PDF pages.'))
    }
  }
}

export async function exportImagesToPdf(
  imagePaths: string[],
  outputPath: string
): Promise<{ ok: true; outputByteLength: number } | { ok: false; error: AppError }> {
  try {
    const { byteLength } = await imagesToPdf(imagePaths, outputPath)
    return { ok: true, outputByteLength: byteLength }
  } catch (err) {
    return {
      ok: false,
      error: appError('conversion_failed', fsErrorMessage(err, 'Could not create PDF.'))
    }
  }
}

export async function convertFileToOutputDir(
  inputPath: string,
  outputDir: string,
  outputFormat: OutputFormat,
  options: BatchConvertOptions
): Promise<
  | { inputPath: string; ok: true; savedPath: string; outputByteLength: number; copied: boolean }
  | { inputPath: string; ok: false; error: string; code: AppErrorCode }
> {
  const savedPath = outputPathForInput(
    inputPath,
    outputDir,
    outputFormat,
    options.layout,
    options.inputRoot
  )
  const result = await processFileToPath(inputPath, savedPath, outputFormat)
  if (!result.ok) {
    return batchFailure(inputPath, result.error)
  }

  return {
    inputPath,
    ok: true,
    savedPath,
    outputByteLength: result.outputByteLength,
    copied: result.copied
  }
}

export type BatchProgress = {
  current: number
  total: number
  fileName: string
}

export async function convertBatchToOutputDir(
  inputPaths: string[],
  outputDir: string,
  outputFormat: OutputFormat,
  options: BatchConvertOptions,
  onProgress: (progress: BatchProgress) => void
): Promise<
  Array<
    | { inputPath: string; ok: true; savedPath: string; outputByteLength: number; copied: boolean }
    | { inputPath: string; ok: false; error: string; code: AppErrorCode }
  >
> {
  const { images, pdfs } = partitionIngestPaths(inputPaths)

  try {
    assertPdfOutputCompatible(images.length, pdfs.length, outputFormat)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid batch.'
    return inputPaths.map((inputPath) =>
      batchFailure(inputPath, appError('invalid_input', message))
    )
  }

  if (outputFormat === 'pdf') {
    onProgress({ current: 1, total: 1, fileName: 'document.pdf' })
    const pdfPath = join(outputDir, 'document.pdf')
    const created = await exportImagesToPdf(images, pdfPath)
    if (!created.ok) {
      return images.map((inputPath) => batchFailure(inputPath, created.error))
    }
    return images.map((inputPath) => ({
      inputPath,
      ok: true as const,
      savedPath: pdfPath,
      outputByteLength: created.outputByteLength,
      copied: false
    }))
  }

  if (pdfs.length > 0) {
    const results: Array<
      | { inputPath: string; ok: true; savedPath: string; outputByteLength: number; copied: boolean }
      | { inputPath: string; ok: false; error: string; code: AppErrorCode }
    > = []

    for (let i = 0; i < pdfs.length; i++) {
      const inputPath = pdfs[i]
      onProgress({ current: i + 1, total: pdfs.length, fileName: basename(inputPath) })
      const exported = await exportPdfToImages(inputPath, outputDir, outputFormat)
      if (!exported.ok) {
        results.push(batchFailure(inputPath, exported.error))
        continue
      }
      results.push({
        inputPath,
        ok: true,
        savedPath: exported.savedPath,
        outputByteLength: exported.outputByteLength,
        copied: false
      })
    }

    return results
  }

  const results: Array<
    | { inputPath: string; ok: true; savedPath: string; outputByteLength: number; copied: boolean }
    | { inputPath: string; ok: false; error: string; code: AppErrorCode }
  > = []
  const total = inputPaths.length

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i]
    onProgress({ current: i + 1, total, fileName: basename(inputPath) })
    results.push(await convertFileToOutputDir(inputPath, outputDir, outputFormat, options))
  }

  return results
}
