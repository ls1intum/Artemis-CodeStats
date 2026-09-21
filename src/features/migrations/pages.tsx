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
import { sourceUrl, type Detail, type Unit } from './model'
import { hits, number, short, unitFile } from './format'
import { SegmentBar } from './status'

type PageState = 'ready' | 'blocked' | 'bootstrap'
const state = (u: Unit): PageState =>
  hits(u) > 0 ? 'bootstrap' : u.closureHits > 0 ? 'blocked' : 'ready'
const stateLabel: Record<PageState, string> = {
  ready: 'Imports no Bootstrap',
  blocked: 'Blocked by imported units',
  bootstrap: 'Bootstrap in the page itself',
}
const stateFill: Record<PageState, string> = {
  ready: 'bg-status-locked',
  blocked: 'bg-status-clean',
  bootstrap: 'bg-status-dirty',
}
const states: PageState[] = ['ready', 'blocked', 'bootstrap']

// Routed pages are what users see; a page is ready when nothing it imports carries Bootstrap.
export function Pages({ detail }: { detail: Detail }) {
  const [filter, setFilter] = useState<PageState | 'all'>('all')
  const pages = detail.units.filter((u) => u.route !== undefined)
  const counts = (list: Unit[]) =>
    states.map((s) => ({
      label: stateLabel[s],
      value: list.filter((u) => state(u) === s).length,
      className: stateFill[s],
    }))
  const sections = [...new Set(pages.map((u) => u.section))]
    .map((name) => ({ name, pages: pages.filter((u) => u.section === name) }))
    .sort((a, b) => b.pages.length - a.pages.length)
  const rows = pages
    .filter((u) => filter === 'all' || state(u) === filter)
    .sort(
      (a, b) =>
        states.indexOf(state(a)) - states.indexOf(state(b)) ||
        a.closureHits + hits(a) - (b.closureHits + hits(b)) ||
        a.route!.localeCompare(b.route!),
    )
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Routed pages</h2>
          </CardTitle>
          <CardDescription>
            Components referenced by <code>component</code> or{' '}
            <code>loadComponent</code> in route files. A page is ready when
            neither it nor anything it imports carries Bootstrap; blocked pages
            only need their imported units fixed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SegmentBar segments={counts(pages)} legend />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead className="w-64">Pages</TableHead>
                <TableHead className="text-right">Ready</TableHead>
                <TableHead className="text-right">Blocked</TableHead>
                <TableHead className="text-right">Bootstrap</TableHead>
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
                Cheapest first within each state: fewest hits in the page and
                its imports.
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
                  {s === 'ready'
                    ? 'Ready'
                    : s === 'blocked'
                      ? 'Blocked'
                      : 'Bootstrap'}
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
                <TableHead className="text-right">Units to fix</TableHead>
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
                      className="break-all underline underline-offset-4"
                      href={sourceUrl(detail.commit, unitFile(u))}
                    >
                      {u.selector ?? short(unitFile(u))}
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
                    {u.blocked + (hits(u) > 0 ? 1 : 0) || ''}
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
