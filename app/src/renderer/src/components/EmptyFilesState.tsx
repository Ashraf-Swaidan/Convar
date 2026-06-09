import { ImagePlus } from 'lucide-react'

export function EmptyFilesState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
        <ImagePlus className="size-5" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-foreground/85">No files yet</p>
      <p className="max-w-[220px] text-xs leading-relaxed text-muted-foreground">
        Drop PNG, JPG, or WebP files here, or use Select Files
      </p>
    </div>
  )
}
