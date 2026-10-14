import assert from 'node:assert/strict'
import { test } from 'node:test'
import { snapshotSchema, type Snapshot } from '../../src/features/openapi/model'
import { scopeReport } from '../../src/features/openapi/scope'
import { assessReadiness } from '../../src/features/openapi/assessment'
import {
  applyEvidence,
  assessmentEvidenceSchema,
  bindingStatus,
  type AssessmentEvidence,
} from './evidence'

const commit = 'a'.repeat(40)
const hash = 'b'.repeat(64)
const server = { inputId: 'server', path: 'server/Example.java', line: 1 }
const client = { inputId: 'client', path: 'client/core/consumer.ts', line: 10 }
const generated = { inputId: 'generated', path: 'generated/api.ts', line: 12 }
const anchor = {
  inputId: 'assessment-evidence',
  path: 'report/openapi/evidence.json',
  line: 1,
}
const unknown = {
  state: 'unassessed' as const,
  reason: 'No measurement claim in this schema fixture',
}
const measurements = () => ({
  uniqueOperations: unknown,
  generatedCallSites: unknown,
  manualCallSites: unknown,
  unresolvedCallSites: unknown,
  specificationCoverage: unknown,
  generatedTransportCoverage: unknown,
  productionAdoption: unknown,
})

// Independent synthetic evidence validation data, never emitted as a collected report.
function sample(): Snapshot {
  return snapshotSchema.parse({
    schemaVersion: 1,
    provenance: {
      artemisCommit: commit,
      repositoryUrl: 'https://github.com/ls1intum/Artemis',
      analyzerVersion: 'test',
      analyzedAt: '2026-10-11T00:00:00Z',
      moduleMapping: { version: 'fixture', sha256: hash },
      assumptions: [],
      generation: {
        state: 'unknown',
        reason: 'No run evidence',
        declarations: [],
      },
      pruning: { state: 'unknown', reason: 'No raw input' },
      inputs: [
        { id: 'server', kind: 'server-source', path: 'server' },
        { id: 'client', kind: 'production-client', path: 'client' },
        { id: 'generated', kind: 'generated-client', path: 'generated' },
        { id: 'spec', kind: 'specification', path: 'spec.yaml' },
        { id: 'mapping', kind: 'configuration', path: 'mapping.json' },
        {
          id: 'assessment-evidence',
          kind: 'verification',
          path: 'report/openapi/evidence.json',
        },
      ].map((input) => ({
        ...input,
        revision: { state: 'known', commit },
        content: { state: 'available', sha256: hash },
      })),
    },
    modules: [
      {
        id: 'example',
        role: 'server-module',
        roots: [server],
        inventory: {
          state: 'inventoried',
          operationIds: ['GET /api/example'],
          completeness: 'complete',
          evidence: [server],
        },
        measurements: measurements(),
      },
    ],
    operations: [
      {
        id: 'GET /api/example',
        method: 'GET',
        path: '/api/example',
        ownership: {
          state: 'resolved',
          moduleId: 'example',
          evidence: [server],
        },
        variants: [
          {
            id: 'handler',
            handler: server,
            declaredPaths: ['/api/example'],
            conditions: [],
            mappingAttributes: {},
          },
        ],
        specification: {
          state: 'present',
          evidence: [server],
          reason: 'Fixture contract',
        },
        generatedTransport: {
          state: 'available',
          methodIds: ['api#read'],
          evidence: [generated],
          reason: 'Fixture generated implementation',
        },
        adoption: {
          state: 'generated-only',
          callerIds: ['call'],
          analysis: 'complete',
          evidence: [client],
          reason: 'Complete fixture source analysis',
        },
        webRelevance: {
          state: 'relevant',
          basis: 'production-caller',
          evidence: [client],
        },
      },
    ],
    generatedMethods: [
      {
        id: 'api#read',
        symbol: 'Api.read',
        location: generated,
        transport: 'observable',
        operationIds: ['GET /api/example'],
        mapping: 'resolved',
        reason: 'Fixture transport',
      },
    ],
    callers: [
      {
        id: 'call',
        symbol: 'Core.load',
        area: 'core',
        location: client,
        kind: 'production',
        transport: 'generated',
        traffic: 'artemis-rest',
        operationIds: ['GET /api/example'],
        mapping: 'resolved',
        generatedMethodId: 'api#read',
        via: [generated],
        reason: 'Actual fixture method call',
      },
    ],
    diagnostics: [],
    exceptions: [],
    measurements: measurements(),
  })
}
const binding = {
  artemisCommit: commit,
  inputHashes: {
    server: hash,
    client: hash,
    generated: hash,
    spec: hash,
    mapping: hash,
  },
}
const scope = {
  moduleIds: ['example'],
  operationIds: [] as string[],
  callerIds: [] as string[],
}
const document = () =>
  assessmentEvidenceSchema.parse({
    version: 1,
    exceptions: [],
    verification: [],
    enforcement: [],
    webRelevance: [],
  })
