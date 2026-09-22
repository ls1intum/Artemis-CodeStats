import { useState } from 'react'
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
import { commitUrl, pullRequest, type Summary } from './model'
import { day, number, percent } from './format'
import { AuthorName } from './author'
import { changeColumns } from './change-columns'
import {
  contributions,
  leaderboard,
  progressed,
  type Contributor,
} from './contributions'

type Window = 'adoption' | 'compare'

const count = (
  id: keyof Contributor & string,
  header: string,
  hide0 = true,
): ColumnDef<Row, unknown> => ({
  id,
  header,
  accessorKey: id,
  meta: { align: 'right' },
  cell: ({ getValue }) =>
    hide0 && getValue<number>() === 0 ? '' : number(getValue<number>()),
})

const commitLink = (c: Contributor['last']) => {
  const pr = pullRequest(c.subject)
  return (
    <a
      className="underline underline-offset-4"
      href={pr.url ?? commitUrl(c.commit)}
      title={pr.title}
    >
      {pr.number ? `#${pr.number}` : c.commit.slice(0, 8)}
    </a>
  )
}

type Row = Contributor & { share: number }

const columns: ColumnDef<Row, unknown>[] = [
  {
    id: 'rank',
    header: '#',
    accessorKey: 'rank',
    sortDescFirst: false,
    meta: { align: 'right', className: 'w-10 text-muted-foreground' },
  },
  {
    id: 'author',
    header: 'Contributor',
    accessorFn: (r) => r.author.name,
    sortDescFirst: false,
    meta: { className: 'whitespace-nowrap', sticky: true },
    cell: ({ row }) => <AuthorName author={row.original.author} />,
  },
  count('prs', 'PRs'),
  count('hitsRemoved', 'Hits removed'),
  {
    id: 'share',
    header: 'Share',
    accessorFn: (r) => r.share,
    meta: { align: 'right', className: 'text-muted-foreground' },
    cell: ({ getValue }) =>
      getValue<number>() ? percent(getValue<number>(), 1) : '',
  },
  count('legacyFree', 'Legacy-free', false),
  count('primeng', 'PrimeNG'),
  count('ngBootstrap', 'ng-bootstrap'),
  count('tumUi', 'TUM UI'),
  count('locks', 'Locked dirs'),
  {
    id: 'hitsAdded',
    header: 'Hits added',
    accessorKey: 'hitsAdded',
    meta: { align: 'right' },
    cell: ({ getValue }) =>
      getValue<number>() > 0 && (
        <span className="text-destructive">{number(getValue<number>())}</span>
      ),
  },
  {
    id: 'last',
    header: 'Last progress',
    accessorFn: (r) => Date.parse(r.last.date),
    meta: { align: 'right', className: 'whitespace-nowrap' },
    cell: ({ row }) => (
      <>
        <span className="text-muted-foreground">
          {day(row.original.last.date)}
        </span>{' '}
        {commitLink(row.original.last)}
      </>
    ),
  },
  {
    id: 'first',
    header: 'Active since',
    accessorFn: (r) => Date.parse(r.first.date),
    sortDescFirst: false,
    meta: {
      align: 'right',
      className: 'whitespace-nowrap text-muted-foreground',
    },
    cell: ({ row }) => day(row.original.first.date, true),
  },
]

const stat = (value: number, label: string) => (
  <span className="grid">
    <span className="text-xl font-semibold tabular-nums">{number(value)}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </span>
)

// Who moved the migration: progress per author, with the top three called out.
export function Contributors({
  series,
  compare,
}: {
  series: Summary[]
  compare: Summary
}) {
  const [window, setWindow] = useState<Window>('adoption')
  const all = contributions(series)
  const since = Date.parse(compare.date)
  const rows =
    window === 'compare' ? all.filter((c) => Date.parse(c.date) > since) : all
  const removed = rows.reduce(
    (n, c) =>
      n + (c.attributable && !c.ruleChanged && c.hits < 0 ? -c.hits : 0),
    0,
  )
  const board: Row[] = leaderboard(rows).map((r) => ({
    ...r,
    share: removed ? r.hitsRemoved / removed : 0,
  }))
  const latest = all.filter(progressed).slice(-15)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Contributors</h2>
          </CardTitle>
          <CardDescription>
            Every integrated commit counts for its author as GitHub records it.
            Ranked by Bootstrap hits removed, then by units made legacy-free;
            every column sorts. PRs are commits that made progress on any
            measure; Share is the part of all hits removed in the window.
            Legacy-free, PrimeNG, ng-bootstrap and TUM UI are net unit counts
            (removed, or added for TUM UI), so a commit that adds legacy
            subtracts. Hits added stays visible next to the progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-5">
          {board.length > 0 && (
            <ol className="grid gap-3 sm:grid-cols-3" aria-label="Top three">
              {board.slice(0, 3).map((r) => (
                <li
                  key={r.key}
                  className="grid gap-3 rounded-lg border p-4 data-[rank=1]:border-progress"
                  data-rank={r.rank}
                >
                  <span className="flex items-start justify-between gap-2">
                    <AuthorName author={r.author} size="lg" />
                    <span className="text-sm font-medium text-muted-foreground">
                      #{r.rank}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-x-5 gap-y-2">
                    {stat(
                      r.hitsRemoved,
                      r.share
                        ? `hits removed · ${percent(r.share, 1)}`
                        : 'hits removed',
                    )}
                    {stat(r.legacyFree, 'units legacy-free')}
                    {stat(r.prs, r.prs === 1 ? 'PR' : 'PRs')}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <DataTable
            columns={columns}
            data={board}
            initialSorting={[{ id: 'rank', desc: false }]}
            search="Search contributors"
            getRowId={(r) => r.key}
            empty="No progress in this window."
            toolbar={
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={window}
                onValueChange={(v) => v && setWindow(v as Window)}
                aria-label="Window"
              >
                <ToggleGroupItem value="adoption" className="flex-none px-3">
                  Since adoption
                </ToggleGroupItem>
                <ToggleGroupItem value="compare" className="flex-none px-3">
                  Since {day(compare.date)}
                </ToggleGroupItem>
              </ToggleGroup>
            }
          />
        </CardContent>
      </Card>
      {latest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>Latest progress</h2>
            </CardTitle>
            <CardDescription>
              The last {latest.length} commits up to the snapshot that reduced
              legacy or adopted TUM UI, newest first. Δ hits is Bootstrap hits;
              the other deltas count units.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={changeColumns}
              data={latest}
              initialSorting={[{ id: 'date', desc: true }]}
              search="Search progress"
              maxHeight="max-h-[28rem]"
              getRowId={(r) => r.commit}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
