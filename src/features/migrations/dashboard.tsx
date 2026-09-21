import {
  useLoaderData,
  useNavigate,
  useRouter,
  useSearch,
} from '@tanstack/react-router'
import { Layers3, ScanSearch } from 'lucide-react'
import { dimensionKeys, dimensions, commitUrl, type Dimension } from './model'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MigrationTrend } from './trend'
import { EvidenceExplorer } from './explorer'
import { MigrationMetrics } from './metrics'
import { ModuleMatrix } from './module-matrix'
import { Methodology } from './methodology'

export function MigrationDashboard() {
  const {
    manifest: data,
    current,
    detail,
    detailError,
  } = useLoaderData({ from: '/' })
  const search = useSearch({ from: '/' })
  const router = useRouter()
  const navigate = useNavigate({ from: '/' })
  const update = (patch: Partial<typeof search>, replace = false) =>
    void navigate({
      to: '/',
      search: (previous) => ({ ...previous, ...patch }),
      replace,
    })
  const compare =
    data.snapshots.find((s) => s.commit === search.compare) ?? data.snapshots[0]
  const module = search.module ?? ''
  const dimension = search.dimension ?? ''
  const query = search.q ?? ''
  const stale =
    Date.now() - Date.parse(data.snapshots[data.snapshots.length - 1].date) >
    7 * 86400000
  const legacyDelta = current.legacyFiles - compare.legacyFiles
  const options = data.snapshots.map((s) => (
    <option key={s.commit} value={s.commit}>
      {s.date.slice(0, 10)} · {s.commit.slice(0, 8)}
      {s.commit === data.baseline
        ? ' · Kit pilot'
        : s.commit === data.packageAdoption
          ? ' · Package adoption'
          : ''}
    </option>
  ))
  const modules = [
    ...new Set([...current.modules, ...compare.modules].map((m) => m.name)),
  ].sort(
    (a, b) =>
      (current.modules.find((m) => m.name === b)?.legacyFiles ?? 0) -
        (current.modules.find((m) => m.name === a)?.legacyFiles ?? 0) ||
      a.localeCompare(b),
  )
  return (
    <main tabIndex={-1} id="main-content" className="migration-shell space-y-7">
      {((search.current && search.current !== current.commit) ||
        (search.compare && search.compare !== compare.commit)) && (
        <p role="status" className="text-sm text-destructive">
          A requested snapshot is no longer available. Showing the selected
          fallback dates below; update the comparison before interpreting
          changes.
        </p>
      )}
      <section className="migration-hero">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-200">
              <Layers3 size={17} /> ARTEMIS / UI MODERNIZATION
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              A clearer path to an owned UI.
            </h1>
            <p className="mt-4 text-blue-100 leading-relaxed">
              Retire PrimeNG and Bootstrap. Adopt TUM UI and Tailwind. Track the
              remaining work, inspect the evidence, and make the next migration
              count.
            </p>
          </div>
          <span className="rounded-full border border-blue-300/40 px-3 py-1 text-xs font-medium">
            ACTIVE MIGRATION
          </span>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-3 border-t border-white/20 pt-6">
          <div>
            <div className="text-3xl font-semibold tabular-nums">
              {current.legacyFiles.toLocaleString()}
            </div>
            <p className="text-sm text-blue-100 mt-1">
              files with detected legacy evidence
            </p>
          </div>
          <div>
            <div className="text-3xl font-semibold tabular-nums">
              {legacyDelta > 0 ? '+' : ''}
              {legacyDelta.toLocaleString()}
            </div>
            <p className="text-sm text-blue-100 mt-1">
              net change vs. comparison · lower is better
            </p>
          </div>
          <div>
            <div className="text-3xl font-semibold tabular-nums">
              {current.files.toLocaleString()}
            </div>
            <p className="text-sm text-blue-100 mt-1">
              source files scanned · {current.templates} templates
            </p>
          </div>
        </div>
      </section>
      {(stale ||
        current.diagnostics.length > 0 ||
        compare.diagnostics.length > 0) && (
        <section
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
          role="status"
        >
          {stale && (
            <p>
              <strong>Stale source:</strong> the latest sampled commit is more
              than seven days old. Do not interpret this as live Artemis status.
            </p>
          )}
          {(current.diagnostics.length > 0 ||
            compare.diagnostics.length > 0) && (
            <p>
              <strong>Partial analysis:</strong> the selected snapshot or
              comparison has diagnostics. Counts and deltas are not reliable
              progress estimates; inspect coverage below.
            </p>
          )}
        </section>
      )}
      <section className="migration-panel" aria-label="Snapshot comparison">
        <div className="grid gap-4 md:grid-cols-2">
          <Label
            htmlFor="current-snapshot"
            className="migration-label items-stretch"
          >
            Selected snapshot
            <select
              id="current-snapshot"
              value={current.commit}
              onChange={(e) => update({ current: e.target.value })}
            >
              {options}
            </select>
          </Label>
          <Label
            htmlFor="compare-snapshot"
            className="migration-label items-stretch"
          >
            Compare against
            <select
              id="compare-snapshot"
              value={compare.commit}
              onChange={(e) => update({ compare: e.target.value })}
            >
              {options}
            </select>
          </Label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
          <a className="migration-link" href={commitUrl(current.commit)}>
            Source {current.commit.slice(0, 8)} ↗
          </a>
          <a
            className="migration-link"
            href={`https://github.com/ls1intum/Artemis/compare/${compare.commit}...${current.commit}`}
          >
            Compare commits ↗
          </a>
          <span>
            Generated {new Date(data.generatedAt).toISOString().slice(0, 10)} ·
            Analyzer v{data.analyzerVersion}
          </span>
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => update({ compare: data.packageAdoption })}
          >
            Use package-adoption baseline
          </Button>
        </div>
        {Date.parse(compare.date) > Date.parse(current.date) && (
          <p className="mt-3 text-sm text-amber-800">
            Reverse comparison: your comparison is newer than the selected
            snapshot.
          </p>
        )}
      </section>
      <MigrationMetrics
        current={current}
        compare={compare}
        module={module}
        dimension={dimension}
        onSelect={(dimension) => update({ dimension })}
      />
      <MigrationTrend
        snapshots={data.snapshots.filter(
          (s) => Date.parse(s.date) <= Date.parse(current.date),
        )}
      />
      <ModuleMatrix
        current={current}
        compare={compare}
        modules={modules}
        module={module}
        onSelect={(module) => update({ module })}
      />
      <section className="migration-panel" aria-label="Evidence filters">
        <div className="flex items-center gap-2 mb-4">
          <ScanSearch size={20} />
          <h2>Find the next change</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Label
            htmlFor="module-filter"
            className="migration-label items-stretch"
          >
            Module
            <select
              id="module-filter"
              aria-label="Module"
              value={module}
              onChange={(e) => update({ module: e.target.value || undefined })}
            >
              <option value="">All modules</option>
              {module && !modules.includes(module) && (
                <option value={module}>{module} (unavailable)</option>
              )}
              {modules.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </Label>
          <Label
            htmlFor="dimension-filter"
            className="migration-label items-stretch"
          >
            Dimension
            <select
              id="dimension-filter"
              aria-label="Dimension"
              value={dimension}
              onChange={(e) =>
                update({
                  dimension: (e.target.value as Dimension) || undefined,
                })
              }
            >
              <option value="">All dimensions</option>
              {dimensionKeys.map((key) => (
                <option key={key} value={key}>
                  {dimensions[key].label}
                </option>
              ))}
            </select>
          </Label>
          <Label
            htmlFor="evidence-query"
            className="migration-label items-stretch"
          >
            File or evidence
            <Input
              id="evidence-query"
              type="search"
              value={query}
              placeholder="e.g. assessment or p-dialog"
              onChange={(e) => update({ q: e.target.value || undefined }, true)}
            />
          </Label>
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm">
          <p>
            Filters are stored in the URL for sharing and reloads. Trend and
            module matrix stay global.
          </p>
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() =>
              update({ module: undefined, dimension: undefined, q: undefined })
            }
          >
            Clear filters
          </Button>
        </div>
      </section>
      <EvidenceExplorer
        key={current.commit}
        commit={current.commit}
        data={detail}
        error={detailError}
        retry={() => void router.invalidate()}
        module={module}
        dimension={dimension}
        query={query}
      />
      <Methodology data={data} current={current} />
    </main>
  )
}
