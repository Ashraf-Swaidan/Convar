import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function App(): React.JSX.Element {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)

  const handleSelectFile = (): void => {
    // Step 3: replace with Electron file dialog via IPC
    setSelectedFilePath('C:\\Users\\example\\sample.png')
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Convar</h1>
        <p className="text-sm text-muted-foreground">Convert PNG to WebP locally.</p>

        <Button type="button" onClick={handleSelectFile}>
          Select File
        </Button>

        <Textarea
          readOnly
          placeholder="No file selected"
          value={selectedFilePath ?? ''}
          rows={3}
          className="resize-none"
        />

        <Button type="button" disabled={!selectedFilePath}>
          Convert
        </Button>
      </div>
    </div>
  )
}

export default App
