import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import type { Summary } from './model'
import { hits, number, percent, velocity } from './format'
import { Delta, StageBar } from './status'

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
  replaceable,
}: {
  series: Summary[]
  snapshot: Summary
  compare: Summary
  lockableUnits: number
  // Share of PrimeNG and ng-bootstrap usage that a kit component already covers.
  replaceable: { primeng: [number, number]; ngBootstrap: [number, number] }
}) {
  const t = snapshot.totals
  const c = compare.totals
  const recent = velocity(series, snapshot, 28)
  const overall = velocity(series, snapshot, Infinity)
  const components = t.units - t.legacyFree - t.dirty
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Tile title="Legacy-free units" value={percent(t.legacyFree, t.units)}>
          {number(t.legacyFree)} of {number(t.units)} use neither Bootstrap,
          ng-bootstrap nor PrimeNG ·{' '}
          <Delta value={t.legacyFree - c.legacyFree} positive="up" /> vs.
          comparison
        </Tile>
        <Tile title="Bootstrap hits" value={number(hits(t))}>
          <Delta value={hits(t) - hits(c)} /> vs. comparison
          {recent &&
            ` · ${pace(recent)} over ${Math.round(recent.weeks)} weeks`}
          {overall &&
            overall.weeks > (recent?.weeks ?? 0) + 1 &&
            ` · ${pace(overall)} since adoption`}
        </Tile>
        <Tile title="Units using PrimeNG" value={number(t.primeng)}>
          <Delta value={t.primeng - c.primeng} /> vs. comparison ·{' '}
          {percent(replaceable.primeng[0], replaceable.primeng[1])} of its
          usages have a kit component
        </Tile>
        <Tile title="Units using ng-bootstrap" value={number(t.ngBootstrap)}>
          <Delta value={t.ngBootstrap - c.ngBootstrap} /> vs. comparison ·{' '}
          {percent(replaceable.ngBootstrap[0], replaceable.ngBootstrap[1])} of
          its usages have a kit component
        </Tile>
        <Tile title="Units using TUM UI" value={number(t.tumUi)}>
          <Delta value={t.tumUi - c.tumUi} positive="up" /> vs. comparison ·{' '}
          {t.kit} kit components
        </Tile>
      </div>
      <StageBar
        counts={{ modern: t.legacyFree, components, bootstrap: t.dirty }}
        legend
      />
      <p className="text-sm text-muted-foreground">
        Bootstrap gate: {number(t.locked)} units locked in {t.lockedDirs} lock
        entries
        {t.lockedResidue > 0 &&
          `, ${t.lockedResidue} hits outside the templates the lint scans`}
        ; {number(lockableUnits)} units in {number(t.lockableDirs)} directories
        can be locked now ·{' '}
        <Link
          to="/"
          search={(previous) => ({ ...previous, view: 'next' })}
          className="underline underline-offset-4"
        >
          lock entries
        </Link>
      </p>
    </div>
  )
}
