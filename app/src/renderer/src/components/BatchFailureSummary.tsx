import { groupBatchFailures, type AppErrorCode, type BatchFailure } from '@/lib/errorHints'

type BatchFailureSummaryProps = {
  failures: BatchFailure[]
  fileNameFromPath: (path: string) => string
}

export function BatchFailureSummary({
  failures,
  fileNameFromPath
}: BatchFailureSummaryProps): React.JSX.Element {
  const groups = groupBatchFailures(failures, fileNameFromPath)

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div
          key={group.code}
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
        >
          <p className="font-medium text-destructive">
            {group.title} ({group.files.length})
          </p>
          {group.hint !== undefined && (
            <p className="mt-1 text-muted-foreground">{group.hint}</p>
          )}
          <ul className="mt-2 space-y-0.5 text-foreground">
            {group.files.map((file) => (
              <li key={file.fileName} className="truncate">
                {file.fileName}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export type { AppErrorCode, BatchFailure }
