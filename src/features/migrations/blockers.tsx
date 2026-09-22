import type { ColumnDef } from '@tanstack/react-table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import { sourceUrl, type UnitView } from './model'
import type { DetailView } from './load-report'
import { hits, unitFile } from './format'
import { ValueDelta } from './status'

export function Blockers({
  detail,
  compare,
}: {
  detail: DetailView
  compare: DetailView
}) {
  const before = new Map(compare.units.map((u) => [u.id, u]))
  const rows = detail.units.filter((u) => u.blocks > 0)
  if (!rows.length) return null
  const columns: ColumnDef<UnitView, unknown>[] = [
    {
      id: 'unit',
      header: 'Unit',
      accessorFn: (u) => u.selector ?? unitFile(u),
      sortDescFirst: false,
      meta: { className: 'whitespace-normal' },
      cell: ({ row, getValue }) => (
        <>
          <a
            className="break-all underline underline-offset-4"
            href={sourceUrl(detail.commit, unitFile(row.original))}
          >
            {getValue<string>()}
          </a>
          {row.original.status === 'locked' && (
            <span className="ml-2 text-xs text-muted-foreground">
              locked · hits outside its templates
            </span>
          )}
        </>
      ),
    },
    {
      id: 'section',
      header: 'Section',
      accessorKey: 'section',
      sortDescFirst: false,
    },
    {
      id: 'blocks',
      header: 'Blocks',
      accessorKey: 'blocks',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <ValueDelta
          value={row.original.blocks}
          previous={before.get(row.original.id)?.blocks}
        />
      ),
    },
    {
      id: 'hits',
      header: 'Own hits',
      accessorFn: (u) => hits(u),
      meta: { align: 'right' },
      sortDescFirst: false,
      cell: ({ row }) => (
        <ValueDelta
          value={hits(row.original)}
          previous={
            before.get(row.original.id) && hits(before.get(row.original.id)!)
          }
        />
      ),
    },
    {
      id: 'leverage',
      header: 'Units per hit',
      accessorFn: (u) => u.blocks / Math.max(hits(u), 1),
      meta: { align: 'right' },
      cell: ({ getValue }) => getValue<number>().toFixed(1),
    },
    {
      id: 'classes',
      header: 'Bootstrap classes',
      accessorFn: (u) => Object.keys(u.tokens).length,
      meta: { className: 'whitespace-normal' },
      cell: ({ row }) => (
        <>
          {Object.entries(row.original.tokens)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([token]) => (
              <code key={token} className="mr-1 text-xs">
                {token}
              </code>
            ))}
          {row.original.styleHits > 0 && (
            <span className="text-xs text-muted-foreground">
              {row.original.styleHits} scss
            </span>
          )}
        </>
      ),
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Shared units with Bootstrap that block the most</h2>
        </CardTitle>
        <CardDescription>
          Units with Bootstrap that Bootstrap-free, unlocked units import. Sort
          by units per hit for the cheapest fix with the largest effect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={rows}
          initialSorting={[
            { id: 'blocks', desc: true },
            { id: 'hits', desc: false },
          ]}
          search="Search blockers"
          maxHeight="max-h-[28rem]"
          getRowId={(u) => u.id}
        />
      </CardContent>
    </Card>
  )
}
