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

export function appError(code: AppErrorCode, message: string): AppError {
  return { code, message }
}

export function fsErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const errno = (err as NodeJS.ErrnoException).code

    switch (errno) {
      case 'EACCES':
        return 'Permission denied. Check that you can access this file or folder.'
      case 'ENOSPC':
        return 'Disk is full. Free some space and try again.'
      case 'ENOENT':
        return 'File or folder not found. It may have been moved or deleted.'
      case 'EEXIST':
        return 'A file with that name already exists.'
      case 'EBUSY':
        return 'File is in use by another program. Close it and try again.'
      case 'EPERM':
        return 'Operation not permitted. Check folder permissions.'
    }
  }

  return fallback
}

export function toFailure(error: AppError): { ok: false; error: string; code: AppErrorCode } {
  return { ok: false, error: error.message, code: error.code }
}
