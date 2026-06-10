import { allOutputFormats, detectInputType, outputOptionsByInput, type OutputFormat } from './convert'
import { isPdfFile } from './fileKind'

export const PDF_RASTER_OUTPUT_FORMATS: OutputFormat[] = ['png', 'jpg', 'webp', 'avif']

export type CompatibleOutputs = {
  formats: OutputFormat[]
  blockedReason: string | null
}

export function outputFormatsForIngestPath(filePath: string): OutputFormat[] | null {
  if (isPdfFile(filePath)) {
    return [...PDF_RASTER_OUTPUT_FORMATS]
  }

  const inputType = detectInputType(filePath)
  if (!inputType) {
    return null
  }

  return [...outputOptionsByInput[inputType], 'pdf']
}

export function getCompatibleOutputFormats(filePaths: string[]): CompatibleOutputs {
  if (filePaths.length === 0) {
    return { formats: [...allOutputFormats], blockedReason: null }
  }

  const hasPdf = filePaths.some((filePath) => isPdfFile(filePath))
  const hasNonPdf = filePaths.some((filePath) => !isPdfFile(filePath))

  if (hasPdf && hasNonPdf) {
    return {
      formats: [],
      blockedReason: 'Mix PDF with images in one batch. Convert them separately.'
    }
  }

  let intersection: Set<OutputFormat> | null = null

  for (const filePath of filePaths) {
    const allowed = outputFormatsForIngestPath(filePath)
    if (!allowed) {
      return {
        formats: [],
        blockedReason: 'One or more files use an unsupported type.'
      }
    }

    const allowedSet = new Set(allowed)
    if (!intersection) {
      intersection = allowedSet
    } else {
      const next = new Set<OutputFormat>()
      for (const format of intersection) {
        if (allowedSet.has(format)) {
          next.add(format)
        }
      }
      intersection = next
    }
  }

  const formats = allOutputFormats.filter((format) => intersection?.has(format))
  return {
    formats,
    blockedReason:
      formats.length === 0 ? 'No output format works for every file in this selection.' : null
  }
}
