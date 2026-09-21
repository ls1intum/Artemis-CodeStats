import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { commitUrl, pullRequest, type Manifest, type Summary } from './model'
import { day, dayTime } from './format'
import { weekBefore } from './load-report'

type Option = { commit: string; label: string; note?: string }

// Combobox over every snapshot: searchable by date, commit and subject.
function CommitPicker({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: Option[]
  onChange: (commit: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.commit === value)
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-80 justify-between font-normal"
          >
            <span className="truncate">
              {selected?.label}
              {selected?.note && (
                <span className="text-muted-foreground">
                  {' '}
                  · {selected.note}
                </span>
              )}
            </span>
            <ChevronsUpDown aria-hidden="true" className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[32rem] p-0" align="start">
          <Command
            // Substring match with a constant score keeps the chronological order.
            filter={(value, search) =>
              value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder="Search by date, commit or subject" />
            <CommandList>
              <CommandEmpty>No snapshot found.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.commit}
                    value={`${o.label} ${o.commit} ${o.note ?? ''}`}
                    onSelect={() => {
                      onChange(o.commit)
                      setOpen(false)
                    }}
                  >
                    <Check
                      aria-hidden="true"
                      className={cn(
                        'shrink-0',
                        o.commit === value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{o.label}</span>
                    {o.note && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {o.note}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function Controls({
  manifest,
  snapshot,
  compare,
  onChange,
}: {
  manifest: Manifest
  snapshot: Summary
  compare: Summary
  onChange: (patch: { snapshot?: string; compare?: string }) => void
}) {
  const all = manifest.snapshots
  const latest = all.at(-1)!
  const milestone: Record<string, string> = {
    [manifest.baseline]: 'kit pilot',
    [manifest.packageAdoption]: 'package adoption',
    [latest.commit]: 'latest',
  }
  const option = (s: Summary): Option => ({
    commit: s.commit,
    label: `${dayTime(s.date).replace(' UTC', '')} · ${s.commit.slice(0, 8)} · ${pullRequest(s.subject).title}`,
    note: milestone[s.commit],
  })
  const earlier = all.slice(0, all.indexOf(snapshot))
  const week = weekBefore(earlier, snapshot)
  const stale = Date.now() - Date.parse(latest.date) > 7 * 86_400_000
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <CommitPicker
        id="snapshot"
        label="Snapshot"
        value={snapshot.commit}
        options={[...all].reverse().map(option)}
        onChange={(commit) => onChange({ snapshot: commit })}
      />
      <CommitPicker
        id="compare"
        label="Compare against"
        value={compare.commit}
        options={[...(earlier.length ? earlier : [snapshot])]
          .reverse()
          .map((s) => ({
            ...option(s),
            note: s === week ? 'a week earlier' : milestone[s.commit],
          }))}
        onChange={(commit) => onChange({ compare: commit })}
      />
      <p className="text-sm text-muted-foreground">
        <a
          className="underline underline-offset-4"
          href={commitUrl(snapshot.commit)}
        >
          Artemis {snapshot.commit.slice(0, 8)}
        </a>{' '}
        · {day(snapshot.date, true)}
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
