export type AppErrorCode =
  | 'unknown_conversion'
  | 'no_file'
  | 'no_files'
  | 'no_output_folder'
  | 'invalid_input'
  | 'read_failed'
  | 'conversion_failed'
  | 'save_failed'
  | 'preview_failed'

export type AppError = {
  code: AppErrorCode
  message: string
}

export type ErrorHint = {
  title: string
  hint?: string
}

export const errorHints: Record<AppErrorCode, ErrorHint> = {
  unknown_conversion: {
    title: 'Unknown conversion',
    hint: 'Try changing the input or output format.'
  },
  no_file: {
    title: 'No file selected',
    hint: 'Select a file before converting.'
  },
  no_files: {
    title: 'No files selected',
    hint: 'Select one or more files before converting.'
  },
  no_output_folder: {
    title: 'No output folder',
    hint: 'Choose a folder where converted files should be saved.'
  },
  invalid_input: {
    title: 'Wrong file type',
    hint: 'Pick a file that matches your selected input format.'
  },
  read_failed: {
    title: 'Could not read file',
    hint: 'The file may be missing, locked, or you may not have permission to open it.'
  },
  conversion_failed: {
    title: 'Conversion failed',
    hint: 'The file may be corrupt or not a valid image for this conversion.'
  },
  save_failed: {
    title: 'Could not save',
    hint: 'Check folder permissions, disk space, or choose a different location.'
  },
  preview_failed: {
    title: 'Preview unavailable',
    hint: 'The file could not be previewed, but conversion may still work.'
  }
}

export function getErrorHint(code: AppErrorCode): ErrorHint {
  return errorHints[code]
}

export function appError(code: AppErrorCode, message: string): AppError {
  return { code, message }
}

export type BatchFailure = {
  inputPath: string
  error: string
  code: AppErrorCode
}

export type BatchFailureGroup = {
  code: AppErrorCode
  title: string
  hint?: string
  files: Array<{ fileName: string; message: string }>
}

export function groupBatchFailures(
  failures: BatchFailure[],
  fileNameFromPath: (path: string) => string
): BatchFailureGroup[] {
  const byCode = new Map<AppErrorCode, BatchFailure[]>()

  for (const failure of failures) {
    const existing = byCode.get(failure.code) ?? []
    existing.push(failure)
    byCode.set(failure.code, existing)
  }

  return Array.from(byCode.entries()).map(([code, groupFailures]) => {
    const hint = getErrorHint(code)
    return {
      code,
      title: hint.title,
      hint: hint.hint,
      files: groupFailures.map((failure) => ({
        fileName: fileNameFromPath(failure.inputPath),
        message: failure.error
      }))
    }
  })
}
