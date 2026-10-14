import assert from 'node:assert/strict'
import { loadOpenApiReport } from '../../src/features/openapi/load-report'
import { manifestSchema } from '../../src/features/openapi/model'

/** Use the browser's actual decoding, hash and identity checks against published artifacts. */
export async function verifyOpenApiDeployment(
  site: string,
  commit?: string,
  request: typeof fetch = fetch,
  expected?: unknown,
) {
  const base = site.endsWith('/') ? site : `${site}/`
  const fresh: typeof fetch = (input, options) => {
    const url = new URL(String(input))
    url.searchParams.set('verify', String(Date.now()))
    return request(url, { ...options, cache: 'no-store' })
  }
  const loaded = await loadOpenApiReport(
    {},
    AbortSignal.timeout(30_000),
    base,
    fresh,
  )
  if (commit)
    assert.equal(
      loaded.snapshot.provenance.artemisCommit,
      commit,
      'Published OpenAPI must match its expected revision',
    )
  if (expected)
    assert.deepEqual(
      loaded.manifest,
      manifestSchema.parse(expected),
      'Published OpenAPI manifest must match the verified commit',
    )
  return loaded
}
