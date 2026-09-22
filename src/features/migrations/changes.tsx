import type { ColumnDef } from '@tanstack/react-table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import { commitUrl, pullRequest, type Summary } from './model'
import { day, hits } from './format'
import { Delta } from './status'

type Change = Summary & {
  hits: number
  legacyFree: number
  primeng: number
  ngBootstrap: number
  tumUi: number
  locks: number
}

export function Changes({
  series,
  snapshot,
  compare,
}: {
  series: Summary[]
  snapshot: Summary
  compare: Summary
}) {
  const from = series.findIndex((s) => s.commit === compare.commit)
  const to = series.findIndex((s) => s.commit === snapshot.commit)
  if (from < 0 || to <= from) return null
  const rows: Change[] = series
    .slice(from + 1, to + 1)
    .map((s, i) => {
      const p = series[from + i].totals
      return {
        ...s,
        hits: hits(s.totals) - hits(p),
        legacyFree: s.totals.legacyFree - p.legacyFree,
        primeng: s.totals.primeng - p.primeng,
        ngBootstrap: s.totals.ngBootstrap - p.ngBootstrap,
        tumUi: s.totals.tumUi - p.tumUi,
        locks: s.totals.lockedDirs - p.lockedDirs,
      }
    })
    .filter(
      (r) =>
        r.hits ||
        r.legacyFree ||
        r.primeng ||
        r.ngBootstrap ||
        r.tumUi ||
        r.locks,
    )
  if (!rows.length) return null
  const delta = (
    id: keyof Change & string,
    header: string,
    positive: 'down' | 'up',
  ): ColumnDef<Change, unknown> => ({
    id,
    header,
    accessorKey: id,
    meta: { align: 'right' },
    sortDescFirst: positive === 'up',
    cell: ({ getValue }) =>
      getValue<number>() !== 0 && (
        <Delta value={getValue<number>()} positive={positive} />
      ),
  })
  const columns: ColumnDef<Change, unknown>[] = [
    {
      id: 'date',
      header: 'Date',
      accessorFn: (r) => Date.parse(r.date),
      meta: { className: 'whitespace-nowrap' },
      cell: ({ row }) => day(row.original.date),
    },
    {
      id: 'commit',
      header: 'Commit',
      accessorFn: (r) => pullRequest(r.subject).title,
      sortDescFirst: false,
      meta: { className: 'max-w-md whitespace-normal' },
      cell: ({ row }) => {
        const pr = pullRequest(row.original.subject)
        return (
          <>
            <a
              className="underline underline-offset-4"
              href={pr.url ?? commitUrl(row.original.commit)}
            >
              {pr.number ? `#${pr.number}` : row.original.commit.slice(0, 8)}
            </a>{' '}
            <span className="text-muted-foreground">{pr.title}</span>
            {row.original.locks !== 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {row.original.locks > 0 ? '+' : ''}
                {row.original.locks} lock entr
                {Math.abs(row.original.locks) === 1 ? 'y' : 'ies'}
              </span>
            )}
          </>
        )
      },
    },
    delta('hits', 'Δ Bootstrap hits', 'down'),
    delta('legacyFree', 'Δ legacy-free units', 'up'),
    delta('primeng', 'Δ PrimeNG units', 'down'),
    delta('ngBootstrap', 'Δ ng-bootstrap units', 'down'),
    delta('tumUi', 'Δ TUM UI units', 'up'),
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Commits that moved the numbers</h2>
        </CardTitle>
        <CardDescription>
          Every commit between {day(compare.date)} and {day(snapshot.date)} that
          changed a total, largest Bootstrap change first; search by title.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={rows}
          initialSorting={[{ id: 'hits', desc: false }]}
          search="Search commits"
          maxHeight="max-h-[24rem]"
          getRowId={(r) => r.commit}
        />
      </CardContent>
    </Card>
  )
}
