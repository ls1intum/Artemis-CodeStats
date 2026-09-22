import type { BaseReport } from '../../report/types'

export function processReportData<T extends BaseReport>(
  files: Record<string, unknown>,
): T[] {
  const data = Object.values(files).map((file) => {
    const reportData = file as { default: BaseReport }
    return {
      ...reportData.default,
      metadata: {
        type: reportData.default.metadata.type,
        artemis: {
          ...reportData.default.metadata.artemis,
          commitDate: new Date(reportData.default.metadata.artemis.commitDate),
        },
      },
    } as T
  })

  data.sort((a, b) => {
    return (
      a.metadata.artemis.commitDate.getTime() -
      b.metadata.artemis.commitDate.getTime()
    )
  })

  return data
}
