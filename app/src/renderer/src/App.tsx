import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

type InputFormat = 'png' | 'jpg'
type OutputFormat = 'webp' | 'jpg' | 'png'
type ConversionId = 'png-webp' | 'png-jpg' | 'jpg-png'

const INPUT_FORMATS: InputFormat[] = ['png', 'jpg']

const OUTPUT_OPTIONS: Record<InputFormat, OutputFormat[]> = {
  png: ['webp', 'jpg'],
  jpg: ['png']
}

const FORMAT_LABELS: Record<InputFormat | OutputFormat, string> = {
  png: 'PNG',
  jpg: 'JPG',
  webp: 'WebP'
}

function toConversionId(input: InputFormat, output: OutputFormat): ConversionId {
  return `${input}-${output}` as ConversionId
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function App(): React.JSX.Element {
  const [inputFormat, setInputFormat] = useState<InputFormat>('png')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('webp')
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [convertedSize, setConvertedSize] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const outputOptions = OUTPUT_OPTIONS[inputFormat]
  const conversionId = toConversionId(inputFormat, outputFormat)

  const clearFileState = (): void => {
    setSelectedFilePath(null)
    setFileName(null)
    setPreviewUrl(null)
    setFileSize(null)
  }

  const clearResultState = (): void => {
    setSavedPath(null)
    setConvertedSize(null)
    setError(null)
  }

  const handleInputFormatChange = (value: InputFormat): void => {
    setInputFormat(value)
    const nextOutputs = OUTPUT_OPTIONS[value]
    if (!nextOutputs.includes(outputFormat)) {
      setOutputFormat(nextOutputs[0])
    }
    clearFileState()
    clearResultState()
  }

  const handleOutputFormatChange = (value: OutputFormat): void => {
    setOutputFormat(value)
    clearResultState()
  }

  const loadSelectedFile = async (filePath: string, id: ConversionId): Promise<boolean> => {
    const readResult = await window.api.readFile(filePath, id)
    if (!readResult.ok) {
      clearFileState()
      setError(readResult.error)
      return false
    }

    const previewResult = await window.api.getFilePreview(filePath, id)
    if (!previewResult.ok) {
      clearFileState()
      setError(previewResult.error)
      return false
    }

    setSelectedFilePath(filePath)
    setFileName(previewResult.fileName)
    setPreviewUrl(previewResult.dataUrl)
    setFileSize(readResult.byteLength)
    return true
  }

  const handleSelectFile = async (): Promise<void> => {
    clearResultState()

    const filePath = await window.api.selectFile(conversionId)
    if (!filePath) return

    await loadSelectedFile(filePath, conversionId)
  }

  const handleConvert = async (): Promise<void> => {
    clearResultState()

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
        <p className="text-sm text-muted-foreground">Choose input and output formats, then convert.</p>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Input</span>
            <Select value={inputFormat} onValueChange={handleInputFormatChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INPUT_FORMATS.map((format) => (
                  <SelectItem key={format} value={format}>
                    {FORMAT_LABELS[format]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="pb-2 text-sm text-muted-foreground">→</span>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Output</span>
            <Select value={outputFormat} onValueChange={handleOutputFormatChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {outputOptions.map((format) => (
                  <SelectItem key={format} value={format}>
                    {FORMAT_LABELS[format]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="button" onClick={handleSelectFile}>
          Select File
        </Button>

        {previewUrl !== null && fileName !== null ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <img
              src={previewUrl}
              alt={`Preview of ${fileName}`}
              className="max-h-40 w-full rounded-md object-contain"
            />
            <p className="truncate text-sm font-medium">{fileName}</p>
            {fileSize !== null && (
              <p className="text-sm text-muted-foreground">{formatFileSize(fileSize)}</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No file selected
          </div>
        )}

        <Button type="button" disabled={!selectedFilePath} onClick={handleConvert}>
          Convert
        </Button>

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
