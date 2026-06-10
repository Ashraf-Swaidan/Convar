import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AppErrorDisplay } from '@/components/AppErrorDisplay'
import { AppFooter } from '@/components/AppFooter'
import { AssetList } from '@/components/AssetList'
import { BatchFailureSummary, type BatchFailure } from '@/components/BatchFailureSummary'
import { ConversionHistory } from '@/components/ConversionHistory'
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
import {
  clearLegacyConversionHistory,
  loadLegacyConversionHistory,
  type ConversionHistoryEntry
} from '@/lib/conversionHistory'
import { outputFormatHints, supportedInputSummary } from '@/lib/formatHints'
import { HEIC_PREVIEW_PLACEHOLDER, isHeicPath } from '@/lib/heicPreview'
import { PDF_PREVIEW_PLACEHOLDER, isPdfPath } from '@/lib/pdfPreview'
import {
  DNG_PREVIEW_PLACEHOLDER,
  isDngPath,
  isPsdPath,
  isRawPath,
  PSD_PREVIEW_PLACEHOLDER,
  RAW_PREVIEW_PLACEHOLDER
} from '@/lib/proPreview'
import { historyMetaForFile } from '@/lib/historyMeta'
import type { OutputFormat, OutputLayout } from '@/lib/formatTypes'
import {
  getRememberedOutputFolder,
  rememberOutputFolder
} from '@/lib/outputFolder'
import { getSaveNextToInput, setSaveNextToInput } from '@/lib/saveNextToInput'

type FormatOptions = {
  outputFormats: OutputFormat[]
  formatLabels: Record<string, string>
}

type CompatibleOutputs = {
  formats: OutputFormat[]
  blockedReason: string | null
}

type SelectedFile = {
  path: string
  fileName: string
  byteLength: number
  previewUrl?: string
}

type BatchFileResult =
  | { inputPath: string; ok: true; savedPath: string; outputByteLength: number; copied: boolean }
  | { inputPath: string; ok: false; error: string; code: AppErrorCode }

type BatchProgress = {
  current: number
  total: number
  fileName: string
}

