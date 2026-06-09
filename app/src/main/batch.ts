import { join, basename, extname } from 'path'
import { readFileBuffer, writeFileBuffer } from './file'
import {
  runConversion,
  conversionMeta,
  isValidInputFile,
  type ConversionId
} from './convert'

export type BatchFileResult =
  | { inputPath: string; ok: true; savedPath: string; outputByteLength: number }
  | { inputPath: string; ok: false; error: string }

export type BatchProgress = {
  current: number
  total: number
  fileName: string
}

export async function convertFileToOutputDir(
  inputPath: string,
  outputDir: string,
  conversionId: ConversionId
): Promise<BatchFileResult> {
  const meta = conversionMeta[conversionId]

  if (!isValidInputFile(inputPath, meta.inputType)) {
    return { inputPath, ok: false, error: meta.invalidInputError }
  }

  let input: Buffer
  try {
    input = await readFileBuffer(inputPath)
  } catch {
    return { inputPath, ok: false, error: `Could not read the file for ${meta.label}.` }
  }

  let output: Buffer
  try {
    output = await runConversion(input, conversionId)
  } catch {
    return { inputPath, ok: false, error: meta.conversionFailedError }
  }

  const savedPath = join(
    outputDir,
    `${basename(inputPath, extname(inputPath))}.${meta.outputExt}`
  )

  try {
    await writeFileBuffer(savedPath, output)
  } catch {
    return { inputPath, ok: false, error: `Could not save the ${meta.label} output.` }
  }

  return { inputPath, ok: true, savedPath, outputByteLength: output.byteLength }
}

export async function convertBatchToOutputDir(
  inputPaths: string[],
  outputDir: string,
  conversionId: ConversionId,
  onProgress: (progress: BatchProgress) => void
): Promise<BatchFileResult[]> {
  const results: BatchFileResult[] = []
  const total = inputPaths.length

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i]
    onProgress({ current: i + 1, total, fileName: basename(inputPath) })
    results.push(await convertFileToOutputDir(inputPath, outputDir, conversionId))
  }

  return results
}
