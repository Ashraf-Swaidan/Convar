import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function App(): React.JSX.Element {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [convertedSize, setConvertedSize] = useState<number | null>(null)

  const handleSelectFile = async (): Promise<void> => {
    const filePath = await window.api.selectFile()
    if (!filePath) return

    setSelectedFilePath(filePath)
    setSavedPath(null)
    setConvertedSize(null)

    const { byteLength } = await window.api.readFile(filePath)
    setFileSize(byteLength)
  }

  const handleConvert = async (): Promise<void> => {
    if (!selectedFilePath) return

    const result = await window.api.convertAndSaveWebp(selectedFilePath)
    if (result.canceled) return

    setSavedPath(result.savedPath)
    setConvertedSize(result.outputByteLength)
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

        {fileSize !== null && (
          <p className="text-sm text-muted-foreground">File size: {formatFileSize(fileSize)}</p>
        )}

        <Button type="button" disabled={!selectedFilePath} onClick={handleConvert}>
          Convert
        </Button>

        {savedPath !== null && convertedSize !== null && (
          <p className="text-sm text-muted-foreground">
            Saved {formatFileSize(convertedSize)} to: {savedPath}
          </p>
        )}
      </div>
    </div>
  )
}

export default App
