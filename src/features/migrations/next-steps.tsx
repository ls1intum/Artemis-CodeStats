import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DetailView } from './load-report'
import { Blockers } from './blockers'
import { LockableTable } from './lockable'

export function NextSteps({ detail }: { detail: DetailView }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
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
