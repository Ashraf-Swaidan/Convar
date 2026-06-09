type DropOverlayProps = {
  visible: boolean
}

export function DropOverlay({ visible }: DropOverlayProps): React.JSX.Element | null {
  if (!visible) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/55 backdrop-blur-[2px]"
      aria-hidden
    >
      <p className="text-base font-medium text-foreground/80">Drop files anywhere</p>
    </div>
  )
}
