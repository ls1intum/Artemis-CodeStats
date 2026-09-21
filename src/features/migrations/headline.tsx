import { Card, CardContent } from '@/components/ui/card'
import type { Summary } from './model'
import { free, hits, number, percent, velocity } from './format'
import { Delta, StatusBar } from './status'

function Tile({
  title,
  value,
  children,
}: {
  title: string
  value: string
  children?: React.ReactNode
}) {
  return (
    <Card className="py-4">
      <CardContent className="grid gap-1">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  )
}

const pace = (v: { perWeek: number; weeks: number } | undefined) =>
  v && `${v.perWeek > 0 ? '+' : ''}${Math.round(v.perWeek)}/week`

export function Headline({
  series,
  snapshot,
  compare,
  lockableUnits,
}: {
  series: Summary[]
  snapshot: Summary
  compare: Summary
  lockableUnits: number
}) {
  const t = snapshot.totals
  const c = compare.totals
  const recent = velocity(series, snapshot, 28)
  const overall = velocity(series, snapshot, Infinity)
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Tile title="Bootstrap hits" value={number(hits(t))}>
          <Delta value={hits(t) - hits(c)} /> vs. comparison
          {recent &&
            ` · ${pace(recent)} over ${Math.round(recent.weeks)} weeks`}
          {overall &&
            overall.weeks > (recent?.weeks ?? 0) + 1 &&
            ` · ${pace(overall)} since adoption`}
        </Tile>
        <Tile title="Bootstrap-free units" value={percent(free(t), t.units)}>
          {number(free(t))} of {number(t.units)} ·{' '}
          <Delta value={free(t) - free(c)} positive="up" /> vs. comparison
        </Tile>
        <Tile
          title="Pages ready"
          value={`${number(t.pagesClean)} / ${number(t.pages)}`}
        >
          routed pages that import no Bootstrap ·{' '}
          <Delta value={t.pagesClean - c.pagesClean} positive="up" /> vs.
          comparison
        </Tile>
        <Tile title="Locked units" value={number(t.locked)}>
          {t.lockedDirs} lock entries ·{' '}
          <Delta value={t.locked - c.locked} positive="up" /> vs. comparison
          {t.lockedResidue > 0 &&
            ` · ${t.lockedResidue} hits outside the templates the lint scans`}
        </Tile>
        <Tile title="Lockable directories" value={number(t.lockableDirs)}>
          {number(lockableUnits)} units with nothing left to migrate ·{' '}
          <a className="underline underline-offset-4" href="#lockable">
            lock entries
          </a>
        </Tile>
      </div>
      <StatusBar counts={t} legend />
    </div>
  )
}
