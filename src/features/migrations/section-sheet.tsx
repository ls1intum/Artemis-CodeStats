import { useRef, useState, type RefObject } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { appRoot, sourceUrl, statuses, type Detail, type Status } from './model'
import {
  free,
  hits,
  number,
  percent,
  short,
  statusLabel,
  unitFile,
} from './format'
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
const usage = (u: Record<string, number>) =>
  Object.values(u).reduce((a, b) => a + b, 0)

function SectionBody({
  section,
  detail,
  compare,
}: {
  section: string
  detail: Detail
  compare: Detail
}) {
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const summary = detail.sections.find((s) => s.name === section)!
  const before = compare.sections.find((s) => s.name === section)
  const unitById = new Map(detail.units.map((u) => [u.id, u]))
  const styleOwners = new Map<string, number>()
  for (const u of detail.units)
    for (const s of u.styles) styleOwners.set(s, (styleOwners.get(s) ?? 0) + 1)
  const units = detail.units
    .filter(
      (u) => u.section === section && (filter === 'all' || u.status === filter),
    )
    .sort(
      (a, b) =>
        b.classHits - a.classHits ||
        b.styleHits - a.styleHits ||
        b.closureHits - a.closureHits ||
        a.id.localeCompare(b.id),
    )
  const files = detail.files.filter((f) => f.section === section)
  const lockable = detail.lockable.filter((l) =>
    l.dir.startsWith(`${appRoot}/${section}/`),
  )
  return (
    <>
      <SheetHeader>
        <SheetTitle>{section}</SheetTitle>
        <SheetDescription>
          {number(summary.units)} units · {number(hits(summary))} hits
          {before && (
            <>
              {' '}
              (<Delta value={hits(summary) - hits(before)} /> vs. comparison)
            </>
          )}
          {summary.units > 0 &&
            ` · ${percent(free(summary), summary.units)} Bootstrap-free`}
        </SheetDescription>
        {summary.units > 0 && <StatusBar counts={summary} legend />}
      </SheetHeader>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-6 overflow-y-auto px-4 pb-4">
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
              <ToggleGroupItem value="all" className="flex-none px-3">
                All
              </ToggleGroupItem>
              {statuses.map((s) => (
                <ToggleGroupItem key={s} value={s} className="flex-none px-3">
                  {filterLabel[s]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Hits</TableHead>
                <TableHead className="text-right">Imports with hits</TableHead>
                <TableHead>Bootstrap classes</TableHead>
                <TableHead className="text-right">PrimeNG / ngb</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) => {
                const blockers = u.blockers
                  .map((id) => unitById.get(id)!)
                  .sort((a, b) => hits(b) - hits(a))
                const tokens = Object.entries(u.tokens).sort(
                  (a, b) => b[1] - a[1],
                )
                const shared = u.styles.find(
                  (s) => (styleOwners.get(s) ?? 0) > 1,
                )
                return (
                  <TableRow key={u.id}>
                    <TableCell className="min-w-40 whitespace-normal">
                      <a
                        className="break-all underline underline-offset-4"
                        href={sourceUrl(detail.commit, unitFile(u))}
                      >
                        {short(unitFile(u)).replace(`app/${section}/`, '')}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant[u.status]}>
                        {statusLabel[u.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {hits(u) || ''}
                      {u.styleHits > 0 && (
                        <span className="text-muted-foreground">
                          {' '}
                          ({u.styleHits} scss
                          {shared && `, shared by ${styleOwners.get(shared)}`})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {blockers.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="underline decoration-dotted underline-offset-4"
                            >
                              {number(u.closureHits)} in {blockers.length}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-96 text-sm">
                            <p className="mb-2 font-medium">
                              Imported units that still carry Bootstrap
                            </p>
                            <ul className="grid gap-1">
                              {blockers.slice(0, 12).map((b) => (
                                <li
                                  key={b.id}
                                  className="flex justify-between gap-3"
                                >
                                  <a
                                    className="truncate underline underline-offset-4"
                                    href={sourceUrl(detail.commit, unitFile(b))}
                                  >
                                    {b.selector ?? short(b.id)}
                                  </a>
                                  <span className="tabular-nums">
                                    {hits(b)}
                                  </span>
                                </li>
                              ))}
                              {blockers.length > 12 && (
                                <li className="text-muted-foreground">
                                  and {blockers.length - 12} more
                                </li>
                              )}
                            </ul>
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                    <TableCell className="min-w-40 whitespace-normal">
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
                    <TableCell className="whitespace-normal">
                      <a
                        className="break-all underline underline-offset-4"
                        href={sourceUrl(detail.commit, f.path)}
                      >
                        {short(f.path)}
                      </a>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {hits(f)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )}
      </div>
    </>
  )
}

export function SectionSheet({
  section,
  detail,
  compare,
  onClose,
  opener,
}: {
  section: string | undefined
  detail: Detail
  compare: Detail
  onClose: () => void
  opener: RefObject<HTMLElement | null>
}) {
  const body = useRef<HTMLDivElement>(null)
  return (
    <Sheet open={!!section} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full gap-0 sm:max-w-5xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          body.current?.focus()
        }}
        // Without a SheetTrigger, Radix would leave focus on <body> after closing.
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          opener.current?.focus()
          opener.current = null
        }}
      >
        {section && (
          <div
            ref={body}
            tabIndex={-1}
            className="flex min-h-0 flex-1 flex-col gap-4 outline-none"
          >
            <SectionBody
              key={section}
              section={section}
              detail={detail}
              compare={compare}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