const verification = (
  kind: 'wire-compatibility' | 'runtime-flow' | 'client-compilation',
) => ({
  id: kind,
  kind,
  binding,
  scope,
  result: 'passed' as const,
  recordedAt: '2026-10-11T00:00:00Z',
  evidence: [anchor],
  reason: 'Fixture independently recorded check',
})
const rule = () => ({
  id: 'rule',
  rule: 'Contract and manual transport checks',
  binding,
  scope,
  state: 'enabled' as const,
  coverage: 'complete' as const,
  checks: ['specification', 'manual-transport'] as const,
  exclusions: [],
  exceptionIds: [],
  recordedAt: '2026-10-11T00:00:00Z',
  evidence: [anchor],
  reason: 'Fixture enabled CI rule with explicit whole-module coverage',
})

test('source-ready candidates require runtime/wire evidence; compilation and missing enforcement never establish protection', () => {
  const snapshot = sample()
  const evidence = document()
  evidence.verification.push(verification('client-compilation'))
  applyEvidence(snapshot, evidence, anchor)
  assessReadiness(snapshot)
  assert.equal(snapshot.readiness![0].migration, 'candidate')
  assert.equal(snapshot.readiness![0].protection, 'candidate')
  assert.ok(
    snapshot.nextSteps!.some(
      (step) =>
        step.category === 'verification' && /runtime-flow/.test(step.reason),
    ),
  )
  assert.ok(snapshot.nextSteps!.some((step) => step.category === 'enforcement'))
  snapshotSchema.parse(snapshot)
})

test('verified and protected states require matching inputs, wire/runtime checks and enabled complete enforcement', () => {
  const snapshot = sample()
  const evidence = document()
  evidence.verification.push(
    verification('wire-compatibility'),
    verification('runtime-flow'),
  )
  const enforcement = rule()
  evidence.enforcement.push({ ...enforcement, checks: [...enforcement.checks] })
  applyEvidence(snapshot, evidence, anchor)
  assessReadiness(snapshot)
  assert.equal(snapshot.readiness![0].migration, 'verified')
  assert.equal(snapshot.readiness![0].protection, 'protected')
  assert.deepEqual(snapshot.readiness![0].prerequisiteIds, [])
  snapshotSchema.parse(snapshot)
  snapshot.enforcement![0].exclusions.push('shared-ui/**')
  assert.equal(
    snapshotSchema.safeParse(snapshot).success,
    false,
    'a forged protected claim cannot omit rule exclusions',
  )
  assessReadiness(snapshot)
  assert.equal(snapshot.readiness![0].protection, 'candidate')
  snapshotSchema.parse(snapshot)
})

