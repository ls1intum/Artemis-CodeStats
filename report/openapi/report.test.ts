import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { z } from 'zod'
import {
  manifestSchema,
  inputSchema,
  operationIdentitySchema,
  snapshotSchema,
  sourceLocationSchema,
} from '../../src/features/openapi/model'
import { analyzerVersion, defaultMapping, sha256 } from './generate'

const baseline = z
  .object({
    artemisCommit: z.string(),
    inputs: z.array(inputSchema),
    cases: z.array(
      z.object({
        id: z.string(),
        group: z.string(),
        operation: operationIdentitySchema,
        serverModule: z.string(),
        server: sourceLocationSchema,
        specification: z.object({ state: z.enum(['present', 'missing']) }),
        generatedMethods: z.array(
          z.object({
            symbol: z.string(),
            location: sourceLocationSchema,
            transport: z.enum(['observable', 'resource-helper']),
          }),
        ),
        callers: z.array(
          z.object({
            symbol: z.string(),
            area: z.string(),
            transport: z.enum(['generated', 'manual']),
            location: sourceLocationSchema,
          }),
        ),
        expected: z.object({
          generatedTransport: z.enum(['available', 'missing']),
          adoption: z.string(),
        }),
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
  assert.ok(snapshot.generatedMethods.length > 0)
  assert.ok(snapshot.callers.length > 0)
  assert.ok(
    snapshot.operations.every(
      (operation) =>
        !['generated-only', 'no-calls'].includes(operation.adoption.state),
    ),
  )
  assert.equal(
    snapshot.measurements.productionAdoption.state,
    'incomplete-analysis',
  )
  assert.ok(
    snapshot.diagnostics.some(
      (item) =>
        item.stage === 'adoption' && item.reason.includes('Direct-only'),
    ),
  )
})

test('real direct adoption reconciles independent pinned call sites, symbols and ownership across client areas', () => {
  for (const expected of baseline.cases.filter(
    (entry) => entry.group !== 'inherited-wrapper',
  )) {
    const id = `${expected.operation.method} ${expected.operation.path}`
    const operation = snapshot.operations.find((entry) => entry.id === id)!
    assert.equal(
      operation.adoption.state,
      expected.expected.adoption,
      expected.id,
    )
    assert.equal(operation.webRelevance.state, 'relevant')
    const callers = snapshot.callers.filter((caller) =>
      caller.operationIds.includes(id),
    )
    assert.equal(callers.length, expected.callers.length, expected.id)
    for (const anchor of expected.callers) {
      assert.ok(
        callers.some(
          (caller) =>
            caller.symbol === anchor.symbol &&
            caller.area === anchor.area &&
            caller.transport === anchor.transport &&
            caller.location.path === anchor.location.path &&
            caller.location.line === anchor.location.line,
        ),
        expected.id,
      )
    }
  }
  const shared = snapshot.callers.find(
    (caller) => caller.symbol === 'UsersImportDialogComponent.importUsers',
  )!
  assert.equal(shared.area, 'shared-ui')
  assert.deepEqual(shared.operationIds, [
    'POST /api/tutorialgroup/courses/{courseId}/tutorial-groups/{tutorialGroupId}/import-registrations',
  ])
  const owner = snapshot.operations.find(
    (operation) => operation.id === shared.operationIds[0],
  )!.ownership
  assert.equal(owner.state === 'resolved' && owner.moduleId, 'tutorialgroup')
  const search = snapshot.callers.find(
    (caller) => caller.symbol === 'GlobalSearchModalComponent.constructor',
  )!
  assert.equal(search.area, 'core')
  assert.deepEqual(search.operationIds, ['GET /api/search'])
})

test('real inherited examples remain actionable unresolved work and totals independently reconcile every call site', () => {
  for (const expected of baseline.cases.filter(
    (entry) => entry.group === 'inherited-wrapper',
  )) {
    for (const anchor of expected.callers) {
      const caller = snapshot.callers.find(
        (caller) =>
          caller.symbol === anchor.symbol &&
          caller.location.path === anchor.location.path &&
          caller.location.line === anchor.location.line,
      )
      assert.ok(caller)
      assert.equal(caller.transport, 'unresolved')
      assert.equal(caller.mapping, 'unresolved')
      assert.match(caller.reason, /Inherited/)
      assert.ok(
        snapshot.diagnostics.some(
          (diagnostic) =>
            diagnostic.stage === 'adoption' &&
            diagnostic.evidence.some(
              (evidence) =>
                evidence.path === caller.location.path &&
                evidence.line === caller.location.line,
            ),
        ),
      )
    }
  }
  for (const [bucket, key] of [
    ['generated', 'generatedCallSites'],
    ['manual', 'manualCallSites'],
    ['unresolved', 'unresolvedCallSites'],
  ] as const) {
    // Independently calculate the partition rather than invoking the collector's helper.
    const expected = snapshot.callers.filter(
      (caller) =>
        caller.kind === 'production' &&
        (bucket === 'unresolved'
          ? caller.traffic === 'unresolved' ||
            (caller.traffic === 'artemis-rest' &&
              (caller.mapping !== 'resolved' ||
                caller.transport === 'unresolved'))
          : caller.traffic === 'artemis-rest' &&
            caller.mapping === 'resolved' &&
            caller.transport === bucket),
    )
    const count = snapshot.measurements[key]
    assert.equal(count.state, 'measured')
    if (count.state === 'measured') {
      assert.equal(count.value, expected.length)
      assert.equal(count.completeness, 'incomplete-analysis')
    }
  }
  assert.ok(
    snapshot.callers.every(
      (caller) =>
        ['production', 'wrapper-implementation'].includes(caller.kind) &&
        !caller.location.path.includes('/openapi/') &&
        !/\.(spec|test)\.ts$/.test(caller.location.path),
    ),
  )
})

test('real generated inventory matches independently pinned methods, tree hash and the quiz transport gap', () => {
  const tree = snapshot.provenance.inputs.find(
    (input) => input.id === 'generated',
  )!
  const expectedTree = baseline.inputs.find(
    (input) => input.id === 'generated-tree',
  )!
  assert.deepEqual(tree.content, expectedTree.content)
  assert.deepEqual(tree.revision, expectedTree.revision)
  for (const expected of baseline.cases) {
    const id = `${expected.operation.method} ${expected.operation.path}`
    const operation = snapshot.operations.find((entry) => entry.id === id)!
    assert.equal(
      operation.generatedTransport.state,
      expected.expected.generatedTransport,
      expected.id,
    )
    for (const anchor of expected.generatedMethods) {
      const method = snapshot.generatedMethods.find(
        (entry) =>
          entry.symbol === anchor.symbol &&
          entry.location.path === anchor.location.path &&
          entry.location.line === anchor.location.line,
      )
      assert.ok(
        method,
        `Missing independently pinned generated method: ${anchor.symbol}`,
      )
      assert.equal(method.transport, anchor.transport)
      assert.equal(method.mapping, 'resolved')
      assert.ok(method.operationIds.includes(id))
      assert.ok(
        method.identities?.some(
          (identity) => `${identity.method} ${identity.path}` === id,
        ),
      )
    }
  }
  const calendar = snapshot.modules.find((module) => module.id === 'calendar')!
    .measurements.generatedTransportCoverage
  assert.deepEqual(
    calendar.state === 'eligible'
      ? [calendar.numerator, calendar.denominator]
      : calendar.state,
    [3, 3],
  )
  assert.equal(
    snapshot.generatedMethods.some((method) =>
      method.identities?.some(
        (identity) =>
          `${identity.method} ${identity.path}` ===
          'POST /api/quiz/exercises/{exerciseId}/submissions/live',
      ),
    ),
    false,
  )
  assert.ok(
    snapshot.diagnostics.some(
      (diagnostic) =>
        diagnostic.stage === 'generated' &&
        diagnostic.reason.includes(
          'POST /api/quiz/exercises/{exerciseId}/submissions/live',
        ),
    ),
  )
  assert.ok(
    snapshot.generatedMethods.some(
      (method) =>
        method.mapping === 'unresolved' &&
        method.identities?.length &&
        method.operationIds.length === 0,
    ),
    'Generated identities outside the independent inventory remain visible',
  )
  assert.equal(snapshot.provenance.generation.state, 'unknown')
  if (snapshot.provenance.generation.state === 'unknown')
    assert.ok(
      snapshot.provenance.generation.declarations.some((declaration) =>
        declaration.includes('7.21.0'),
      ),
    )
})
