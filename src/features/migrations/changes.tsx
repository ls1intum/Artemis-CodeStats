import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import type { Summary } from './model'
import { day } from './format'
import { changeColumns } from './change-columns'
import { contributions, moved } from './contributions'

// Every commit between the comparison and the snapshot that changed a total.
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
  const rows = contributions(series.slice(from, to + 1)).filter(moved)
  if (!rows.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Commits that moved the numbers</h2>
        </CardTitle>
        <CardDescription>
          Every commit between {day(compare.date)} and {day(snapshot.date)} that
          changed a total, largest Bootstrap change first; search by title or
          author. Δ hits is Bootstrap hits; the other deltas count units.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={changeColumns}
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
