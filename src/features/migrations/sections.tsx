import type { ColumnDef } from '@tanstack/react-table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TableCell, TableFooter, TableRow } from '@/components/ui/table'
import { DataTable } from '@/components/data-table'
import type { Section, Summary } from './model'
import type { DetailView } from './load-report'
import { day, hits, number, percent } from './format'
import { Delta, StageBar, ValueDelta } from './status'
import { families, family, type Family } from './targets'

// Latest commit that reduced a section's hits or made one of its units legacy-free.
const lastProgress = (series: Summary[], name: string) =>
  series.findLast((x, i) => {
    const row = x.sections[name]
    const prev = series[i - 1]?.sections[name]
    return (
      !!row &&
      !!prev &&
      (row[4] + row[5] < prev[4] + prev[5] || row[6] > prev[6])
    )
  })

type SectionRow = {
  section: Section
  before?: Section
  adoption?: number
  progress?: string
  idle: boolean
}

export function Sections({
  detail,
  compare,
  series,
  onSelect,
}: {
  detail: DetailView
  compare: DetailView
  series: Summary[]
  onSelect: (section: string, trigger: HTMLElement) => void
}) {
  const end = Date.parse(series.at(-1)?.date ?? detail.commit)
  const rows: SectionRow[] = detail.sections
    .filter((s) => s.units || hits(s))
    .map((section) => {
      const progress = lastProgress(series, section.name)?.date
      const adoption = series[0]?.sections[section.name]
      return {
        section,
        before: compare.sections.find((c) => c.name === section.name),
        adoption: adoption && adoption[4] + adoption[5],
        progress,
        idle: !!progress && end - Date.parse(progress) > 28 * 86_400_000,
      }
    })
  const remaining = (s: Section) => hits(s) + s.primeng + s.ngBootstrap
  const columns: ColumnDef<SectionRow, unknown>[] = [
    {
      id: 'section',
      header: 'Section',
      accessorFn: (r) => r.section.name,
      sortDescFirst: false,
      meta: { sticky: true },
      cell: ({ row }) => (
        <button
          type="button"
          data-section-trigger={row.original.section.name}
          className="font-medium underline underline-offset-4"
          onClick={(event) =>
            onSelect(row.original.section.name, event.currentTarget)
          }
        >
          {row.original.section.name}
        </button>
      ),
    },
    {
      id: 'units',
      header: 'Units',
      accessorFn: (r) => r.section.units,
      meta: { align: 'right' },
      cell: ({ getValue }) => number(getValue<number>()),
    },
    {
      id: 'legacyFree',
      header: 'Legacy-free',
      accessorFn: (r) =>
        r.section.units ? r.section.legacyFree / r.section.units : -1,
      cell: ({ row }) => {
        const s = row.original.section
        return s.units > 0 ? (
          <span className="flex items-center gap-2">
            <StageBar
              className="w-24"
              counts={{
                modern: s.legacyFree,
                components: s.units - s.legacyFree - s.dirty,
                bootstrap: s.dirty,
              }}
            />
            <ValueDelta
              value={s.legacyFree}
              previous={row.original.before?.legacyFree}
              positive="up"
              format={(v) => percent(v, s.units)}
            />
          </span>
        ) : null
      },
    },
    {
      id: 'progress',
      header: 'Δ legacy-free',
      accessorFn: (r) =>
        r.before ? r.section.legacyFree - r.before.legacyFree : 0,
      meta: { align: 'right' },
      cell: ({ getValue }) =>
        getValue<number>() !== 0 && (
          <Delta value={getValue<number>()} positive="up" />
        ),
    },
    {
      id: 'hits',
      header: 'Bootstrap hits',
      accessorFn: (r) => hits(r.section),
      meta: { align: 'right' },
      cell: ({ getValue }) => number(getValue<number>()),
    },
    {
      id: 'deltaHits',
      header: 'Δ hits',
      accessorFn: (r) => (r.before ? hits(r.section) - hits(r.before) : 0),
      meta: { align: 'right' },
      sortDescFirst: false,
      cell: ({ getValue }) =>
        getValue<number>() !== 0 && <Delta value={getValue<number>()} />,
    },
    {
      id: 'adoption',
      header: 'Since adoption',
      accessorFn: (r) =>
        r.adoption !== undefined ? hits(r.section) - r.adoption : 0,
      meta: { align: 'right' },
      sortDescFirst: false,
      cell: ({ getValue }) =>
        getValue<number>() !== 0 && <Delta value={getValue<number>()} />,
    },
    {
      id: 'primeng',
      header: 'PrimeNG',
      accessorFn: (r) => r.section.primeng,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <ValueDelta
          value={row.original.section.primeng}
          previous={row.original.before?.primeng}
        />
      ),
    },
    {
      id: 'ngBootstrap',
      header: 'ng-bootstrap',
      accessorFn: (r) => r.section.ngBootstrap,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <ValueDelta
          value={row.original.section.ngBootstrap}
          previous={row.original.before?.ngBootstrap}
        />
      ),
    },
    {
      id: 'tumUi',
      header: 'TUM UI',
      accessorFn: (r) => r.section.tumUi,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <ValueDelta
          value={row.original.section.tumUi}
          previous={row.original.before?.tumUi}
          positive="up"
        />
      ),
    },
    {
      id: 'locked',
      header: 'Locked',
      accessorFn: (r) => r.section.locked,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <ValueDelta
          value={row.original.section.locked}
          previous={row.original.before?.locked}
          positive="up"
        />
      ),
    },
    {
      id: 'lastProgress',
      header: 'Last progress',
      accessorFn: (r) => (r.progress ? Date.parse(r.progress) : undefined),
      sortUndefined: 'last',
      meta: { align: 'right', className: 'whitespace-nowrap' },
      cell: ({ row }) => {
        const r = row.original
        return remaining(r.section) === 0 ? (
          <span className="text-muted-foreground">done</span>
        ) : r.progress ? (
          <span
            className={r.idle ? 'text-destructive' : 'text-muted-foreground'}
          >
            {day(r.progress)}
          </span>
        ) : (
          <span className="text-destructive">none since adoption</span>
        )
      },
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Sections</h2>
        </CardTitle>
        <CardDescription>
          Every column sorts; the default is most remaining Bootstrap first.
          Unit counts per library carry their change against the comparison.
          Last progress is the latest commit that reduced the section's hits or
          made a unit legacy-free; more than four idle weeks is marked. Open a
          section for its units, what blocks them and its lock entries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={rows}
          initialSorting={[{ id: 'hits', desc: true }]}
          getRowId={(r) => r.section.name}
        />
      </CardContent>
    </Card>
  )
}

