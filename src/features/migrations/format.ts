import type { Status, Summary } from './model'

export const day = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
export const dayTime = (date: string) =>
  new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC'
export const number = (value: number) => value.toLocaleString('en-US')
export const percent = (part: number, total: number) =>
  total === 0 ? '—' : `${((part / total) * 100).toFixed(1)}%`
export const short = (path: string) => path.replace(/^src\/main\/webapp\//, '')
export const hits = (t: { classHits: number; styleHits: number }) =>
  t.classHits + t.styleHits

export const statusLabel: Record<Status, string> = {
  locked: 'Locked',
  clean: 'Bootstrap-free, unlocked',
  dirty: 'Bootstrap',
}

// Velocity over the four weeks before the snapshot, from every integrated commit.
export function velocity(series: Summary[], snapshot: Summary) {
  const end = Date.parse(snapshot.date)
  const start = series.find((s) => Date.parse(s.date) >= end - 28 * 86_400_000)
  if (
    !start ||
    start === snapshot ||
    Date.parse(start.date) > end - 21 * 86_400_000
  )
    return undefined
  const weeks = (end - Date.parse(start.date)) / (7 * 86_400_000)
  return (hits(snapshot.totals) - hits(start.totals)) / weeks
}
