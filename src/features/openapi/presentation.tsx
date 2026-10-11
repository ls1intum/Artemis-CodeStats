import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Caller, NextStep, Provenance, SourceLocation } from './model'
import { sourceUrl } from './source'

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4">{children}</CardContent>
    </Card>
  )
}

export function State({ value }: { value: string }) {
  return <Badge variant="outline">{value}</Badge>
}

export function Source({
  provenance,
  location,
}: {
  provenance: Provenance
  location: SourceLocation
}) {
  const href = sourceUrl(provenance, location)
  const label = `${location.symbol ? `${location.symbol} · ` : ''}${location.path}:${location.line}`
  return href ? (
    <a href={href} className="break-all text-sm underline underline-offset-4">
      {label}
    </a>
  ) : (
    <span className="break-all text-sm">
      {label} (revision link unavailable)
    </span>
  )
}

export function PagedList<T extends { id: string }>({
  title,
  items,
  text,
  children,
  empty = 'No records in this scope.',
}: {
  title: string
  items: T[]
  text: (item: T) => string
  children: (item: T) => ReactNode
  empty?: string
}) {
  const [query, setQuery] = useState('')
  const [requestedPage, setPage] = useState(0)
  const filtered = query
    ? items.filter((item) =>
        text(item).toLowerCase().includes(query.toLowerCase()),
      )
    : items
  const page = Math.min(
    requestedPage,
    Math.max(0, Math.ceil(filtered.length / 20) - 1),
  )
  return (
    <div className="grid min-w-0 gap-3" aria-label={title}>
      <Input
        aria-label={`Search ${title.toLowerCase()}`}
        placeholder={`Search ${title.toLowerCase()}`}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setPage(0)
        }}
      />
      <p className="text-sm text-muted-foreground">
        {filtered.length.toLocaleString('en-US')} {title.toLowerCase()} ·{' '}
        {filtered.length
          ? `${page * 20 + 1}–${Math.min((page + 1) * 20, filtered.length)} shown`
          : empty}
      </p>
      <ul className="grid min-w-0 gap-3">
        {filtered.slice(page * 20, (page + 1) * 20).map((item) => (
          <li
            key={item.id}
            className="grid min-w-0 gap-2 rounded-md border p-3"
          >
            {children(item)}
          </li>
        ))}
      </ul>
      {filtered.length > 20 && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous {title.toLowerCase()}
          </Button>
          <span className="text-sm">
            Page {page + 1} of {Math.ceil(filtered.length / 20)}
          </span>
          <Button
            variant="outline"
            disabled={(page + 1) * 20 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Next {title.toLowerCase()}
          </Button>
        </div>
      )}
    </div>
  )
}

export function Evidence({
  provenance,
  locations,
}: {
  provenance: Provenance
  locations?: SourceLocation[]
}) {
  const [open, setOpen] = useState(false)
  if (!locations?.length) return null
  if (locations.length <= 5)
    return (
      <ul className="grid gap-1">
        {locations.map((location, index) => (
          <li key={index}>
            <Source provenance={provenance} location={location} />
          </li>
        ))}
      </ul>
    )
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm">
        Source evidence ({locations.length})
      </summary>
      {open && (
        <PagedList
          title="Source locations"
          items={locations.map((location, index) => ({
            ...location,
            id: String(index),
          }))}
          text={(location) =>
            `${location.symbol ?? ''} ${location.path}:${location.line}`
          }
        >
          {(location) => <Source provenance={provenance} location={location} />}
        </PagedList>
      )}
    </details>
  )
}

export function Assessment({
  title,
  value,
  provenance,
}: {
  title: string
  value: {
    state: string
    reason?: string
    basis?: string
    analysis?: string
    evidence?: SourceLocation[]
  }
  provenance: Provenance
}) {
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <h3 className="font-medium">{title}</h3>
      <div>
        <State value={value.state} />{' '}
        {value.analysis && <State value={value.analysis} />}
      </div>
      <p className="text-sm">{value.reason ?? value.basis}</p>
      <Evidence provenance={provenance} locations={value.evidence} />
    </div>
  )
}

export function CallerList({
  callers,
  provenance,
  title = 'Callers',
}: {
  callers: Caller[]
  provenance: Provenance
  title?: string
}) {
  return (
    <PagedList
      title={title}
      items={callers}
      text={(caller) =>
        `${caller.symbol} ${caller.area} ${caller.kind} ${caller.transport} ${caller.traffic} ${caller.mapping} ${caller.reason} ${caller.operationIds.join(' ')}`
      }
      empty="No detected callers; this does not establish server-only status or migration."
    >
      {(caller) => (
        <>
          <h3 className="font-medium break-all">{caller.symbol}</h3>
          <p className="text-sm">
            Caller area: <strong>{caller.area}</strong> ·{' '}
            <State value={caller.kind} /> <State value={caller.transport} />{' '}
            <State value={caller.traffic} /> <State value={caller.mapping} />
          </p>
          <p className="break-all text-sm">
            {caller.operationIds.join(', ') || 'Operation unresolved'}
            {caller.generatedMethodId &&
              ` · Generated method: ${caller.generatedMethodId}`}
          </p>
          <p className="text-sm">{caller.reason}</p>
          <Source provenance={provenance} location={caller.location} />
          {caller.via.length > 0 && (
            <div>
              <p className="text-sm font-medium">Transport chain</p>
              <Evidence provenance={provenance} locations={caller.via} />
            </div>
          )}
        </>
      )}
    </PagedList>
  )
}

export function StepList({
  steps,
  provenance,
  title = 'Next steps',
}: {
  steps: NextStep[]
  provenance: Provenance
  title?: string
}) {
  return (
    <PagedList
      title={title}
      items={steps}
      text={(step) =>
        `${step.category} ${step.moduleIds.join(' ')} ${step.operationIds.join(' ')} ${step.reason} ${step.action}`
      }
      empty="No recorded steps; missing assessments do not imply completion."
    >
      {(step) => (
        <>
          <div>
            <State value={step.category} />
          </div>
          <h3 className="font-medium">{step.action}</h3>
          <p className="text-sm">{step.reason}</p>
          <p className="break-all text-sm text-muted-foreground">
            {step.moduleIds.join(', ') || 'Shared or unassigned limitation'}
            {step.operationIds.length > 0 &&
              ` · ${step.operationIds.join(', ')}`}
          </p>
          <Evidence provenance={provenance} locations={step.evidence} />
        </>
      )}
    </PagedList>
  )
}
