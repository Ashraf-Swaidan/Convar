import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type InputFileType = 'png' | 'jpg'

type ConversionId = 'png-webp' | 'png-jpg' | 'jpg-png'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function App(): React.JSX.Element {
  const [inputType, setInputType] = useState<InputFileType | null>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [convertedSize, setConvertedSize] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelectFile = async (type: InputFileType): Promise<void> => {
    setError(null)
    setSavedPath(null)
    setConvertedSize(null)

    const filePath = await window.api.selectFile(type)
    if (!filePath) return

    const readResult = await window.api.readFile(filePath, type)
    if (!readResult.ok) {
      setInputType(null)
      setSelectedFilePath(null)
      setFileSize(null)
      setError(readResult.error)
      return
    }

    setInputType(type)
    setSelectedFilePath(filePath)
    setFileSize(readResult.byteLength)
  }

  const handleConvert = async (conversionId: ConversionId): Promise<void> => {
    setError(null)
    setSavedPath(null)
    setConvertedSize(null)

    if (!selectedFilePath) {
      setError('No file selected.')
      return
    }

    const result = await window.api.convertAndSave(selectedFilePath, conversionId)

    if ('canceled' in result) return

    if (!result.ok) {
      setError(result.error)
      return
    }

    setSavedPath(result.savedPath)
    setConvertedSize(result.outputByteLength)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Convar</h1>
        <p className="text-sm text-muted-foreground">
          Convert PNG ↔ JPG / WebP locally. (temporary multi-button UI)
        </p>

        <div className="flex gap-2">
          <Button type="button" onClick={() => handleSelectFile('png')}>
            Select PNG
          </Button>
          <Button type="button" variant="outline" onClick={() => handleSelectFile('jpg')}>
            Select JPG
          </Button>
        </div>

        <Textarea
          readOnly
          placeholder="No file selected"
          value={selectedFilePath ?? ''}
          rows={3}
          className="resize-none"
        />

        {fileSize !== null && inputType !== null && (
          <p className="text-sm text-muted-foreground">
            {inputType.toUpperCase()} file size: {formatFileSize(fileSize)}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={inputType !== 'png' || !selectedFilePath}
            onClick={() => handleConvert('png-webp')}
          >
            Convert to WebP
          </Button>
          <Button
            type="button"
            disabled={inputType !== 'png' || !selectedFilePath}
            onClick={() => handleConvert('png-jpg')}
          >
            Convert to JPG
          </Button>
          <Button
            type="button"
            disabled={inputType !== 'jpg' || !selectedFilePath}
            onClick={() => handleConvert('jpg-png')}
          >
            Convert to PNG
          </Button>
        </div>

        {error !== null && <p className="text-sm text-destructive">{error}</p>}

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
