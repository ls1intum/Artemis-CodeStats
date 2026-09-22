import type { ColumnDef } from '@tanstack/react-table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/data-table'
import {
  inventoryOf,
  sourceUrl,
  type InventoryEntry,
  type StyleFile,
} from './model'
import type { DetailView } from './load-report'
import { number } from './format'
import { Delta, ValueDelta } from './status'
import { bootstrapTarget, kitCoverage, kitTarget, ngbTarget } from './targets'
import { family } from './targets'

type Row = InventoryEntry & {
  previous?: InventoryEntry
  gone: boolean
  target: string
}

// Current and disappeared entries merged, each with its change since the comparison.
const merge = (
  entries: InventoryEntry[],
  previous: InventoryEntry[],
  target: (name: string) => string,
): Row[] => {
  const before = new Map(previous.map((e) => [e.name, e]))
  const names = new Set(entries.map((e) => e.name))
  return [
    ...entries.map((e) => ({
      ...e,
      previous: before.get(e.name),
      gone: false,
      target: target(e.name),
    })),
    ...previous
      .filter((e) => !names.has(e.name))
      .map((e) => ({
        ...e,
        occurrences: 0,
        units: 0,
        previous: e,
        gone: true,
        target: target(e.name),
      })),
  ]
}

function InventoryTable({
  rows,
  targetLabel,
  positive = 'down',
  kind,
}: {
  rows: Row[]
  targetLabel?: string
  positive?: 'down' | 'up'
  kind?: boolean
}) {
  const columns: ColumnDef<Row, unknown>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      sortDescFirst: false,
      cell: ({ row }) => (
        <code className={row.original.gone ? 'line-through' : undefined}>
          {row.original.name}
        </code>
      ),
    },
    ...(kind
      ? [
          {
            id: 'kind',
            header: 'Kind',
            accessorFn: (r: Row) => family(r.name),
            sortDescFirst: false,
          } satisfies ColumnDef<Row, unknown>,
        ]
      : []),
    {
      id: 'occurrences',
      header: 'Occurrences',
      accessorKey: 'occurrences',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <ValueDelta
          value={row.original.occurrences}
          previous={row.original.previous?.occurrences ?? 0}
          positive={positive}
        />
      ),
    },
    {
      id: 'delta',
      header: 'Δ',
      accessorFn: (r) => r.occurrences - (r.previous?.occurrences ?? 0),
      meta: { align: 'right' },
      sortDescFirst: false,
      cell: ({ getValue }) =>
        getValue<number>() !== 0 && (
          <Delta value={getValue<number>()} positive={positive} />
        ),
    },
    {
      id: 'units',
      header: 'Units',
      accessorKey: 'units',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <ValueDelta
          value={row.original.units}
          previous={row.original.previous?.units ?? 0}
          positive={positive}
        />
      ),
    },
    ...(targetLabel
      ? [
          {
            id: 'target',
            header: targetLabel,
            accessorKey: 'target',
            sortDescFirst: false,
            meta: { className: 'text-muted-foreground' },
            cell: ({ row }) =>
              row.original.gone ? 'gone since comparison' : row.original.target,
          } satisfies ColumnDef<Row, unknown>,
        ]
      : []),
  ]
  return (
    <DataTable
      columns={columns}
      data={rows}
      initialSorting={[{ id: 'occurrences', desc: true }]}
      search="Search"
      maxHeight="max-h-[32rem]"
      getRowId={(r) => r.name}
      rowClassName={(r) =>
        r.original.gone ? 'text-muted-foreground' : undefined
      }
    />
  )
}

function Coverage({
  entries,
  target,
  library,
}: {
  entries: InventoryEntry[]
  target: (name: string) => string
  library: string
}) {
  const [covered, total] = kitCoverage(entries, target)
  const gaps = entries
    .filter((e) => {
      const t = target(e.name)
      return !t || t.startsWith('no ')
    })
    .filter((e) => /^(p-|ngb-|p[A-Z]|ngb[A-Z])/.test(e.name))
    .slice(0, 8)
  return (
    <p className="text-sm text-muted-foreground">
      {number(covered)} of {number(total)} {library} usages have a TUM UI
      component to move to.
      {gaps.length > 0 && (
        <>
          {' '}
          Largest gaps without a kit component:{' '}
          {gaps.map((g, i) => (
            <span key={g.name}>
              {i > 0 && ', '}
              <code>{g.name}</code> ({g.occurrences})
            </span>
          ))}
          .
        </>
      )}
    </p>
  )
}

const inventories = (detail: DetailView) => ({
  bootstrap: inventoryOf([
    ...detail.units.map((u) => u.tokens),
    ...detail.files.map((f) => f.tokens),
  ]),
  primeng: inventoryOf(detail.units.map((u) => u.primeng)),
  ngBootstrap: inventoryOf(detail.units.map((u) => u.ngBootstrap)),
  tumUi: inventoryOf(detail.units.map((u) => u.tumUi)),
})

