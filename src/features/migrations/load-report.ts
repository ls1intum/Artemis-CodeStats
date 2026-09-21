import { z } from 'zod'
import { detailSchema, manifestSchema, type Manifest } from './model'

async function loadJson<T>(
  file: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
  cache: RequestCache,
): Promise<T> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}migrations/${file}`,
    { signal, cache },
  )
  if (!response.ok)
    throw new Error(`Report unavailable (HTTP ${response.status}).`)
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success)
    throw new Error(
      `Report data is invalid or uses an unsupported analyzer version (${file}: ${parsed.error.issues[0]?.path.join('.') || 'schema'}). Regenerate and publish matching reports.`,
    )
  return parsed.data
}

const checkpoints = (manifest: Manifest) =>
  manifest.snapshots.filter((s) => manifest.evidenceCommits.includes(s.commit))

// Detail exists only for checkpoints. The comparison is always an earlier checkpoint;
// the first checkpoint compares against itself.
export async function loadMigrationReport(
  requested: { snapshot?: string; compare?: string },
  signal: AbortSignal,
) {
  const manifest = await loadJson(
    'index.json',
    manifestSchema,
    signal,
    'no-cache',
  )
  const points = checkpoints(manifest)
  const snapshot =
    points.find((s) => s.commit === requested.snapshot) ?? points.at(-1)!
  const index = points.indexOf(snapshot)
  const earlier = points.slice(0, index)
  const compare =
    earlier.find((s) => s.commit === requested.compare) ??
    earlier.at(-1) ??
    snapshot
  const load = async (commit: string) => {
    const detail = await loadJson(
      `${commit}.json`,
      detailSchema,
      signal,
      'default',
    )
    if (detail.commit !== commit)
      throw new Error(
        'Report identity mismatch. Regenerate and publish matching reports.',
      )
    return detail
  }
  const [detail, compareDetail] = await Promise.all([
    load(snapshot.commit),
    compare === snapshot ? undefined : load(compare.commit),
  ])
  return {
    manifest,
    points,
    snapshot,
    compare,
    detail,
    compareDetail: compareDetail ?? detail,
  }
}
export type MigrationReport = Awaited<ReturnType<typeof loadMigrationReport>>
