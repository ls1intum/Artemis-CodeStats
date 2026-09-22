import type { DtoViolationsReport } from '../../report/types'
import summaries from '../generated/dto-summaries.json'

const detailUrls = import.meta.glob<string>(
  '/data/server/dtoViolations/*.json',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
)

export const dtoViolationReports: (DtoViolationsReport & {
  filename: string
})[] = summaries
  .map((report) => ({
    ...report,
    dtoViolations: {
      totals: report.dtoViolations.totals,
      modules: Object.fromEntries(Object.entries(report.dtoViolations.modules)),
    },
    metadata: {
      ...report.metadata,
      artemis: {
        ...report.metadata.artemis,
        commitDate: new Date(report.metadata.artemis.commitDate),
      },
    },
  }))
  .sort(
    (a, b) =>
      a.metadata.artemis.commitDate.getTime() -
      b.metadata.artemis.commitDate.getTime(),
  )

export async function loadDtoReport(
  index: number | undefined,
  signal: AbortSignal,
) {
  const selectedIndex =
    index !== undefined && index >= 0 && index < dtoViolationReports.length
      ? index
      : Math.max(0, dtoViolationReports.length - 1)
  const summary = dtoViolationReports[selectedIndex]
  if (!summary) return { selectedIndex, report: undefined }
  const response = await fetch(
    detailUrls[`/data/server/dtoViolations/${summary.filename}`],
    { signal },
  )
  if (!response.ok)
    throw new Error(`DTO archive report unavailable (HTTP ${response.status})`)
  const report: DtoViolationsReport = await response.json()
  if (
    report.metadata.artemis.commitHash !== summary.metadata.artemis.commitHash
  ) {
    throw new Error('DTO archive report does not match its summary')
  }
  return { selectedIndex, report: { ...report, metadata: summary.metadata } }
}