const PREVIEW_LIMIT = 3
const isDev = import.meta.env.DEV

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
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('webp')
  const [compatibleOutputs, setCompatibleOutputs] = useState<CompatibleOutputs | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [statusByPath, setStatusByPath] = useState<Record<string, FileConversionStatus>>({})
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [assetListExpanded, setAssetListExpanded] = useState(false)
  const [batchOutputFolder, setBatchOutputFolder] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [saveNextToInput, setSaveNextToInputState] = useState(getSaveNextToInput)
  const [batchFailures, setBatchFailures] = useState<BatchFailure[]>([])
  const [historyEntries, setHistoryEntries] = useState<ConversionHistoryEntry[]>([])
  const [appVersion, setAppVersion] = useState('…')
  const [inputRoot, setInputRoot] = useState<string | null>(null)
  const [outputLayout, setOutputLayout] = useState<OutputLayout>('flat')
  const dragDepth = useRef(0)

  useEffect(() => {
    window.api.getFormatOptions().then(setFormatOptions)
    window.api.getAppVersion().then(setAppVersion)

    void (async () => {
      let entries = await window.api.loadConversionHistory()

      if (entries.length === 0) {
        const legacy = loadLegacyConversionHistory()
        if (legacy.length > 0) {
          entries = await window.api.replaceConversionHistory(legacy)
          clearLegacyConversionHistory()
        }
      }

      setHistoryEntries(entries)
    })()
  }, [])

  useEffect(() => {
    const paths = selectedFiles.map((file) => file.path)
    if (paths.length === 0) {
      setCompatibleOutputs(null)
      return
    }

    void window.api.getCompatibleOutputFormats(paths).then(setCompatibleOutputs)
  }, [selectedFiles])

  useEffect(() => {
    if (!compatibleOutputs || compatibleOutputs.formats.length === 0) return

    setOutputFormat((current) =>
      compatibleOutputs.formats.includes(current) ? current : compatibleOutputs.formats[0]
    )
  }, [compatibleOutputs])

  const visibleOutputFormats =
    compatibleOutputs?.formats ?? formatOptions?.outputFormats ?? []

  const clearFileState = (): void => {
    setSelectedFiles([])
    setInputRoot(null)
  }

  const clearResultState = (): void => {
    setStatusByPath({})
    setBatchProgress(null)
    setError(null)
    setAssetListExpanded(false)
    setBatchOutputFolder(null)
    setBatchFailures([])
  }

  const handleClearFiles = (): void => {
    clearFileState()
    clearResultState()
  }

  const handleRemoveFile = (path: string): void => {
    const nextFiles = selectedFiles.filter((file) => file.path !== path)
    setSelectedFiles(nextFiles)
    setStatusByPath((prev) => {
      const { [path]: _, ...rest } = prev
      return rest
    })

    if (nextFiles.length === 0) {
      clearResultState()
    }
  }

  const handleSaveNextToInputChange = (checked: boolean): void => {
    setSaveNextToInputState(checked)
    setSaveNextToInput(checked)
  }

  const recordHistory = async (
    inputPath: string,
    outputPath: string,
    outputByteLength: number
  ): Promise<void> => {
    if (!formatOptions) return

    const meta = historyMetaForFile(inputPath, outputFormat, formatOptions.formatLabels)
    const entries = await window.api.appendConversionHistory({
      inputPath,
      outputPath,
      conversionId: meta.conversionId,
      conversionLabel: meta.conversionLabel,
      outputByteLength
    })
    setHistoryEntries(entries)
  }

  const handleClearHistory = async (): Promise<void> => {
    await window.api.clearConversionHistory()
    setHistoryEntries([])
  }

  const handleOpenHistoryOutput = async (path: string): Promise<void> => {
    const result = await window.api.openPath(path)
    if (!result.ok) toast.error(result.error)
  }

  const handleRevealHistoryOutput = async (path: string): Promise<void> => {
    const result = await window.api.showItemInFolder(path)
    if (!result.ok) toast.error(result.error)
  }

  const handleOutputFormatChange = (value: OutputFormat): void => {
    setOutputFormat(value)
    clearResultState()
  }

  const loadPreviews = async (files: SelectedFile[]): Promise<SelectedFile[]> => {
    const next = [...files]

    for (let index = 0; index < Math.min(next.length, PREVIEW_LIMIT); index++) {
      const file = next[index]
      if (file.previewUrl) continue

      if (isHeicPath(file.path)) {
        next[index] = { ...next[index], previewUrl: HEIC_PREVIEW_PLACEHOLDER }
        continue
      }

      if (isPdfPath(file.path)) {
        next[index] = { ...next[index], previewUrl: PDF_PREVIEW_PLACEHOLDER }
        continue
      }

      if (isDngPath(file.path)) {
        next[index] = { ...next[index], previewUrl: DNG_PREVIEW_PLACEHOLDER }
        continue
      }

      if (isRawPath(file.path)) {
        next[index] = { ...next[index], previewUrl: RAW_PREVIEW_PLACEHOLDER }
        continue
      }

      if (isPsdPath(file.path)) {
        next[index] = { ...next[index], previewUrl: PSD_PREVIEW_PLACEHOLDER }
        continue
      }

      const previewResult = await window.api.getFilePreview(file.path)
      if (previewResult.ok) {
        next[index] = {
          ...next[index],
          fileName: previewResult.fileName,
          previewUrl: previewResult.dataUrl
        }
      }
    }

    return next
  }

  const notifySkippedFiles = (skippedIngest: number, skippedInvalid: number): void => {
    if (skippedIngest > 0) {
      toast.warning(
        skippedIngest === 1
          ? 'Skipped 1 unsupported path'
          : `Skipped ${skippedIngest} unsupported paths`
      )
    }
    if (skippedInvalid > 0) {
      toast.warning(
        skippedInvalid === 1
          ? 'Skipped 1 file — wrong format'
          : `Skipped ${skippedInvalid} files — wrong format`
      )
    }
  }

  const loadSelectedFiles = async (
    filePaths: string[],
    mode: 'replace' | 'append' = 'replace'
  ): Promise<{ ok: true; skippedInvalid: number } | { ok: false }> => {
    const newPaths = filePaths.filter(
      (path) => mode === 'replace' || !selectedFiles.some((file) => file.path === path)
    )

    if (newPaths.length === 0) {
      if (mode === 'append' && filePaths.length > 0) {
        toast.message('Files already in list')
      }
      return { ok: true, skippedInvalid: 0 }
    }

    const files: SelectedFile[] = mode === 'append' ? [...selectedFiles] : []
    let skippedInvalid = 0

    for (const filePath of newPaths) {
      const readResult = await window.api.readFile(filePath)
      if (!readResult.ok) {
        if (mode === 'append') {
          skippedInvalid += 1
          continue
        }

        clearFileState()
        setError({ code: readResult.code, message: readResult.error })
        return { ok: false }
      }

      files.push({
        path: filePath,
        fileName: fileNameFromPath(filePath),
        byteLength: readResult.byteLength
      })
    }

    if (files.length === 0) {
      setError(appError('invalid_input', 'No supported image files were added.'))
      return { ok: false }
    }

    setSelectedFiles(await loadPreviews(files))
    return { ok: true, skippedInvalid }
  }

  const addPaths = async (paths: string[]): Promise<boolean> => {
    if (paths.length === 0) {
      toast.error('No files to add.')
      return false
    }

    const expanded = await window.api.expandIngestPaths(paths)
    if (expanded.files.length === 0) {
      toast.error('No supported images found.')
      return false
    }

    clearResultState()

    if (expanded.inputRoot) {
      setInputRoot(expanded.inputRoot)
    }

    const mode = selectedFiles.length === 0 ? 'replace' : 'append'
    const result = await loadSelectedFiles(expanded.files, mode)

    if (!result.ok) return false

    notifySkippedFiles(expanded.skipped, result.skippedInvalid)

    if (expanded.files.length > paths.length) {
      toast.message(`${expanded.files.length} images added from folder`)
    }

    return true
  }

  const handleSelectFiles = async (): Promise<void> => {
    const filePaths = await window.api.selectFiles()
    if (!filePaths || filePaths.length === 0) return

    await addPaths(filePaths)
  }

  const handleSelectFolder = async (): Promise<void> => {
    const folderPath = await window.api.selectInputFolder()
    if (!folderPath) return

    await addPaths([folderPath])
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

    await addPaths(filePaths)
  }

  const notifyBatchComplete = (results: BatchFileResult[]): void => {
    const { success, failed } = countStatuses(buildStatusMapFromBatch(results))
    const copied = results.filter((r) => r.ok && r.copied).length
    const converted = success - copied

    if (failed === 0) {
      if (copied > 0 && converted === 0) {
        toast.success(`${copied} file${copied === 1 ? '' : 's'} copied`)
      } else if (copied > 0) {
        toast.success(`${converted} converted, ${copied} copied`)
      } else {
        toast.success(`${success} file${success === 1 ? '' : 's'} converted`)
      }
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
        const result = await window.api.convertAndSave(file.path, outputFormat, {
          saveNextToInput
        })

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
        await recordHistory(file.path, result.savedPath, result.outputByteLength)
        toast.success(result.copied ? `Copied ${file.fileName}` : `Saved ${file.fileName}`, {
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
      const batchLayout: OutputLayout =
        outputLayout === 'mirror' && inputRoot ? 'mirror' : 'flat'

      const result = await window.api.convertAndSaveBatch(
        selectedFiles.map((file) => file.path),
        outputDir,
        outputFormat,
        { layout: batchLayout, inputRoot }
      )
      stopProgress()

      if (!result.ok) {
        setError({ code: result.code, message: result.error })
        toast.error(result.error)
        return
      }

      setStatusByPath(buildStatusMapFromBatch(result.results))
      setBatchFailures(
        result.results
          .filter((entry): entry is Extract<BatchFileResult, { ok: false }> => !entry.ok)
          .map((entry) => ({
            inputPath: entry.inputPath,
            error: entry.error,
            code: entry.code
          }))
      )
      setAssetListExpanded(true)
      setBatchOutputFolder(outputDir)
      for (const entry of result.results) {
        if (entry.ok) {
          await recordHistory(entry.inputPath, entry.savedPath, entry.outputByteLength)
        }
      }
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
        outputByteLength: file.byteLength,
        copied: false
      }
    })

    setStatusByPath(buildStatusMapFromBatch(results))
    setBatchFailures(
      results
        .filter((entry): entry is Extract<BatchFileResult, { ok: false }> => !entry.ok)
        .map((entry) => ({
          inputPath: entry.inputPath,
          error: entry.error,
          code: entry.code
        }))
    )
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
    <main className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-8">
      <div className="flex w-full max-w-md flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Output format
          </h2>
          <div className="flex flex-col gap-1.5">
            <Select
              value={visibleOutputFormats.includes(outputFormat) ? outputFormat : undefined}
              onValueChange={handleOutputFormatChange}
              disabled={isConverting || visibleOutputFormats.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No compatible output" />
              </SelectTrigger>
              <SelectContent>
                {visibleOutputFormats.map((format) => (
                  <SelectItem key={format} value={format}>
                    {formatOptions.formatLabels[format]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {compatibleOutputs?.blockedReason ? (
              <p className="text-[11px] leading-snug text-destructive">{compatibleOutputs.blockedReason}</p>
            ) : (
              <p className="text-[11px] leading-snug text-muted-foreground">
                {visibleOutputFormats.includes(outputFormat)
                  ? outputFormatHints[outputFormat]
                  : 'Choose files to see compatible outputs'}{' '}
                · {supportedInputSummary}
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Files
            </h2>
            <div className="flex items-center gap-3">
              {selectedFiles.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}
                </span>
              )}
              {selectedFiles.length > 0 && (
                <button
                  type="button"
                  disabled={isConverting}
                  onClick={handleClearFiles}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="px-1">
            <FilePreviewCollage
              files={selectedFiles}
              totalCount={selectedFiles.length}
              statusByPath={statusByPath}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleSelectFiles}
              disabled={isConverting}
            >
              Select Files
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleSelectFolder}
              disabled={isConverting}
            >
              Select Folder
            </Button>
          </div>

          <AssetList
            files={selectedFiles}
            formatFileSize={formatFileSize}
            statusByPath={statusByPath}
            autoExpand={assetListExpanded}
            onRemoveFile={handleRemoveFile}
            removeDisabled={isConverting}
          />
        </section>

        <section className="flex flex-col gap-3">
          {batchProgress !== null && (
            <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/25 px-3 py-3">
              <p className="text-sm text-foreground/90">
                Converting {batchProgress.current} of {batchProgress.total}
              </p>
              <p className="truncate text-xs text-muted-foreground">{batchProgress.fileName}</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {selectedFiles.length === 1 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={saveNextToInput}
                disabled={isConverting}
                onChange={(event) => handleSaveNextToInputChange(event.target.checked)}
                className="size-3.5 rounded border-border accent-primary"
              />
              Save next to original file
            </label>
          )}

          {selectedFiles.length > 1 && (
            <fieldset className="flex flex-col gap-2" disabled={isConverting}>
              <legend className="text-xs text-muted-foreground">Output layout</legend>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <label className="flex cursor-pointer items-center gap-2 select-none">
                  <input
                    type="radio"
                    name="output-layout"
                    checked={outputLayout === 'flat'}
                    onChange={() => setOutputLayout('flat')}
                    className="size-3.5 accent-primary"
                  />
                  Flat — all files in one folder
                </label>
                <label
                  className={`flex items-center gap-2 select-none ${inputRoot ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                >
                  <input
                    type="radio"
                    name="output-layout"
                    checked={outputLayout === 'mirror'}
                    disabled={!inputRoot}
                    onChange={() => setOutputLayout('mirror')}
                    className="size-3.5 accent-primary"
                  />
                  Mirror — keep subfolder structure
                </label>
              </div>
              {outputLayout === 'mirror' && inputRoot && (
                <p className="text-[11px] text-muted-foreground">
                  Relative to {fileNameFromPath(inputRoot)}
                </p>
              )}
            </fieldset>
          )}

          <Button
            type="button"
            size="lg"
            disabled={
              selectedFiles.length === 0 ||
              isConverting ||
              visibleOutputFormats.length === 0
            }
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

          {batchFailures.length > 0 && (
            <BatchFailureSummary failures={batchFailures} fileNameFromPath={fileNameFromPath} />
          )}

          {error !== null && <AppErrorDisplay error={error} />}

          <ConversionHistory
            entries={historyEntries}
            formatFileSize={formatFileSize}
            onOpenOutput={handleOpenHistoryOutput}
            onRevealOutput={handleRevealHistoryOutput}
            onClear={handleClearHistory}
          />

          {isDev && selectedFiles.length > 1 && (
            <button
              type="button"
              onClick={handleDevMockMixedResults}
              className="text-center text-[11px] text-muted-foreground/70 underline-offset-2 hover:text-muted-foreground hover:underline"
            >
              Dev: preview mixed results UI
            </button>
          )}
        </section>
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
        <AppFooter version={appVersion} />
        </div>
      </div>
  )
}

export default App
