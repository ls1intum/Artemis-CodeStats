import type { ColumnDef } from '@tanstack/react-table'
import { commitUrl, pullRequest } from './model'
import { day } from './format'
import { Delta } from './status'
import { AuthorName } from './author'
import type { Contribution } from './contributions'

const delta = (
  id: keyof Contribution & string,
  header: string,
  positive: 'down' | 'up',
): ColumnDef<Contribution, unknown> => ({
  id,
  header,
  accessorKey: id,
  meta: { align: 'right' },
  sortDescFirst: positive === 'up',
  cell: ({ row, getValue }) =>
    getValue<number>() !== 0 && (
      <Delta
        value={getValue<number>()}
        positive={positive}
        className={
          id === 'hits' && row.original.ruleChanged
            ? 'line-through opacity-60'
            : undefined
        }
      />
    ),
})

export const changeColumns: ColumnDef<Contribution, unknown>[] = [
  {
    id: 'date',
    header: 'Date',
    accessorFn: (r) => Date.parse(r.date),
    meta: { className: 'whitespace-nowrap' },
    cell: ({ row }) => day(row.original.date),
  },
  {
    id: 'author',
    header: 'Author',
    accessorFn: (r) => r.author.name,
    sortDescFirst: false,
    meta: { className: 'whitespace-nowrap' },
    cell: ({ row }) => <AuthorName author={row.original.author} />,
  },
  {
    id: 'commit',
    header: 'Commit',
    accessorFn: (r) => pullRequest(r.subject).title,
    sortDescFirst: false,
    meta: { className: 'max-w-md whitespace-normal' },
    cell: ({ row }) => {
      const c = row.original
      const pr = pullRequest(c.subject)
      return (
        <>
          <a
            className="underline underline-offset-4"
            href={pr.url ?? commitUrl(c.commit)}
          >
            {pr.number ? `#${pr.number}` : c.commit.slice(0, 8)}
          </a>{' '}
          <span className="text-muted-foreground">{pr.title}</span>
          {c.locks !== 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {c.locks > 0 ? '+' : ''}
              {c.locks} lock entr{Math.abs(c.locks) === 1 ? 'y' : 'ies'}
            </span>
          )}
          {!c.attributable && (
            <span className="ml-2 text-xs text-muted-foreground">
              weekly sample: the change of every commit in that week
            </span>
          )}
          {c.ruleChanged && (
            <span className="ml-2 text-xs text-muted-foreground">
              Bootstrap rule changed: hits are not comparable
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
