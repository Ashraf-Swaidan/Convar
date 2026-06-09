import { Minus, Square, X } from 'lucide-react'
import darkLogo from '@/assets/convar-dark-logo.png'

const isMac = window.api.platform === 'darwin'

export function TitleBar(): React.JSX.Element {
  return (
    <header className="app-drag flex h-11 shrink-0 items-center border-b border-border/80 bg-[oklch(0.992_0_0)] pl-3 pr-0">
      <div
        className={`app-no-drag flex items-center gap-2.5 ${isMac ? 'pl-16' : ''}`}
      >
        <img
          src={darkLogo}
          alt=""
          className="size-9 rounded-[10px] object-cover"
          draggable={false}
        />
        <span className="text-[13px] font-semibold tracking-[0.08em] text-foreground/90">
          CONVAR
        </span>
      </div>

      <div className="flex-1" />

      {!isMac && (
        <div className="app-no-drag flex h-full">
          <WindowButton label="Minimize" onClick={() => window.api.minimizeWindow()}>
            <Minus className="size-3.5" strokeWidth={1.75} />
          </WindowButton>
          <WindowButton label="Maximize" onClick={() => window.api.toggleMaximizeWindow()}>
            <Square className="size-3" strokeWidth={1.75} />
          </WindowButton>
          <WindowButton label="Close" onClick={() => window.api.closeWindow()} close>
            <X className="size-3.5" strokeWidth={1.75} />
          </WindowButton>
        </div>
      )}
    </header>
  )
}

function WindowButton({
  label,
  onClick,
  close,
  children
}: {
  label: string
  onClick: () => void
  close?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-full w-11 items-center justify-center text-foreground/70 transition-colors hover:bg-black/[0.06] ${
        close ? 'hover:bg-[#e81123] hover:text-white' : ''
      }`}
    >
      {children}
    </button>
  )
}
