import {
  Link,
  useLoaderData,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { inventoryOf, sourceUrl, views, type View } from './model'
import { Controls } from './controls'
import { Headline } from './headline'
import { Regressions } from './regressions'
import { Trends } from './trends'
import { kitCoverage, kitTarget, ngbTarget } from './targets'
import { Changes } from './changes'
import { FamilyHeatmap, Sections } from './sections'
import { ModuleDetail } from './module-detail'
import { Pages } from './pages'
import { NextSteps } from './next-steps'
import { Inventory } from './inventory'
import { Contributors } from './contributors'
import { Methodology } from './methodology'
import { scopeDetail, scopeSnapshot, scopeSummary } from './scope'

const viewLabel: Record<View, string> = {
  overview: 'Overview',
  contributors: 'Contributors',
  modules: 'Modules',
  pages: 'Pages',
  next: 'Next steps',
  inventory: 'Inventory',
}

export function MigrationDashboard() {
  const loaded = useLoaderData({ from: '/' })
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const update = (patch: Partial<typeof search>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }) })
  const { manifest } = loaded
  const module =
    search.module &&
    loaded.detail.sections.some((s) => s.name === search.module)
      ? search.module
      : undefined
  // With a module selected every view counts that module's units only.
  const detail = module ? scopeDetail(loaded.detail, module) : loaded.detail
  const compareDetail = module
    ? scopeDetail(loaded.compareDetail, module)
    : loaded.compareDetail
  const snapshot = module
    ? scopeSnapshot(loaded.snapshot, module, detail)
    : loaded.snapshot
  const compare = module
    ? scopeSnapshot(loaded.compare, module, compareDetail)
    : loaded.compare
  const snapshots = module
    ? manifest.snapshots.map((s) => scopeSummary(s, module))
    : manifest.snapshots
  const adoption = manifest.snapshots.findIndex(
    (s) => s.commit === manifest.packageAdoption,
  )
  const series = snapshots.filter(
    (s, i) =>
      i >= adoption && Date.parse(s.date) <= Date.parse(loaded.snapshot.date),
  )
  const view = search.view ?? 'overview'
  const kit = new Set(detail.kit)
  return (
    <main
      tabIndex={-1}
      id="main-content"
      className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-8"
    >
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Client UI modernization
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Retiring Bootstrap, ng-bootstrap and PrimeNG from the Artemis client
            for Tailwind and the TUM UI kit. Bootstrap is measured with
            Artemis's own{' '}
            <a
              className="underline underline-offset-4"
              href={sourceUrl(
                loaded.snapshot.commit,
                'rules/no-bootstrap-classes.mjs',
              )}
            >
              lint rule
            </a>{' '}
            and lock list; PrimeNG, ng-bootstrap and TUM UI by what each unit
            uses and imports. A unit is legacy-free when none of the three
            remain. Pick a module to see everything for that part of the client.
          </p>
        </div>
        <Controls
          manifest={manifest}
          snapshot={loaded.snapshot}
          compare={loaded.compare}
          modules={loaded.detail.sections}
          module={module}
          onChange={update}
        />
      </div>
      {(search.snapshot && search.snapshot !== snapshot.commit) ||
      (search.compare && search.compare !== compare.commit) ? (
        <p role="status" className="text-sm text-destructive">
          A requested commit is not in the history or is not earlier than the
          snapshot; showing the nearest available one.
        </p>
      ) : null}
      {search.module && !module && (
        <p role="status" className="text-sm text-destructive">
          There is no module named <code>{search.module}</code> at this commit;
          showing all modules.
        </p>
      )}
      {module && (
        <p
          role="status"
          className="rounded-md border border-status-locked/40 bg-status-locked/10 px-3 py-2 text-sm"
        >
          Showing the <strong>{module}</strong> module only: every number, trend
          and table below counts its units.{' '}
          <Link
            to="/"
            search={(previous) => ({ ...previous, module: undefined })}
            className="underline underline-offset-4"
          >
            Show all modules
          </Link>
        </p>
      )}
      <Headline
        series={series}
        snapshot={snapshot}
        compare={compare}
        lockableUnits={detail.lockable.reduce((n, l) => n + l.units, 0)}
        replaceable={{
          primeng: kitCoverage(
            inventoryOf(detail.units.map((u) => u.primeng)),
            (n) => kitTarget(n, kit),
          ),
          ngBootstrap: kitCoverage(
            inventoryOf(detail.units.map((u) => u.ngBootstrap)),
            (n) => ngbTarget(n, kit),
          ),
        }}
      />
      <Tabs
        value={view}
        onValueChange={(v) =>
          update({ view: v === 'overview' ? undefined : (v as View) })
        }
      >
        <TabsList className="flex h-auto flex-wrap">
          {views.map((v) => (
            <TabsTrigger key={v} value={v}>
              {viewLabel[v]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent
          value="overview"
          className="grid grid-cols-[minmax(0,1fr)] gap-6"
        >
          <Regressions detail={detail} compare={compareDetail} />
          <Trends
            series={series}
            snapshot={snapshot}
            latest={snapshot.commit === manifest.snapshots.at(-1)?.commit}
          />
          <Changes series={snapshots} snapshot={snapshot} compare={compare} />
        </TabsContent>
        <TabsContent value="contributors">
          <Contributors series={series} compare={compare} />
        </TabsContent>
        <TabsContent
          value="modules"
          className="grid grid-cols-[minmax(0,1fr)] gap-6"
        >
          {module ? (
            <ModuleDetail
              key={module}
              section={module}
              detail={detail}
              compare={compareDetail}
              all={loaded.detail}
            />
          ) : (
            <>
              <Sections
                detail={detail}
                compare={compareDetail}
                series={series}
                onSelect={(name) => update({ module: name })}
              />
              <FamilyHeatmap detail={detail} />
            </>
          )}
        </TabsContent>
        <TabsContent value="pages">
          <Pages
            detail={detail}
            compare={compareDetail}
            all={loaded.detail}
            scoped={!!module}
          />
        </TabsContent>
        <TabsContent value="next">
          <NextSteps detail={detail} compare={compareDetail} series={series} />
        </TabsContent>
        <TabsContent value="inventory">
          <Inventory detail={detail} compare={compareDetail} />
        </TabsContent>
      </Tabs>
      <Methodology manifest={manifest} detail={loaded.detail} />
    </main>
  )
}
