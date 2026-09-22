import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import {
  inventoryOf,
  sourceUrl,
  stageOf,
  type Section,
  type Summary,
  type UnitView,
} from './model'
import type { DetailView } from './load-report'
import { day, hits, number, unitFile } from './format'
import { ValueDelta } from './status'
import { Blockers } from './blockers'
import { LockableTable } from './lockable'
import { bootstrapTarget, kitTarget, ngbTarget } from './targets'

// Units one small change away from legacy-free: few hits, nothing imported with Bootstrap.
function QuickWins({ detail }: { detail: DetailView }) {
  const kit = new Set(detail.kit)
  const steps = (u: UnitView) => [
    ...Object.keys(u.tokens).map((t) => `${t} → ${bootstrapTarget(t) || '?'}`),
    ...(u.styleHits ? [`${u.styleHits} SCSS residue`] : []),
    ...Object.keys(u.primeng)
      .filter((n) => /^p(?:-|[A-Z])/.test(n))
      .map((n) => `${n} → ${kitTarget(n, kit) || '?'}`),
    ...Object.keys(u.ngBootstrap).map(
      (n) => `${n} → ${ngbTarget(n, kit) || '?'}`,
    ),
  ]
  const rows = detail.units.filter(
    (u) =>
      stageOf(u) !== 'modern' &&
      hits(u) <= 3 &&
      u.closureHits === 0 &&
      u.status !== 'locked',
  )
  if (!rows.length) return null
  const columns: ColumnDef<UnitView, unknown>[] = [
    {
      id: 'unit',
      header: 'Unit',
      accessorFn: (u) => u.selector ?? unitFile(u),
      sortDescFirst: false,
      meta: { className: 'whitespace-normal' },
      cell: ({ row, getValue }) => (
        <a
          className="break-all underline underline-offset-4"
          href={sourceUrl(detail.commit, unitFile(row.original))}
        >
          {getValue<string>()}
        </a>
      ),
    },
    {
      id: 'section',
      header: 'Section',
      accessorKey: 'section',
      sortDescFirst: false,
    },
    {
      id: 'hits',
      header: 'Hits',
      accessorFn: (u) => hits(u),
      meta: { align: 'right' },
      sortDescFirst: false,
      cell: ({ getValue }) => getValue<number>() || '',
    },
    {
      id: 'steps',
      header: 'Changes',
      accessorFn: (u) => steps(u).length,
      sortDescFirst: false,
      meta: { className: 'whitespace-normal text-xs' },
      cell: ({ row }) => {
        const list = steps(row.original)
        return (
          <>
            {list.slice(0, 5).map((step) => (
              <code key={step} className="mr-2">
                {step}
              </code>
            ))}
            {list.length > 5 && (
              <span className="text-muted-foreground">+{list.length - 5}</span>
            )}
          </>
        )
      },
    },
    {
      id: 'page',
      header: 'Routed page',
      accessorFn: (u) => (u.route !== undefined ? 1 : 0),
      cell: ({ row }) =>
        row.original.route !== undefined && (
          <code className="text-xs">{row.original.route}</code>
        ),
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Quick wins</h2>
        </CardTitle>
        <CardDescription>
          {number(rows.length)} units with at most three Bootstrap hits that
          import nothing with Bootstrap. Each becomes legacy-free with one small
          change; a directory of them can be locked right after. Sort by section
          to batch them into one pull request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={rows}
          initialSorting={[
            { id: 'steps', desc: false },
            { id: 'section', desc: false },
          ]}
          search="Search quick wins"
          maxHeight="max-h-[28rem]"
          getRowId={(u) => u.id}
        />
      </CardContent>
    </Card>
  )
}

type Gap = {
  name: string
  library: string
  occurrences: number
  units: number
  previous: number
}

// PrimeNG and ng-bootstrap usages the kit cannot replace yet: the design-system backlog.
function KitGaps({
  detail,
  compare,
}: {
  detail: DetailView
  compare: DetailView
}) {
  const kit = new Set(detail.kit)
  const before = new Map(
    [
      ...inventoryOf(compare.units.map((u) => u.primeng)),
      ...inventoryOf(compare.units.map((u) => u.ngBootstrap)),
    ].map((e) => [e.name, e.units]),
  )
  const gaps: Gap[] = [
    ...inventoryOf(detail.units.map((u) => u.primeng)).map((e) => ({
      ...e,
      library: 'PrimeNG',
      target: kitTarget(e.name, kit),
    })),
    ...inventoryOf(detail.units.map((u) => u.ngBootstrap)).map((e) => ({
      ...e,
      library: 'ng-bootstrap',
      target: ngbTarget(e.name, kit),
    })),
  ]
    .filter(
      (e) =>
        /^(p-|ngb-|p[A-Z]|ngb[A-Z])/.test(e.name) &&
        (!e.target || e.target.startsWith('no ')),
    )
    .map((e) => ({ ...e, previous: before.get(e.name) ?? 0 }))
  if (!gaps.length) return null
  const columns: ColumnDef<Gap, unknown>[] = [
    {
      id: 'name',
      header: 'Usage',
      accessorKey: 'name',
      sortDescFirst: false,
      cell: ({ getValue }) => <code>{getValue<string>()}</code>,
    },
    {
      id: 'library',
      header: 'Library',
      accessorKey: 'library',
      sortDescFirst: false,
    },
    {
      id: 'occurrences',
      header: 'Occurrences',
      accessorKey: 'occurrences',
      meta: { align: 'right' },
      cell: ({ getValue }) => number(getValue<number>()),
    },
    {
      id: 'units',
      header: 'Units',
      accessorKey: 'units',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <ValueDelta
          value={row.original.units}
          previous={row.original.previous}
        />
      ),
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Kit gaps</h2>
        </CardTitle>
        <CardDescription>
          Legacy components still in use that no TUM UI component covers at this
          commit. Units that use them cannot become legacy-free until the kit
          grows or the usage is redesigned.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={gaps}
          initialSorting={[{ id: 'units', desc: true }]}
          maxHeight="max-h-[24rem]"
          getRowId={(g) => `${g.library}:${g.name}`}
        />
      </CardContent>
    </Card>
  )
}

type Closest = {
  section: Section
  before?: Section
  progress?: string
}

// Sections with the least legacy left: finishing one is visible progress.
function ClosestSections({
  detail,
  compare,
  series,
}: {
  detail: DetailView
  compare: DetailView
  series: Summary[]
}) {
  const remaining = (s: Section) => s.units - s.legacyFree
  const rows: Closest[] = detail.sections
    .filter((s) => s.units > 0 && remaining(s) > 0)
    .map((section) => ({
      section,
      before: compare.sections.find((c) => c.name === section.name),
      progress: series.findLast((x, i) => {
        const row = x.sections[section.name]
        const prev = series[i - 1]?.sections[section.name]
        return (
          !!row &&
          !!prev &&
          (row[4] + row[5] < prev[4] + prev[5] || row[6] > prev[6])
        )
      })?.date,
    }))
  if (!rows.length) return null
  const columns: ColumnDef<Closest, unknown>[] = [
    {
      id: 'section',
      header: 'Section',
      accessorFn: (r) => r.section.name,
      sortDescFirst: false,
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue<string>()}</span>
      ),
    },
    {
      id: 'left',
      header: 'Units left',
      accessorFn: (r) => remaining(r.section),
      meta: { align: 'right' },
      sortDescFirst: false,
      cell: ({ row }) => (
        <ValueDelta
          value={remaining(row.original.section)}
          previous={row.original.before && remaining(row.original.before)}
        />
      ),
    },
    {
      id: 'hits',
      header: 'Bootstrap hits',
      accessorFn: (r) => hits(r.section),
      meta: { align: 'right' },
      sortDescFirst: false,
      cell: ({ row }) => (
        <ValueDelta
          value={hits(row.original.section)}
          previous={row.original.before && hits(row.original.before)}
        />
      ),
    },
    {
      id: 'primeng',
      header: 'PrimeNG',
      accessorFn: (r) => r.section.primeng,
      meta: { align: 'right' },
      sortDescFirst: false,
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
      sortDescFirst: false,
      cell: ({ row }) => (
        <ValueDelta
          value={row.original.section.ngBootstrap}
          previous={row.original.before?.ngBootstrap}
        />
      ),
    },
    {
      id: 'progress',
      header: 'Last progress',
      accessorFn: (r) => (r.progress ? Date.parse(r.progress) : undefined),
      sortUndefined: 'last',
      meta: {
        align: 'right',
        className: 'text-muted-foreground whitespace-nowrap',
      },
      cell: ({ row }) =>
        row.original.progress
          ? day(row.original.progress)
          : 'none since adoption',
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Closest to legacy-free</h2>
        </CardTitle>
        <CardDescription>
          Sections with the fewest units left that still use Bootstrap, PrimeNG
          or ng-bootstrap.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={rows}
          initialSorting={[
            { id: 'left', desc: false },
            { id: 'hits', desc: false },
          ]}
          maxHeight="max-h-[24rem]"
          getRowId={(r) => r.section.name}
        />
      </CardContent>
    </Card>
  )
}

export function NextSteps({
  detail,
  compare,
  series,
}: {
  detail: DetailView
  compare: DetailView
  series: Summary[]
}) {
  const previouslyLockable = new Set(compare.lockable.map((l) => l.dir))
  const newLockable = detail.lockable.filter(
    (l) => !previouslyLockable.has(l.dir),
  ).length
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <QuickWins detail={detail} />
      {detail.lockable.length > 0 && (
        <Card id="lockable">
          <CardHeader>
            <CardTitle asChild>
              <h2>Lockable directories</h2>
            </CardTitle>
            <CardDescription>
              Nothing under these directories, nor anything they import, has
              Bootstrap left. Locking them is a configuration-only change to the
              three lists; the copied entries are ready to paste.
              {newLockable > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {newLockable} new since comparison
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LockableTable
              lockable={detail.lockable}
              commit={detail.commit}
              isNew={(dir) => !previouslyLockable.has(dir)}
            />
          </CardContent>
        </Card>
      )}
      <Blockers detail={detail} compare={compare} />
      <KitGaps detail={detail} compare={compare} />
      <ClosestSections detail={detail} compare={compare} series={series} />
    </div>
  )
}
