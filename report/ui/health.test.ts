import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  checkHealth,
  stalledAfter,
  stalledRuns,
  staleAfter,
  type Run,
} from './health'
import { verifyDeployment } from './verify-deployment'
import { openApiFixture } from '../../tests/fixtures/openapi'
import { createHash } from 'node:crypto'
import {
  applyPatch,
  storedDetailSchema,
} from '../../src/features/migrations/model'

const manifest = JSON.parse(
  readFileSync('public/migrations/index.json', 'utf8'),
)
const latest = manifest.snapshots.at(-1)!
const openApi = JSON.parse(
  JSON.stringify(openApiFixture()).replaceAll('a'.repeat(40), latest.commit),
)
const openApiBytes = JSON.stringify(openApi)
const openApiManifest = {
  schemaVersion: 1,
  generatedAt: openApi.provenance.analyzedAt,
  snapshots: [
    {
      artemisCommit: latest.commit,
      file: `${latest.commit}.json`,
      sha256: createHash('sha256').update(openApiBytes).digest('hex'),
      analyzerVersion: openApi.provenance.analyzerVersion,
      analyzedAt: openApi.provenance.analyzedAt,
    },
  ],
}
const now = Date.parse('2026-10-14T08:00:00Z')
const run: Run = {
  id: 42,
  status: 'waiting',
  created_at: new Date(now - stalledAfter - 1).toISOString(),
  html_url: 'https://github.com/owner/repo/actions/runs/42',
}

test('health detects blocked runs even if they never started a runner', () => {
  assert.deepEqual(stalledRuns([run], now), [run])
  assert.deepEqual(stalledRuns([{ ...run, status: 'completed' }], now), [])
  assert.deepEqual(
    stalledRuns(
      [{ ...run, created_at: new Date(now - stalledAfter).toISOString() }],
      now,
    ),
    [],
  )
})

function mockHealth({
  stalled = false,
  active = false,
  stale = false,
  broken = false,
  issue = false,
} = {}) {
  const calls: { url: string; method?: string; body?: unknown }[] = []
  const request: typeof fetch = async (input, init) => {
    const url = String(input)
    calls.push({
      url,
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    })
    let result: unknown = {}
    if (url.includes('/runs?'))
      result = {
        workflow_runs: url.includes('status=waiting')
          ? [
              ...(stalled ? [run] : []),
              ...(active
                ? [{ ...run, id: 43, created_at: new Date(now).toISOString() }]
                : []),
            ]
          : [],
      }
    else if (url.endsWith('/commits/develop'))
      result = {
        sha: stale ? 'a'.repeat(40) : latest.commit,
        commit: {
          committer: { date: new Date(now).toISOString() },
        },
      }
    else if (url.includes('/compare/'))
      result = {
        status: 'ahead',
        commits: [
          {
            commit: {
              committer: { date: new Date(now - staleAfter - 1).toISOString() },
            },
          },
        ],
      }
    else if (url.includes('/openapi/index.json')) result = openApiManifest
    else if (url.includes('/openapi/')) return new Response(openApiBytes)
    else if (url.includes('/migrations/index.json'))
      return new Response(JSON.stringify(broken ? {} : manifest))
    else if (url.includes('/migrations/'))
      return new Response(
        readFileSync(
          `public/migrations/${new URL(url).pathname.split('/').at(-1)}`,
          'utf8',
        ),
      )
    else if (url.includes('/issues?'))
      result = issue
        ? [{ title: 'UI migration collection is failing', number: 7 }]
        : []
    else if (url.endsWith('/force-cancel') || url.endsWith('/dispatches'))
      return new Response(null, { status: 204 })
    return new Response(JSON.stringify(result))
  }
  return { calls, request }
}

test('independent health check cancels a stuck deployment, reports it and requests recovery', async () => {
  const { request, calls } = mockHealth({ stalled: true })
  assert.equal(
    (
      await checkHealth(
        'owner/repo',
        'test-token',
        'https://site.test/',
        request,
        now,
      )
    ).length,
    1,
  )
  assert(
    calls.some(
      (c) => c.url.endsWith('/42/force-cancel') && c.method === 'POST',
    ),
  )
  assert(calls.some((c) => c.url.endsWith('/issues') && c.method === 'POST'))
  assert(
    calls.some((c) => c.url.endsWith('/dispatches') && c.method === 'POST'),
  )
})

test('health detects stale or invalid deployed evidence, but does not replace healthy collection', async () => {
  for (const broken of [false, true]) {
    const { request, calls } = mockHealth({
      stale: true,
      broken,
      issue: true,
      active: true,
    })
    assert.equal(
      (
        await checkHealth(
          'owner/repo',
          'test-token',
          'https://site.test/',
          request,
          now,
        )
      ).length,
      2,
    )
    assert(calls.some((c) => c.url.endsWith('/issues/7/comments')))
    assert(!calls.some((c) => c.url.endsWith('/dispatches')))
  }
})

