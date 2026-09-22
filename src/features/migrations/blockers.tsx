import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { sourceUrl } from './model'
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
  const rows = detail.units
    .filter((u) => u.blocks > 0)
    .sort((a, b) => b.blocks - a.blocks || hits(a) - hits(b))
    .slice(0, 10)
  if (!rows.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Shared units with Bootstrap that block the most</h2>
        </CardTitle>
        <CardDescription>
          Units with Bootstrap that Bootstrap-free, unlocked units import. Few
          hits and many dependants means a cheap fix with a large effect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Blocks</TableHead>
              <TableHead className="text-right">Own hits</TableHead>
              <TableHead>Bootstrap classes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="max-w-md">
                  <a
                    className="underline underline-offset-4 break-all"
                    href={sourceUrl(detail.commit, unitFile(u))}
                  >
                    {u.selector ?? u.id}
                  </a>
                  {u.status === 'locked' && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      locked · hits outside its templates
                    </span>
                  )}
                </TableCell>
                <TableCell>{u.section}</TableCell>
                <TableCell className="text-right">
                  <ValueDelta
                    value={u.blocks}
                    previous={before.get(u.id)?.blocks}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {hits(u)}
                </TableCell>
                <TableCell>
                  {Object.entries(u.tokens)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([token]) => (
                      <code key={token} className="mr-1 text-xs">
                        {token}
                      </code>
                    ))}
                  {u.styleHits > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {u.styleHits} scss
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
