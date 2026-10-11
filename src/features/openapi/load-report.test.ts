import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { openApiFixture } from '../../../tests/fixtures/openapi'
import { loadOpenApiReport } from './load-report'
import { sourceUrl } from './source'

test('loader uses the deployment base, signal and manifest digest, and preserves unknown evidence', async (t) => {
  const snapshot = openApiFixture()
  const bytes = JSON.stringify(snapshot)
  const entry = {
    artemisCommit: snapshot.provenance.artemisCommit,
    file: `${snapshot.provenance.artemisCommit}.json`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    analyzerVersion: snapshot.provenance.analyzerVersion,
    analyzedAt: snapshot.provenance.analyzedAt,
  }
  const manifest = {
    schemaVersion: 1,
    generatedAt: entry.analyzedAt,
    snapshots: [entry],
  }
  const signal = new AbortController().signal
  const requests: string[] = []
  t.mock.method(
    globalThis,
    'fetch',
    async (url: string, options: RequestInit) => {
      requests.push(url)
      assert.equal(options.signal, signal)
      assert.equal(
        options.cache,
        url.endsWith('index.json') ? 'no-cache' : 'default',
      )
      return new Response(
        url.endsWith('index.json') ? JSON.stringify(manifest) : bytes,
      )
    },
  )
  const loaded = await loadOpenApiReport({}, signal, '/Artemis-CodeStats/')
  assert.deepEqual(requests, [
    '/Artemis-CodeStats/openapi/index.json',
    `/Artemis-CodeStats/openapi/${entry.file}`,
  ])
  assert.equal(loaded.snapshot.operations[2].specification.state, 'unknown')
  assert.equal(
    loaded.snapshot.modules[0].measurements.productionAdoption.state,
    'unassessed',
  )
  assert.equal(loaded.snapshot.readiness?.[1].migration, 'candidate')
})

test('latest selection uses analysis time rather than manifest order, and explicit revision selection is retained', async (t) => {
  const latest = openApiFixture()
  const earlier = JSON.parse(
    JSON.stringify(latest)
      .replaceAll('a'.repeat(40), 'c'.repeat(40))
      .replaceAll('2026-10-11T00:00:00Z', '2026-10-10T00:00:00Z'),
  )
  const snapshots = [latest, earlier].map((snapshot) => {
    const bytes = JSON.stringify(snapshot)
    return {
      artemisCommit: snapshot.provenance.artemisCommit,
      file: `${snapshot.provenance.artemisCommit}.json`,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      analyzerVersion: snapshot.provenance.analyzerVersion,
      analyzedAt: snapshot.provenance.analyzedAt,
    }
  })
  t.mock.method(
    globalThis,
    'fetch',
    async (url: string) =>
      new Response(
        JSON.stringify(
          url.endsWith('index.json')
            ? {
                schemaVersion: 1,
                generatedAt: latest.provenance.analyzedAt,
                snapshots,
              }
            : url.endsWith(`${'a'.repeat(40)}.json`)
              ? latest
              : earlier,
        ),
      ),
  )
  assert.equal(
    (await loadOpenApiReport({}, new AbortController().signal, '/')).snapshot
      .provenance.artemisCommit,
    'a'.repeat(40),
  )
  assert.equal(
    (
      await loadOpenApiReport(
        { snapshot: 'c'.repeat(40) },
        new AbortController().signal,
        '/',
      )
    ).snapshot.provenance.artemisCommit,
    'c'.repeat(40),
  )
})

