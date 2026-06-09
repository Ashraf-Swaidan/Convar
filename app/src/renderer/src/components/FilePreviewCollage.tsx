import { useState } from 'react'

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
}

export function FilePreviewCollage({
  files,
  totalCount
}: FilePreviewCollageProps): React.JSX.Element {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const previewFiles = files.filter((file) => file.previewUrl).slice(0, MAX_PREVIEWS)
  const extraCount = totalCount > MAX_PREVIEWS ? totalCount - MAX_PREVIEWS : 0

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
    <div className="flex justify-center py-2">
      <div
        className="relative h-[4.5rem]"
        style={{ width: `${stackWidth + (extraCount > 0 ? 28 : 0)}px` }}
      >
        {previewFiles.map((file, index) => {
          const style = STYLES[index]
          const isHovered = hoveredIndex === index
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
            </div>
          )
        })}
        {extraCount > 0 && (
          <span className="pointer-events-none absolute right-0 bottom-1 z-10 rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-semibold text-background shadow-sm">
            +{extraCount}
          </span>
        )}
      </div>
    </div>
  )
}
