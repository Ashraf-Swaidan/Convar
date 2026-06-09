import type { ConversionId } from '@/lib/formatTypes'

export type ConversionHistoryEntry = {
  id: string
  inputPath: string
  outputPath: string
  conversionId: ConversionId
  conversionLabel: string
  outputByteLength: number
  timestamp: number
}

export type NewConversionHistoryEntry = Omit<ConversionHistoryEntry, 'id' | 'timestamp'>

const LEGACY_KEY = 'convar:conversionHistory'

export function loadLegacyConversionHistory(): ConversionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ConversionHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function clearLegacyConversionHistory(): void {
  localStorage.removeItem(LEGACY_KEY)
}
