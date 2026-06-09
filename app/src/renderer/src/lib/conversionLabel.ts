import type { ConversionId } from '@/lib/formatTypes'

type FormatLabels = Record<string, string>

export function conversionLabel(id: ConversionId, labels: FormatLabels): string {
  const [input, output] = id.split('-')
  return `${labels[input] ?? input} → ${labels[output] ?? output}`
}
