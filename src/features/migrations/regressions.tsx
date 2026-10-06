import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { matchUnits, sourceUrl, usesLibrary } from './model'
import type { DetailView } from './load-report'
import { hits, unitFile } from './format'

// Units that gained Bootstrap, PrimeNG or ng-bootstrap since the comparison; standing residue is not a regression.
export function Regressions({
  detail,
  compare,
}: {
  detail: DetailView
  compare: DetailView
}) {
  if (detail === compare) return null
  // Moved files are matched to their old location, so a move is not new legacy.
  const rows = matchUnits(compare.units, detail.units).flatMap(
    ([previous, u]) => {
      if (!u) return []
      const grown = hits(u) - (previous ? hits(previous) : 0)
      const added = (['primeng', 'ngBootstrap'] as const).filter(
        (lib) =>
          usesLibrary(u[lib]) && (!previous || !usesLibrary(previous[lib])),
      )
      if (grown <= 0 && !added.length) return []
      const moved = previous && previous.id !== u.id
      const notes = [
        grown > 0 &&
          (previous
            ? `+${grown} Bootstrap hits`
            : `new unit with ${grown} Bootstrap hits`),
        ...added.map(
          (lib) =>
            `${previous ? 'now uses' : 'new unit using'} ${lib === 'primeng' ? 'PrimeNG' : 'ng-bootstrap'}`,
        ),
        moved && `moved from ${unitFile(previous)}`,
      ].filter(Boolean)
      return [{ unit: u, note: notes.join(' · ') }]
    },
  )
  if (!rows.length) return null
  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>
        Legacy grew in {rows.length} unit{rows.length === 1 ? '' : 's'} since
        the comparison
      </AlertTitle>
      <AlertDescription>
        <ul className="grid min-w-0 gap-1">
          {rows.slice(0, 6).map(({ unit, note }) => (
            <li key={unit.id}>
              <a
                className="underline underline-offset-4 [overflow-wrap:anywhere]"
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
