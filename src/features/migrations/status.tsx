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

export function StatusBar({
  counts,
  legend = false,
  className,
}: {
  counts: Record<Status, number>
  legend?: boolean
  className?: string
}) {
  const total = statuses.reduce((n, s) => n + counts[s], 0)
  const summary = statuses
    .map((s) => `${statusLabel[s]} ${counts[s]}`)
    .join(', ')
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={summary}
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-sm bg-status-dirty"
      >
        {statuses.map(
          (s) =>
            counts[s] > 0 && (
              <div
                key={s}
                className={statusFill[s]}
                style={{ width: `${(counts[s] / Math.max(total, 1)) * 100}%` }}
              />
            ),
        )}
      </div>
      {legend && (
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {statuses.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn('size-2.5 rounded-xs', statusFill[s])}
              />
              <dt className="text-muted-foreground">{statusLabel[s]}</dt>
              <dd className="tabular-nums">
                {number(counts[s])}{' '}
                <span className="text-muted-foreground">
                  ({percent(counts[s], total)})
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
