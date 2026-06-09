type AppFooterProps = {
  version: string
}

export function AppFooter({ version }: AppFooterProps): React.JSX.Element {
  return (
    <footer className="shrink-0 border-t border-border/50 py-2 text-center text-[11px] text-muted-foreground/70">
      Convar {version}
    </footer>
  )
}
