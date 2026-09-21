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
import {
  commitUrl,
  pullRequestNumber,
  pullRequestUrl,
  type Summary,
} from './model'
import { day } from './format'
import { Delta } from './status'

const hits = (s: Summary) => s.totals.classHits + s.totals.styleHits
const free = (s: Summary) => s.totals.locked + s.totals.clean

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
        hits: hits(s) - hits(previous),
        free: free(s) - free(previous),
        locks: s.totals.lockedDirs - previous.totals.lockedDirs,
      }
    })
    .filter((r) => r.hits || r.free || r.locks)
    .sort((a, b) => Math.abs(b.hits) - Math.abs(a.hits))
  if (!rows.length) return null
  const shown = rows.slice(0, 10)
  return (
    <Card>
      <CardHeader>
        <CardTitle>
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
              <TableHead className="text-right">Δ hits</TableHead>
              <TableHead className="text-right">
                Δ Bootstrap-free units
              </TableHead>
              <TableHead className="text-right">Δ lock entries</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((row) => {
              const pr = pullRequestNumber(row.subject)
              return (
                <TableRow key={row.commit}>
                  <TableCell className="whitespace-nowrap">
                    {day(row.date)}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <a
                      className="underline underline-offset-4"
                      href={pr ? pullRequestUrl(pr) : commitUrl(row.commit)}
                    >
                      {pr ? `#${pr}` : row.commit.slice(0, 8)}
                    </a>{' '}
                    <span className="text-muted-foreground">
                      {row.subject.replace(/\s*\(#\d+\)\s*$/, '')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Delta value={row.hits} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Delta value={row.free} positive="up" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Delta value={row.locks} positive="up" />
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
