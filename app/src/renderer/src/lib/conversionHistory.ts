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

const KEY = 'convar:conversionHistory'
const MAX_ENTRIES = 20

export function loadConversionHistory(): ConversionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ConversionHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveConversionHistory(entries: ConversionHistoryEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
}

export function addConversionHistoryEntry(
  entry: Omit<ConversionHistoryEntry, 'id' | 'timestamp'>
): ConversionHistoryEntry[] {
  const next: ConversionHistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  }
  const entries = [next, ...loadConversionHistory()].slice(0, MAX_ENTRIES)
  saveConversionHistory(entries)
  return entries
}

export function clearConversionHistory(): void {
  localStorage.removeItem(KEY)
}
