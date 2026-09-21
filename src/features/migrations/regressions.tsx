import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { sourceUrl, type Detail } from './model'
import { short } from './format'

const hits = (u: { classHits: number; styleHits: number }) =>
  u.classHits + u.styleHits

export function Regressions({
  detail,
  compare,
}: {
  detail: Detail
  compare: Detail
}) {
  const before = new Map(compare.units.map((u) => [u.id, u]))
  const rows = detail.units.flatMap((u) => {
    const previous = before.get(u.id)
    const grown = previous ? hits(u) - hits(previous) : hits(u)
    if (u.status === 'locked' && hits(u) > 0)
      return [
        {
          unit: u,
          note: `${hits(u)} Bootstrap hits inside a locked path, outside what the lint gate scans`,
        },
      ]
    if (grown > 0 && u.status !== 'locked')
      return [
        {
          unit: u,
          note: previous
            ? `+${grown} hits since comparison`
            : `new unit with ${grown} hits`,
        },
      ]
    return []
  })
  if (!rows.length) return null
  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>
        {rows.length} regression{rows.length === 1 ? '' : 's'} vs. comparison
      </AlertTitle>
      <AlertDescription>
        <ul className="grid min-w-0 gap-1">
          {rows.slice(0, 6).map(({ unit, note }) => (
            <li key={unit.id}>
              <a
                className="break-all underline underline-offset-4"
                href={sourceUrl(detail.commit, unit.template ?? unit.id)}
              >
                {short(unit.template ?? unit.id)}
              </a>{' '}
              · {note}
            </li>
          ))}
          {rows.length > 6 && <li>and {rows.length - 6} more</li>}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
