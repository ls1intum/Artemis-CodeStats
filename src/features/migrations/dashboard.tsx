import { useRef } from 'react'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sourceUrl, views, type View } from './model'
import { Controls } from './controls'
import { Headline } from './headline'
import { Regressions } from './regressions'
import { Burndown } from './burndown'
import { Changes } from './changes'
import { FamilyHeatmap, Sections } from './sections'
import { SectionSheet } from './section-sheet'
import { Pages } from './pages'
import { NextSteps } from './next-steps'
import { Inventory } from './inventory'
import { Methodology } from './methodology'

const viewLabel: Record<View, string> = {
  overview: 'Overview',
  sections: 'Sections',
  pages: 'Pages',
  next: 'Next steps',
  inventory: 'Inventory',
}

export function MigrationDashboard() {
  const { manifest, snapshot, compare, detail, compareDetail } = useLoaderData({
    from: '/',
  })
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const opener = useRef<HTMLElement | null>(null)
  const update = (patch: Partial<typeof search>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }) })
  const adoption = manifest.snapshots.findIndex(
    (s) => s.commit === manifest.packageAdoption,
  )
  const series = manifest.snapshots.filter(
    (s, i) => i >= adoption && Date.parse(s.date) <= Date.parse(snapshot.date),
  )
  const section =
    search.section && detail.sections.some((s) => s.name === search.section)
      ? search.section
      : undefined
  const view = search.view ?? 'overview'
  return (
    <main
      tabIndex={-1}
      id="main-content"
      className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-8"
    >
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bootstrap → Tailwind / TUM UI migration
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Remaining Bootstrap in the Artemis client, measured with Artemis's
            own{' '}
            <a
              className="underline underline-offset-4"
              href={sourceUrl(
                snapshot.commit,
                'rules/no-bootstrap-classes.mjs',
              )}
            >
              lint rule
            </a>{' '}
            and lock list, plus what routed pages import. A unit is done when
            its directory is locked.
          </p>
        </div>
        <Controls
          manifest={manifest}
          snapshot={snapshot}
          compare={compare}
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
      <Headline
        series={series}
        snapshot={snapshot}
        compare={compare}
        lockableUnits={detail.lockable.reduce((n, l) => n + l.units, 0)}
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
          <Burndown
            series={series}
            snapshot={snapshot}
            latest={snapshot.commit === manifest.snapshots.at(-1)?.commit}
          />
          <Changes
            series={manifest.snapshots}
            snapshot={snapshot}
            compare={compare}
          />
        </TabsContent>
        <TabsContent
          value="sections"
          className="grid grid-cols-[minmax(0,1fr)] gap-6"
        >
          <Sections
            detail={detail}
            compare={compareDetail}
            series={series}
            onSelect={(section, trigger) => {
              opener.current = trigger
              update({ section })
            }}
          />
          <FamilyHeatmap detail={detail} />
        </TabsContent>
        <TabsContent value="pages">
          <Pages detail={detail} />
        </TabsContent>
        <TabsContent value="next">
          <NextSteps detail={detail} />
        </TabsContent>
        <TabsContent value="inventory">
          <Inventory detail={detail} />
        </TabsContent>
      </Tabs>
      <SectionSheet
        section={section}
        detail={detail}
        compare={compareDetail}
        onClose={() => update({ section: undefined })}
        opener={opener}
      />
      <Methodology manifest={manifest} detail={detail} />
    </main>
  )
}
