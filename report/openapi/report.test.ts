import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { z } from 'zod'
import {
  manifestSchema,
  operationIdentitySchema,
  snapshotSchema,
  sourceLocationSchema,
} from '../../src/features/openapi/model'
import { analyzerVersion, defaultMapping, sha256 } from './generate'

const baseline = z
  .object({
    artemisCommit: z.string(),
    cases: z.array(
      z.object({
        id: z.string(),
        operation: operationIdentitySchema,
        serverModule: z.string(),
        server: sourceLocationSchema,
        specification: z.object({ state: z.enum(['present', 'missing']) }),
      }),
    ),
  })
  .parse(
    JSON.parse(
      await readFile(
        new URL('./fixtures/baseline.json', import.meta.url),
        'utf8',
      ),
    ),
  )
const bytes = await readFile(
  new URL(
    `../../public/openapi/${baseline.artemisCommit}.json`,
    import.meta.url,
  ),
)
const snapshot = snapshotSchema.parse(JSON.parse(bytes.toString()))
const manifest = manifestSchema.parse(
  JSON.parse(
    await readFile(
      new URL('../../public/openapi/index.json', import.meta.url),
      'utf8',
    ),
  ),
)

test('retained real report is validated, bound to its manifest and tracked mapping configuration', async () => {
  assert.equal(snapshot.provenance.artemisCommit, baseline.artemisCommit)
  assert.equal(snapshot.provenance.analyzerVersion, analyzerVersion)
  assert.equal(
    snapshot.provenance.moduleMapping.sha256,
    sha256(await readFile(defaultMapping)),
  )
  assert.match(snapshot.provenance.fingerprint!, /^[a-f0-9]{64}$/)
  assert.equal(
    manifest.snapshots.find(
      (entry) => entry.artemisCommit === baseline.artemisCommit,
    )!.sha256,
    sha256(bytes),
  )
  assert.ok(
    snapshot.modules.some((module) => module.id === 'deimos'),
    'A module absent from the specification is still inventoried',
  )
  assert.ok(
    snapshot.modules.every(
      (module) =>
        module.inventory.state !== 'inventoried' ||
        module.inventory.operationIds.length > 0,
    ),
  )
  assert.equal(
    new Set(snapshot.operations.map((operation) => operation.id)).size,
    snapshot.operations.length,
  )
})

test('real server/spec inventory reconciles all eight independently pinned source expectations', () => {
  for (const expected of baseline.cases) {
    const id = `${expected.operation.method} ${expected.operation.path}`
    const operation = snapshot.operations.find((item) => item.id === id)
    assert.ok(
      operation,
      `Independent source expectation missing from report: ${expected.id}`,
    )
    assert.equal(
      operation.specification.state,
      expected.specification.state,
      expected.id,
    )
    assert.equal(operation.ownership.state, 'resolved')
    if (operation.ownership.state === 'resolved')
      assert.equal(operation.ownership.moduleId, expected.serverModule)
    assert.ok(
      operation.variants.some(
        (variant) =>
          variant.handler.path === expected.server.path &&
          variant.handler.line === expected.server.line &&
          variant.handler.symbol!.endsWith(expected.server.symbol!),
      ),
      `Handler evidence differs for ${expected.id}`,
    )
  }
  const calendar = snapshot.modules.find((module) => module.id === 'calendar')!
    .measurements.specificationCoverage
  assert.deepEqual(
    calendar.state === 'eligible'
      ? [calendar.numerator, calendar.denominator]
      : calendar.state,
    [3, 3],
  )
  assert.equal(
    snapshot.operations.find(
      (operation) =>
        operation.id === 'GET /api/course/courses/{courseId}/management-detail',
    )!.specification.state,
    'missing',
  )
  assert.ok(
    snapshot.operations
      .find((operation) => operation.id === 'GET /api/search')!
      .variants.some((variant) =>
        variant.conditions.some((condition) =>
          condition.includes('WeaviateEnabled'),
        ),
      ),
  )
})

test('real limitations prevent global completeness and later migration claims', () => {
  assert.equal(
    snapshot.measurements.specificationCoverage.state,
    'incomplete-analysis',
  )
  assert.equal(snapshot.measurements.uniqueOperations.state, 'measured')
  if (snapshot.measurements.uniqueOperations.state === 'measured')
    assert.equal(
      snapshot.measurements.uniqueOperations.completeness,
      'incomplete-analysis',
    )
  assert.ok(
    snapshot.diagnostics.some((item) =>
      item.reason.includes('JavaParser could not completely parse'),
    ),
  )
  assert.ok(
    snapshot.diagnostics.some((item) =>
      item.reason.includes('constrained/dynamic path'),
    ),
  )
  assert.equal(snapshot.provenance.generation.state, 'unknown')
  assert.equal(snapshot.provenance.pruning.state, 'unknown')
  assert.equal(snapshot.enforcement, undefined)
  assert.equal(snapshot.verification, undefined)
  assert.equal(snapshot.generatedMethods.length, 0)
  assert.equal(snapshot.callers.length, 0)
  assert.ok(
    snapshot.operations.every(
      (operation) =>
        operation.generatedTransport.state === 'unassessed' &&
        operation.adoption.state === 'unassessed' &&
        operation.webRelevance.state === 'unassessed',
    ),
  )
})
