import { useRef } from 'react'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { sourceUrl } from './model'
import { Controls } from './controls'
import { Headline } from './headline'
import { Regressions } from './regressions'
import { Burndown } from './burndown'
import { Changes } from './changes'
import { Sections } from './sections'
import { SectionSheet } from './section-sheet'
import { Blockers } from './blockers'
import { LockableTable } from './lockable'
import { Inventory } from './inventory'
import { Methodology } from './methodology'

export function MigrationDashboard() {
  const { manifest, points, snapshot, compare, detail, compareDetail } =
    useLoaderData({ from: '/' })
  const search = useSearch({ from: '/' })
  const opener = useRef<HTMLElement | null>(null)
  const navigate = useNavigate({ from: '/' })
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
            and lock list. A unit is done when its directory is locked.
          </p>
        </div>
        <Controls
          manifest={manifest}
          points={points}
          snapshot={snapshot}
          compare={compare}
          onChange={update}
        />
      </div>
      {(search.snapshot && search.snapshot !== snapshot.commit) ||
      (search.compare && search.compare !== compare.commit) ? (
        <p role="status" className="text-sm text-destructive">
          A requested snapshot is not a retained checkpoint or is not earlier
          than the snapshot; showing the nearest available one.
        </p>
      ) : null}
      <Headline
        series={series}
        snapshot={snapshot}
        compare={compare}
        lockableUnits={detail.lockable.reduce((n, l) => n + l.units, 0)}
      />
      <Regressions detail={detail} compare={compareDetail} />
      <Burndown
        series={series}
        snapshot={snapshot}
        latest={snapshot.commit === points.at(-1)?.commit}
      />
      <Changes
        series={manifest.snapshots}
        snapshot={snapshot}
        compare={compare}
      />
      <Sections
        detail={detail}
        compare={compareDetail}
        onSelect={(section, trigger) => {
          opener.current = trigger
          update({ section })
        }}
      />
      <SectionSheet
        section={section}
        detail={detail}
        compare={compareDetail}
        onClose={() => update({ section: undefined })}
        opener={opener}
      />
      <Blockers detail={detail} />
      {detail.lockable.length > 0 && (
        <Card id="lockable">
          <CardHeader>
            <CardTitle asChild>
              <h2>Lockable directories</h2>
            </CardTitle>
            <CardDescription>
              Nothing under these directories, nor anything they import, has
              Bootstrap left. Locking them is a configuration-only change to the
              three lists.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[28rem] overflow-auto">
            <LockableTable lockable={detail.lockable} commit={detail.commit} />
          </CardContent>
        </Card>
      )}
      <Inventory detail={detail} />
      <Methodology manifest={manifest} detail={detail} />
    </main>
  )
}
