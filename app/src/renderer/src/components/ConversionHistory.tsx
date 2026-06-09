import { ChevronDown, ExternalLink } from 'lucide-react'
import type { ConversionHistoryEntry } from '@/lib/conversionHistory'

type ConversionHistoryProps = {
  entries: ConversionHistoryEntry[]
  formatFileSize: (bytes: number) => string
  onOpenOutput: (path: string) => void
  onClear: () => void
}

function fileNameFromPath(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath
}

function formatWhen(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

export function ConversionHistory({
  entries,
  formatFileSize,
  onOpenOutput,
  onClear
}: ConversionHistoryProps): React.JSX.Element | null {
  if (entries.length === 0) return null

  return (
    <details className="group rounded-lg border border-border/70 bg-muted/15">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        <span>Recent conversions ({entries.length})</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="border-t border-border/60 px-2 pb-2">
        <ul className="divide-y divide-border/40">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 py-2 pl-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground/90">
                  {fileNameFromPath(entry.outputPath)}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {entry.conversionLabel} · {formatFileSize(entry.outputByteLength)} ·{' '}
                  {formatWhen(entry.timestamp)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Open ${fileNameFromPath(entry.outputPath)}`}
                onClick={() => onOpenOutput(entry.outputPath)}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="size-3.5" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClear}
          className="mt-1 w-full py-1.5 text-center text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Clear history
        </button>
      </div>
    </details>
  )
}
