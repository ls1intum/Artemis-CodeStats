import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { Summary, Totals } from './model'
import { day, dayTime, hits, number } from './format'

// One small chart per legacy dependency and one for the kit; same time axis, own value axis.
const measures = [
  {
    key: 'hits',
    title: 'Bootstrap hits',
    read: (t: Totals) => hits(t),
    color: 'var(--color-remaining)',
  },
  {
    key: 'primeng',
    title: 'Units using PrimeNG',
    read: (t: Totals) => t.primeng,
    color: 'var(--color-remaining)',
  },
  {
    key: 'ngBootstrap',
    title: 'Units using ng-bootstrap',
    read: (t: Totals) => t.ngBootstrap,
    color: 'var(--color-remaining)',
  },
  {
    key: 'tumUi',
    title: 'Units using TUM UI',
    read: (t: Totals) => t.tumUi,
    color: 'var(--color-status-locked)',
  },
] as const

export function Trends({
  series,
  snapshot,
  latest,
}: {
  series: Summary[]
  snapshot: Summary
  latest: boolean
}) {
  const data = series.map((s, i) => ({
    time: Date.parse(s.date),
    subject: s.subject,
    locks: i === 0 ? 0 : s.totals.lockedDirs - series[i - 1].totals.lockedDirs,
    ...Object.fromEntries(measures.map((m) => [m.key, m.read(s.totals)])),
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Legacy retired and kit adopted, per integrated commit</h2>
        </CardTitle>
        <CardDescription>
          Every first-parent commit on develop since package adoption. Dashed
          lines mark commits that changed the Bootstrap lock list.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        {measures.map((m) => {
          const config = {
            [m.key]: { label: m.title, color: m.color },
          } satisfies ChartConfig
          return (
            <div key={m.key} className="grid gap-2">
              <h3 className="text-sm font-medium">{m.title}</h3>
              <ChartContainer
                config={config}
                className="h-44 w-full aspect-auto"
              >
                <AreaChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    type="number"
                    scale="time"
                    domain={['dataMin - 43200000', 'dataMax']}
                    tickFormatter={(v: number) =>
                      day(new Date(v).toISOString())
                    }
                    minTickGap={48}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    width={48}
                    tickFormatter={(v: number) => number(v)}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 'auto']}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          const row = payload?.[0]
                            ?.payload as (typeof data)[number]
                          return (
                            <span className="grid gap-0.5">
                              <span>
                                {dayTime(new Date(row.time).toISOString())}
                              </span>
                              <span className="max-w-72 truncate font-normal text-muted-foreground">
                                {row.subject}
                              </span>
                            </span>
                          )
                        }}
                        formatter={(value) => (
                          <span className="flex w-full justify-between gap-4 tabular-nums">
                            <span className="text-muted-foreground">
                              {m.title}
                            </span>
                            <span>{number(Number(value))}</span>
                          </span>
                        )}
                      />
                    }
                  />
                  {m.key === 'hits' &&
                    data
                      .filter((d) => d.locks)
                      .map((d) => (
                        <ReferenceLine
                          key={d.time}
                          x={d.time}
                          stroke="var(--muted-foreground)"
                          strokeDasharray="3 3"
                        />
                      ))}
                  {!latest && (
                    <ReferenceLine
                      x={Date.parse(snapshot.date)}
                      stroke="var(--foreground)"
                      strokeDasharray="4 3"
                    />
                  )}
                  <Area
                    dataKey={m.key}
                    type="stepAfter"
                    stroke={`var(--color-${m.key})`}
                    fill={`var(--color-${m.key})`}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
