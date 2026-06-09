import { Toaster as Sonner } from 'sonner'

export function Toaster(): React.JSX.Element {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-lg border border-border/80 bg-background text-foreground shadow-lg',
          title: 'text-sm font-medium',
          description: 'text-xs text-muted-foreground',
          closeButton: 'border-border/80 bg-background'
        }
      }}
    />
  )
}
