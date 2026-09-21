import { Line, LineChart } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Detail, Summary } from './model'
import { free, hits, number, percent } from './format'
import { Delta, StatusBar } from './status'
import { families, family, type Family } from './targets'

const sparkConfig = {
  hits: { color: 'var(--color-status-locked)' },
} satisfies ChartConfig

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  return (
    <ChartContainer
      config={sparkConfig}
      className="h-6 w-24 aspect-auto"
      aria-hidden="true"
    >
      <LineChart data={values.map((hits) => ({ hits }))}>
        <Line
          dataKey="hits"
          type="stepAfter"
          stroke="var(--color-hits)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

// Hits per section and class family: what kind of work remains where.
export function FamilyHeatmap({ detail }: { detail: Detail }) {
  const cells = new Map<string, Record<Family, number>>()
  const empty = () =>
    Object.fromEntries(families.map((f) => [f, 0])) as Record<Family, number>
  const add = (section: string, tokens: Record<string, number>) => {
    const row = cells.get(section) ?? empty()
    for (const [token, n] of Object.entries(tokens)) row[family(token)] += n
    cells.set(section, row)
  }
  for (const u of detail.units) add(u.section, u.tokens)
  for (const f of detail.files) add(f.section, f.tokens)
  const rows = detail.sections
    .filter((s) => s.classHits > 0)
    .map((s) => ({ name: s.name, cells: cells.get(s.name) ?? empty() }))
  const max = Math.max(
    1,
    ...rows.flatMap((r) => families.map((f) => r.cells[f])),
  )
  const totals = empty()
  for (const r of rows) for (const f of families) totals[f] += r.cells[f]
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>What kind of work remains where</h2>
        </CardTitle>
        <CardDescription>
          Bootstrap class hits per section and family. Grid and layout classes
          convert mechanically to Tailwind; buttons, forms and components need
          the TUM UI kit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              {families.map((f) => (
                <TableHead key={f} className="text-right">
                  {f}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="font-medium">{r.name}</TableCell>
                {families.map((f) => (
                  <TableCell
                    key={f}
                    className="text-right tabular-nums"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--color-status-locked) ${Math.round((r.cells[f] / max) * 70)}%, transparent)`,
                    }}
                  >
                    {r.cells[f] || ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow className="font-medium">
              <TableCell>All sections</TableCell>
              {families.map((f) => (
                <TableCell key={f} className="text-right tabular-nums">
                  {number(totals[f])}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function Sections({
  detail,
  compare,
  series,
  onSelect,
}: {
  detail: Detail
  compare: Detail
  series: Summary[]
  onSelect: (section: string, trigger: HTMLElement) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Sections</h2>
        </CardTitle>
        <CardDescription>
          Most remaining Bootstrap first. The sparkline is the section's hits
          for every commit up to the snapshot. Open a section for its units,
          what blocks them and its lock entries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead>Bootstrap-free</TableHead>
              <TableHead className="text-right">Hits</TableHead>
              <TableHead className="text-right">Δ hits</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead className="text-right">Pages ready</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.sections.map((s) => {
              if (!s.units && !hits(s)) return null
              const before = compare.sections.find((c) => c.name === s.name)
              const pages = detail.units.filter(
                (u) => u.section === s.name && u.route !== undefined,
              )
              const ready = pages.filter(
                (u) => hits(u) === 0 && u.closureHits === 0,
              ).length
              return (
                <TableRow key={s.name}>
                  <TableCell>
                    <button
                      type="button"
                      className="font-medium underline underline-offset-4"
                      onClick={(event) => onSelect(s.name, event.currentTarget)}
                    >
                      {s.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number(s.units)}
                  </TableCell>
                  <TableCell>
                    {s.units > 0 && (
                      <span className="flex items-center gap-2">
                        <StatusBar className="w-24" counts={s} />
                        <span className="tabular-nums">
                          {percent(free(s), s.units)}
                        </span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number(hits(s))}
                  </TableCell>
                  <TableCell className="text-right">
                    {before && <Delta value={hits(s) - hits(before)} />}
                  </TableCell>
                  <TableCell>
                    <Sparkline
                      values={series.map((x) => {
                        const row = x.sections[s.name]
                        return row ? row[4] + row[5] : 0
                      })}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pages.length ? `${ready} / ${pages.length}` : ''}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
