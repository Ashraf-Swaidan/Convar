import { getErrorHint, type AppError } from '@/lib/errorHints'

type AppErrorDisplayProps = {
  error: AppError
}

export function AppErrorDisplay({ error }: AppErrorDisplayProps): React.JSX.Element {
  const { title, hint } = getErrorHint(error.code)

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
    >
      <p className="font-medium text-destructive">{title}</p>
      <p className="mt-0.5 text-foreground">{error.message}</p>
      {hint !== undefined && hint !== error.message && (
        <p className="mt-1.5 text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
