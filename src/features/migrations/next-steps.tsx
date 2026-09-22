import { Badge } from '@/components/ui/badge'
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
import { inventoryOf, sourceUrl, stageOf, type Summary } from './model'
import type { DetailView } from './load-report'
import { day, hits, number, unitFile } from './format'
import { ValueDelta } from './status'
import { Blockers } from './blockers'
import { LockableTable } from './lockable'
import { bootstrapTarget, kitTarget, ngbTarget } from './targets'

// Units one small change away from legacy-free: few hits, nothing imported with Bootstrap.
function QuickWins({ detail }: { detail: DetailView }) {
  const rows = detail.units
    .filter(
      (u) =>
        stageOf(u) !== 'modern' &&
        hits(u) <= 3 &&
        u.closureHits === 0 &&
        u.status !== 'locked',
    )
    .sort(
      (a, b) =>
        hits(a) +
          Object.keys(a.primeng).length +
          Object.keys(a.ngBootstrap).length -
          (hits(b) +
            Object.keys(b.primeng).length +
            Object.keys(b.ngBootstrap).length) || a.id.localeCompare(b.id),
    )
  if (!rows.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Quick wins</h2>
        </CardTitle>
        <CardDescription>
          {number(rows.length)} units with at most three Bootstrap hits that
          import nothing with Bootstrap. Each becomes legacy-free with one small
          change; a directory of them can be locked right after.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[28rem] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Hits</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 40).map((u) => {
              const kit = new Set(detail.kit)
              const steps = [
                ...Object.keys(u.tokens).map(
                  (t) => `${t} → ${bootstrapTarget(t) || '?'}`,
                ),
                ...(u.styleHits ? [`${u.styleHits} SCSS residue`] : []),
                ...Object.keys(u.primeng)
                  .filter((n) => /^p(?:-|[A-Z])/.test(n))
                  .map((n) => `${n} → ${kitTarget(n, kit) || '?'}`),
                ...Object.keys(u.ngBootstrap).map(
                  (n) => `${n} → ${ngbTarget(n, kit) || '?'}`,
                ),
              ]
              return (
                <TableRow key={u.id}>
                  <TableCell className="whitespace-normal">
                    <a
                      className="break-all underline underline-offset-4"
                      href={sourceUrl(detail.commit, unitFile(u))}
                    >
                      {u.selector ?? unitFile(u)}
                    </a>
                  </TableCell>
                  <TableCell>{u.section}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {hits(u) || ''}
                  </TableCell>
                  <TableCell className="whitespace-normal text-xs">
                    {steps.slice(0, 5).map((step) => (
                      <code key={step} className="mr-2">
                        {step}
                      </code>
                    ))}
                    {steps.length > 5 && (
                      <span className="text-muted-foreground">
                        +{steps.length - 5}
                      </span>
                    )}
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

// PrimeNG and ng-bootstrap usages the kit cannot replace yet: the design-system backlog.
function KitGaps({ detail }: { detail: DetailView }) {
  const kit = new Set(detail.kit)
  const gaps = [
    ...inventoryOf(detail.units.map((u) => u.primeng)).map((e) => ({
      ...e,
      library: 'PrimeNG',
      target: kitTarget(e.name, kit),
    })),
    ...inventoryOf(detail.units.map((u) => u.ngBootstrap)).map((e) => ({
      ...e,
      library: 'ng-bootstrap',
      target: ngbTarget(e.name, kit),
    })),
  ]
    .filter(
      (e) =>
        /^(p-|ngb-|p[A-Z]|ngb[A-Z])/.test(e.name) &&
        (!e.target || e.target.startsWith('no ')),
    )
    .sort((a, b) => b.units - a.units || b.occurrences - a.occurrences)
  if (!gaps.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Kit gaps</h2>
        </CardTitle>
        <CardDescription>
          Legacy components still in use that no TUM UI component covers at this
          commit. Units that use them cannot become legacy-free until the kit
          grows or the usage is redesigned.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[24rem] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usage</TableHead>
              <TableHead>Library</TableHead>
              <TableHead className="text-right">Occurrences</TableHead>
              <TableHead className="text-right">Units</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gaps.map((g) => (
              <TableRow key={`${g.library}:${g.name}`}>
                <TableCell>
                  <code>{g.name}</code>
                </TableCell>
                <TableCell>{g.library}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {number(g.occurrences)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {number(g.units)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// Sections with the least legacy left: finishing one is visible progress.
function ClosestSections({
  detail,
  compare,
  series,
}: {
  detail: DetailView
  compare: DetailView
  series: Summary[]
}) {
  const remaining = (s: (typeof detail.sections)[number]) =>
    s.units - s.legacyFree
  const rows = detail.sections
    .filter((s) => s.units > 0 && remaining(s) > 0)
    .sort((a, b) => remaining(a) - remaining(b) || hits(a) - hits(b))
    .slice(0, 8)
  if (!rows.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>Closest to legacy-free</h2>
        </CardTitle>
        <CardDescription>
          Sections with the fewest units left that still use Bootstrap, PrimeNG
          or ng-bootstrap.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Units left</TableHead>
              <TableHead className="text-right">Bootstrap hits</TableHead>
              <TableHead className="text-right">PrimeNG</TableHead>
              <TableHead className="text-right">ng-bootstrap</TableHead>
              <TableHead className="text-right">Last progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => {
              const before = compare.sections.find((c) => c.name === s.name)
              const progress = series.findLast((x, i) => {
                const row = x.sections[s.name]
                const prev = series[i - 1]?.sections[s.name]
                return (
                  !!row &&
                  !!prev &&
                  (row[4] + row[5] < prev[4] + prev[5] || row[6] > prev[6])
                )
              })
              return (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">
                    <ValueDelta
                      value={remaining(s)}
                      previous={before && remaining(before)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <ValueDelta
                      value={hits(s)}
                      previous={before && hits(before)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <ValueDelta value={s.primeng} previous={before?.primeng} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ValueDelta
                      value={s.ngBootstrap}
                      previous={before?.ngBootstrap}
                    />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {progress ? day(progress.date) : 'none since adoption'}
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

export function NextSteps({
  detail,
  compare,
  series,
}: {
  detail: DetailView
  compare: DetailView
  series: Summary[]
}) {
  const previouslyLockable = new Set(compare.lockable.map((l) => l.dir))
  const newLockable = detail.lockable.filter(
    (l) => !previouslyLockable.has(l.dir),
  ).length
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <QuickWins detail={detail} />
      {detail.lockable.length > 0 && (
        <Card id="lockable">
          <CardHeader>
            <CardTitle asChild>
              <h2>Lockable directories</h2>
            </CardTitle>
            <CardDescription>
              Nothing under these directories, nor anything they import, has
              Bootstrap left. Locking them is a configuration-only change to the
              three lists; the copied entries are ready to paste.
              {newLockable > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {newLockable} new since comparison
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[28rem] overflow-auto">
            <LockableTable
              lockable={detail.lockable}
              commit={detail.commit}
              isNew={(dir) => !previouslyLockable.has(dir)}
            />
          </CardContent>
        </Card>
      )}
      <Blockers detail={detail} compare={compare} />
      <KitGaps detail={detail} />
      <ClosestSections detail={detail} compare={compare} series={series} />
    </div>
  )
}
