import { join, basename, extname } from 'path'
import { readFileBuffer, writeFileBuffer } from './file'
import { runConversion, conversionMeta, isValidInputFile, type ConversionId } from './convert'
import { appError, fsErrorMessage, type AppError, type AppErrorCode } from './errors'

export type ConvertedOutput = {
  buffer: Buffer
  savedPath: string
}

export async function readAndConvert(
  inputPath: string,
  conversionId: ConversionId
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: AppError }> {
  const meta = conversionMeta[conversionId]

  if (!inputPath) {
    return { ok: false, error: appError('no_file', `No file selected for ${meta.label}.`) }
  }

  if (!isValidInputFile(inputPath, meta.inputType)) {
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

export async function convertBuffer(
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

export async function writeConvertedOutput(
  outputPath: string,
  buffer: Buffer,
  conversionId: ConversionId
): Promise<{ ok: true } | { ok: false; error: AppError }> {
  const meta = conversionMeta[conversionId]

  try {
    await writeFileBuffer(outputPath, buffer)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: appError(
        'save_failed',
        fsErrorMessage(err, `Could not save the ${meta.label} output.`)
      )
    }
  }
}

export function outputPathForInput(inputPath: string, outputDir: string, conversionId: ConversionId): string {
  const meta = conversionMeta[conversionId]
  return join(outputDir, `${basename(inputPath, extname(inputPath))}.${meta.outputExt}`)
}

export function batchFailure(
  inputPath: string,
  error: AppError
): { inputPath: string; ok: false; error: string; code: AppErrorCode } {
  return { inputPath, ok: false, error: error.message, code: error.code }
}

export async function convertFileToOutputDir(
  inputPath: string,
  outputDir: string,
  conversionId: ConversionId
): Promise<
  | { inputPath: string; ok: true; savedPath: string; outputByteLength: number }
  | { inputPath: string; ok: false; error: string; code: AppErrorCode }
> {
  const readResult = await readAndConvert(inputPath, conversionId)
  if (!readResult.ok) {
    return batchFailure(inputPath, readResult.error)
  }

  const convertResult = await convertBuffer(readResult.buffer, conversionId)
  if (!convertResult.ok) {
    return batchFailure(inputPath, convertResult.error)
  }

  const savedPath = outputPathForInput(inputPath, outputDir, conversionId)
  const writeResult = await writeConvertedOutput(savedPath, convertResult.buffer, conversionId)
  if (!writeResult.ok) {
    return batchFailure(inputPath, writeResult.error)
  }

  return {
    inputPath,
    ok: true,
    savedPath,
    outputByteLength: convertResult.buffer.byteLength
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
  conversionId: ConversionId,
  onProgress: (progress: BatchProgress) => void
): Promise<
  Array<
    | { inputPath: string; ok: true; savedPath: string; outputByteLength: number }
    | { inputPath: string; ok: false; error: string; code: AppErrorCode }
  >
> {
  const results: Array<
    | { inputPath: string; ok: true; savedPath: string; outputByteLength: number }
    | { inputPath: string; ok: false; error: string; code: AppErrorCode }
  > = []
  const total = inputPaths.length

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i]
    onProgress({ current: i + 1, total, fileName: basename(inputPath) })
    results.push(await convertFileToOutputDir(inputPath, outputDir, conversionId))
  }

  return results
}
