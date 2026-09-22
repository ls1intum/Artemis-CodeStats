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
import { commitUrl, pullRequest, type Summary } from './model'
import { day, hits } from './format'
import { Delta } from './status'

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
  const rows = series
    .slice(from + 1, to + 1)
    .map((s, i) => {
      const previous = series[from + i]
      return {
        ...s,
        hits: hits(s.totals) - hits(previous.totals),
        legacyFree: s.totals.legacyFree - previous.totals.legacyFree,
        primeng: s.totals.primeng - previous.totals.primeng,
        ngBootstrap: s.totals.ngBootstrap - previous.totals.ngBootstrap,
        locks: s.totals.lockedDirs - previous.totals.lockedDirs,
      }
    })
    .filter(
      (r) => r.hits || r.legacyFree || r.primeng || r.ngBootstrap || r.locks,
    )
    .sort((a, b) => Math.abs(b.hits) - Math.abs(a.hits))
  if (!rows.length) return null
  const shown = rows.slice(0, 10)
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Commits that moved the numbers</h2>
        </CardTitle>
        <CardDescription>
          Between {day(compare.date)} and {day(snapshot.date)}, largest change
          first
          {rows.length > shown.length &&
            ` · ${rows.length - shown.length} smaller changes not shown`}
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Commit</TableHead>
              <TableHead className="text-right">Δ Bootstrap hits</TableHead>
              <TableHead className="text-right">Δ legacy-free units</TableHead>
              <TableHead className="text-right">Δ PrimeNG units</TableHead>
              <TableHead className="text-right">Δ ng-bootstrap units</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((row) => {
              const pr = pullRequest(row.subject)
              return (
                <TableRow key={row.commit}>
                  <TableCell className="whitespace-nowrap">
                    {day(row.date)}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <a
                      className="underline underline-offset-4"
                      href={pr.url ?? commitUrl(row.commit)}
                    >
                      {pr.number ? `#${pr.number}` : row.commit.slice(0, 8)}
                    </a>{' '}
                    <span className="text-muted-foreground">{pr.title}</span>
                    {row.locks !== 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {row.locks > 0 ? '+' : ''}
                        {row.locks} lock entr
                        {Math.abs(row.locks) === 1 ? 'y' : 'ies'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Delta value={row.hits} />
                  </TableCell>
                  <TableCell className="text-right">
                    {row.legacyFree !== 0 && (
                      <Delta value={row.legacyFree} positive="up" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.primeng !== 0 && <Delta value={row.primeng} />}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.ngBootstrap !== 0 && <Delta value={row.ngBootstrap} />}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
