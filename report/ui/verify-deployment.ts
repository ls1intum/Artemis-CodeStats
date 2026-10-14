import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { setTimeout } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import {
  applyPatch,
  manifestSchema,
  storedDetailSchema,
  type Detail,
} from '../../src/features/migrations/model'

export async function verifyDeployment(
  site: string,
  expected: unknown,
  request: typeof fetch = fetch,
) {
  const manifest = manifestSchema.parse(expected)
  const json = async (file: string) => {
    const response = await request(
      new URL(`migrations/${file}?verify=${Date.now()}`, site),
      {
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`)
    return response.json()
  }
  assert.deepEqual(
    manifestSchema.parse(await json('index.json')),
    manifest,
    'Deployed manifest must match the verified commit',
  )
  const load = async (commit: string): Promise<Detail> => {
    const stored = storedDetailSchema.parse(await json(`${commit}.json`))
    assert.equal(stored.commit, commit)
    if (!('base' in stored)) return stored
    assert(
      manifest.bases.includes(stored.base),
      'Patch must reference a published base',
    )
    const base = storedDetailSchema.parse(await json(`${stored.base}.json`))
    assert(!('base' in base), 'A base must contain full detail')
    assert.equal(base.commit, stored.base)
    return applyPatch(base, stored)
  }
  const latest = manifest.snapshots.at(-1)!
  const week = manifest.snapshots
    .filter(
      (s) => Date.parse(s.date) <= Date.parse(latest.date) - 7 * 86_400_000,
    )
    .at(-1)
  for (const snapshot of [latest, ...(week ? [week] : [])]) {
    const detail = await load(snapshot.commit)
    assert.equal(detail.units.length, snapshot.totals.units)
    assert.equal(
      detail.sections.reduce(
        (sum, section) => sum + section.classHits + section.styleHits,
        0,
      ),
      snapshot.totals.classHits + snapshot.totals.styleHits,
    )
  }
  return latest.commit
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const expected = JSON.parse(
    readFileSync('public/migrations/index.json', 'utf8'),
  )
  const site = process.env.DASHBOARD_URL
  if (!site) throw new Error('DASHBOARD_URL is required')
  for (let attempt = 1; ; attempt++) {
    try {
      const commit = await verifyDeployment(site, expected)
      console.log(`Verified deployed UI reports: ${commit}`)
      break
    } catch (error) {
      if (attempt >= 12) throw error
      console.warn(
        `Deployment not visible yet (attempt ${attempt}): ${String(error)}`,
      )
      await setTimeout(10_000)
    }
  }
}
