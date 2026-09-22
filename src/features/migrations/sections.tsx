import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Detail, Summary } from './model'
import { hits, number, percent } from './format'
import { Delta, StageBar } from './status'
import { families, family, type Family } from './targets'

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
  const columns = [...families, 'SCSS', 'PrimeNG', 'ng-bootstrap'] as const
  const occurrences = (section: string, key: 'primeng' | 'ngBootstrap') =>
    detail.units
      .filter((u) => u.section === section)
      .reduce((n, u) => n + Object.values(u[key]).reduce((a, b) => a + b, 0), 0)
  const rows = detail.sections
    .filter((s) => hits(s) > 0 || s.primeng > 0 || s.ngBootstrap > 0)
    .map((s) => {
      const row = {
        ...(cells.get(s.name) ?? empty()),
        SCSS: s.styleHits,
        PrimeNG: occurrences(s.name, 'primeng'),
        'ng-bootstrap': occurrences(s.name, 'ngBootstrap'),
      }
      return {
        name: s.name,
        cells: row,
        total: columns.reduce((n, c) => n + row[c], 0),
      }
    })
  const totals = Object.fromEntries(columns.map((c) => [c, 0])) as Record<
    (typeof columns)[number],
    number
  >
  for (const r of rows) for (const c of columns) totals[c] += r.cells[c]
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>What kind of work remains where</h2>
        </CardTitle>
        <CardDescription>
          Bootstrap hits per section by the kind of work they need, SCSS
          residue, and PrimeNG and ng-bootstrap occurrences; shading is the
          share within the section. Layout and grid classes convert mechanically
          to Tailwind utilities; buttons, forms, tables, components, PrimeNG and
          ng-bootstrap need TUM UI kit components; SCSS residue needs semantic
          tokens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              {columns.map((c) => (
                <TableHead key={c} className="text-right">
                  {c}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="font-medium">{r.name}</TableCell>
                {columns.map((c) => (
                  <TableCell
                    key={c}
                    className="text-right tabular-nums"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--color-remaining) ${Math.round((r.cells[c] / r.total) * 80)}%, transparent)`,
                    }}
                  >
                    {r.cells[c] || ''}
                  </TableCell>
                ))}
                <TableCell className="text-right tabular-nums">
                  {number(r.total)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-medium">
              <TableCell>All sections</TableCell>
              {columns.map((c) => (
                <TableCell key={c} className="text-right tabular-nums">
                  {number(totals[c])}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums">
                {number(rows.reduce((n, r) => n + r.total, 0))}
              </TableCell>
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
          Most remaining Bootstrap first; unit counts per library. Open a
          section for its units, what blocks them and its lock entries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead>Legacy-free</TableHead>
              <TableHead className="text-right">Bootstrap hits</TableHead>
              <TableHead className="text-right">Δ hits</TableHead>
              <TableHead className="text-right">Since adoption</TableHead>
              <TableHead className="text-right">PrimeNG</TableHead>
              <TableHead className="text-right">ng-bootstrap</TableHead>
              <TableHead className="text-right">TUM UI</TableHead>
              <TableHead className="text-right">Locked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.sections.map((s) => {
              if (!s.units && !hits(s)) return null
              const before = compare.sections.find((c) => c.name === s.name)
              const adoption = series[0]?.sections[s.name]
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
                        <StageBar
                          className="w-24"
                          counts={{
                            modern: s.legacyFree,
                            components: s.units - s.legacyFree - s.dirty,
                            bootstrap: s.dirty,
                          }}
                        />
                        <span className="tabular-nums">
                          {percent(s.legacyFree, s.units)}
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
                  <TableCell className="text-right">
                    {adoption && (
                      <Delta value={hits(s) - (adoption[4] + adoption[5])} />
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.primeng || ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.ngBootstrap || ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.tumUi || ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.locked || ''}
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
