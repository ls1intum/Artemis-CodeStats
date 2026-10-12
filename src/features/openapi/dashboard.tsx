import { useMemo, useState } from 'react'
import {
  Link,
  useLoaderData,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { scopeReport } from './scope'
import { CallerList, Section } from './presentation'
import {
  MeasurementDetails,
  Modules,
  Overview,
  SnapshotSummary,
} from './overview'
import { SharedWork, Work } from './work'
import { partitionWork } from './summary'
import { Endpoints, EvidenceView, ModuleDetail, Provenance } from './views'

const views = [
  'overview',
  'modules',
  'endpoints',
  'callers',
  'next',
  'evidence',
] as const
const labels = {
  overview: 'Overview',
  modules: 'Modules',
  endpoints: 'Endpoints',
  callers: 'Callers',
  next: 'Next steps',
  evidence: 'Evidence',
}
const selectClass = 'h-9 rounded-md border bg-background px-3 text-sm'

export function OpenApiDashboard() {
  const { manifest, snapshot } = useLoaderData({ from: '/openapi' })
  const search = useSearch({ from: '/openapi' })
  const navigate = useNavigate({ from: '/openapi' })
  const update = (patch: Partial<typeof search>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }) })
  const module = snapshot.modules.find((module) => module.id === search.module)
  const scope = useMemo(
    () => scopeReport(snapshot, module?.id),
    [snapshot, module],
  )
  const operation = scope.operations.find(
    (operation) => operation.id === search.operation,
  )
  const view = search.view ?? (search.operation ? 'endpoints' : 'overview')
  const invalid = [
    search.module && !module ? `Unknown module: ${search.module}.` : '',
    !views.some((candidate) => candidate === view)
      ? `Unknown view: ${view}.`
      : '',
    search.operation && !operation
      ? `Operation is not inventoried in the selected scope: ${search.operation}.`
      : '',
  ].filter(Boolean)
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 [overflow-wrap:anywhere] sm:px-8"
    >
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            OpenAPI migration
          </h1>
          <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
            Assess specification coverage, generated transport, production
            adoption, and enforcement independently across all discovered
            Artemis modules. Static usage is evidence for remaining work;
            runtime migration requires matching verification.
          </p>
          <a
            className="mt-2 inline-block text-sm underline"
            href="https://github.com/ls1intum/Artemis-CodeStats/blob/main/docs/openapi-dashboard.md"
          >
            Measurement definitions and collection methodology
          </a>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1.5 text-sm">
            Snapshot
            <select
              aria-label="OpenAPI snapshot"
              className={selectClass}
              value={snapshot.provenance.artemisCommit}
              onChange={(event) =>
                update({ snapshot: event.target.value, operation: undefined })
              }
            >
              {[...manifest.snapshots]
                .sort(
                  (a, b) => Date.parse(b.analyzedAt) - Date.parse(a.analyzedAt),
                )
                .map((entry) => (
                  <option key={entry.artemisCommit} value={entry.artemisCommit}>
                    {entry.artemisCommit.slice(0, 8)} · {entry.analyzedAt}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            Module
            <select
              aria-label="OpenAPI module"
              className={selectClass}
              value={search.module ?? ''}
              onChange={(event) =>
                update({
                  module: event.target.value || undefined,
                  operation: undefined,
                })
              }
            >
              <option value="">All modules</option>
              {search.module && !module && (
                <option value={search.module}>{search.module} (unknown)</option>
              )}
              {[...snapshot.modules]
                .sort((a, b) => a.id.localeCompare(b.id))
                .map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.id}
                  </option>
                ))}
            </select>
          </label>
          <p className="text-sm text-muted-foreground">
            Artemis{' '}
            <a
              className="underline"
              href={`${snapshot.provenance.repositoryUrl}/commit/${snapshot.provenance.artemisCommit}`}
            >
              {snapshot.provenance.artemisCommit.slice(0, 8)}
            </a>{' '}
            · {snapshot.provenance.analyzerVersion}
          </p>
        </div>
      </div>
      {invalid.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Invalid OpenAPI filter</AlertTitle>
          <AlertDescription>
            <p>{invalid.join(' ')}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() =>
                update({
                  module: undefined,
                  view: undefined,
                  operation: undefined,
                })
              }
            >
              Clear invalid filters
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {module && (
            <p
              role="status"
              className="rounded-md border bg-muted px-3 py-2 text-sm"
            >
              Showing <strong>{module.id}</strong> server ownership across every
              view, including callers from other client areas. Shared analysis
              limitations remain visible.{' '}
              <Link
                to="/openapi"
                search={(previous) => ({
                  ...previous,
                  module: undefined,
                  operation: undefined,
                })}
                className="underline"
              >
                Show all modules
              </Link>
            </p>
          )}
          <SnapshotSummary
            snapshot={snapshot}
            scope={scope}
            module={module}
            onEvidence={() => update({ view: 'evidence' })}
          />
          <Tabs
            value={view}
            onValueChange={(view) =>
              update({
                view:
                  view === 'overview' && !search.operation ? undefined : view,
              })
            }
          >
            <TabsList className="flex h-auto flex-wrap">
              {views.map((view) => (
                <TabsTrigger key={view} value={view}>
                  {labels[view]}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="overview" className="grid gap-6">
              {module && <ModuleDetail module={module} snapshot={snapshot} />}
              <Overview snapshot={snapshot} scope={scope} module={module} />
              <Modules
                snapshot={snapshot}
                modules={scope.modules}
                onSelect={(module) => update({ module, operation: undefined })}
              />
              <Work
                key={module?.id ?? 'all'}
                scope={scope}
                snapshot={snapshot}
              />
            </TabsContent>
            <TabsContent value="modules" className="grid gap-6">
              {module && <ModuleDetail module={module} snapshot={snapshot} />}
              <Modules
                snapshot={snapshot}
                modules={scope.modules}
                onSelect={(module) => update({ module, operation: undefined })}
              />
              {module ? (
                <Work key={module.id} scope={scope} snapshot={snapshot} />
              ) : (
                <SharedWork
                  snapshot={snapshot}
                  steps={partitionWork(snapshot, scope.nextSteps).shared}
                />
              )}
            </TabsContent>
            <TabsContent value="endpoints">
              {module && <ModuleDetail module={module} snapshot={snapshot} />}
              <Endpoints
                key={module?.id ?? 'all'}
                scope={scope}
                snapshot={snapshot}
                operation={operation}
                onSelect={(operation) => update({ operation })}
              />
            </TabsContent>
            <TabsContent value="callers">
              <Callers
                key={module?.id ?? 'all'}
                scope={scope}
                snapshot={snapshot}
              />
            </TabsContent>
            <TabsContent value="next">
              <Work
                key={module?.id ?? 'all'}
                scope={scope}
                snapshot={snapshot}
              />
            </TabsContent>
            <TabsContent value="evidence" className="grid gap-6">
              {module && <ModuleDetail module={module} snapshot={snapshot} />}
              <MeasurementDetails snapshot={snapshot} module={module} />
              <Provenance snapshot={snapshot} />
              <EvidenceView
                key={module?.id ?? 'all'}
                scope={scope}
                snapshot={snapshot}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </main>
  )
}

function Callers({
  scope,
  snapshot,
}: {
  scope: ReturnType<typeof scopeReport>
  snapshot: Parameters<typeof scopeReport>[0]
}) {
  const [kind, setKind] = useState('production')
  return (
    <div className="grid gap-6">
      <Section
        title="Caller evidence"
        description="Callers are scoped by their target's server ownership. Caller area and wrapper implementation are retained independently. Only production REST calls contribute to call-site measurements."
      >
        <label className="flex items-center gap-3 text-sm">
          Caller records
          <select
            aria-label="Caller records"
            className={selectClass}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="production">Production</option>
            <option value="wrapper-implementation">
              Wrapper implementations
            </option>
            <option value="all">All records</option>
          </select>
        </label>
        <CallerList
          key={kind}
          callers={scope.callers.filter(
            (caller) => kind === 'all' || caller.kind === kind,
          )}
          provenance={snapshot.provenance}
        />
      </Section>
      {scope.unscopedCallers.length > 0 && (
        <Section
          title="Shared unresolved production calls"
          description="These calls have no endpoint binding and cannot be attributed to this owner. They remain uncertainty for every module, separate from the selected module's counts."
        >
          <CallerList
            title="Unassigned callers"
            callers={scope.unscopedCallers}
            provenance={snapshot.provenance}
          />
        </Section>
      )}
    </div>
  )
}