test('loader rejects missing, malformed, unsupported, mismatched and unknown-revision artifacts', async (t) => {
  const snapshot = openApiFixture()
  const original = JSON.stringify(snapshot)
  const entry = {
    artemisCommit: snapshot.provenance.artemisCommit,
    file: `${snapshot.provenance.artemisCommit}.json`,
    sha256: createHash('sha256').update(original).digest('hex'),
    analyzerVersion: snapshot.provenance.analyzerVersion,
    analyzedAt: snapshot.provenance.analyzedAt,
  }
  for (const [name, index, bytes, pattern] of [
    ['missing', null, original, /HTTP 404/],
    ['malformed JSON', '{', original, /Invalid JSON/],
    [
      'unsupported manifest',
      { schemaVersion: 99 },
      original,
      /Unsupported OpenAPI schema/,
    ],
    [
      'invalid manifest',
      { schemaVersion: 1 },
      original,
      /Invalid OpenAPI report/,
    ],
    [
      'wrong filename',
      { ...entry, file: 'other.json' },
      original,
      /identity mismatch/,
    ],
    ['wrong digest', entry, `${original}\n`, /integrity mismatch/],
    [
      'wrong analyzer',
      { ...entry, analyzerVersion: 'different' },
      original,
      /identity mismatch/,
    ],
    [
      'wrong time',
      { ...entry, analyzedAt: '2026-10-10T00:00:00Z' },
      original,
      /identity mismatch/,
    ],
    [
      'unsupported snapshot',
      entry,
      JSON.stringify({ ...snapshot, schemaVersion: 99 }),
      /Unsupported OpenAPI schema/,
    ],
    [
      'invalid snapshot',
      entry,
      JSON.stringify({ ...snapshot, modules: [] }),
      /Invalid OpenAPI report/,
    ],
    [
      'wrong revision',
      entry,
      original.replaceAll('a'.repeat(40), 'c'.repeat(40)),
      /identity mismatch/,
    ],
  ] as const) {
    await t.test(name, async (t) => {
      const record =
        index && 'file' in Object(index)
          ? {
              ...(index as typeof entry),
              sha256:
                name === 'wrong digest'
                  ? entry.sha256
                  : createHash('sha256').update(bytes).digest('hex'),
            }
          : undefined
      const manifest = record
        ? {
            schemaVersion: 1,
            generatedAt: entry.analyzedAt,
            snapshots: [record],
          }
        : index
      t.mock.method(
        globalThis,
        'fetch',
        async (url: string) =>
          new Response(
            url.endsWith('index.json')
              ? typeof manifest === 'string'
                ? manifest
                : JSON.stringify(manifest)
              : bytes,
            { status: name === 'missing' ? 404 : 200 },
          ),
      )
      await assert.rejects(
        loadOpenApiReport({}, new AbortController().signal, '/'),
        pattern,
      )
      if (name === 'wrong analyzer')
        await assert.rejects(
          loadOpenApiReport(
            { snapshot: 'missing' },
            new AbortController().signal,
            '/',
          ),
          /not in the report history/,
        )
    })
  }
})

test('an aborted load cannot return a report, including cancellation during fetch', async (t) => {
  const controller = new AbortController()
  t.mock.method(
    globalThis,
    'fetch',
    (_url: string, options: RequestInit) =>
      new Promise((_resolve, reject) =>
        options.signal?.addEventListener(
          'abort',
          () => reject(options.signal?.reason),
          { once: true },
        ),
      ),
  )
  const pending = loadOpenApiReport({}, controller.signal, '/')
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
})

test('source links use the evidenced storage revision and line, never a guessed configuration revision', () => {
  const snapshot = openApiFixture()
  const location = snapshot.callers[0].location
  assert.equal(
    sourceUrl(snapshot.provenance, location),
    `https://github.com/ls1intum/Artemis/blob/${'a'.repeat(40)}/client/core/consumer.ts#L25`,
  )
  snapshot.provenance.inputs.find((input) => input.id === 'client')!.revision =
    { state: 'known', commit: 'c'.repeat(40) }
  assert.match(sourceUrl(snapshot.provenance, location)!, /blob\/c{40}\//)
  snapshot.provenance.inputs.find((input) => input.id === 'client')!.revision =
    { state: 'unknown', reason: 'No storage revision' }
  assert.equal(sourceUrl(snapshot.provenance, location), undefined)
  snapshot.provenance.inputs.find((input) => input.id === 'mapping')!.revision =
    { state: 'not-applicable', reason: 'Collector local input' }
  assert.equal(
    sourceUrl(snapshot.provenance, {
      inputId: 'mapping',
      path: 'mapping.json',
      line: 1,
    }),
    undefined,
  )
})
