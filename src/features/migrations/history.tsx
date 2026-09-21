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
import { commitUrl, type Manifest, type Summary } from './model'
import { day, free, hits, number, percent } from './format'
import { Delta } from './status'

// Checkpoints only: the per-commit series is on the burndown, and every checkpoint has a detail file.
export function History({
  manifest,
  points,
}: {
  manifest: Manifest
  points: Summary[]
}) {
  const base = import.meta.env.BASE_URL
  const label = (s: Summary) =>
    s.commit === manifest.baseline
      ? 'kit pilot'
      : s.commit === manifest.packageAdoption
        ? 'package adoption'
        : ''
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Checkpoints</h2>
          </CardTitle>
          <CardDescription>
            Weekly checkpoints, both milestones and the latest commit. Each has
            a full detail file; every commit in between has totals in the
            history file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead className="text-right">Hits</TableHead>
                <TableHead className="text-right">Δ</TableHead>
                <TableHead className="text-right">Bootstrap-free</TableHead>
                <TableHead className="text-right">Locked</TableHead>
                <TableHead className="text-right">Lock entries</TableHead>
                <TableHead className="text-right">Pages ready</TableHead>
                <TableHead className="text-right">PrimeNG units</TableHead>
                <TableHead className="text-right">TUM UI units</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Detail</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...points].reverse().map((s, i, all) => {
                const previous = all[i + 1]
                const t = s.totals
                return (
                  <TableRow key={s.commit}>
                    <TableCell className="whitespace-nowrap">
                      {day(s.date, true)}
                      {label(s) && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {label(s)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <a
                        className="underline underline-offset-4"
                        href={commitUrl(s.commit)}
                      >
                        {s.commit.slice(0, 8)}
                      </a>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {number(hits(t))}
                    </TableCell>
                    <TableCell className="text-right">
                      {previous && (
                        <Delta value={hits(t) - hits(previous.totals)} />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {percent(free(t), t.units)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {number(t.locked)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.lockedDirs}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.pagesClean} / {t.pages}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.primeng}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.tumUi}
                    </TableCell>
                    <TableCell>
                      <a
                        className="text-xs underline underline-offset-4"
                        href={`${base}migrations/${s.commit}.json`}
                      >
                        JSON
                      </a>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Data and agent entry points</h2>
          </CardTitle>
          <CardDescription>
            Everything on this page is derived from static JSON that is
            regenerated hourly. Agents and scripts can read the same files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-[14rem_1fr]">
            <dt className="font-medium">
              <a
                className="underline underline-offset-4"
                href={`${base}migrations/brief.md`}
              >
                migrations/brief.md
              </a>
            </dt>
            <dd>
              Current status, directories to lock with the exact entries, shared
              units to fix first, and per-section unit tasks with
              class-to-target mappings. Written for coding agents; paste it or
              point an agent at the URL.
            </dd>
            <dt className="font-medium">
              <a
                className="underline underline-offset-4"
                href={`${base}migrations/brief.json`}
              >
                migrations/brief.json
              </a>
            </dt>
            <dd>The same brief as structured data.</dd>
            <dt className="font-medium">
              <a
                className="underline underline-offset-4"
                href={`${base}migrations/index.json`}
              >
                migrations/index.json
              </a>
            </dt>
            <dd>
              Totals and per-section rows for every first-parent commit since
              package adoption, with commit subjects.
            </dd>
            <dt className="font-medium">
              <a
                className="underline underline-offset-4"
                href={`${base}llms.txt`}
              >
                llms.txt
              </a>
            </dt>
            <dd>Index of these files for language-model tooling.</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
