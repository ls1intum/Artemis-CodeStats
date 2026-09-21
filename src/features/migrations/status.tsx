import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { statuses, type Status } from './model'
import { number, percent, statusLabel } from './format'

// Hits go down; adoption goes up. `positive` names the direction that is progress.
export function Delta({
  value,
  positive = 'down',
  className,
}: {
  value: number
  positive?: 'down' | 'up'
  className?: string
}) {
  if (value === 0)
    return (
      <span className={cn('text-muted-foreground tabular-nums', className)}>
        ±0
      </span>
    )
  const good = positive === 'down' ? value < 0 : value > 0
  const Icon = value < 0 ? ArrowDownRight : ArrowUpRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 tabular-nums',
        good ? 'text-progress' : 'text-destructive',
        className,
      )}
    >
      <Icon size={14} aria-hidden="true" />
      {value > 0 ? '+' : ''}
      {number(value)}
    </span>
  )
}

const statusFill: Record<Status, string> = {
  locked: 'bg-status-locked',
  clean: 'bg-status-clean',
  dirty: 'bg-status-dirty',
}

export type Segment = { label: string; value: number; className: string }

// A single-track stacked bar; segments are named in the accessible label and the legend.
export function SegmentBar({
  segments,
  legend = false,
  className,
}: {
  segments: Segment[]
  legend?: boolean
  className?: string
}) {
  const total = segments.reduce((n, s) => n + s.value, 0)
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-sm bg-muted"
      >
        {segments.map(
          (s) =>
            s.value > 0 && (
              <div
                key={s.label}
                className={s.className}
                style={{ width: `${(s.value / Math.max(total, 1)) * 100}%` }}
              />
            ),
        )}
      </div>
      {legend && (
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn('size-2.5 rounded-xs', s.className)}
              />
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="tabular-nums">
                {number(s.value)}{' '}
                <span className="text-muted-foreground">
                  ({percent(s.value, total)})
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

export function StatusBar({
  counts,
  legend = false,
  className,
}: {
  counts: Pick<Record<Status, number>, Status>
  legend?: boolean
  className?: string
}) {
  return (
    <SegmentBar
      className={className}
      legend={legend}
      segments={statuses.map((s) => ({
        label: statusLabel[s],
        value: counts[s],
        className: statusFill[s],
      }))}
    />
  )
}
