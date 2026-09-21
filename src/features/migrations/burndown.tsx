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
import type { Summary } from './model'
import { day, dayTime, hits, number } from './format'

const config = {
  hits: { label: 'Bootstrap hits', color: 'var(--color-status-locked)' },
} satisfies ChartConfig

export function Burndown({
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
    hits: hits(s.totals),
    delta: i === 0 ? 0 : hits(s.totals) - hits(series[i - 1].totals),
    subject: s.subject,
    locks: i === 0 ? 0 : s.totals.lockedDirs - series[i - 1].totals.lockedDirs,
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Bootstrap hits per integrated commit</h2>
        </CardTitle>
        <CardDescription>
          Every first-parent commit on develop since package adoption. Dashed
          lines mark commits that changed the lock list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full aspect-auto">
          <AreaChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={['dataMin - 43200000', 'dataMax']}
              tickFormatter={(v: number) => day(new Date(v).toISOString())}
              minTickGap={48}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={56}
              tickFormatter={(v: number) => number(v)}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as (typeof data)[number]
                    return (
                      <span className="grid gap-0.5">
                        <span>{dayTime(new Date(row.time).toISOString())}</span>
                        <span className="font-normal text-muted-foreground max-w-72 truncate">
                          {row.subject}
                        </span>
                      </span>
                    )
                  }}
                  formatter={(value, name, item) => (
                    <span className="flex w-full justify-between gap-4 tabular-nums">
                      <span className="text-muted-foreground">
                        {config[name as keyof typeof config].label}
                      </span>
                      <span>
                        {number(Number(value))}{' '}
                        {item.payload.delta !== 0 && (
                          <span className="text-muted-foreground">
                            ({item.payload.delta > 0 ? '+' : ''}
                            {number(item.payload.delta)})
                          </span>
                        )}
                      </span>
                    </span>
                  )}
                />
              }
            />
            {data
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
                label={{
                  value: 'snapshot',
                  position: 'insideTopRight',
                  fontSize: 11,
                }}
              />
            )}
            <Area
              dataKey="hits"
              type="stepAfter"
              stroke="var(--color-hits)"
              fill="var(--color-hits)"
              fillOpacity={0.1}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
