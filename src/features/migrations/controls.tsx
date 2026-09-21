import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { commitUrl, type Manifest, type Summary } from './model'
import { day, dayTime } from './format'

function SnapshotSelect({
  id,
  label,
  value,
  points,
  manifest,
  onChange,
}: {
  id: string
  label: string
  value: string
  points: Summary[]
  manifest: Manifest
  onChange: (commit: string) => void
}) {
  const milestone = (commit: string) =>
    commit === manifest.baseline
      ? 'kit pilot'
      : commit === manifest.packageAdoption
        ? 'package adoption'
        : commit === points.at(-1)?.commit
          ? 'latest'
          : undefined
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[...points].reverse().map((s) => (
            <SelectItem key={s.commit} value={s.commit}>
              {day(s.date)} · {s.commit.slice(0, 8)}
              {milestone(s.commit) ? ` · ${milestone(s.commit)}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function Controls({
  manifest,
  points,
  snapshot,
  compare,
  onChange,
}: {
  manifest: Manifest
  points: Summary[]
  snapshot: Summary
  compare: Summary
  onChange: (patch: { snapshot?: string; compare?: string }) => void
}) {
  const stale = Date.now() - Date.parse(points.at(-1)!.date) > 7 * 86_400_000
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <SnapshotSelect
        id="snapshot"
        label="Snapshot"
        value={snapshot.commit}
        points={points}
        manifest={manifest}
        onChange={(commit) => onChange({ snapshot: commit })}
      />
      <SnapshotSelect
        id="compare"
        label="Compare against"
        value={compare.commit}
        points={points}
        manifest={manifest}
        onChange={(commit) => onChange({ compare: commit })}
      />
      <p className="text-sm text-muted-foreground">
        <a
          className="underline underline-offset-4"
          href={commitUrl(snapshot.commit)}
        >
          Artemis {snapshot.commit.slice(0, 8)}
        </a>{' '}
        · {dayTime(snapshot.date)} · collected {dayTime(manifest.generatedAt)} ·
        analyzer v{manifest.analyzerVersion}
        {stale && (
          <Badge variant="outline" className="ml-2">
            stale
          </Badge>
        )}
      </p>
    </div>
  )
}
