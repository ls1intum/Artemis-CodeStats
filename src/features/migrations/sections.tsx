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
import { number, percent } from './format'
import { Delta, StatusBar } from './status'

export function Sections({
  detail,
  compare,
  onSelect,
}: {
  detail: Detail
  compare: Detail
  onSelect: (section: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Sections</h2>
        </CardTitle>
        <CardDescription>
          Top-level client directories, most remaining Bootstrap first. Open a
          section for its units, blockers and lock entries.
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
              <TableHead className="text-right">Lockable dirs</TableHead>
              <TableHead className="text-right">External blockers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.sections.map((s) => {
              const before = compare.sections.find((c) => c.name === s.name)
              const hits = s.classHits + s.styleHits
              return (
                <TableRow key={s.name}>
                  <TableCell>
                    <button
                      type="button"
                      className="font-medium underline underline-offset-4"
                      onClick={() => onSelect(s.name)}
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
                        <StatusBar
                          className="w-24"
                          counts={{
                            locked: s.locked,
                            clean: s.clean,
                            dirty: s.dirty,
                          }}
                        />
                        <span className="tabular-nums">
                          {percent(s.locked + s.clean, s.units)}
                        </span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number(hits)}
                  </TableCell>
                  <TableCell className="text-right">
                    {before && (
                      <Delta
                        value={hits - (before.classHits + before.styleHits)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.lockableDirs || ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.blockers || ''}
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