export function Inventory({
  detail,
  compare,
}: {
  detail: DetailView
  compare: DetailView
}) {
  const kit = new Set(detail.kit)
  const inventory = inventories(detail)
  const previous = inventories(compare)
  const used = new Set(inventory.tumUi.map((e) => e.name))
  const unused = detail.kit.filter((s) => !used.has(s))
  const previousStyles = new Map(compare.styles.map((f) => [f.path, f]))
  const styleColumns: ColumnDef<StyleFile, unknown>[] = [
    {
      id: 'file',
      header: 'File',
      accessorKey: 'path',
      sortDescFirst: false,
      meta: { className: 'whitespace-normal' },
      cell: ({ getValue }) => (
        <a
          className="break-all underline underline-offset-4"
          href={sourceUrl(detail.commit, getValue<string>())}
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
    ...(['variables', 'colors', 'imports'] as const).map(
      (key): ColumnDef<StyleFile, unknown> => ({
        id: key,
        header: {
          variables: '--bs-* vars',
          colors: 'Raw colors',
          imports: 'Sass imports',
        }[key],
        accessorKey: key,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <ValueDelta
            value={row.original[key]}
            previous={previousStyles.get(row.original.path)?.[key] ?? 0}
          />
        ),
      }),
    ),
    {
      id: 'total',
      header: 'Total',
      accessorFn: (f) => f.variables + f.colors + f.imports,
      meta: { align: 'right' },
      cell: ({ getValue }) => number(getValue<number>()),
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
          <h2>What remains, and what replaces it</h2>
        </CardTitle>
        <CardDescription>
          Bootstrap classes, PrimeNG and ng-bootstrap elements, directives and
          services still in the client at this snapshot with their change
          against the comparison, and the Tailwind utility or TUM UI component
          that replaces them where the guideline or the kit provides one; plus
          kit usage and stylesheet residue. Every column sorts; sort by Δ to see
          what a change retired.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bootstrap">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="bootstrap">
              Bootstrap classes ({inventory.bootstrap.length})
            </TabsTrigger>
            <TabsTrigger value="primeng">
              PrimeNG ({inventory.primeng.length})
            </TabsTrigger>
            <TabsTrigger value="ngBootstrap">
              ng-bootstrap ({inventory.ngBootstrap.length})
            </TabsTrigger>
            <TabsTrigger value="tumUi">
              TUM UI kit ({detail.kit.length - unused.length} of{' '}
              {detail.kit.length} selectors used)
            </TabsTrigger>
            <TabsTrigger value="styles">
              Stylesheets ({detail.styles.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="bootstrap">
            <InventoryTable
              rows={merge(
                inventory.bootstrap,
                previous.bootstrap,
                bootstrapTarget,
              )}
              targetLabel="Target"
              kind
            />
          </TabsContent>
          <TabsContent value="primeng" className="grid gap-3">
            <Coverage
              entries={inventory.primeng}
              target={(n) => kitTarget(n, kit)}
              library="PrimeNG"
            />
            <InventoryTable
              rows={merge(inventory.primeng, previous.primeng, (n) =>
                kitTarget(n, kit),
              )}
              targetLabel="Kit component"
            />
          </TabsContent>
          <TabsContent value="ngBootstrap" className="grid gap-3">
            <Coverage
              entries={inventory.ngBootstrap}
              target={(n) => ngbTarget(n, kit)}
              library="ng-bootstrap"
            />
            <InventoryTable
              rows={merge(inventory.ngBootstrap, previous.ngBootstrap, (n) =>
                ngbTarget(n, kit),
              )}
              targetLabel="Kit component"
            />
          </TabsContent>
          <TabsContent value="styles" className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              SCSS files with residue the stylelint lock rejects:{' '}
              <code>--bs-*</code> variables and raw colors, plus Bootstrap Sass
              imports that block removing the dependency. Files under{' '}
              <code>content/scss/themes</code> define the theme palette itself.
            </p>
            <DataTable
              columns={styleColumns}
              data={detail.styles}
              initialSorting={[{ id: 'total', desc: true }]}
              search="Search stylesheets"
              maxHeight="max-h-[32rem]"
              getRowId={(f) => f.path}
            />
          </TabsContent>
          <TabsContent value="tumUi" className="grid gap-4">
            <InventoryTable
              rows={merge(inventory.tumUi, previous.tumUi, () => '')}
              positive="up"
            />
            {unused.length > 0 && (
              <p className="text-sm text-muted-foreground">
                In the kit, not used by the client yet:{' '}
                {unused.map((s) => (
                  <code key={s} className="mr-1">
                    {s}
                  </code>
                ))}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
