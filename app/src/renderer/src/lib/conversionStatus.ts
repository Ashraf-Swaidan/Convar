export type FileConversionStatus =
  | { state: 'success' }
  | { state: 'failed'; error: string; code?: string }

export function buildStatusMapFromBatch(
  results: Array<
    | { inputPath: string; ok: true }
    | { inputPath: string; ok: false; error: string; code: string }
  >
): Record<string, FileConversionStatus> {
  const map: Record<string, FileConversionStatus> = {}
  for (const result of results) {
    if (result.ok) {
      map[result.inputPath] = { state: 'success' }
    } else {
      map[result.inputPath] = {
        state: 'failed',
        error: result.error,
        code: result.code
      }
    }
  }
  return map
}

export function countStatuses(statusByPath: Record<string, FileConversionStatus>): {
  success: number
  failed: number
} {
  let success = 0
  let failed = 0
  for (const status of Object.values(statusByPath)) {
    if (status.state === 'success') success++
    else failed++
  }
  return { success, failed }
}