test('stale, partial and insufficient enforcement/verification records remain visible without becoming success', () => {
  for (const scenario of [
    'revision',
    'hash',
    'partial',
    'checks',
    'scope',
  ] as const) {
    const snapshot = sample()
    const evidence = document()
    evidence.verification.push(
      verification('wire-compatibility'),
      verification('runtime-flow'),
    )
    const enforcement: AssessmentEvidence['enforcement'][number] = {
      ...rule(),
      checks: [...rule().checks],
    }
    if (scenario === 'revision')
      evidence.verification[1].binding = {
        ...binding,
        artemisCommit: 'c'.repeat(40),
      }
    if (scenario === 'hash')
      enforcement.binding = {
        ...binding,
        inputHashes: { ...binding.inputHashes, client: 'c'.repeat(64) },
      }
    if (scenario === 'partial') enforcement.coverage = 'partial'
    if (scenario === 'checks') enforcement.checks = ['manual-transport']
    if (scenario === 'scope')
      enforcement.scope = {
        moduleIds: [],
        operationIds: [],
        callerIds: ['call'],
      }
    evidence.enforcement.push(enforcement)
    applyEvidence(snapshot, evidence, anchor)
    assessReadiness(snapshot)
    assert.notEqual(snapshot.readiness![0].protection, 'protected', scenario)
    assert.ok(
      snapshot.nextSteps!.some(
        (step) =>
          step.category ===
          (scenario === 'revision' ? 'verification' : 'enforcement'),
      ),
      scenario,
    )
    snapshotSchema.parse(snapshot)
  }
  const missing = sample()
  missing.provenance.inputs.find((input) => input.id === 'generated')!.content =
    { state: 'unavailable', reason: 'Missing generated input' }
  assert.equal(bindingStatus(missing, binding), 'unknown')
})

test('transition exceptions retain manual counts, review/removal conditions and stale binding limitations', () => {
  const snapshot = sample()
  snapshot.callers.push({
    ...snapshot.callers[0],
    id: 'manual',
    generatedMethodId: undefined,
    transport: 'manual',
  })
  snapshot.operations[0].adoption = {
    state: 'mixed',
    analysis: 'incomplete-analysis',
    callerIds: ['call', 'manual'],
    evidence: [client],
    reason: 'Two transports',
  }
  const evidence = document()
  evidence.exceptions.push({
    id: 'temporary-adapter',
    binding: { ...binding, artemisCommit: 'c'.repeat(40) },
    scope: { ...scope, callerIds: ['manual'] },
    evidence: [anchor],
    reason: 'Temporary response conversion',
    reviewCondition: 'the generated model changes',
    removalCondition: 'wire behavior is verified',
  })
  applyEvidence(snapshot, evidence, anchor)
  assessReadiness(snapshot)
  assert.equal(snapshot.exceptions[0].bindingStatus, 'mismatched')
  assert.equal(scopeReport(snapshot, 'example').counts.manualCallSites, 1)
  assert.equal(snapshot.readiness![0].migration, 'blocked')
  assert.ok(
    snapshot.nextSteps!.some(
      (step) =>
        step.category === 'exception-review' &&
        step.action.includes('wire behavior'),
    ),
  )
  snapshotSchema.parse(snapshot)
  assert.equal(
    assessmentEvidenceSchema.safeParse({
      ...evidence,
      exceptions: [{ ...evidence.exceptions[0], reviewCondition: '' }],
    }).success,
    false,
  )
})

test('absence of callers leaves relevance unassessed; only matching metadata can establish server-only status', () => {
  const snapshot = sample()
  snapshot.callers = []
  snapshot.operations[0].adoption = unknown
  snapshot.operations[0].webRelevance = unknown
  assessReadiness(snapshot)
  assert.equal(snapshot.readiness![0].migration, 'blocked')
  const evidence = document()
  evidence.webRelevance.push({
    operationId: 'GET /api/example',
    binding,
    state: 'server-only',
    reason: 'Explicit server consumer inventory',
    evidence: [anchor],
  })
  applyEvidence(snapshot, evidence, anchor)
  assert.equal(snapshot.operations[0].webRelevance.state, 'server-only')
  snapshotSchema.parse(snapshot)
  const conflict = sample()
  applyEvidence(conflict, evidence, anchor)
  assert.equal(conflict.operations[0].webRelevance.state, 'relevant')
  assert.ok(
    conflict.diagnostics.some((record) => record.reason.includes('conflicts')),
  )
})

