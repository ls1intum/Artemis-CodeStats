import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DataTable } from '@/components/data-table'
import { cn } from '@/lib/utils'
import { sourceUrl, stageOf, type UnitView } from './model'
import type { DetailView } from './load-report'
import { hits, number, unitFile } from './format'
import { SegmentBar, ValueDelta } from './status'
import { ListPopover } from './list-popover'

// What a user would meet on the page: nothing legacy, only PrimeNG or ng-bootstrap components
// somewhere in it, Bootstrap in something it imports or renders inside, or Bootstrap in the
// page's own template and styles.
type PageState = 'modern' | 'components' | 'blocked' | 'bootstrap'
const state = (u: UnitView): PageState =>
  hits(u) > 0
    ? 'bootstrap'
    : u.closureHits + u.routeHits > 0
      ? 'blocked'
      : stageOf(u) === 'components' ||
          u.closureComponents + u.routeComponents > 0
        ? 'components'
        : 'modern'
const stateLabel: Record<PageState, string> = {
  modern: 'Legacy-free',
  components: 'PrimeNG or ng-bootstrap remain',
  blocked: 'Bootstrap in imports or layouts',
  bootstrap: 'Bootstrap in the page',
}
const shortLabel: Record<PageState, string> = {
  modern: 'Legacy-free',
  components: 'Components left',
  blocked: 'Blocked',
  bootstrap: 'Bootstrap',
}
const stateFill: Record<PageState, string> = {
  modern: 'bg-status-locked',
  components: 'bg-status-clean',
  blocked: 'bg-status-blocked',
  bootstrap: 'bg-status-dirty',
}
const states: PageState[] = ['modern', 'components', 'blocked', 'bootstrap']
const remaining = (u: UnitView) => hits(u) + u.closureHits + u.routeHits

type ModulePages = { name: string; pages: UnitView[]; previous: UnitView[] }

function StateDot({ s }: { s: PageState }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={stateLabel[s]}>
      <span
        aria-hidden="true"
        className={cn('size-2.5 rounded-full', stateFill[s])}
      />
      {shortLabel[s]}
    </span>
  )
}

