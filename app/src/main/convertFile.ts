import { stat } from 'fs/promises'
import { join, basename, extname } from 'path'
import { readFileBuffer, writeFileBuffer, copyFileToPath } from './file'
import {
  runConversion,
  conversionMeta,
  detectInputType,
  inputMatchesOutput,
  toConversionId,
  outputExtension,
  formatLabels,
  type ConversionId,
  type OutputFormat
} from './convert'
import { appError, fsErrorMessage, type AppError, type AppErrorCode } from './errors'

export async function readSupportedFile(
  filePath: string
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: AppError }> {
  if (!filePath) {
    return { ok: false, error: appError('no_file', 'No file selected.') }
  }

  if (!detectInputType(filePath)) {
    return {
      ok: false,
      error: appError('invalid_input', 'Unsupported image type. Use PNG, JPG, or WebP.')
    }
  }

  try {
    const buffer = await readFileBuffer(filePath)
    return { ok: true, buffer }
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

  if (!detectInputType(inputPath)) {
    return { ok: false, error: appError('invalid_input', meta.invalidInputError) }
  }

  try {
    const buffer = await readFileBuffer(inputPath)
    return { ok: true, buffer }
  } catch (err) {
    return {
      ok: false,
      error: appError(
        'read_failed',
        fsErrorMessage(err, `Could not read the file for ${meta.label}.`)
      )
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

export function outputPathForInput(
  inputPath: string,
  outputDir: string,
  outputFormat: OutputFormat
): string {
  return join(
    outputDir,
    `${basename(inputPath, extname(inputPath))}.${outputExtension(outputFormat)}`
  )
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
      error: appError('invalid_input', 'Unsupported image type. Use PNG, JPG, or WebP.')
    }
  }

  if (inputMatchesOutput(inputType, outputFormat)) {
    try {
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

export async function convertFileToOutputDir(
  inputPath: string,
  outputDir: string,
  outputFormat: OutputFormat
): Promise<
  | { inputPath: string; ok: true; savedPath: string; outputByteLength: number; copied: boolean }
  | { inputPath: string; ok: false; error: string; code: AppErrorCode }
> {
  const savedPath = outputPathForInput(inputPath, outputDir, outputFormat)
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
  onProgress: (progress: BatchProgress) => void
): Promise<
  Array<
    | { inputPath: string; ok: true; savedPath: string; outputByteLength: number; copied: boolean }
    | { inputPath: string; ok: false; error: string; code: AppErrorCode }
  >
> {
  const results: Array<
    | { inputPath: string; ok: true; savedPath: string; outputByteLength: number; copied: boolean }
    | { inputPath: string; ok: false; error: string; code: AppErrorCode }
  > = []
  const total = inputPaths.length

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i]
    onProgress({ current: i + 1, total, fileName: basename(inputPath) })
    results.push(await convertFileToOutputDir(inputPath, outputDir, outputFormat))
  }

  return results
}
