import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { lockEntries, sourceUrl, type Detail } from './model'
import { short } from './format'

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
  void navigator.clipboard
    .writeText(text)
    .then(() =>
      toast(
        `Copied lock entries for ${dirs.length} director${dirs.length === 1 ? 'y' : 'ies'}`,
      ),
    )
    .catch(() => toast.error('Clipboard unavailable'))
}

export function LockableTable({
  lockable,
  commit,
}: {
  lockable: Detail['lockable']
  commit: string
}) {
  if (!lockable.length) return null
  return (
    <div className="grid gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Directory</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Copy</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lockable.map(({ dir, units }) => (
            <TableRow key={dir}>
              <TableCell>
                <a
                  className="underline underline-offset-4 break-all"
                  href={sourceUrl(commit, dir)}
                >
                  {short(dir)}
                </a>
              </TableCell>
              <TableCell className="text-right tabular-nums">{units}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Copy lock entries for ${short(dir)}`}
                  onClick={() => copyEntries([dir])}
                >
                  <Copy aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() => copyEntries(lockable.map((l) => l.dir))}
      >
        <Copy aria-hidden="true" /> Copy all {lockable.length} lock entries
      </Button>
    </div>
  )
}
