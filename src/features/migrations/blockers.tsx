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
import { sourceUrl, type Detail } from './model'
import { number, short } from './format'

export function Blockers({ detail }: { detail: Detail }) {
  const rows = detail.units
    .filter((u) => u.blocks > 0)
    .sort(
      (a, b) =>
        b.blocks - a.blocks ||
        a.classHits + a.styleHits - (b.classHits + b.styleHits),
    )
    .slice(0, 12)
  if (!rows.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Shared units that block the most</h2>
        </CardTitle>
        <CardDescription>
          Units with Bootstrap that are rendered by Bootstrap-free units. Few
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
                    href={sourceUrl(detail.commit, u.template ?? u.id)}
                  >
                    {u.selector ?? short(u.id)}
                  </a>
                  {u.status === 'locked' && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      locked · residue outside templates
                    </span>
                  )}
                </TableCell>
                <TableCell>{u.section}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {number(u.blocks)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {u.classHits + u.styleHits}
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
