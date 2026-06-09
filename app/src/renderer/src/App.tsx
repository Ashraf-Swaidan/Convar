import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AppErrorDisplay } from '@/components/AppErrorDisplay'
import { AssetList } from '@/components/AssetList'
import { DropOverlay } from '@/components/DropOverlay'
import { FilePreviewCollage } from '@/components/FilePreviewCollage'
import { TitleBar } from '@/components/TitleBar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { appError, type AppError, type AppErrorCode } from '@/lib/errorHints'
import {
  buildStatusMapFromBatch,
  countStatuses,
  type FileConversionStatus
} from '@/lib/conversionStatus'
import { resolveDroppedPaths } from '@/lib/detectInputFormat'
import type { ConversionId, InputFormat, OutputFormat } from '@/lib/formatTypes'
import {
  getRememberedOutputFolder,
  rememberOutputFolder
} from '@/lib/outputFolder'

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

const PREVIEW_LIMIT = 3
const isDev = import.meta.env.DEV

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
  const [statusByPath, setStatusByPath] = useState<Record<string, FileConversionStatus>>({})
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [assetListExpanded, setAssetListExpanded] = useState(false)
  const [batchOutputFolder, setBatchOutputFolder] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragDepth = useRef(0)

  useEffect(() => {
    window.api.getFormatOptions().then(setFormatOptions)
  }, [])

  const outputOptions = formatOptions?.outputOptionsByInput[inputFormat] ?? []
  const conversionId = toConversionId(inputFormat, outputFormat)

  const clearFileState = (): void => {
    setSelectedFiles([])
  }

  const clearResultState = (): void => {
    setStatusByPath({})
    setBatchProgress(null)
    setError(null)
    setAssetListExpanded(false)
    setBatchOutputFolder(null)
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

  const loadPreviews = async (files: SelectedFile[], id: ConversionId): Promise<SelectedFile[]> => {
    const next = [...files]

    await Promise.all(
      next.slice(0, PREVIEW_LIMIT).map(async (file, index) => {
        if (file.previewUrl) return

        const previewResult = await window.api.getFilePreview(file.path, id)
        if (previewResult.ok) {
          next[index] = {
            ...next[index],
            fileName: previewResult.fileName,
            previewUrl: previewResult.dataUrl
          }
        }
      })
    )

    return next
  }

  const loadSelectedFiles = async (filePaths: string[], id: ConversionId): Promise<boolean> => {
    if (filePaths.length === 0) return true

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

    setSelectedFiles(await loadPreviews(files, id))
    return true
  }

  const handleSelectFiles = async (): Promise<void> => {
    clearResultState()

    const filePaths = await window.api.selectFiles(conversionId)
    if (!filePaths || filePaths.length === 0) return

    await loadSelectedFiles(filePaths, conversionId)
  }

  const handleDragEnter = (event: React.DragEvent): void => {
    event.preventDefault()
    if (isConverting) return

    dragDepth.current += 1
    if (dragDepth.current === 1) setIsDragOver(true)
  }

  const handleDragOver = (event: React.DragEvent): void => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDragLeave = (event: React.DragEvent): void => {
    event.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setIsDragOver(false)
    }
  }

  const handleDrop = async (event: React.DragEvent): Promise<void> => {
    event.preventDefault()
    dragDepth.current = 0
    setIsDragOver(false)

    if (isConverting || !formatOptions) return

    const filePaths = Array.from(event.dataTransfer.files).map((file) =>
      window.api.getPathForFile(file)
    )

    if (filePaths.length === 0) return

    const resolved = resolveDroppedPaths(filePaths)
    if (!resolved.ok) {
      toast.error(resolved.message)
      return
    }

    const nextInput = resolved.inputFormat
    const nextOutputs = formatOptions.outputOptionsByInput[nextInput]
    const nextOutput = nextOutputs.includes(outputFormat) ? outputFormat : nextOutputs[0]
    const nextConversionId = toConversionId(nextInput, nextOutput)

    clearFileState()
    clearResultState()
    setInputFormat(nextInput)
    setOutputFormat(nextOutput)
    await loadSelectedFiles(resolved.paths, nextConversionId)
  }

  const notifyBatchComplete = (results: BatchFileResult[]): void => {
    const { success, failed } = countStatuses(buildStatusMapFromBatch(results))

    if (failed === 0) {
      toast.success(`${success} file${success === 1 ? '' : 's'} converted`)
      return
    }

    if (success === 0) {
      toast.error(`All ${failed} file${failed === 1 ? '' : 's'} failed`)
      return
    }

    toast.warning(`${success} succeeded, ${failed} failed`)
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
        const file = selectedFiles[0]
        const result = await window.api.convertAndSave(file.path, conversionId)

        if ('canceled' in result) return

        if (!result.ok) {
          setError({ code: result.code, message: result.error })
          setStatusByPath({
            [file.path]: { state: 'failed', error: result.error, code: result.code }
          })
          setAssetListExpanded(true)
          toast.error('Conversion failed')
          return
        }

        setStatusByPath({ [file.path]: { state: 'success' } })
        toast.success(`Saved ${file.fileName}`, {
          description: formatFileSize(result.outputByteLength)
        })
        return
      }

      const outputDir = await window.api.selectOutputFolder(
        getRememberedOutputFolder() ?? undefined
      )
      if (!outputDir) return

      rememberOutputFolder(outputDir)

      const stopProgress = window.api.onBatchProgress(setBatchProgress)
      const result = await window.api.convertAndSaveBatch(
        selectedFiles.map((file) => file.path),
        outputDir,
        conversionId
      )
      stopProgress()

      if (!result.ok) {
        setError({ code: result.code, message: result.error })
        toast.error(result.error)
        return
      }

      setStatusByPath(buildStatusMapFromBatch(result.results))
      setAssetListExpanded(true)
      setBatchOutputFolder(outputDir)
      notifyBatchComplete(result.results)
    } finally {
      setIsConverting(false)
      setBatchProgress(null)
    }
  }

  const handleDevMockMixedResults = (): void => {
    if (selectedFiles.length === 0) return

    const results: BatchFileResult[] = selectedFiles.map((file, index) => {
      if (index === 0) {
        return {
          inputPath: file.path,
          ok: false as const,
          error: 'PNG → WebP conversion failed. The file may not be a valid PNG.',
          code: 'conversion_failed' as AppErrorCode
        }
      }
      return {
        inputPath: file.path,
        ok: true as const,
        savedPath: `C:\\output\\${file.fileName.replace(/\.[^.]+$/, '.webp')}`,
        outputByteLength: file.byteLength
      }
    })

    setStatusByPath(buildStatusMapFromBatch(results))
    setAssetListExpanded(true)
    notifyBatchComplete(results)
    toast.message('Dev preview: mixed batch results')
  }

  const successCount = Object.values(statusByPath).filter((s) => s.state === 'success').length
  const showOpenOutputFolder =
    batchOutputFolder !== null && successCount > 0 && selectedFiles.length > 1

  const handleOpenOutputFolder = async (): Promise<void> => {
    if (!batchOutputFolder) return

    const result = await window.api.openPath(batchOutputFolder)
    if (!result.ok) {
      toast.error(result.error)
    }
  }

  const content = !formatOptions ? (
    <div className="flex flex-1 items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  ) : (
    <main className="flex flex-1 flex-col items-center overflow-y-auto p-6">
      <div className="flex w-full max-w-lg flex-col gap-4 py-2">
        <p className="text-center text-sm text-muted-foreground">
          Choose formats, select or drop files, then convert.
        </p>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Input</span>
            <Select
              value={inputFormat}
              onValueChange={handleInputFormatChange}
              disabled={isConverting}
            >
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
            <Select
              value={outputFormat}
              onValueChange={handleOutputFormatChange}
              disabled={isConverting}
            >
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

        <FilePreviewCollage
          files={selectedFiles}
          totalCount={selectedFiles.length}
          statusByPath={statusByPath}
        />

        <AssetList
          files={selectedFiles}
          conversionId={conversionId}
          formatFileSize={formatFileSize}
          statusByPath={statusByPath}
          autoExpand={assetListExpanded}
        />

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

        {showOpenOutputFolder && (
          <Button type="button" variant="outline" onClick={handleOpenOutputFolder}>
            Open output folder
          </Button>
        )}

        {error !== null && <AppErrorDisplay error={error} />}

        {isDev && selectedFiles.length > 1 && (
          <button
            type="button"
            onClick={handleDevMockMixedResults}
            className="text-center text-[11px] text-muted-foreground/70 underline-offset-2 hover:text-muted-foreground hover:underline"
          >
            Dev: preview mixed results UI
          </button>
        )}
      </div>
    </main>
  )

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div
        className="relative flex min-h-0 flex-1 flex-col"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DropOverlay visible={isDragOver} />
        {content}
      </div>
    </div>
  )
}

export default App
