import { ClipboardCopy, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Detail, Summary } from './model'
import { renderBrief } from './brief'
import { Blockers } from './blockers'
import { LockableTable } from './lockable'

const copyText = (text: string, done: string) =>
  void navigator.clipboard
    .writeText(text)
    .then(() => toast(done))
    .catch(() => toast.error('Clipboard unavailable'))

export function BriefActions({
  snapshot,
  detail,
  section,
}: {
  snapshot: Summary
  detail: Detail
  section?: string
}) {
  const brief = () => renderBrief(snapshot, detail, { section })
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          copyText(brief().markdown, 'Copied the migration brief as markdown')
        }
      >
        <ClipboardCopy aria-hidden="true" /> Copy brief for an agent
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(brief().json, null, 2)], {
              type: 'application/json',
            }),
          )
          const a = Object.assign(document.createElement('a'), {
            href: url,
            download: `migration-brief${section ? `-${section}` : ''}.json`,
          })
          a.click()
          URL.revokeObjectURL(url)
        }}
      >
        <Download aria-hidden="true" /> Brief as JSON
      </Button>
    </div>
  )
}

export function NextSteps({
  snapshot,
  detail,
}: {
  snapshot: Summary
  detail: Detail
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Brief for people and agents</h2>
          </CardTitle>
          <CardDescription>
            Status, directories to lock with the exact entries, shared units to
            fix first, and per-section unit tasks with each Bootstrap class
            mapped to its guideline target. The published copy at{' '}
            <code>migrations/brief.md</code> is regenerated hourly; this button
            renders it for the selected snapshot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BriefActions snapshot={snapshot} detail={detail} />
        </CardContent>
      </Card>
      {detail.lockable.length > 0 && (
        <Card id="lockable">
          <CardHeader>
            <CardTitle asChild>
              <h2>Lockable directories</h2>
            </CardTitle>
            <CardDescription>
              Nothing under these directories, nor anything they import, has
              Bootstrap left. Locking them is a configuration-only change to the
              three lists; the copied entries are ready to paste.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[28rem] overflow-auto">
            <LockableTable lockable={detail.lockable} commit={detail.commit} />
          </CardContent>
        </Card>
      )}
      <Blockers detail={detail} />
    </div>
  )
}
