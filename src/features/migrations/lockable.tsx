import { Copy } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { lockEntries, sourceUrl, type Detail } from './model'
import { copyText } from './clipboard'

function copyEntries(dirs: string[]) {
  const entries = dirs.map(lockEntries)
  const text = [
    '// eslint.config.mjs · no-bootstrap-classes files',
    ...entries.map((e) => e.eslint),
    '// .stylelintrc.json · hex / --bs- override files',
    ...entries.map((e) => e.stylelint),
    '// src/main/webapp/tailwind.css',
    ...entries.map((e) => e.tailwind),
  ].join('\n')
  copyText(
    text,
    `Copied lock entries for ${dirs.length} director${dirs.length === 1 ? 'y' : 'ies'}`,
  )
}

type Lockable = Detail['lockable'][number]

export function LockableTable({
  lockable,
  commit,
  isNew,
}: {
  lockable: Detail['lockable']
  commit: string
  isNew?: (dir: string) => boolean
}) {
  if (!lockable.length) return null
  const columns: ColumnDef<Lockable, unknown>[] = [
    {
      id: 'dir',
      header: 'Directory',
      accessorKey: 'dir',
      sortDescFirst: false,
      meta: {
        className: 'min-w-48 whitespace-normal [overflow-wrap:anywhere]',
      },
      cell: ({ row }) => (
        <>
          <a
            className="underline underline-offset-4"
            href={sourceUrl(commit, row.original.dir)}
          >
            {row.original.dir}
          </a>
          {isNew?.(row.original.dir) && (
            <Badge variant="secondary" className="ml-2">
              new
            </Badge>
          )}
        </>
      ),
    },
    {
      id: 'section',
      header: 'Module',
      accessorFn: (l) => l.dir.split('/')[1],
      sortDescFirst: false,
    },
    {
      id: 'units',
      header: 'Units',
      accessorKey: 'units',
      meta: { align: 'right' },
    },
    {
      id: 'copy',
      header: () => <span className="sr-only">Copy</span>,
      enableSorting: false,
      meta: { className: 'w-10' },
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Copy lock entries for ${row.original.dir}`}
          onClick={() => copyEntries([row.original.dir])}
        >
          <Copy aria-hidden="true" />
        </Button>
      ),
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={lockable}
      initialSorting={[{ id: 'units', desc: true }]}
      search="Search directories"
      maxHeight="max-h-[24rem]"
      getRowId={(l) => l.dir}
      toolbar={
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyEntries(lockable.map((l) => l.dir))}
        >
          <Copy aria-hidden="true" /> Copy all {lockable.length} lock entries
        </Button>
      }
    />
  )
}
