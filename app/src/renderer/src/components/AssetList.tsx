import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { getErrorHint, type AppErrorCode } from '@/lib/errorHints'
import { countStatuses, type FileConversionStatus } from '@/lib/conversionStatus'

type ConversionId = 'png-webp' | 'png-jpg' | 'jpg-png'

type AssetFile = {
  path: string
  fileName: string
  byteLength: number
  previewUrl?: string
}

type AssetListProps = {
  files: AssetFile[]
  conversionId: ConversionId
  formatFileSize: (bytes: number) => string
  statusByPath?: Record<string, FileConversionStatus>
  autoExpand?: boolean
}

export function AssetList({
  files,
  conversionId,
  formatFileSize,
  statusByPath = {},
  autoExpand = false
}: AssetListProps): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [previewByPath, setPreviewByPath] = useState<Record<string, string>>({})
  const loadingRef = useRef<Set<string>>(new Set())

  const hasStatuses = Object.keys(statusByPath).length > 0
  const { success, failed } = countStatuses(statusByPath)

  useEffect(() => {
    if (autoExpand) {
      setOpen(true)
    }
  }, [autoExpand])

  useEffect(() => {
    loadingRef.current = new Set(files.filter((file) => file.previewUrl).map((file) => file.path))
    setPreviewByPath((prev) => {
      const next = { ...prev }
      for (const file of files) {
        if (file.previewUrl) {
          next[file.path] = file.previewUrl
        }
      }
      return next
    })
  }, [files])

  useEffect(() => {
    if (!open || files.length === 0) return

    let cancelled = false

    void (async () => {
      for (const file of files) {
        if (cancelled) return
        if (file.previewUrl || loadingRef.current.has(file.path)) continue

        loadingRef.current.add(file.path)
        const result = await window.api.getFilePreview(file.path, conversionId)
        if (cancelled) return

        if (result.ok) {
          setPreviewByPath((prev) => ({ ...prev, [file.path]: result.dataUrl }))
        } else {
          loadingRef.current.delete(file.path)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, files, conversionId])

  if (files.length === 0) return null

  const previewFor = (file: AssetFile): string | undefined =>
    file.previewUrl ?? previewByPath[file.path]

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group rounded-lg border border-border/70 bg-muted/20"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>
            {files.length} asset{files.length === 1 ? '' : 's'}
          </span>
          {hasStatuses && (
            <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              {success > 0 && (
                <span className="inline-flex items-center gap-0.5 text-emerald-600">
                  <Check className="size-3.5" strokeWidth={2.5} />
                  {success}
                </span>
              )}
              {failed > 0 && (
                <span className="inline-flex items-center gap-0.5 text-destructive">
                  <X className="size-3.5" strokeWidth={2.5} />
                  {failed}
                </span>
              )}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="border-t border-border/60 px-2 pb-2">
        <table className="w-full table-fixed text-left text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="w-8 py-1.5 pl-1 font-medium" scope="col" />
              <th className="w-11 py-1.5 font-medium" scope="col" />
              <th className="py-1.5 font-medium" scope="col">
                Name
              </th>
              <th className="w-16 py-1.5 pr-1 text-right font-medium" scope="col">
                Size
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const preview = previewFor(file)
              const status = statusByPath[file.path]
              return (
                <tr key={file.path} className="border-t border-border/40 first:border-t-0">
                  <td className="py-1.5 pl-1 align-middle">
                    <StatusCell status={status} />
                  </td>
                  <td className="py-1.5 align-middle">
                    <div className="relative size-8 overflow-hidden rounded-md bg-muted ring-1 ring-black/[0.05]">
                      {preview !== undefined ? (
                        <img
                          src={preview}
                          alt=""
                          className="size-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="size-full animate-pulse bg-muted-foreground/10" />
                      )}
                      {status?.state === 'success' && (
                        <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-1 ring-background">
                          <Check className="size-2" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="truncate py-1.5 pr-2 align-middle font-medium text-foreground/90">
                    {file.fileName}
                  </td>
                  <td className="py-1.5 pr-1 text-right align-middle whitespace-nowrap text-muted-foreground">
                    {formatFileSize(file.byteLength)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function StatusCell({ status }: { status?: FileConversionStatus }): React.JSX.Element | null {
  if (!status) return null

  if (status.state === 'success') {
    return <Check className="size-3.5 text-emerald-600" strokeWidth={2.5} aria-label="Converted" />
  }

  const hint =
    status.code !== undefined
      ? getErrorHint(status.code as AppErrorCode).title
      : 'Conversion failed'

  return (
    <span className="group/fail relative inline-flex">
      <X
        className="size-3.5 cursor-help text-destructive"
        strokeWidth={2.5}
        aria-label="Failed"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-1.5 hidden w-max max-w-[220px] rounded-md border border-border/80 bg-foreground px-2 py-1.5 text-[10px] leading-snug font-normal text-background shadow-md group-hover/fail:block"
      >
        <span className="block font-medium">{hint}</span>
        <span className="mt-0.5 block opacity-90">{status.error}</span>
      </span>
    </span>
  )
}
