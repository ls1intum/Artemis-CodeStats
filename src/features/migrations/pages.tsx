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
import { sourceUrl, stageOf, type UnitView } from './model'
import type { DetailView } from './load-report'
import { hits, number, unitFile } from './format'
import { SegmentBar, ValueDelta } from './status'

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
  components: 'Bootstrap-free, PrimeNG or ng-bootstrap remain',
  blocked: 'Bootstrap in imported or parent units',
  bootstrap: 'Bootstrap in the page itself',
}
const shortLabel: Record<PageState, string> = {
  modern: 'Legacy-free',
  components: 'Components',
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

type SectionPages = { name: string; pages: UnitView[]; previous: UnitView[] }

// Routed pages are what users see; a page is legacy-free when nothing it renders carries legacy.
export function Pages({
  detail,
  compare,
}: {
  detail: DetailView
  compare: DetailView
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
  const sections: SectionPages[] = [
    ...new Set(pages.map((u) => u.section)),
  ].map((name) => ({
    name,
    pages: pages.filter((u) => u.section === name),
    previous: previousPages.filter((u) => u.section === name),
  }))
  const shell = detail.units.find((u) => u.id === 'app/app.component.ts')
  const sectionColumns: ColumnDef<SectionPages, unknown>[] = [
    {
      id: 'section',
      header: 'Section',
      accessorKey: 'name',
      sortDescFirst: false,
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
    ...states.map((s): ColumnDef<SectionPages, unknown> => ({
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
  const pageColumns = useMemo<ColumnDef<UnitView, unknown>[]>(
    () => [
      {
        id: 'route',
        header: 'Route',
        accessorKey: 'route',
        sortDescFirst: false,
        meta: {
          className: 'min-w-48 whitespace-normal [overflow-wrap:anywhere]',
          sticky: true,
        },
        cell: ({ getValue }) => (
          <code className="text-xs">{getValue<string>() || '/'}</code>
        ),
      },
      {
        id: 'page',
        header: 'Page',
        accessorFn: (u) => u.selector ?? unitFile(u),
        sortDescFirst: false,
        meta: {
          className: 'min-w-40 whitespace-normal [overflow-wrap:anywhere]',
        },
        cell: ({ row }) => (
          <a
            className="underline underline-offset-4"
            href={sourceUrl(detail.commit, unitFile(row.original))}
          >
            {row.original.selector ?? unitFile(row.original)}
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
        id: 'state',
        header: 'State',
        accessorFn: (u) => states.indexOf(state(u)),
        sortDescFirst: false,
        cell: ({ row }) => shortLabel[state(row.original)],
      },
      {
        id: 'own',
        header: 'Own hits',
        accessorFn: (u) => hits(u),
        meta: { align: 'right' },
        cell: ({ getValue }) => getValue<number>() || '',
      },
      {
        id: 'imported',
        header: 'Imported hits',
        accessorKey: 'closureHits',
        meta: { align: 'right' },
        cell: ({ getValue }) =>
          getValue<number>() ? number(getValue<number>()) : '',
      },
      {
        id: 'parents',
        header: 'Parent hits',
        accessorKey: 'routeHits',
        meta: { align: 'right' },
        cell: ({ getValue }) =>
          getValue<number>() ? number(getValue<number>()) : '',
      },
      {
        id: 'toFix',
        header: 'Units to fix',
        accessorFn: (u) => u.blockers.length + (hits(u) > 0 ? 1 : 0),
        meta: { align: 'right' },
        cell: ({ getValue }) => getValue<number>() || '',
      },
      {
        id: 'components',
        header: 'PrimeNG / ngb',
        accessorFn: (u) =>
          u.closureComponents +
          u.routeComponents +
          (stageOf(u) === 'components' ? 1 : 0),
        meta: { align: 'right' },
        cell: ({ getValue }) => getValue<number>() || '',
      },
      {
        id: 'remaining',
        header: 'Remaining',
        accessorFn: remaining,
        meta: { align: 'right' },
        cell: ({ getValue }) => number(getValue<number>()),
      },
    ],
    [detail.commit],
  )
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Routed pages</h2>
          </CardTitle>
          <CardDescription>
            Components reached from <code>app.routes.ts</code> through{' '}
            <code>component</code>, <code>loadComponent</code>,{' '}
            <code>children</code> and <code>loadChildren</code>. A page is
            legacy-free when it, what it imports and the route components it
            renders inside use neither Bootstrap, PrimeNG nor ng-bootstrap.
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
          <DataTable
            columns={sectionColumns}
            data={sections}
            initialSorting={[{ id: 'pages', desc: true }]}
            getRowId={(r) => r.name}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Every page</h2>
          </CardTitle>
          <CardDescription>
            Sorted by state, then by the fewest hits in the page, its imports
            and its parent routes; search by route, page or section. Hits are
            Bootstrap hits in the page itself, in what it imports and in the
            route components it renders inside; PrimeNG / ngb counts the units
            among those that still use PrimeNG or ng-bootstrap.
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