// Routed pages are what users see; a page is legacy-free when nothing it renders carries legacy.
export function Pages({
  detail,
  compare,
  all,
  scoped,
}: {
  detail: DetailView
  compare: DetailView
  // Unscoped detail: imported units and layouts may live in other modules.
  all: DetailView
  scoped: boolean
}) {
  const [filter, setFilter] = useState<PageState | 'all'>('all')
  const pages = detail.units.filter((u) => u.route !== undefined)
  const previousPages = compare.units.filter((u) => u.route !== undefined)
  const counts = (list: UnitView[]) =>
    states.map((s) => ({
      label: stateLabel[s],
      value: list.filter((u) => state(u) === s).length,
      className: stateFill[s],
    }))
  const count = (list: UnitView[], s: PageState) =>
    list.filter((u) => state(u) === s).length
  const modules: ModulePages[] = [...new Set(pages.map((u) => u.section))].map(
    (name) => ({
      name,
      pages: pages.filter((u) => u.section === name),
      previous: previousPages.filter((u) => u.section === name),
    }),
  )
  const shell = all.units.find((u) => u.id === 'app/app.component.ts')
  const moduleColumns: ColumnDef<ModulePages, unknown>[] = [
    {
      id: 'module',
      header: 'Module',
      accessorKey: 'name',
      sortDescFirst: false,
      meta: { sticky: true },
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue<string>()}</span>
      ),
    },
    {
      id: 'pages',
      header: 'Pages',
      accessorFn: (r) => r.pages.length,
      meta: { className: 'w-64' },
      cell: ({ row }) => <SegmentBar segments={counts(row.original.pages)} />,
    },
    ...states.map((s): ColumnDef<ModulePages, unknown> => ({
      id: s,
      header: shortLabel[s],
      accessorFn: (r) => count(r.pages, s),
      meta: { align: 'right' },
      cell: ({ row }) => (
        <ValueDelta
          value={count(row.original.pages, s)}
          previous={count(row.original.previous, s)}
          positive={s === 'modern' ? 'up' : 'down'}
        />
      ),
    })),
    {
      id: 'share',
      header: 'Legacy-free share',
      accessorFn: (r) =>
        r.pages.length ? count(r.pages, 'modern') / r.pages.length : 0,
      meta: { align: 'right' },
      cell: ({ getValue }) =>
        getValue<number>().toLocaleString('en-US', {
          style: 'percent',
          maximumFractionDigits: 0,
        }),
    },
  ]
  const pageColumns = useMemo<ColumnDef<UnitView, unknown>[]>(() => {
    const unitById = new Map(all.units.map((u) => [u.id, u]))
    // Every unit that still stands between this page and legacy-free, with its hits.
    const toFix = (u: UnitView) => {
      const items: { unit: UnitView; role: string }[] = []
      if (hits(u) > 0) items.push({ unit: u, role: 'the page' })
      for (const id of u.blockers) {
        const b = unitById.get(id)
        if (b) items.push({ unit: b, role: 'imported' })
      }
      for (const id of u.routeParents ?? []) {
        const p = unitById.get(id)
        if (!p) continue
        if (hits(p) > 0) items.push({ unit: p, role: 'layout' })
        for (const b of p.blockers) {
          const pb = unitById.get(b)
          if (pb && !items.some((i) => i.unit.id === pb.id))
            items.push({ unit: pb, role: 'imported by a layout' })
        }
      }
      return items.sort((a, b) => hits(b.unit) - hits(a.unit))
    }
    const name = (u: UnitView) => u.selector ?? unitFile(u)
    return [
      {
        id: 'page',
        header: 'Page',
        accessorFn: (u) => `${name(u)} ${u.route}`,
        sortDescFirst: false,
        meta: { className: 'whitespace-normal', sticky: true },
        cell: ({ row }) => (
          <span className="grid max-w-72 gap-0.5">
            <a
              className="truncate underline underline-offset-4"
              href={sourceUrl(detail.commit, unitFile(row.original))}
              title={unitFile(row.original)}
            >
              {name(row.original)}
            </a>
            <code
              className="truncate text-xs text-muted-foreground"
              title={row.original.route || '/'}
            >
              {row.original.route || '/'}
            </code>
          </span>
        ),
      },
      ...(scoped
        ? []
        : [
            {
              id: 'module',
              header: 'Module',
              accessorKey: 'section',
              sortDescFirst: false,
            } satisfies ColumnDef<UnitView, unknown>,
          ]),
      {
        id: 'state',
        header: 'State',
        accessorFn: (u) => states.indexOf(state(u)),
        sortDescFirst: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => <StateDot s={state(row.original)} />,
      },
      {
        id: 'own',
        header: 'Hits in page',
        accessorFn: (u) => hits(u),
        meta: { align: 'right' },
        cell: ({ getValue }) => getValue<number>() || '',
      },
      {
        id: 'imported',
        header: 'Hits imported',
        accessorKey: 'closureHits',
        meta: { align: 'right' },
        cell: ({ getValue }) =>
          getValue<number>() ? number(getValue<number>()) : '',
      },
      {
        id: 'layouts',
        header: 'Hits in layouts',
        accessorKey: 'routeHits',
        meta: { align: 'right' },
        cell: ({ getValue }) =>
          getValue<number>() ? number(getValue<number>()) : '',
      },
      {
        id: 'toFix',
        header: 'Units to fix',
        accessorFn: (u) => toFix(u).length,
        meta: { align: 'right' },
        cell: ({ row, getValue }) => {
          const items = toFix(row.original)
          return items.length ? (
            <ListPopover
              label={number(getValue<number>())}
              title="Units with Bootstrap that this page renders"
              items={items.map(({ unit, role }) => ({
                key: `${role}:${unit.id}`,
                left: (
                  <span className="truncate">
                    <a
                      className="underline underline-offset-4"
                      href={sourceUrl(detail.commit, unitFile(unit))}
                    >
                      {name(unit)}
                    </a>
                    <span className="text-muted-foreground"> · {role}</span>
                  </span>
                ),
                right: (
                  <span className="tabular-nums">{number(hits(unit))}</span>
                ),
              }))}
            />
          ) : (
            ''
          )
        },
      },
      {
        id: 'components',
        header: 'PrimeNG / ngb units',
        accessorFn: (u) =>
          u.closureComponents +
          u.routeComponents +
          (stageOf(u) === 'components' ? 1 : 0),
        meta: { align: 'right' },
        cell: ({ getValue }) => getValue<number>() || '',
      },
      {
        id: 'remaining',
        header: 'All hits',
        accessorFn: remaining,
        meta: { align: 'right' },
        cell: ({ getValue }) => number(getValue<number>()),
      },
    ]
  }, [detail.commit, all, scoped])
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Routed pages</h2>
          </CardTitle>
          <CardDescription>
            A page is a component that a route opens (found in{' '}
            <code>app.routes.ts</code>). What a user meets on it is the page
            itself, everything it imports, and the layouts it renders inside
            (its parent routes). A page is <em>legacy-free</em> when none of
            that uses Bootstrap, PrimeNG or ng-bootstrap;{' '}
            <em>components left</em> when only PrimeNG or ng-bootstrap
            components remain; <em>blocked</em> when the page itself is
            Bootstrap-free but something it imports or a layout is not;{' '}
            <em>Bootstrap</em> when the page's own template or styles still
            carry it.
            {shell && hits(shell) + shell.closureHits > 0 && (
              <>
                {' '}
                The global shell (<code>{unitFile(shell)}</code> with navbar,
                footer and overlays) carries{' '}
                {number(hits(shell) + shell.closureHits)} hits and renders on
                every page; it is not counted here.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-5">
          <SegmentBar segments={counts(pages)} legend />
          {!scoped && (
            <DataTable
              columns={moduleColumns}
              data={modules}
              initialSorting={[{ id: 'pages', desc: true }]}
              getRowId={(r) => r.name}
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Every page</h2>
          </CardTitle>
          <CardDescription>
            Legacy-free pages first, then the pages with the least Bootstrap
            left across the page, its imports and its layouts. Open{' '}
            <em>Units to fix</em> for the exact components that stand in the
            way, with their hits; search by page, route or module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={pageColumns}
            data={pages.filter((u) => filter === 'all' || state(u) === filter)}
            initialSorting={[
              { id: 'state', desc: false },
              { id: 'remaining', desc: false },
            ]}
            search="Search pages"
            maxHeight="max-h-[40rem]"
            getRowId={(u) => u.id}
            toolbar={
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                className="flex-wrap"
                value={filter}
                onValueChange={(v) => v && setFilter(v as PageState | 'all')}
                aria-label="Filter pages by state"
              >
                <ToggleGroupItem value="all" className="flex-none px-3">
                  All
                </ToggleGroupItem>
                {states.map((s) => (
                  <ToggleGroupItem key={s} value={s} className="flex-none px-3">
                    {shortLabel[s]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
