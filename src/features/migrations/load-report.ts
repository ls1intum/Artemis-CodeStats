import { z } from 'zod'
import {
  applyPatch,
  enrich,
  manifestSchema,
  storedDetailSchema,
  type Detail,
  type Summary,
  type UnitView,
} from './model'

export type DetailView = Omit<Detail, 'units'> & { units: UnitView[] }
const view = (detail: Detail): DetailView => ({
  ...detail,
  units: enrich(detail.units),
})

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

// The default comparison is the last commit at least a week before the snapshot.
export const weekBefore = (snapshots: Summary[], snapshot: Summary) => {
  const cutoff = Date.parse(snapshot.date) - 7 * 86_400_000
  return snapshots.filter((s) => Date.parse(s.date) <= cutoff).at(-1)
}

// Every commit has a detail file; a patch resolves through its base (one extra request).
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
  const all = manifest.snapshots
  const snapshot =
    all.find((s) => s.commit === requested.snapshot) ?? all.at(-1)!
  const earlier = all.slice(0, all.indexOf(snapshot))
  const compare =
    earlier.find((s) => s.commit === requested.compare) ??
    weekBefore(earlier, snapshot) ??
    earlier[0] ??
    snapshot
  const bases = new Map<string, Promise<Detail>>()
  const load = async (commit: string): Promise<Detail> => {
    const stored = await loadJson(
      `${commit}.json`,
      storedDetailSchema,
      signal,
      'default',
    )
    if (stored.commit !== commit)
      throw new Error(
        'Report identity mismatch. Regenerate and publish matching reports.',
      )
    if (!('base' in stored)) return stored
    const base = bases.get(stored.base) ?? load(stored.base)
    bases.set(stored.base, base)
    return applyPatch(await base, stored)
  }
  const [detail, compareDetail] = await Promise.all([
    load(snapshot.commit).then(view),
    compare === snapshot ? undefined : load(compare.commit).then(view),
  ])
  return {
    manifest,
    snapshot,
    compare,
    detail,
    compareDetail: compareDetail ?? detail,
  }
}
export type MigrationReport = Awaited<ReturnType<typeof loadMigrationReport>>