type HeatRow = {
  name: string
  cells: Record<string, number>
  total: number
}

// Hits per section and kind of work, plus PrimeNG and ng-bootstrap occurrences.
export function FamilyHeatmap({ detail }: { detail: DetailView }) {
  const columns = [...families, 'SCSS', 'PrimeNG', 'ng-bootstrap'] as const
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
  const occurrences = (section: string, key: 'primeng' | 'ngBootstrap') =>
    detail.units
      .filter((u) => u.section === section)
      .reduce((n, u) => n + Object.values(u[key]).reduce((a, b) => a + b, 0), 0)
  const rows: HeatRow[] = detail.sections
    .filter((s) => hits(s) > 0 || s.primeng > 0 || s.ngBootstrap > 0)
    .map((s) => {
      const row: Record<string, number> = {
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
  const totals = Object.fromEntries(
    columns.map((c) => [c, rows.reduce((n, r) => n + r.cells[c], 0)]),
  )
  const defs: ColumnDef<HeatRow, unknown>[] = [
    {
      id: 'section',
      header: 'Section',
      accessorKey: 'name',
      sortDescFirst: false,
      meta: { sticky: true },
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue<string>()}</span>
      ),
    },
    ...columns.map((c): ColumnDef<HeatRow, unknown> => ({
      id: c,
      header: c,
      accessorFn: (r) => r.cells[c],
      meta: { align: 'right' },
      cell: ({ row, getValue }) => (
        <span
          className="-mx-2 -my-2 block px-2 py-2"
          style={{
            backgroundColor: `color-mix(in oklab, var(--color-remaining) ${Math.round((getValue<number>() / row.original.total) * 80)}%, transparent)`,
          }}
        >
          {getValue<number>() || ''}
        </span>
      ),
    })),
    {
      id: 'total',
      header: 'Total',
      accessorKey: 'total',
      meta: { align: 'right' },
      cell: ({ getValue }) => number(getValue<number>()),
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>What kind of work remains where</h2>
        </CardTitle>
        <CardDescription>
          Bootstrap hits per section by the kind of work they need, SCSS
          residue, and PrimeNG and ng-bootstrap occurrences; shading is the
          share within the section, and every column sorts. Layout and grid
          classes convert mechanically to Tailwind utilities; buttons, forms,
          tables, components, PrimeNG and ng-bootstrap need TUM UI kit
          components; SCSS residue needs semantic tokens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={defs}
          data={rows}
          initialSorting={[{ id: 'total', desc: true }]}
          getRowId={(r) => r.name}
          footer={
            <TableFooter>
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
            </TableFooter>
          }
        />
      </CardContent>
    </Card>
  )
}