test('healthy deployment needs no cancellation, dispatch or issue', async () => {
  const { request, calls } = mockHealth()
  assert.deepEqual(
    await checkHealth(
      'owner/repo',
      'test-token',
      'https://site.test/',
      request,
      now,
    ),
    [],
  )
  assert(!calls.some((c) => c.method === 'POST'))
})

test('API failures fail the monitor visibly rather than silently reporting success', async () => {
  const request: typeof fetch = async () => new Response('{}', { status: 403 })
  await assert.rejects(
    checkHealth('owner/repo', 'test-token', 'https://site.test/', request, now),
    /HTTP 403/,
  )
})

test('deployment verification loads real patches, bases and the default comparison; rejects stale or missing files', async () => {
  const request: typeof fetch = async (input) => {
    const name = new URL(String(input)).pathname.split('/').at(-1)!
    return new Response(readFileSync(`public/migrations/${name}`, 'utf8'))
  }
  assert.equal(
    await verifyDeployment('https://site.test/', manifest, request),
    latest.commit,
  )
  await assert.rejects(
    verifyDeployment(
      'https://site.test/',
      { ...manifest, generatedAt: '2000-01-01T00:00:00Z' },
      request,
    ),
    /must match/,
  )
  const missing: typeof fetch = async (input, init) =>
    String(input).includes('index.json')
      ? request(input, init)
      : new Response('', { status: 404 })
  await assert.rejects(
    verifyDeployment('https://site.test/', manifest, missing),
    /HTTP 404/,
  )
  const corrupt: typeof fetch = async (input, init) => {
    if (!String(input).includes(`${latest.commit}.json`))
      return request(input, init)
    const stored = storedDetailSchema.parse(
      JSON.parse(
        readFileSync(`public/migrations/${latest.commit}.json`, 'utf8'),
      ),
    )
    const detail =
      'base' in stored
        ? applyPatch(
            storedDetailSchema.parse(
              JSON.parse(
                readFileSync(`public/migrations/${stored.base}.json`, 'utf8'),
              ),
            ) as Parameters<typeof applyPatch>[0],
            stored,
          )
        : stored
    return new Response(
      JSON.stringify({ ...detail, units: detail.units.slice(1) }),
    )
  }
  await assert.rejects(
    verifyDeployment('https://site.test/', manifest, corrupt),
  )
})

test('workflow locks do not hold collection while Pages waits; health runs independently', () => {
  const collector = readFileSync('.github/workflows/daily-report.yml', 'utf8')
  assert.match(
    collector,
    /generate-report:\n[\s\S]*? {4}concurrency:\n {6}group: migration-reports/,
  )
  assert(!/^concurrency:/m.test(collector))
  const deploy = readFileSync(
    '.github/workflows/deploy-github-pages.yml',
    'utf8',
  )
  assert.match(deploy, /group: pages\n[\s\S]*?cancel-in-progress: true/)
  assert.match(deploy, /report\/verify-deployment.ts/)
  const health = readFileSync('.github/workflows/report-health.yml', 'utf8')
  assert.match(health, /actions: write/)
  assert.match(health, /issues: write/)
  assert(!health.includes('needs:'))
})

test('a healthy UI manifest cannot hide a missing or corrupt OpenAPI deployment', async () => {
  const { request, calls } = mockHealth()
  const missing: typeof fetch = (url, options) =>
    String(url).includes('/openapi/')
      ? Promise.resolve(new Response('', { status: 404 }))
      : request(url, options)
  const problems = await checkHealth(
    'owner/repo',
    'test-token',
    'https://site.test/',
    missing,
    now,
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /openapi report is unavailable/)
  assert(
    calls.some(
      (call) => call.url.endsWith('/issues') && call.method === 'POST',
    ),
  )
  assert(
    calls.some(
      (call) => call.url.endsWith('/dispatches') && call.method === 'POST',
    ),
  )
})

test('a broken UI deployment cannot stop OpenAPI health checks', async () => {
  const { request, calls } = mockHealth()
  const missing: typeof fetch = (url, options) =>
    String(url).includes('/migrations/')
      ? Promise.resolve(new Response('', { status: 503 }))
      : request(url, options)
  const problems = await checkHealth(
    'owner/repo',
    'test-token',
    'https://site.test/',
    missing,
    now,
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /ui report is unavailable/)
  assert(calls.some((call) => call.url.includes('/openapi/index.json')))
})

test('a failed collection is detected immediately even while its last-good report remains valid', async () => {
  const { request } = mockHealth()
  const failed: typeof fetch = (url, options) =>
    String(url).includes('/collection-status.json')
      ? Promise.resolve(
          new Response(
            JSON.stringify({
              schemaVersion: 1,
              updatedAt: new Date(now).toISOString(),
              attemptedCommit: latest.commit,
              runUrl: 'https://github.com/owner/repo/actions/runs/1',
              dashboards: {
                ui: { state: 'success', publishedCommit: latest.commit },
                openapi: { state: 'failed', publishedCommit: latest.commit },
              },
            }),
          ),
        )
      : request(url, options)
  const problems = await checkHealth(
    'owner/repo',
    'test-token',
    'https://site.test/',
    failed,
    now,
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /openapi collection failed/)
})
