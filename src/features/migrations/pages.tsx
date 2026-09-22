import { useState } from 'react'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { sourceUrl, stageOf, type UnitView } from './model'
import type { DetailView } from './load-report'
import { hits, number, unitFile } from './format'
import { SegmentBar } from './status'

type PageState = 'modern' | 'components' | 'blocked' | 'bootstrap'
const state = (u: UnitView): PageState =>
  hits(u) > 0
    ? 'bootstrap'
    : u.closureHits + u.routeHits > 0
      ? 'blocked'
      : stageOf(u) === 'components' ||
          u.closureComponents + u.routeComponents > 0
        ? 'components'
        : 'modern'
const stateLabel: Record<PageState, string> = {
  modern: 'Legacy-free',
  components: 'Bootstrap-free, PrimeNG or ng-bootstrap remain',
  blocked: 'Bootstrap in imported or parent units',
  bootstrap: 'Bootstrap in the page itself',
}
const shortLabel: Record<PageState, string> = {
  modern: 'Legacy-free',
  components: 'Components',
  blocked: 'Blocked',
  bootstrap: 'Bootstrap',
}
const stateFill: Record<PageState, string> = {
  modern: 'bg-status-locked',
  components: 'bg-status-clean',
  blocked: 'bg-status-blocked',
  bootstrap: 'bg-status-dirty',
}
const states: PageState[] = ['modern', 'components', 'blocked', 'bootstrap']

// Routed pages are what users see; a page is ready when nothing it imports carries Bootstrap.
export function Pages({ detail }: { detail: DetailView }) {
  const [filter, setFilter] = useState<PageState | 'all'>('all')
  const pages = detail.units.filter((u) => u.route !== undefined)
  const counts = (list: UnitView[]) =>
    states.map((s) => ({
      label: stateLabel[s],
      value: list.filter((u) => state(u) === s).length,
      className: stateFill[s],
    }))
  const sections = [...new Set(pages.map((u) => u.section))]
    .map((name) => ({ name, pages: pages.filter((u) => u.section === name) }))
    .sort((a, b) => b.pages.length - a.pages.length)
  const remaining = (u: UnitView) => hits(u) + u.closureHits + u.routeHits
  const rows = pages
    .filter((u) => filter === 'all' || state(u) === filter)
    .sort(
      (a, b) =>
        states.indexOf(state(a)) - states.indexOf(state(b)) ||
        remaining(a) - remaining(b) ||
        a.route!.localeCompare(b.route!),
    )
  const shell = detail.units.find((u) => u.id === 'app/app.component.ts')
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Routed pages</h2>
          </CardTitle>
          <CardDescription>
            Components reached from <code>app.routes.ts</code> through{' '}
            <code>component</code>, <code>loadComponent</code>,{' '}
            <code>children</code> and <code>loadChildren</code>. A page is
            legacy-free when it, what it imports and the route components it
            renders inside use neither Bootstrap, PrimeNG nor ng-bootstrap.
            {shell && hits(shell) + shell.closureHits > 0 && (
              <>
                {' '}
                The global shell (<code>{unitFile(shell)}</code> with navbar,
                footer and overlays) carries{' '}
                {number(hits(shell) + shell.closureHits)} hits and renders on
                every page; it is not counted here.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SegmentBar segments={counts(pages)} legend />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead className="w-64">Pages</TableHead>
                {states.map((st) => (
                  <TableHead key={st} className="text-right">
                    {shortLabel[st]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((s) => {
                const c = counts(s.pages)
                return (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <SegmentBar segments={c} />
                    </TableCell>
                    {c.map((x) => (
                      <TableCell
                        key={x.label}
                        className="text-right tabular-nums"
                      >
                        {x.value || ''}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1.5">
              <CardTitle asChild>
                <h2>Pages by remaining work</h2>
              </CardTitle>
              <CardDescription>
                Cheapest first within each state: fewest hits in the page, its
                imports and its parent routes.
              </CardDescription>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={filter}
              onValueChange={(v) => v && setFilter(v as PageState | 'all')}
              aria-label="Filter pages by state"
            >
              <ToggleGroupItem value="all" className="flex-none px-3">
                All
              </ToggleGroupItem>
              {states.map((s) => (
                <ToggleGroupItem key={s} value={s} className="flex-none px-3">
                  {shortLabel[s]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="max-h-[40rem] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="text-right">Own hits</TableHead>
                <TableHead className="text-right">Imported hits</TableHead>
                <TableHead className="text-right">Parent route hits</TableHead>
                <TableHead className="text-right">Units to fix</TableHead>
                <TableHead className="text-right">
                  Units with PrimeNG / ngb
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <code className="text-xs">{u.route || '/'}</code>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <a
                      className="underline underline-offset-4"
                      href={sourceUrl(detail.commit, unitFile(u))}
                    >
                      {u.selector ?? unitFile(u)}
                    </a>
                  </TableCell>
                  <TableCell>{u.section}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {hits(u) || ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.closureHits ? number(u.closureHits) : ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.routeHits ? number(u.routeHits) : ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.blockers.length + (hits(u) > 0 ? 1 : 0) || ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.closureComponents +
                      u.routeComponents +
                      (stageOf(u) === 'components' ? 1 : 0) || ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
