import { z } from 'zod'
import { detailSchema, manifestSchema, type Manifest } from './model'

async function loadJson<T>(
  file: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}migrations/${file}`,
    { signal, cache: 'no-cache' },
  )
  if (!response.ok)
    throw new Error(`Report unavailable (HTTP ${response.status}).`)
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success)
    throw new Error(
      'Report data is invalid or uses an unsupported analyzer version. Regenerate and publish matching reports.',
    )
  return parsed.data
}

export const checkpoints = (manifest: Manifest) =>
  manifest.snapshots.filter((s) => manifest.evidenceCommits.includes(s.commit))

// Detail exists only for checkpoints; unknown requests fall back to the latest and its predecessor.
export async function loadMigrationReport(
  requested: { snapshot?: string; compare?: string },
  signal: AbortSignal,
) {
  const manifest = await loadJson('index.json', manifestSchema, signal)
  const points = checkpoints(manifest)
  const snapshot =
    points.find((s) => s.commit === requested.snapshot) ?? points.at(-1)!
  const index = points.indexOf(snapshot)
  const compare =
    points.find((s) => s.commit === requested.compare) ??
    points[Math.max(0, index - 1)]
  const [detail, compareDetail] = await Promise.all(
    [snapshot, compare].map(async (s) => {
      const detail = await loadJson(`${s.commit}.json`, detailSchema, signal)
      if (detail.commit !== s.commit)
        throw new Error(
          'Report identity mismatch. Regenerate and publish matching reports.',
        )
      return detail
    }),
  )
  return { manifest, snapshot, compare, detail, compareDetail }
}
export type MigrationReport = Awaited<ReturnType<typeof loadMigrationReport>>