test('shared server scoping keeps cross-area callers, exceptions and evidence; unbound work stays globally visible', () => {
  const snapshot = sample()
  const second = {
    ...snapshot.callers[0],
    id: 'shared',
    area: 'shared-ui',
    location: { ...client, path: 'client/shared-ui/dialog.ts' },
  }
  snapshot.callers.push(second, {
    ...snapshot.callers[0],
    id: 'unknown',
    transport: 'unresolved',
    traffic: 'unresolved',
    mapping: 'unresolved',
    generatedMethodId: undefined,
    operationIds: [],
  })
  snapshot.operations[0].adoption = {
    state: 'generated-detected',
    analysis: 'incomplete-analysis',
    callerIds: ['call', 'shared'],
    evidence: [client],
    reason: 'Source evidence remains incomplete',
  }
  assessReadiness(snapshot)
  const scoped = scopeReport(snapshot, 'example')
  assert.deepEqual(
    scoped.callers.map((caller) => caller.area),
    ['core', 'shared-ui'],
  )
  assert.equal(scoped.counts.uniqueOperations, 1)
  assert.equal(scoped.counts.generatedCallSites, 2)
  assert.equal(scoped.counts.unresolvedCallSites, 0)
  assert.equal(scoped.unscopedCallers.length, 1)
  assert.ok(scoped.nextSteps.some((step) => step.callerIds.includes('unknown')))
  assert.equal(scopeReport(snapshot).counts.unresolvedCallSites, 1)
  assert.throws(
    () => scopeReport(snapshot, 'missing'),
    /Unknown OpenAPI module/,
  )
  snapshotSchema.parse(snapshot)
})

test('unapplied records produce actionable diagnostics and duplicate evidence identifiers are rejected', () => {
  const snapshot = sample()
  const evidence = document()
  evidence.verification.push({
    ...verification('runtime-flow'),
    scope: { moduleIds: ['deleted-module'], operationIds: [], callerIds: [] },
  })
  applyEvidence(snapshot, evidence, anchor)
  assert.equal(snapshot.verification, undefined)
  assert.ok(
    snapshot.diagnostics.some((record) => record.reason.includes('Unapplied')),
  )
  const stale = document()
  stale.enforcement.push({
    ...rule(),
    checks: [...rule().checks],
    binding: { ...binding, artemisCommit: 'c'.repeat(40) },
    exceptionIds: ['missing-exception'],
  })
  applyEvidence(snapshot, stale, anchor)
  assert.deepEqual(snapshot.enforcement, [])
  assert.equal(
    snapshot.diagnostics.filter((record) => record.stage === 'enforcement')
      .length,
    2,
    'both stale binding and unavailable exception remain actionable',
  )
  assert.equal(
    new Set(snapshot.diagnostics.map((record) => record.id)).size,
    snapshot.diagnostics.length,
  )
  snapshotSchema.parse(snapshot)
  assert.equal(
    assessmentEvidenceSchema.safeParse({
      ...evidence,
      verification: [
        verification('runtime-flow'),
        verification('runtime-flow'),
      ],
    }).success,
    false,
  )
})

test('candidate gates reject incomplete source claims, missing input kinds, forged no-REST and compilation-only verification', () => {
  const detected = sample()
  detected.operations[0].adoption = {
    ...detected.operations[0].adoption,
    state: 'generated-detected',
  } as (typeof detected.operations)[0]['adoption']
  assessReadiness(detected)
  assert.equal(detected.readiness![0].migration, 'blocked')
  snapshotSchema.parse(detected)
  const missing = sample()
  missing.provenance.inputs = missing.provenance.inputs.filter(
    (input) => input.id !== 'spec',
  )
  assessReadiness(missing)
  assert.equal(missing.readiness![0].migration, 'blocked')
  snapshotSchema.parse(missing)
  const forged = sample()
  assessReadiness(forged)
  forged.readiness![0].migration = 'not-applicable'
  assert.equal(snapshotSchema.safeParse(forged).success, false)
  forged.readiness![0].migration = 'verified'
  forged.readiness![0].prerequisiteIds = []
  const evidence = document()
  evidence.verification.push(verification('client-compilation'))
  applyEvidence(forged, evidence, anchor)
  forged.readiness![0].verificationIds = ['client-compilation']
  assert.equal(snapshotSchema.safeParse(forged).success, false)
})

