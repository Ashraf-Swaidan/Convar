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
  const previewFiles = files.filter((file) => file.previewUrl).slice(0, MAX_PREVIEWS)
  const extraCount = totalCount > MAX_PREVIEWS ? totalCount - MAX_PREVIEWS : 0

  if (previewFiles.length === 0 && totalCount === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground/80">No files selected</p>
    )
  }

  if (previewFiles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <p className="text-sm text-muted-foreground">
          {totalCount} file{totalCount === 1 ? '' : 's'} selected
        </p>
      </div>
    )
  }

  const stackWidth = previewFiles.length === 1 ? 72 : previewFiles.length === 2 ? 100 : 128

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div
        className="relative h-[4.5rem]"
        style={{ width: `${stackWidth + (extraCount > 0 ? 28 : 0)}px` }}
      >
        {previewFiles.map((file, index) => {
          const style = STYLES[index]
          return (
            <div
              key={file.path}
              className="absolute top-1/2 left-0 size-[4.5rem] overflow-hidden rounded-xl bg-muted shadow-[0_4px_14px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.06]"
              style={{
                transform: `translateX(${style.x}px) translateY(-50%) rotate(${style.rotate}deg)`,
                zIndex: style.z
              }}
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
          <span className="absolute right-0 bottom-1 z-10 rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-semibold text-background shadow-sm">
            +{extraCount}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {totalCount} file{totalCount === 1 ? '' : 's'} selected
      </p>
    </div>
  )
}
