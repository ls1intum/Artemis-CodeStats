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
import type { Detail } from './model'
import { free, hits, number, percent } from './format'
import { Delta, StatusBar } from './status'

export function Sections({
  detail,
  compare,
  onSelect,
}: {
  detail: Detail
  compare: Detail
  onSelect: (section: string, trigger: HTMLElement) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Sections</h2>
        </CardTitle>
        <CardDescription>
          Most remaining Bootstrap first. Open a section for its units, what
          blocks them and its lock entries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead>Bootstrap-free</TableHead>
              <TableHead className="text-right">Hits</TableHead>
              <TableHead className="text-right">Δ hits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.sections.map((s) => {
              const before = compare.sections.find((c) => c.name === s.name)
              return (
                <TableRow key={s.name}>
                  <TableCell>
                    <button
                      type="button"
                      className="font-medium underline underline-offset-4"
                      onClick={(event) => onSelect(s.name, event.currentTarget)}
                    >
                      {s.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number(s.units)}
                  </TableCell>
                  <TableCell>
                    {s.units > 0 && (
                      <span className="flex items-center gap-2">
                        <StatusBar className="w-24" counts={s} />
                        <span className="tabular-nums">
                          {percent(free(s), s.units)}
                        </span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number(hits(s))}
                  </TableCell>
                  <TableCell className="text-right">
                    {before && <Delta value={hits(s) - hits(before)} />}
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