test('known ownership scopes analysis blockers; unbound production transport constrains every candidate', () => {
  const snapshot = sample()
  snapshot.modules.push({
    ...snapshot.modules[0],
    id: 'other',
    inventory: {
      state: 'inventoried',
      operationIds: ['GET /api/other'],
      completeness: 'complete',
      evidence: [server],
    },
  })
  snapshot.operations.push({
    ...snapshot.operations[0],
    id: 'GET /api/other',
    path: '/api/other',
    ownership: { state: 'resolved', moduleId: 'other', evidence: [server] },
    generatedTransport: unknown,
    adoption: unknown,
    webRelevance: unknown,
  })
  snapshot.callers.push({
    ...snapshot.callers[0],
    id: 'unresolved-other',
    transport: 'unresolved',
    traffic: 'unresolved',
    mapping: 'unresolved',
    generatedMethodId: undefined,
    operationIds: ['GET /api/other'],
  })
  assessReadiness(snapshot)
  assert.equal(
    snapshot.readiness!.find((record) => record.moduleId === 'example')!
      .migration,
    'candidate',
  )
  assert.equal(
    snapshot.readiness!.find((record) => record.moduleId === 'other')!
      .migration,
    'blocked',
  )
  snapshotSchema.parse(snapshot)
  snapshot.callers[1].operationIds = []
  snapshot.operations[0].adoption = {
    ...snapshot.operations[0].adoption,
    state: 'generated-detected',
    analysis: 'incomplete-analysis',
  } as Snapshot['operations'][number]['adoption']
  assessReadiness(snapshot)
  assert.ok(
    snapshot.readiness!.every((record) => record.migration === 'blocked'),
  )
  snapshotSchema.parse(snapshot)
})

test('caller-only exceptions and their prerequisites share server scope; unbound exceptions remain visible', () => {
  const snapshot = sample()
  snapshot.modules.push({
    ...snapshot.modules[0],
    id: 'other',
    inventory: {
      state: 'inventoried',
      operationIds: ['GET /api/other'],
      completeness: 'complete',
      evidence: [server],
    },
  })
  snapshot.operations.push({
    ...snapshot.operations[0],
    id: 'GET /api/other',
    path: '/api/other',
    ownership: { state: 'resolved', moduleId: 'other', evidence: [server] },
    generatedTransport: unknown,
    adoption: unknown,
    webRelevance: unknown,
  })
  snapshot.callers.push({
    ...snapshot.callers[0],
    id: 'other-call',
    area: 'shared-ui',
    transport: 'unresolved',
    traffic: 'unresolved',
    mapping: 'unresolved',
    generatedMethodId: undefined,
    operationIds: ['GET /api/other'],
  })
  const evidence = document()
  evidence.exceptions.push({
    id: 'caller-only',
    binding,
    scope: { moduleIds: [], operationIds: [], callerIds: ['other-call'] },
    evidence: [anchor],
    reason: 'A shared adapter needs review',
    reviewCondition: 'the contract changes',
    removalCondition: 'the adapter is removed',
  })
  applyEvidence(snapshot, evidence, anchor)
  assessReadiness(snapshot)
  const example = scopeReport(snapshot, 'example')
  const other = scopeReport(snapshot, 'other')
  assert.equal(example.readiness[0].migration, 'candidate')
  assert.deepEqual(example.exceptions, [])
  assert.ok(
    !example.nextSteps.some(
      (step) => step.id === 'exception-review:caller-only',
    ),
  )
  assert.equal(other.exceptions[0].id, 'caller-only')
  assert.ok(
    other.nextSteps.some((step) => step.id === 'exception-review:caller-only'),
  )
  assert.ok(
    other.readiness[0].prerequisiteIds.includes('exception-review:caller-only'),
  )
  snapshotSchema.parse(snapshot)
  snapshot.callers[1].operationIds = []
  snapshot.operations[0].adoption = {
    ...snapshot.operations[0].adoption,
    state: 'generated-detected',
    analysis: 'incomplete-analysis',
  } as Snapshot['operations'][number]['adoption']
  assessReadiness(snapshot)
  for (const module of snapshot.modules) {
    const scoped = scopeReport(snapshot, module.id)
    assert.equal(scoped.readiness[0].migration, 'blocked')
    assert.equal(scoped.exceptions[0].id, 'caller-only')
    assert.ok(
      scoped.nextSteps.some(
        (step) => step.id === 'exception-review:caller-only',
      ),
    )
    assert.equal(scoped.unscopedCallers[0].id, 'other-call')
  }
  snapshotSchema.parse(snapshot)
})
