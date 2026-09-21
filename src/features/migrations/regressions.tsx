import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { sourceUrl } from './model'
import type { DetailView } from './load-report'
import { hits, unitFile } from './format'

// Units that gained Bootstrap since the comparison; standing residue is not a regression.
export function Regressions({
  detail,
  compare,
}: {
  detail: DetailView
  compare: DetailView
}) {
  if (detail === compare) return null
  const before = new Map(compare.units.map((u) => [u.id, u]))
  const rows = detail.units.flatMap((u) => {
    const previous = before.get(u.id)
    const grown = hits(u) - (previous ? hits(previous) : 0)
    if (grown <= 0) return []
    return [
      {
        unit: u,
        note: previous ? `+${grown} hits` : `new unit with ${grown} hits`,
      },
    ]
  })
  if (!rows.length) return null
  const total = rows.reduce((n, r) => n + hits(r.unit), 0)
  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>
        Bootstrap grew in {rows.length} unit{rows.length === 1 ? '' : 's'} since
        the comparison ({total} hits)
      </AlertTitle>
      <AlertDescription>
        <ul className="grid min-w-0 gap-1">
          {rows.slice(0, 6).map(({ unit, note }) => (
            <li key={unit.id}>
              <a
                className="break-all underline underline-offset-4"
                href={sourceUrl(detail.commit, unitFile(unit))}
              >
                {unitFile(unit)}
              </a>{' '}
              · {note}
              {unit.status === 'locked' && ' · inside a locked path'}
            </li>
          ))}
          {rows.length > 6 && <li>and {rows.length - 6} more</li>}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
