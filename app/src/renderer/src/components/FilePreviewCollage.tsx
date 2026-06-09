import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { FileConversionStatus } from '@/lib/conversionStatus'

const MAX_PREVIEWS = 3

const STYLES = [
  { rotate: -7, x: 0, z: 1 },
  { rotate: 4, x: 28, z: 2 },
  { rotate: 9, x: 56, z: 3 }
] as const

type PreviewFile = {
  path: string
  fileName: string
  previewUrl?: string
}

type FilePreviewCollageProps = {
  files: PreviewFile[]
  totalCount: number
  statusByPath?: Record<string, FileConversionStatus>
}

export function FilePreviewCollage({
  files,
  totalCount,
  statusByPath = {}
}: FilePreviewCollageProps): React.JSX.Element {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const previewFiles = files.filter((file) => file.previewUrl).slice(0, MAX_PREVIEWS)
  const extraCount = totalCount > MAX_PREVIEWS ? totalCount - MAX_PREVIEWS : 0
  const hasStatuses = Object.keys(statusByPath).length > 0

  if (previewFiles.length === 0 && totalCount === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground/80">No files selected</p>
    )
  }

  if (previewFiles.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {totalCount} file{totalCount === 1 ? '' : 's'} selected
      </p>
    )
  }

  const stackWidth = previewFiles.length === 1 ? 72 : previewFiles.length === 2 ? 100 : 128

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div
        className="relative h-[4.5rem]"
        style={{ width: `${stackWidth + (extraCount > 0 ? 28 : 0)}px` }}
      >
        {previewFiles.map((file, index) => {
          const style = STYLES[index]
          const isHovered = hoveredIndex === index
          const status = statusByPath[file.path]
          return (
            <div
              key={file.path}
              className="absolute top-1/2 left-0 size-[4.5rem] cursor-pointer overflow-hidden rounded-xl bg-muted shadow-[0_4px_14px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.06] transition-[transform,box-shadow,z-index] duration-200 ease-out hover:shadow-[0_8px_20px_rgba(0,0,0,0.14)]"
              style={{
                transform: `translateX(${style.x}px) translateY(-50%) rotate(${style.rotate}deg)${isHovered ? ' scale(1.06)' : ''}`,
                zIndex: isHovered ? 20 : style.z
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <img
                src={file.previewUrl}
                alt={file.fileName}
                className="size-full object-cover"
                draggable={false}
              />
              {status?.state === 'success' && (
                <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-2 ring-background">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
              {status?.state === 'failed' && (
                <span className="group/fail absolute -right-1 -bottom-1">
                  <span className="flex size-5 cursor-help items-center justify-center rounded-full bg-destructive text-white shadow-sm ring-2 ring-background">
                    <X className="size-3" strokeWidth={3} />
                  </span>
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-[200px] -translate-x-1/2 rounded-md border border-border/80 bg-foreground px-2 py-1.5 text-[10px] leading-snug text-background shadow-md group-hover/fail:block">
                    {status.error}
                  </span>
                </span>
              )}
            </div>
          )
        })}
        {extraCount > 0 && (
          <span className="pointer-events-none absolute right-0 bottom-1 z-10 rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-semibold text-background shadow-sm">
            +{extraCount}
          </span>
        )}
      </div>
      {hasStatuses && totalCount > MAX_PREVIEWS && (
        <p className="text-xs text-muted-foreground">Status shown on first {MAX_PREVIEWS} previews</p>
      )}
    </div>
  )
}
