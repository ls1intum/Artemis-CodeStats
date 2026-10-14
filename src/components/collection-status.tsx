import { useEffect, useState } from 'react'
import {
  collectionStatusSchema,
  type CollectionStatus,
} from '@/lib/collection-status'

export function CollectionStatusBanner() {
  const [status, setStatus] = useState<CollectionStatus>()
  useEffect(() => {
    const controller = new AbortController()
    void fetch(`${import.meta.env.BASE_URL}collection-status.json`, {
      signal: controller.signal,
      cache: 'no-cache',
    })
      .then(async (response) => {
        if (!response.ok) return
        const parsed = collectionStatusSchema.safeParse(await response.json())
        if (parsed.success) setStatus(parsed.data)
      })
      .catch(() => {
        /* Optional status must not stop either dashboard. */
      })
    return () => controller.abort()
  }, [])
  const failures =
    status &&
    (['ui', 'openapi'] as const).filter(
      (key) => status.dashboards[key].state === 'failed',
    )
  if (!status || !failures?.length) return null
  return (
    <aside
      role="status"
      className="mx-auto max-w-[1440px] m-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
    >
      <strong>Some reports could not update.</strong>{' '}
      {failures
        .map(
          (key) =>
            `${key === 'ui' ? 'UI modernization' : 'OpenAPI migration'} retains its last valid report (${status.dashboards[key].publishedCommit?.slice(0, 8) ?? 'no report available'})`,
        )
        .join('; ')}
      . The other dashboard can still update.{' '}
      <a className="underline" href={status.runUrl}>
        Check the collection log
      </a>
      .
    </aside>
  )
}
