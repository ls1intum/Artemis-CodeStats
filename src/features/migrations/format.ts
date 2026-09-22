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

// Hits per week between the first commit inside the window and the snapshot.
export function velocity(series: Summary[], snapshot: Summary, days: number) {
  const end = Date.parse(snapshot.date)
  const start = series.find(
    (s) => Date.parse(s.date) >= end - days * 86_400_000,
  )
  if (!start) return undefined
  const weeks = (end - Date.parse(start.date)) / (7 * 86_400_000)
  if (weeks < 1) return undefined
  return {
    perWeek: (hits(snapshot.totals) - hits(start.totals)) / weeks,
    weeks,
  }
}
