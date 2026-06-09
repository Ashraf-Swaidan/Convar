import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

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
}

export function AssetList({
  files,
  conversionId,
  formatFileSize
}: AssetListProps): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [previewByPath, setPreviewByPath] = useState<Record<string, string>>({})
  const loadingRef = useRef<Set<string>>(new Set())

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
        <span>
          {files.length} asset{files.length === 1 ? '' : 's'}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="border-t border-border/60 px-2 pb-2">
        <table className="w-full table-fixed text-left text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="w-11 py-1.5 pl-1 font-medium" scope="col">
                {/* image */}
              </th>
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
              return (
                <tr key={file.path} className="border-t border-border/40 first:border-t-0">
                  <td className="py-1.5 pl-1 align-middle">
                    <div className="size-8 overflow-hidden rounded-md bg-muted ring-1 ring-black/[0.05]">
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
