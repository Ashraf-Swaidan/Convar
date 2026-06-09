import { randomUUID } from 'crypto'
import { app } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ConversionId } from './convert'

export type ConversionHistoryEntry = {
  id: string
  inputPath: string
  outputPath: string
  conversionId: ConversionId
  conversionLabel: string
  outputByteLength: number
  timestamp: number
}

export type NewHistoryEntry = Omit<ConversionHistoryEntry, 'id' | 'timestamp'>

const MAX_ENTRIES = 20
const FILE_NAME = 'conversion-history.json'

function historyPath(): string {
  return join(app.getPath('userData'), FILE_NAME)
}

export async function loadHistory(): Promise<ConversionHistoryEntry[]> {
  try {
    const raw = await readFile(historyPath(), 'utf8')
    const parsed = JSON.parse(raw) as ConversionHistoryEntry[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : []
  } catch {
    return []
  }
}

async function saveHistory(entries: ConversionHistoryEntry[]): Promise<void> {
  await writeFile(historyPath(), JSON.stringify(entries.slice(0, MAX_ENTRIES), null, 2), 'utf8')
}

export async function appendHistory(entry: NewHistoryEntry): Promise<ConversionHistoryEntry[]> {
  const next: ConversionHistoryEntry = {
    ...entry,
    id: randomUUID(),
    timestamp: Date.now()
  }
  const entries = [next, ...(await loadHistory())].slice(0, MAX_ENTRIES)
  await saveHistory(entries)
  return entries
}

export async function replaceHistory(
  entries: ConversionHistoryEntry[]
): Promise<ConversionHistoryEntry[]> {
  const trimmed = entries.slice(0, MAX_ENTRIES)
  await saveHistory(trimmed)
  return trimmed
}

export async function clearHistory(): Promise<void> {
  await saveHistory([])
}
