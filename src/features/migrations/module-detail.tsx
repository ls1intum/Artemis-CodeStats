import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DataTable } from '@/components/data-table'
import { ListPopover } from './list-popover'
import {
  sourceUrl,
  stageOf,
  stages,
  type Stage,
  type StyleFile,
  type UnitView,
} from './model'
import type { DetailView } from './load-report'
import { hits, number, percent, stageLabel, unitFile } from './format'
import { Delta, StageBar, ValueDelta } from './status'
import { LockableTable } from './lockable'
import { kitTarget, ngbTarget } from './targets'

const badgeVariant: Record<Stage, 'default' | 'secondary' | 'outline'> = {
  modern: 'default',
  components: 'secondary',
  bootstrap: 'outline',
}
const filterLabel: Record<Stage, string> = {
  modern: 'Legacy-free',
  components: 'PrimeNG / ngb',
  bootstrap: 'Bootstrap',
}
const usage = (u: Record<string, number>) =>
  Object.values(u).reduce((a, b) => a + b, 0)

// A count that opens a list; used for imported units with hits and for library usage.
// Everything about one module: its units by stage, stylesheets with residue, lockable
// directories and files outside a unit. Shown in the Modules view when a module is selected.
export function ModuleDetail({
  section,
  detail,
  compare,
  all,
}: {
  section: string
  detail: DetailView
  compare: DetailView
  // Unscoped detail: imported units may live in other modules.
  all: DetailView
}) {
  const [filter, setFilter] = useState<Stage | 'all'>('all')
  const summary = detail.sections.find((s) => s.name === section)!
  const before = compare.sections.find((s) => s.name === section)
  const units = detail.units.filter(
    (u) => u.section === section && (filter === 'all' || stageOf(u) === filter),
  )
  const files = detail.files.filter((f) => f.section === section)
  const styles: StyleFile[] = detail.styles.filter((f) => f.section === section)
  const lockable = detail.lockable.filter((l) =>
    l.dir.startsWith(`app/${section}/`),
  )
  // Memoized so row cells keep their DOM (and popover state) when the filter changes.
  const unitColumns = useMemo<ColumnDef<UnitView, unknown>[]>(() => {
    const kit = new Set(detail.kit)
    const unitById = new Map(all.units.map((u) => [u.id, u]))
    const previous = new Map(compare.units.map((u) => [u.id, u]))
    const styleOwners = new Map<string, number>()
    for (const u of all.units)
      for (const s of u.styles)
        styleOwners.set(s, (styleOwners.get(s) ?? 0) + 1)
    return [
      {
        id: 'unit',
        header: 'Unit',
        accessorFn: (u) =>
          u.selector ?? unitFile(u).replace(`app/${section}/`, ''),
        sortDescFirst: false,
        meta: {
          className: 'min-w-56 whitespace-normal [overflow-wrap:anywhere]',
          sticky: true,
        },
        cell: ({ row, getValue }) => (
          <a
            className="underline underline-offset-4"
            href={sourceUrl(detail.commit, unitFile(row.original))}
            title={unitFile(row.original)}
          >
            {getValue<string>()}
          </a>
        ),
      },
      {
        id: 'stage',
        header: 'Stage',
        accessorFn: (u) => stages.indexOf(stageOf(u)),
        sortDescFirst: false,
        meta: { className: 'whitespace-normal [&>*]:my-0.5' },
        cell: ({ row }) => (
          <>
            <Badge
              variant={badgeVariant[stageOf(row.original)]}
              title={stageLabel[stageOf(row.original)]}
            >
              {filterLabel[stageOf(row.original)]}
            </Badge>
            {row.original.status === 'locked' && (
              <Badge variant="outline" className="ml-1">
                locked
              </Badge>
            )}
          </>
        ),
      },
      {
        id: 'hits',
        header: 'Hits',
        accessorFn: (u) => hits(u),
        meta: { align: 'right' },
        cell: ({ row }) => {
          const u = row.original
          const shared = u.styles.find((s) => (styleOwners.get(s) ?? 0) > 1)
          return (
            <>
              <ValueDelta
                value={hits(u)}
                previous={previous.get(u.id) && hits(previous.get(u.id)!)}
              />
              {u.styleHits > 0 && (
                <span className="block text-xs text-muted-foreground">
                  {u.styleHits} scss
                  {shared && `, shared by ${styleOwners.get(shared)}`}
                </span>
              )}
            </>
          )
        },
      },
      {
        id: 'imported',
        header: 'Imported hits',
        accessorKey: 'closureHits',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const u = row.original
          if (!u.blockers.length) return null
          const blockers = u.blockers
            .map((id) => unitById.get(id)!)
            .sort((a, b) => hits(b) - hits(a))
          return (
            <ListPopover
              label={`${number(u.closureHits)} in ${blockers.length}`}
              title="Imported units that still carry Bootstrap"
              items={blockers.map((b) => ({
                key: b.id,
                left: (
                  <a
                    className="truncate underline underline-offset-4"
                    href={sourceUrl(detail.commit, unitFile(b))}
                  >
                    {b.selector ?? b.id}
                  </a>
                ),
                right: <span className="tabular-nums">{hits(b)}</span>,
              }))}
            />
          )
        },
      },
      {
        id: 'classes',
        header: 'Bootstrap classes',
        accessorFn: (u) => Object.keys(u.tokens).length,
        meta: { className: 'min-w-56 whitespace-normal' },
        cell: ({ row }) => {
          const tokens = Object.entries(row.original.tokens).sort(
            (a, b) => b[1] - a[1],
          )
          return (
            <>
              {tokens.slice(0, 4).map(([token, n]) => (
                <code key={token} className="mr-1 text-xs">
                  {token}
                  {n > 1 ? `×${n}` : ''}
                </code>
              ))}
              {tokens.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{tokens.length - 4}
                </span>
              )}
            </>
          )
        },
      },
      {
        id: 'spacing',
        header: 'Spacing',
        accessorKey: 'spacing',
        meta: { align: 'right' },
        cell: ({ getValue }) => getValue<number>() || '',
      },
      {
        id: 'libraries',
        header: 'PrimeNG / ngb',
        accessorFn: (u) => usage(u.primeng) + usage(u.ngBootstrap),
        meta: { align: 'right' },
        cell: ({ row }) => {
          const u = row.original
          if (!usage(u.primeng) && !usage(u.ngBootstrap)) return null
          const entries = [
            ...Object.entries(u.primeng).map(
              ([name, n]) => [name, n, kitTarget(name, kit)] as const,
            ),
            ...Object.entries(u.ngBootstrap).map(
              ([name, n]) => [name, n, ngbTarget(name, kit)] as const,
            ),
          ]
          return (
            <ListPopover
              label={`${usage(u.primeng)} / ${usage(u.ngBootstrap)}`}
              title="Library usage and kit component"
              items={entries.map(([name, n, target]) => ({
                key: name,
                left: (
                  <span>
                    <code>{name}</code>
                    {n > 1 && (
                      <span className="text-muted-foreground"> ×{n}</span>
                    )}
                  </span>
                ),
                right: (
                  <span className="text-muted-foreground">
                    {target ? `→ ${target}` : 'no kit target'}
                  </span>
                ),
              }))}
            />
          )
        },
      },
      {
        id: 'tumUi',
        header: 'TUM UI',
        accessorFn: (u) => usage(u.tumUi),
        meta: { align: 'right' },
        cell: ({ getValue }) => getValue<number>() || '',
      },
    ]
  }, [detail, compare, all, section])
  const styleColumns: ColumnDef<StyleFile, unknown>[] = [
    {
      id: 'file',
      header: 'Stylesheet',
      accessorKey: 'path',
      sortDescFirst: false,
      meta: {
        className: 'min-w-48 whitespace-normal [overflow-wrap:anywhere]',
      },
      cell: ({ getValue }) => (
        <a
          className="underline underline-offset-4"
          href={sourceUrl(detail.commit, getValue<string>())}
        >
          {getValue<string>().replace(`app/${section}/`, '')}
        </a>
      ),
    },
    {
      id: 'variables',
      header: '--bs-* vars',
      accessorKey: 'variables',
      meta: { align: 'right' },
      cell: ({ getValue }) => getValue<number>() || '',
    },
    {
      id: 'colors',
      header: 'Raw colors',
      accessorKey: 'colors',
      meta: { align: 'right' },
      cell: ({ getValue }) => getValue<number>() || '',
    },
    {
      id: 'imports',
      header: 'Sass imports',
      accessorKey: 'imports',
      meta: { align: 'right' },
      cell: ({ getValue }) => getValue<number>() || '',
    },
    {
      id: 'units',
      header: 'Used by units',
      accessorKey: 'units',
      meta: { align: 'right' },
      cell: ({ getValue }) => getValue<number>() || '',
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{section} module</h2>
        </CardTitle>
        <CardDescription>
          {number(summary.units)} units · {number(hits(summary))} Bootstrap hits
          {before && (
            <>
              {' '}
              (<Delta value={hits(summary) - hits(before)} /> vs. comparison)
            </>
          )}
          {summary.units > 0 &&
            ` · ${percent(summary.legacyFree, summary.units)} legacy-free · ${summary.locked} locked`}
        </CardDescription>
        {summary.units > 0 && (
          <StageBar
            counts={{
              modern: summary.legacyFree,
              components: summary.units - summary.legacyFree - summary.dirty,
              bootstrap: summary.dirty,
            }}
            legend
          />
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-6">
        {lockable.length > 0 && (
          <section className="grid gap-2">
            <h3 className="font-semibold">Lockable directories</h3>
            <p className="text-sm text-muted-foreground">
              Nothing under these directories has Bootstrap left; the copied
              entries go into the three Artemis lists.
            </p>
            <LockableTable lockable={lockable} commit={detail.commit} />
          </section>
        )}
        <section className="grid gap-3">
          <h3 className="font-semibold">Units</h3>
          <p className="text-sm text-muted-foreground">
            Every component and directive of the module. Hits are Bootstrap hits
            in its own template and styles; imported hits are in units it
            imports (open the count for the list); PrimeNG / ngb opens the
            usages with the TUM UI component that replaces each.
          </p>
          <DataTable
            columns={unitColumns}
            data={units}
            initialSorting={[
              { id: 'hits', desc: true },
              { id: 'imported', desc: true },
            ]}
            search="Search units"
            getRowId={(u) => u.id}
            toolbar={
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                className="flex-wrap"
                value={filter}
                onValueChange={(v) => v && setFilter(v as Stage | 'all')}
                aria-label="Filter units by stage"
              >
                <ToggleGroupItem value="all" className="flex-none px-3">
                  All
                </ToggleGroupItem>
                {stages.map((s) => (
                  <ToggleGroupItem key={s} value={s} className="flex-none px-3">
                    {filterLabel[s]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            }
          />
        </section>
        {styles.length > 0 && (
          <section className="grid gap-2">
            <h3 className="font-semibold">Stylesheets with residue</h3>
            <DataTable
              columns={styleColumns}
              data={styles}
              initialSorting={[{ id: 'units', desc: true }]}
              getRowId={(f) => f.path}
            />
          </section>
        )}
        {files.length > 0 && (
          <section className="grid gap-2">
            <h3 className="font-semibold">Files outside a unit</h3>
            <ul className="grid gap-1 text-sm">
              {files.map((f) => (
                <li key={f.path} className="flex justify-between gap-3">
                  <a
                    className="underline underline-offset-4 [overflow-wrap:anywhere]"
                    href={sourceUrl(detail.commit, f.path)}
                  >
                    {f.path.replace(`app/${section}/`, '')}
                  </a>
                  <span className="tabular-nums">{hits(f)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
