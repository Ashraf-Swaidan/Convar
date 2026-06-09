import { conversionLabel } from '@/lib/conversionLabel'
import { detectInputFormat } from '@/lib/detectInputFormat'
import type { ConversionId, OutputFormat } from '@/lib/formatTypes'

type FormatLabels = Record<string, string>

export function historyMetaForFile(
  inputPath: string,
  outputFormat: OutputFormat,
  labels: FormatLabels
): { conversionId: ConversionId; conversionLabel: string } {
  const input = detectInputFormat(inputPath)

  if (!input) {
    return { conversionId: 'png-webp', conversionLabel: 'Unknown' }
  }

  if (input === outputFormat) {
    return {
      conversionId: `${input}-${outputFormat}` as ConversionId,
      conversionLabel: `${labels[input]} copied`
    }
  }

  const conversionId = `${input}-${outputFormat}` as ConversionId
  return {
    conversionId,
    conversionLabel: conversionLabel(conversionId, labels)
  }
}
