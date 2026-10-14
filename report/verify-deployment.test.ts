import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { verifyDashboardDeployments } from './verify-deployment'

for (const broken of ['ui', 'openapi'] as const)
  test(`deployment verifies the other dashboard even when ${broken} is unavailable`, async () => {
    const seen = new Set<string>()
    const request: typeof fetch = async (input) => {
      const url = new URL(String(input))
      const pathname = url.pathname.replace('/project/', '')
      seen.add(pathname)
      if (pathname.startsWith(broken === 'ui' ? 'migrations/' : 'openapi/'))
        return new Response('', { status: 503 })
      return new Response(await readFile(`public/${pathname}`))
    }
    const results = await verifyDashboardDeployments(
      'https://site.test/project/',
      request,
    )
    assert.equal(
      results.find((result) => result.dashboard === broken)?.success,
      false,
    )
    assert.equal(
      results.find((result) => result.dashboard !== broken)?.success,
      true,
    )
    assert(seen.has('migrations/index.json'))
    assert(seen.has('openapi/index.json'))
  })
