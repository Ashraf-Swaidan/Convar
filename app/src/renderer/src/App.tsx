import { useEffect, useState } from 'react'
import { AppErrorDisplay } from '@/components/AppErrorDisplay'
import { BatchFailureSummary } from '@/components/BatchFailureSummary'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { appError, type AppError, type AppErrorCode, type BatchFailure } from '@/lib/errorHints'

type InputFormat = 'png' | 'jpg'
type OutputFormat = 'webp' | 'jpg' | 'png'
type ConversionId = 'png-webp' | 'png-jpg' | 'jpg-png'

type FormatOptions = {
  inputFormats: InputFormat[]
  outputOptionsByInput: Record<InputFormat, OutputFormat[]>
  formatLabels: Record<InputFormat | OutputFormat, string>
}

type SelectedFile = {
  path: string
  fileName: string
  byteLength: number
  previewUrl?: string
}

type BatchFileResult =
  | { inputPath: string; ok: true; savedPath: string; outputByteLength: number }
  | { inputPath: string; ok: false; error: string; code: AppErrorCode }

type BatchProgress = {
  current: number
  total: number
  fileName: string
}

function toConversionId(input: InputFormat, output: OutputFormat): ConversionId {
  return `${input}-${output}` as ConversionId
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileNameFromPath(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath
}

function App(): React.JSX.Element {
  const [formatOptions, setFormatOptions] = useState<FormatOptions | null>(null)
  const [inputFormat, setInputFormat] = useState<InputFormat>('png')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('webp')
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [convertedSize, setConvertedSize] = useState<number | null>(null)
  const [batchResults, setBatchResults] = useState<BatchFileResult[] | null>(null)
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<AppError | null>(null)

  useEffect(() => {
    window.api.getFormatOptions().then(setFormatOptions)
  }, [])

  const outputOptions = formatOptions?.outputOptionsByInput[inputFormat] ?? []
  const conversionId = toConversionId(inputFormat, outputFormat)

  const clearFileState = (): void => {
    setSelectedFiles([])
  }

  const clearResultState = (): void => {
    setSavedPath(null)
    setConvertedSize(null)
    setBatchResults(null)
    setBatchProgress(null)
    setError(null)
  }

  const handleInputFormatChange = (value: InputFormat): void => {
    if (!formatOptions) return

    setInputFormat(value)
    const nextOutputs = formatOptions.outputOptionsByInput[value]
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

  const loadSelectedFiles = async (filePaths: string[], id: ConversionId): Promise<boolean> => {
    const files: SelectedFile[] = []

    for (const filePath of filePaths) {
      const readResult = await window.api.readFile(filePath, id)
      if (!readResult.ok) {
        clearFileState()
        setError({ code: readResult.code, message: readResult.error })
        return false
      }

      files.push({
        path: filePath,
        fileName: fileNameFromPath(filePath),
        byteLength: readResult.byteLength
      })
    }

    if (files.length > 0) {
      const previewResult = await window.api.getFilePreview(files[0].path, id)
      if (previewResult.ok) {
        files[0] = {
          ...files[0],
          fileName: previewResult.fileName,
          previewUrl: previewResult.dataUrl
        }
      }
    }

    setSelectedFiles(files)
    return true
  }

  const handleSelectFiles = async (): Promise<void> => {
    clearResultState()

    const filePaths = await window.api.selectFiles(conversionId)
    if (!filePaths || filePaths.length === 0) return

    await loadSelectedFiles(filePaths, conversionId)
  }

  const handleConvert = async (): Promise<void> => {
    clearResultState()

    if (selectedFiles.length === 0) {
      setError(appError('no_files', 'No files selected.'))
      return
    }

    setIsConverting(true)

    try {
      if (selectedFiles.length === 1) {
        const result = await window.api.convertAndSave(selectedFiles[0].path, conversionId)

        if ('canceled' in result) return

        if (!result.ok) {
          setError({ code: result.code, message: result.error })
          return
        }

        setSavedPath(result.savedPath)
        setConvertedSize(result.outputByteLength)
        return
      }

      const outputDir = await window.api.selectOutputFolder()
      if (!outputDir) return

      const stopProgress = window.api.onBatchProgress(setBatchProgress)
      const result = await window.api.convertAndSaveBatch(
        selectedFiles.map((file) => file.path),
        outputDir,
        conversionId
      )
      stopProgress()

      if (!result.ok) {
        setError({ code: result.code, message: result.error })
        return
      }

      setBatchResults(result.results)
    } finally {
      setIsConverting(false)
      setBatchProgress(null)
    }
  }

  if (!formatOptions) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const firstPreview = selectedFiles.find((file) => file.previewUrl)?.previewUrl ?? null
  const succeededCount = batchResults?.filter((result) => result.ok).length ?? 0
  const failedResults: BatchFailure[] =
    batchResults?.filter((result): result is Extract<BatchFileResult, { ok: false }> => !result.ok) ??
    []

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Convar</h1>
        <p className="text-sm text-muted-foreground">
          Choose formats, select one or more files, then convert.
        </p>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Input</span>
            <Select value={inputFormat} onValueChange={handleInputFormatChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.inputFormats.map((format) => (
                  <SelectItem key={format} value={format}>
                    {formatOptions.formatLabels[format]}
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
                    {formatOptions.formatLabels[format]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="button" onClick={handleSelectFiles} disabled={isConverting}>
          Select Files
        </Button>

        {selectedFiles.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            {firstPreview !== null && (
              <img
                src={firstPreview}
                alt={`Preview of ${selectedFiles[0].fileName}`}
                className="max-h-40 w-full rounded-md object-contain"
              />
            )}
            <p className="text-sm font-medium">
              {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} selected
            </p>
            <ul className="max-h-32 space-y-1 overflow-y-auto text-sm text-muted-foreground">
              {selectedFiles.map((file) => (
                <li key={file.path} className="truncate">
                  {file.fileName} · {formatFileSize(file.byteLength)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No files selected
          </div>
        )}

        {batchProgress !== null && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Converting {batchProgress.current} of {batchProgress.total}: {batchProgress.fileName}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Button
          type="button"
          disabled={selectedFiles.length === 0 || isConverting}
          onClick={handleConvert}
        >
          {isConverting
            ? 'Converting…'
            : selectedFiles.length > 1
              ? `Convert ${selectedFiles.length} files`
              : 'Convert'}
        </Button>

        {error !== null && <AppErrorDisplay error={error} />}

        {savedPath !== null && convertedSize !== null && (
          <p className="text-sm text-muted-foreground">
            Saved {formatFileSize(convertedSize)} to: {savedPath}
          </p>
        )}

        {batchResults !== null && (
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-muted-foreground">
              Batch complete: {succeededCount} succeeded, {failedResults.length} failed
            </p>
            {failedResults.length > 0 && (
              <BatchFailureSummary failures={failedResults} fileNameFromPath={fileNameFromPath} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
