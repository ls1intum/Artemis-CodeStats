import { Line, LineChart } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import type { Summary } from './model'
import { hits, number, percent, velocity } from './format'
import { Delta, StatusBar } from './status'

const sparkConfig = {
  value: { color: 'var(--color-status-locked)' },
} satisfies ChartConfig

function Sparkline({ values }: { values: number[] }) {
  return (
    <ChartContainer
      config={sparkConfig}
      className="h-10 w-full aspect-auto"
      aria-hidden="true"
    >
      <LineChart data={values.map((value) => ({ value }))}>
        <Line
          dataKey="value"
          type="stepAfter"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

function Tile({
  title,
  value,
  children,
  spark,
}: {
  title: string
  value: string
  children?: React.ReactNode
  spark?: number[]
}) {
  return (
    <Card className="py-4">
      <CardContent className="grid gap-1">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
        {spark && <Sparkline values={spark} />}
      </CardContent>
    </Card>
  )
}

export function Headline({
  series,
  snapshot,
  compare,
}: {
  series: Summary[]
  snapshot: Summary
  compare: Summary
}) {
  const t = snapshot.totals
  const c = compare.totals
  const pace = velocity(series, snapshot)
  const free = t.locked + t.clean
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          title="Bootstrap hits"
          value={number(hits(t))}
          spark={series.map((s) => hits(s.totals))}
        >
          <Delta value={hits(t) - hits(c)} /> vs. comparison
          {pace !== undefined && (
            <>
              {' '}
              · {pace > 0 ? '+' : ''}
              {Math.round(pace)}/week over 4 weeks
              {pace < 0 &&
                ` · 0 in ~${Math.ceil(hits(t) / -pace)} weeks at this pace`}
            </>
          )}
        </Tile>
        <Tile
          title="Bootstrap-free units"
          value={`${percent(free, t.units)}`}
          spark={series.map(
            (s) => (s.totals.locked + s.totals.clean) / s.totals.units,
          )}
        >
          {number(free)} of {number(t.units)} ·{' '}
          <Delta value={free - (c.locked + c.clean)} positive="up" /> vs.
          comparison
        </Tile>
        <Tile title="Lockable now" value={number(t.lockableDirs)}>
          directories with nothing left to migrate ·{' '}
          <a className="underline underline-offset-4" href="#lockable">
            lock entries
          </a>
        </Tile>
        <Tile
          title="Units using PrimeNG"
          value={number(t.primeng)}
          spark={series.map((s) => s.totals.primeng)}
        >
          <Delta value={t.primeng - c.primeng} /> vs. comparison ·{' '}
          {number(t.tumUi)} use TUM UI
        </Tile>
      </div>
      <StatusBar
        counts={{ locked: t.locked, clean: t.clean, dirty: t.dirty }}
        legend
      />
    </div>
  )
}
