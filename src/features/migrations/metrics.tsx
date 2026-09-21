import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import {
  dimensionKeys,
  dimensions,
  reduction,
  type Dimension,
  type Snapshot,
} from './model'

export function MigrationMetrics({
  current,
  compare,
  module,
  dimension,
  onSelect,
}: {
  current: Snapshot
  compare: Snapshot
  module: string
  dimension: Dimension | ''
  onSelect: (dimension: Dimension | undefined) => void
}) {
  const currentModule = current.modules.find((m) => m.name === module)
  const compareModule = compare.modules.find((m) => m.name === module)
  const currentCounts = currentModule?.counts ?? current.counts
  const compareCounts = compareModule?.counts ?? compare.counts
  const moduleValid = !module || (!!currentModule && !!compareModule)
  return (
    <section aria-labelledby="dimensions-title">
      <div className="mb-4">
        <h2 id="dimensions-title" className="text-xl font-semibold">
          Six dimensions. No misleading overall score.
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Counts are distinct affected files, not component instances or
          completion percentages. Cards select an evidence filter. Scope:{' '}
          <strong>{module || 'all modules'}</strong>.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dimensionKeys.map((key) => {
          const meta = dimensions[key]
          const value = currentCounts[key]
          const delta = value - compareCounts[key]
          const progress = reduction(compareCounts[key], value)
          return (
            <button
              key={key}
              aria-pressed={dimension === key}
              onClick={() => onSelect(dimension === key ? undefined : key)}
              className={`migration-metric text-left ${dimension === key ? 'ring-2 ring-blue-700' : ''}`}
            >
              <span className="flex justify-between items-center gap-2">
                <span className="font-semibold">{meta.label}</span>
                <span
                  className={`text-xs rounded-full px-2 py-1 ${meta.kind === 'legacy' ? 'bg-amber-50 text-amber-900' : 'bg-teal-50 text-teal-900'}`}
                >
                  {meta.kind === 'legacy' ? 'Retire' : 'Adopt'}
                </span>
              </span>
              <span className="mt-5 flex items-baseline gap-3">
                <strong className="text-3xl tabular-nums">
                  {module && !currentModule ? '—' : value.toLocaleString()}
                </strong>
                <span className="text-sm text-slate-500">files</span>
              </span>
              <span className="mt-3 flex items-center gap-1 text-sm">
                {moduleValid &&
                  (delta === 0 ? (
                    <Minus size={16} aria-hidden="true" />
                  ) : delta < 0 ? (
                    <ArrowDownRight size={16} aria-hidden="true" />
                  ) : (
                    <ArrowUpRight size={16} aria-hidden="true" />
                  ))}
                {moduleValid
                  ? `${delta > 0 ? '+' : ''}${delta} vs. comparison`
                  : 'Module absent in one snapshot'}
              </span>
              <span className="block mt-3 text-xs text-slate-600 leading-relaxed">
                {meta.description}
              </span>
              {meta.kind === 'legacy' && moduleValid && (
                <span className="block mt-3 text-xs font-medium">
                  {progress === null
                    ? 'No baseline footprint — reduction is undefined'
                    : `${Math.abs(progress).toFixed(1)}% ${progress >= 0 ? 'net footprint reduction' : 'net footprint growth'}`}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
