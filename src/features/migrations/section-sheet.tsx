import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  sourceUrl,
  statuses,
  type Detail,
  type Status,
  type Unit,
} from './model'
import { number, percent, short, statusLabel } from './format'
import { Delta, StatusBar } from './status'
import { LockableTable } from './lockable'

const badgeVariant: Record<Status, 'default' | 'secondary' | 'outline'> = {
  locked: 'default',
  clean: 'secondary',
  dirty: 'outline',
}
const filterLabel: Record<Status, string> = {
  locked: 'Locked',
  clean: 'Clean',
  dirty: 'Bootstrap',
}
const total = (u: Unit) => u.classHits + u.styleHits
const usage = (u: Record<string, number>) =>
  Object.values(u).reduce((a, b) => a + b, 0)

export function SectionSheet({
  section,
  detail,
  compare,
  onClose,
}: {
  section: string | undefined
  detail: Detail
  compare: Detail
  onClose: () => void
}) {
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const summary = detail.sections.find((s) => s.name === section)
  const before = compare.sections.find((s) => s.name === section)
  const units = detail.units
    .filter(
      (u) => u.section === section && (filter === 'all' || u.status === filter),
    )
    .sort(
      (a, b) =>
        total(b) - total(a) ||
        b.closureHits - a.closureHits ||
        a.id.localeCompare(b.id),
    )
  const files = detail.files.filter((f) => f.section === section)
  const lockable = detail.lockable.filter((l) =>
    l.dir.startsWith(`src/main/webapp/app/${section}/`),
  )
  const unitById = new Map(detail.units.map((u) => [u.id, u]))
  return (
    <Sheet open={!!section} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-5xl">
        {summary && (
          <>
            <SheetHeader>
              <SheetTitle>{section}</SheetTitle>
              <SheetDescription>
                {number(summary.units)} units ·{' '}
                {number(summary.classHits + summary.styleHits)} hits
                {before && (
                  <>
                    {' '}
                    (
                    <Delta
                      value={
                        summary.classHits +
                        summary.styleHits -
                        (before.classHits + before.styleHits)
                      }
                    />{' '}
                    vs. comparison)
                  </>
                )}
                {summary.units > 0 &&
                  ` · ${percent(summary.locked + summary.clean, summary.units)} Bootstrap-free`}
              </SheetDescription>
              {summary.units > 0 && (
                <StatusBar
                  counts={{
                    locked: summary.locked,
                    clean: summary.clean,
                    dirty: summary.dirty,
                  }}
                  legend
                />
              )}
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
              <div className="grid gap-6">
                {lockable.length > 0 && (
                  <section className="grid gap-2">
                    <h3 className="font-semibold">Lockable directories</h3>
                    <LockableTable lockable={lockable} commit={detail.commit} />
                  </section>
                )}
                <section className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Units</h3>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      value={filter}
                      onValueChange={(v) => v && setFilter(v as Status | 'all')}
                      aria-label="Filter units by status"
                    >
                      <ToggleGroupItem value="all">All</ToggleGroupItem>
                      {statuses.map((s) => (
                        <ToggleGroupItem key={s} value={s} className="px-3">
                          {filterLabel[s]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Unit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Hits</TableHead>
                        <TableHead className="text-right">Rendered</TableHead>
                        <TableHead className="w-[28%]">
                          Bootstrap classes
                        </TableHead>
                        <TableHead className="w-24 text-right">
                          PrimeNG / ngb
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((u) => {
                        const blockers = u.blockers
                          .map((id) => unitById.get(id)!)
                          .sort((a, b) => total(b) - total(a))
                        const tokens = Object.entries(u.tokens).sort(
                          (a, b) => b[1] - a[1],
                        )
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="whitespace-normal">
                              <a
                                className="underline underline-offset-4 break-all"
                                href={sourceUrl(
                                  detail.commit,
                                  u.template ?? u.id,
                                )}
                              >
                                {short(u.template ?? u.id).replace(
                                  `app/${section}/`,
                                  '',
                                )}
                              </a>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant={badgeVariant[u.status]}>
                                {statusLabel[u.status]}
                              </Badge>
                              {u.status === 'dirty' && usage(u.tumUi) > 0 && (
                                <Badge variant="destructive" className="ml-1">
                                  mixed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {total(u) || ''}
                              {u.styleHits > 0 && (
                                <span className="text-muted-foreground">
                                  {' '}
                                  ({u.styleHits} scss)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {blockers.length > 0 ? (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <button
                                      type="button"
                                      className="underline decoration-dotted underline-offset-4"
                                    >
                                      {number(u.closureHits)} in{' '}
                                      {blockers.length}
                                    </button>
                                  </HoverCardTrigger>
                                  <HoverCardContent
                                    align="end"
                                    className="z-[60] w-96 text-sm"
                                  >
                                    <p className="mb-2 font-medium">
                                      Rendered units still carrying Bootstrap
                                    </p>
                                    <ul className="grid gap-1">
                                      {blockers.slice(0, 12).map((b) => (
                                        <li
                                          key={b.id}
                                          className="flex justify-between gap-3"
                                        >
                                          <a
                                            className="truncate underline underline-offset-4"
                                            href={sourceUrl(
                                              detail.commit,
                                              b.template ?? b.id,
                                            )}
                                          >
                                            {b.selector ?? short(b.id)}
                                          </a>
                                          <span className="tabular-nums">
                                            {total(b)}
                                          </span>
                                        </li>
                                      ))}
                                      {blockers.length > 12 && (
                                        <li className="text-muted-foreground">
                                          and {blockers.length - 12} more
                                        </li>
                                      )}
                                    </ul>
                                  </HoverCardContent>
                                </HoverCard>
                              ) : u.closureHits > 0 ? (
                                number(u.closureHits)
                              ) : (
                                ''
                              )}
                            </TableCell>
                            <TableCell className="whitespace-normal">
                              {tokens.slice(0, 4).map(([token, n]) => (
                                <code key={token} className="mr-1 text-xs">
                                  {token}
                                  {n > 1 ? `×${n}` : ''}
                                </code>
                              ))}
                              {tokens.length > 4 && (
                                <span className="text-xs text-muted-foreground">
                                  +{tokens.length - 4}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {usage(u.primeng) || usage(u.ngBootstrap)
                                ? `${usage(u.primeng)} / ${usage(u.ngBootstrap)}`
                                : ''}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </section>
                {files.length > 0 && (
                  <section className="grid gap-2">
                    <h3 className="font-semibold">Files outside a unit</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File</TableHead>
                          <TableHead className="text-right">Hits</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files.map((f) => (
                          <TableRow key={f.path}>
                            <TableCell>
                              <a
                                className="underline underline-offset-4 break-all"
                                href={sourceUrl(detail.commit, f.path)}
                              >
                                {short(f.path)}
                              </a>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {f.classHits + f.styleHits}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </section>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
