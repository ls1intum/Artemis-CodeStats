import {
  unitPath,
  type Stage,
  type Status,
  type Summary,
  type Unit,
} from './model'

type Hits = { classHits: number; styleHits: number }
type Progress = Pick<Record<Status, number>, 'locked' | 'clean'>

export const hits = (t: Hits) => t.classHits + t.styleHits
export const free = (t: Progress) => t.locked + t.clean
export const number = (value: number) => value.toLocaleString('en-US')
export const percent = (part: number, total: number) =>
  total === 0
    ? '—'
    : (part / total).toLocaleString('en-US', {
        style: 'percent',
        maximumFractionDigits: 1,
      })
export const day = (date: string, year = false) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(year && { year: 'numeric' }),
    timeZone: 'UTC',
  })
export const dayTime = (date: string) =>
  new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }) + ' UTC'
export const unitFile = (unit: Pick<Unit, 'id' | 'template'>) =>
  unit.template ?? unitPath(unit.id)

export const stageLabel: Record<Stage, string> = {
  modern: 'Legacy-free',
  components: 'PrimeNG or ng-bootstrap remain',
  bootstrap: 'Bootstrap',
}
export const statusLabel: Record<Status, string> = {
  locked: 'Locked',
  clean: 'Bootstrap-free, unlocked',
  dirty: 'Bootstrap',
}

// Hits per week between the first commit inside the window and the snapshot. Steps where the
// Bootstrap rule itself changed are left out: they change what counts, not the client.
export function velocity(series: Summary[], snapshot: Summary, days: number) {
  const end = Date.parse(snapshot.date)
  const from = series.findIndex(
    (s) => Date.parse(s.date) >= end - days * 86_400_000,
  )
  const to = series.findIndex((s) => s.commit === snapshot.commit)
  if (from < 0) return undefined
  const start = series[from]
  const weeks = (end - Date.parse(start.date)) / (7 * 86_400_000)
  if (weeks < 1) return undefined
  const steps = to < 0 ? series.slice(from) : series.slice(from, to + 1)
  let change = 0
  for (let i = 1; i < steps.length; i++)
    if (steps[i].rule === steps[i - 1].rule)
      change += hits(steps[i].totals) - hits(steps[i - 1].totals)
  return { perWeek: change / weeks, weeks }
}
