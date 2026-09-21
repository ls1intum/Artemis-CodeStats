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
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: { commit: string; label: string }[]
  onChange: (commit: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.commit} value={o.commit}>
              {o.label}
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
  const latest = points.at(-1)!
  const milestone: Record<string, string> = {
    [manifest.baseline]: 'kit pilot',
    [manifest.packageAdoption]: 'package adoption',
    [latest.commit]: 'latest',
  }
  const options = points.map((s) => ({
    commit: s.commit,
    label: `${day(s.date, true)} · ${s.commit.slice(0, 8)}${milestone[s.commit] ? ` · ${milestone[s.commit]}` : ''}`,
  }))
  const index = points.indexOf(snapshot)
  const stale = Date.now() - Date.parse(latest.date) > 7 * 86_400_000
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <SnapshotSelect
        id="snapshot"
        label="Snapshot"
        value={snapshot.commit}
        options={[...options].reverse()}
        onChange={(commit) => onChange({ snapshot: commit })}
      />
      <SnapshotSelect
        id="compare"
        label="Compare against"
        value={compare.commit}
        options={options.slice(0, Math.max(index, 1)).reverse()}
        onChange={(commit) => onChange({ compare: commit })}
      />
      <p className="text-sm text-muted-foreground">
        <a
          className="underline underline-offset-4"
          href={commitUrl(snapshot.commit)}
        >
          Artemis {snapshot.commit.slice(0, 8)}
        </a>{' '}
        · {dayTime(snapshot.date)}
        {snapshot === latest && ` · collected ${dayTime(manifest.generatedAt)}`}
        {stale && (
          <Badge variant="outline" className="ml-2">
            stale
          </Badge>
        )}
      </p>
    </div>
  )
}
