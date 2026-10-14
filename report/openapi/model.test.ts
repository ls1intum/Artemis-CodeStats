import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  adoptionStateSchema,
  countSchema,
  exceptionSchema,
  inputSchema,
  manifestSchema,
  moduleAssessmentSchema,
  operationIdentitySchema,
  percentageSchema,
  provenanceSchema,
  snapshotSchema,
  specificationStateSchema,
  unavailableSchema,
  webRelevanceSchema,
  type Snapshot,
} from '../../src/features/openapi/model'

const location = { inputId: 'source', path: 'src/example.ts', line: 12 }
const evidence = [location]
const unassessed = {
  state: 'unassessed' as const,
  reason: 'This stage has not run',
}
const measurements = () => ({
  uniqueOperations: unassessed,
  generatedCallSites: unassessed,
  manualCallSites: unassessed,
  unresolvedCallSites: unassessed,
  specificationCoverage: unassessed,
  generatedTransportCoverage: unassessed,
  productionAdoption: unassessed,
})
const commit = 'a'.repeat(40)
const hash = 'b'.repeat(64)
const operationId = 'GET /api/example/{id}'
const binding = { artemisCommit: commit, inputHashes: { source: hash } }

// Synthetic validation data only. It is never written as a collected report.
function sample(): Snapshot {
  return snapshotSchema.parse({
    schemaVersion: 1,
    provenance: {
      artemisCommit: commit,
      repositoryUrl: 'https://github.com/ls1intum/Artemis',
      analyzerVersion: 'contract-test',
      analyzedAt: '2026-10-05T12:00:00Z',
      inputs: [
        {
          id: 'source',
          kind: 'server-source',
          path: 'src/example.ts',
          revision: { state: 'known', commit },
          content: { state: 'available', sha256: hash },
        },
      ],
      moduleMapping: { version: 'contract-test', sha256: hash },
      assumptions: [],
      generation: {
        state: 'unknown',
        reason: 'No generation-run evidence',
        declarations: [],
      },
      pruning: { state: 'unknown', reason: 'No paired raw and derived inputs' },
    },
    modules: [
      {
        id: 'new-module',
        role: 'server-module',
        roots: evidence,
        inventory: {
          state: 'inventoried',
          operationIds: [operationId],
          completeness: 'complete',
          evidence,
        },
        measurements: measurements(),
      },
    ],
    operations: [
      {
        id: operationId,
        method: 'GET',
        path: '/api/example/{id}',
        ownership: { state: 'resolved', moduleId: 'new-module', evidence },
        variants: [
          {
            id: 'handler',
            handler: location,
            declaredPaths: ['api/example/', '{id}'],
            conditions: ['@Profile(core)'],
            mappingAttributes: { produces: ['application/json'] },
          },
        ],
        specification: {
          state: 'present',
          reason: 'Matched committed specification',
          evidence,
        },
        generatedTransport: {
          state: 'available',
          methodIds: ['api#get'],
          reason: 'Matched actual GET transport',
          evidence,
        },
        adoption: {
          state: 'generated-detected',
          callerIds: ['call'],
          analysis: 'incomplete-analysis',
          reason: 'Only direct caller reconciled',
          evidence,
        },
        webRelevance: {
          state: 'relevant',
          basis: 'production-caller',
          evidence,
        },
      },
    ],
    generatedMethods: [
      {
        id: 'api#get',
        symbol: 'Api.get',
        location,
        transport: 'observable',
        operationIds: [operationId],
        mapping: 'resolved',
        reason: 'Actual transport method and URL',
      },
    ],
    callers: [
      {
        id: 'call',
        symbol: 'Core.load',
        area: 'core',
        location,
        kind: 'production',
        transport: 'generated',
        traffic: 'artemis-rest',
        operationIds: [operationId],
        mapping: 'resolved',
        generatedMethodId: 'api#get',
        via: [],
        reason: 'Injected service method call',
      },
    ],
    diagnostics: [],
    exceptions: [],
    measurements: measurements(),
  })
}

test('call-site counts conserve records independently of unique operations and exclude nonproduction/non-REST calls', () => {
  const snapshot = sample()
  const measured = (value: number) => ({
    state: 'measured' as const,
    value,
    completeness: 'incomplete-analysis' as const,
    basis: 'Observed production call sites',
    evidence,
  })
  snapshot.callers.push({
    ...snapshot.callers[0],
    id: 'another-call',
    location: { ...location, line: 13 },
  })
  snapshot.operations[0].adoption = {
    state: 'generated-detected',
    callerIds: ['call', 'another-call'],
    analysis: 'incomplete-analysis',
    evidence,
    reason: 'Two direct sites for one operation',
  }
  snapshot.callers.push({
    ...snapshot.callers[0],
    id: 'test-call',
    kind: 'test',
  })
  snapshot.callers.push({
    ...snapshot.callers[0],
    id: 'asset-call',
    transport: 'manual',
    generatedMethodId: undefined,
    traffic: 'asset',
    mapping: 'unresolved',
    operationIds: [],
  })
  snapshot.callers.push({
    ...snapshot.callers[0],
    id: 'unknown-call',
    transport: 'unresolved',
    generatedMethodId: undefined,
    traffic: 'unresolved',
    mapping: 'unresolved',
    operationIds: [],
  })
  Object.assign(snapshot.measurements, {
    generatedCallSites: measured(2),
    manualCallSites: measured(0),
    unresolvedCallSites: measured(1),
  })
  Object.assign(snapshot.modules[0].measurements, {
    generatedCallSites: measured(2),
    manualCallSites: measured(0),
    unresolvedCallSites: measured(0),
  })
  assert.equal(snapshotSchema.safeParse(snapshot).success, true)
  snapshot.measurements.generatedCallSites = measured(1)
  assert.equal(
    snapshotSchema.safeParse(snapshot).success,
    false,
    'one operation is not one call site',
  )
  snapshot.measurements.generatedCallSites = measured(2)
  snapshot.modules[0].measurements.unresolvedCallSites = measured(1)
  assert.equal(
    snapshotSchema.safeParse(snapshot).success,
    false,
    'unbound callers cannot be assigned to a server owner by their area',
  )
})

test('one ambiguous call site referencing multiple server candidates is counted once globally and once within its owner scope', () => {
  const snapshot = sample()
  const second = structuredClone(snapshot.operations[0])
  second.id = 'GET /api/example/{otherId}'
  second.path = '/api/example/{otherId}'
  second.generatedTransport = unassessed
  second.adoption = unassessed
  second.webRelevance = unassessed
  snapshot.operations[0].adoption = unassessed
  snapshot.operations.push(second)
  const inventory = snapshot.modules[0].inventory
  assert.equal(inventory.state, 'inventoried')
  if (inventory.state === 'inventoried') inventory.operationIds.push(second.id)
  snapshot.callers.push({
    ...snapshot.callers[0],
    id: 'ambiguous-call',
    transport: 'manual',
    generatedMethodId: undefined,
    mapping: 'ambiguous',
    operationIds: [operationId, second.id],
  })
  const measured = {
    state: 'measured' as const,
    value: 1,
    completeness: 'incomplete-analysis' as const,
    basis: 'One source site with two possible identities',
    evidence,
  }
  snapshot.measurements.unresolvedCallSites = measured
  snapshot.modules[0].measurements.unresolvedCallSites = measured
  assert.equal(snapshotSchema.safeParse(snapshot).success, true)
  snapshot.measurements.unresolvedCallSites = { ...measured, value: 2 }
  assert.equal(snapshotSchema.safeParse(snapshot).success, false)
})
const eligible = {
  state: 'eligible' as const,
  numerator: 1,
  denominator: 1,
  denominatorComplete: true as const,
  analysisComplete: true as const,
  basis: 'Independent server inventory',
  evidence,
}

function percentageSample(): Snapshot {
  const snapshot = sample()
  for (const kind of [
    'specification',
    'generated-client',
    'production-client',
    'configuration',
  ] as const)
    snapshot.provenance.inputs.push({
      id: kind,
      kind,
      path: `inputs/${kind}`,
      revision: { state: 'known', commit },
      content: { state: 'available', sha256: hash },
    })
  return snapshot
}

test('OpenAPI unknown evidence stays unknown and cannot acquire a zero default', () => {
  const unknown = { state: 'unknown', reason: 'Generation run not recorded' }
  assert.deepEqual(unavailableSchema.parse(unknown), unknown)
  assert.equal(
    unavailableSchema.safeParse({ ...unknown, value: 0 }).success,
    false,
  )
  assert.equal(
    percentageSchema.safeParse({
      state: 'eligible',
      numerator: 0,
      denominator: 0,
    }).success,
    false,
  )
})

test('missing inputs, partial analysis and zero denominators withhold percentages', () => {
  for (const state of [
    'unknown',
    'unassessed',
    'not-applicable',
    'incomplete-analysis',
  ]) {
    assert.deepEqual(
      percentageSchema.parse({ state, reason: 'Denominator not established' }),
      { state, reason: 'Denominator not established' },
    )
  }
  assert.equal(countSchema.safeParse(0).success, false)
  assert.equal(
    countSchema.safeParse({ state: 'measured', value: 0 }).success,
    false,
  )
  assert.equal(
    percentageSchema.safeParse({ ...eligible, denominator: 0 }).success,
    false,
  )
  assert.equal(
    percentageSchema.safeParse({ ...eligible, numerator: 2 }).success,
    false,
  )
  assert.equal(
    percentageSchema.safeParse({ ...eligible, denominatorComplete: false })
      .success,
    false,
  )
  assert.equal(
    percentageSchema.safeParse({ ...eligible, analysisComplete: false })
      .success,
    false,
  )
  assert.equal(
    specificationStateSchema.safeParse({
      state: 'present',
      evidence: [],
      reason: 'File exists',
    }).success,
    false,
  )
})

test('operation identity preserves methods, path spelling and handler variants', () => {
  for (const identity of [
    { method: 'GET', path: '/api/example/{id}' },
    { method: 'PUT', path: '/api/example/{id}' },
    { method: 'GET', path: '/api/example/{otherId}/' },
  ]) {
    assert.deepEqual(operationIdentitySchema.parse(identity), identity)
  }
  for (const identity of [
    { method: 'get', path: '/api/example' },
    { method: 'REQUEST', path: '/api/example' },
    { method: 'GET', path: 'api/example' },
    { method: 'GET', path: '/api/example?q=x' },
  ]) {
    assert.equal(operationIdentitySchema.safeParse(identity).success, false)
  }
  const snapshot = sample()
  snapshot.operations[0].variants.push({
    ...snapshot.operations[0].variants[0],
    id: 'second-handler',
    conditions: ['@Conditional(FeatureEnabled)'],
    mappingAttributes: { produces: ['text/csv'], params: ['format=csv'] },
  })
  assert.equal(snapshotSchema.parse(snapshot).operations[0].variants.length, 2)
  snapshot.operations.push(snapshot.operations[0])
  assert.equal(
    snapshotSchema.safeParse(snapshot).success,
    false,
    'one global identity, multiple variants',
  )
})

test('every discovered area needs inventory, evidenced no-REST or an actionable limitation', () => {
  const module = sample().modules[0]
  assert.equal(
    moduleAssessmentSchema.safeParse({
      ...module,
      inventory: { ...module.inventory, operationIds: [] },
    }).success,
    false,
  )
  assert.equal(
    moduleAssessmentSchema.safeParse({
      ...module,
      inventory: { state: 'no-rest', evidence: [], reason: 'Empty scan' },
    }).success,
    false,
  )
  assert.equal(
    moduleAssessmentSchema.safeParse({
      ...module,
      role: 'client-only',
      inventory: {
        state: 'limited',
        analysis: 'unassessed',
        evidence,
        reason: 'Client-only role not yet reconciled',
        nextStep: 'Inspect module metadata and transport sources',
      },
    }).success,
    true,
  )
  assert.equal(
    moduleAssessmentSchema.safeParse({
      ...module,
      inventory: {
        state: 'limited',
        analysis: 'unknown',
        evidence,
        reason: 'Unsupported mapping',
      },
    }).success,
    false,
  )
  const snapshot = sample()
  snapshot.modules[0].inventory = {
    state: 'no-rest',
    evidence,
    reason: 'Claimed empty module',
  }
  assert.equal(
    snapshotSchema.safeParse(snapshot).success,
    false,
    'no-REST conflicts with owned operation',
  )
})

test('web relevance requires callers or explicit metadata; no calls do not mean server-only', () => {
  assert.equal(
    webRelevanceSchema.safeParse({
      state: 'server-only',
      reason: 'No caller found',
    }).success,
    false,
  )
  const snapshot = sample()
  snapshot.operations[0].adoption = unassessed
  snapshot.callers = []
  assert.equal(
    snapshotSchema.safeParse(snapshot).success,
    false,
    'production-caller basis needs a caller',
  )
  snapshot.operations[0].webRelevance = {
    state: 'unassessed',
    reason: 'No caller found; intended use unknown',
  }
  assert.equal(snapshotSchema.safeParse(snapshot).success, true)
  snapshot.operations[0].webRelevance = {
    state: 'relevant',
    basis: 'explicit-metadata',
    evidence,
  }
  assert.equal(snapshotSchema.safeParse(snapshot).success, true)
})

test('generated, manual and mixed usage count endpoint calls, excluding implementations', () => {
  const snapshot = sample()
  snapshot.callers.push({
    ...snapshot.callers[0],
    id: 'manual',
    area: 'shared-ui',
    transport: 'manual',
    generatedMethodId: undefined,
  })
  snapshot.operations[0].adoption = {
    state: 'mixed',
    analysis: 'incomplete-analysis',
    callerIds: ['call', 'manual'],
    evidence,
    reason: 'Both transports are detected',
  }
  assert.equal(snapshotSchema.parse(snapshot).operations.length, 1)
  assert.equal(snapshotSchema.parse(snapshot).callers.length, 2)
  snapshot.operations[0].adoption = {
    state: 'generated-only',
    analysis: 'complete',
    callerIds: ['call', 'manual'],
    evidence,
    reason: 'Invalid exclusivity claim',
  }
  assert.equal(snapshotSchema.safeParse(snapshot).success, false)
  assert.equal(
    adoptionStateSchema.safeParse({
      state: 'generated-only',
      analysis: 'incomplete-analysis',
      callerIds: ['call'],
      evidence,
      reason: 'Direct calls only',
    }).success,
    false,
  )
  for (const kind of [
    'test',
    'mock',
    'fixture',
    'generated-implementation',
    'wrapper-implementation',
  ] as const) {
    const excluded = sample()
    excluded.callers[0].kind = kind
    assert.equal(snapshotSchema.safeParse(excluded).success, false, kind)
  }
  const unresolved = sample()
  unresolved.callers[0].mapping = 'unresolved'
  unresolved.operations[0].adoption = {
    state: 'generated-only',
    analysis: 'complete',
    callerIds: ['call'],
    evidence,
    reason: 'Invalid resolution claim',
  }
  assert.equal(snapshotSchema.safeParse(unresolved).success, false)
})

test('percentages reconcile independently and incomplete adoption cannot be advertised', () => {
  const snapshot = percentageSample()
  snapshot.measurements.specificationCoverage = eligible
  snapshot.modules[0].measurements.specificationCoverage = eligible
  assert.equal(snapshotSchema.safeParse(snapshot).success, true)
  snapshot.operations[0].specification = {
    state: 'missing',
    evidence,
    reason: 'Absent from audited spec',
  }
  assert.equal(
    snapshotSchema.safeParse(snapshot).success,
    false,
    'specification cannot define its own denominator',
  )
  const adoption = percentageSample()
  adoption.measurements.productionAdoption = eligible
  assert.equal(
    snapshotSchema.safeParse(adoption).success,
    false,
    'generated detected is not exclusive adoption',
  )
  adoption.operations[0].adoption = {
    state: 'generated-only',
    analysis: 'complete',
    callerIds: ['call'],
    evidence,
    reason: 'All production transport assessed',
  }
  assert.equal(snapshotSchema.safeParse(adoption).success, true)
  adoption.provenance.inputs[0].revision = {
    state: 'known',
    commit: 'c'.repeat(40),
  }
  assert.equal(
    snapshotSchema.safeParse(adoption).success,
    false,
    'mismatched inputs constrain percentages',
  )
})

test('source references and operation/caller relationships are validated', () => {
  const dangling = sample()
  dangling.callers[0].generatedMethodId = 'absent'
  assert.equal(snapshotSchema.safeParse(dangling).success, false)
  const transport = sample()
  transport.generatedMethods[0].mapping = 'unresolved'
  assert.equal(
    snapshotSchema.safeParse(transport).success,
    false,
    'availability needs resolved generated transport',
  )
  const source = sample()
  source.callers[0].location.inputId = 'absent'
  assert.equal(snapshotSchema.safeParse(source).success, false)
  const unavailable = sample()
  unavailable.provenance.inputs[0].content = {
    state: 'unavailable',
    reason: 'Missing extraction input',
  }
  assert.equal(
    snapshotSchema.safeParse(unavailable).success,
    false,
    'unavailable input cannot back a positive source observation',
  )
})

test('known manual callers cannot be omitted to claim generated-only adoption', () => {
  const snapshot = sample()
  snapshot.callers.push({
    ...snapshot.callers[0],
    id: 'manual',
    transport: 'manual',
    generatedMethodId: undefined,
  })
  snapshot.operations[0].adoption = {
    state: 'generated-only',
    callerIds: ['call'],
    analysis: 'complete',
    evidence,
    reason: 'Omitted manual transport',
  }
  assert.equal(snapshotSchema.safeParse(snapshot).success, false)
  snapshot.measurements.uniqueOperations = {
    state: 'measured',
    value: 0,
    completeness: 'complete',
    basis: 'Invalid empty inventory',
    evidence,
  }
  assert.equal(snapshotSchema.safeParse(snapshot).success, false)
  const counted = sample()
  counted.measurements.uniqueOperations = snapshot.measurements.uniqueOperations
  assert.equal(
    snapshotSchema.safeParse(counted).success,
    false,
    'a known operation cannot become zero',
  )
})

test('unsupported forms retain actionable limitations and constrain percentage claims', () => {
  const snapshot = sample()
  snapshot.modules[0].inventory = {
    state: 'limited',
    analysis: 'incomplete-analysis',
    evidence,
    reason: 'Unresolved path constant in a controller',
    nextStep:
      'Resolve the constant from committed imports before completing inventory',
  }
  snapshot.diagnostics = [
    {
      id: 'dynamic-path',
      stage: 'server',
      severity: 'warning',
      moduleIds: ['new-module'],
      operationIds: [],
      evidence,
      reason: 'Mapping expression is unsupported',
      nextStep:
        'Resolve the path constant or supply a revision-bound mapping export',
    },
  ]
  assert.equal(snapshotSchema.safeParse(snapshot).success, true)
  snapshot.measurements.specificationCoverage = eligible
  assert.equal(snapshotSchema.safeParse(snapshot).success, false)
})

test('verification and enforcement are optional and positive records must match inputs', () => {
  const snapshot = sample()
  assert.equal(snapshot.verification, undefined)
  assert.equal(snapshot.enforcement, undefined)
  snapshot.verification = [
    {
      id: 'compile',
      binding,
      bindingStatus: 'matched',
      scope: { moduleIds: ['new-module'], operationIds: [], callerIds: [] },
      kind: 'client-compilation',
      result: 'passed',
      recordedAt: '2026-10-05T12:00:00Z',
      evidence,
      reason: 'External compilation log',
    },
  ]
  snapshot.enforcement = [
    {
      id: 'rule',
      binding,
      bindingStatus: 'matched',
      scope: { moduleIds: ['new-module'], operationIds: [], callerIds: [] },
      rule: 'no-manual-api',
      state: 'enabled',
      exclusions: ['src/legacy/**'],
      exceptionIds: [],
      recordedAt: '2026-10-05T12:00:00Z',
      evidence,
      reason: 'Enabled rule with explicit exclusion',
    },
  ]
  assert.equal(snapshotSchema.safeParse(snapshot).success, true)
  snapshot.verification[0].binding = {
    ...binding,
    artemisCommit: 'c'.repeat(40),
  }
  assert.equal(snapshotSchema.safeParse(snapshot).success, false)
  snapshot.verification[0].bindingStatus = 'mismatched'
  assert.equal(
    snapshotSchema.safeParse(snapshot).success,
    true,
    'stale records are retained, but cannot establish current verification',
  )
  snapshot.enforcement[0].binding = {
    ...binding,
    inputHashes: { source: 'd'.repeat(64) },
  }
  assert.equal(snapshotSchema.safeParse(snapshot).success, false)
  assert.equal(
    snapshotSchema.safeParse({ ...sample(), migrated: true }).success,
    false,
    'compilation cannot silently become runtime migration',
  )
})

test('exceptions require review/removal conditions and do not erase handwritten calls', () => {
  const exception = {
    id: 'transition',
    binding,
    scope: { moduleIds: [], operationIds: [operationId], callerIds: [] },
    evidence,
    reason: 'Temporary compatibility adapter',
    reviewCondition: 'Review when server contract changes',
    removalCondition: 'Remove after wire compatibility is verified',
  }
  assert.equal(exceptionSchema.safeParse(exception).success, true)
  assert.equal(
    exceptionSchema.safeParse({ ...exception, removalCondition: '' }).success,
    false,
  )
  const snapshot = sample()
  snapshot.exceptions = [exception]
  snapshot.callers[0].transport = 'manual'
  snapshot.callers[0].generatedMethodId = undefined
  snapshot.operations[0].adoption = {
    state: 'manual',
    callerIds: ['call'],
    analysis: 'incomplete-analysis',
    evidence,
    reason: 'Manual adapter remains migration work',
  }
  assert.equal(
    snapshotSchema.parse(snapshot).operations[0].adoption.state,
    'manual',
  )
})

test('pruning needs paired raw/derived artifacts from one evidenced generation run', () => {
  const provenance = sample().provenance
  provenance.pruning = {
    state: 'observed',
    runId: 'run',
    rawInputId: 'raw',
    derivedInputId: 'derived',
    removedOperations: [],
    evidence,
  }
  assert.equal(provenanceSchema.safeParse(provenance).success, false)
  provenance.inputs.push(
    {
      id: 'raw',
      kind: 'raw-specification',
      path: 'openapi/raw.yaml',
      revision: { state: 'known', commit },
      content: { state: 'available', sha256: hash },
    },
    {
      id: 'derived',
      kind: 'specification',
      path: 'openapi/openapi.yaml',
      revision: { state: 'known', commit },
      content: { state: 'available', sha256: hash },
    },
  )
  provenance.generation = {
    state: 'recorded',
    binding: {
      artemisCommit: commit,
      inputHashes: { source: hash, raw: hash, derived: hash },
    },
    runId: 'run',
    generatorArtifactSha256: hash,
    profiles: ['core'],
    properties: { 'artemis.weaviate.enabled': 'true' },
    evidence,
  }
  assert.equal(provenanceSchema.safeParse(provenance).success, true)
  provenance.pruning.runId = 'different-run'
  assert.equal(provenanceSchema.safeParse(provenance).success, false)
})

test('external verification logs do not require self-referential hashes', () => {
  const snapshot = sample()
  snapshot.provenance.inputs.push({
    id: 'runtime-log',
    kind: 'verification',
    path: 'evidence/runtime.log',
    revision: {
      state: 'unknown',
      reason: 'External execution artifact, bound by the record',
    },
    content: { state: 'available', sha256: hash },
  })
  snapshot.verification = [
    {
      id: 'runtime',
      binding,
      bindingStatus: 'matched',
      scope: { moduleIds: ['new-module'], operationIds: [], callerIds: [] },
      kind: 'runtime-flow',
      result: 'passed',
      recordedAt: '2026-10-05T12:00:00Z',
      evidence: [
        { inputId: 'runtime-log', path: 'evidence/runtime.log', line: 1 },
      ],
      reason: 'External flow evidence tied to analyzed inputs',
    },
  ]
  assert.equal(snapshotSchema.safeParse(snapshot).success, true)
})

test('manifests bind snapshot files to schema, revision and bytes', () => {
  const manifest = {
    schemaVersion: 1,
    generatedAt: '2026-10-05T12:00:00Z',
    snapshots: [
      {
        artemisCommit: commit,
        file: `${commit}.json`,
        sha256: hash,
        analyzerVersion: 'contract-test',
        analyzedAt: '2026-10-05T12:00:00Z',
      },
    ],
  }
  assert.equal(manifestSchema.safeParse(manifest).success, true)
  assert.equal(
    manifestSchema.safeParse({ ...manifest, schemaVersion: 2 }).success,
    false,
  )
  assert.equal(
    manifestSchema.safeParse({
      ...manifest,
      snapshots: [manifest.snapshots[0], manifest.snapshots[0]],
    }).success,
    false,
  )
  assert.equal(
    manifestSchema.safeParse({
      ...manifest,
      snapshots: [{ ...manifest.snapshots[0], file: '../other.json' }],
    }).success,
    false,
  )
})

test('collector configuration is content-bound without claiming an Artemis storage revision', () => {
  const snapshot = sample()
  const configuration = {
    id: 'mapping',
    kind: 'configuration' as const,
    path: 'report/openapi/module-mapping.json',
    revision: {
      state: 'not-applicable' as const,
      reason: 'Configuration is stored in CodeStats',
    },
    content: { state: 'available' as const, sha256: hash },
  }
  inputSchema.parse(configuration)
  assert.equal(
    inputSchema.safeParse({ ...configuration, kind: 'server-source' }).success,
    false,
  )
  snapshot.provenance.inputs.push(configuration)
  snapshotSchema.parse(snapshot)
  snapshot.measurements.specificationCounts = {
    present: {
      state: 'measured',
      value: 99,
      completeness: 'complete',
      basis: 'Invalid test claim',
      evidence,
    },
    missing: unassessed,
    ambiguous: unassessed,
    unresolved: unassessed,
  }
  assert.equal(
    snapshotSchema.safeParse(snapshot).success,
    false,
    'Coverage counts must reconcile with independently inventoried states',
  )
})

test('actual generated identities reconcile references/counts and preserve orphan transport without a fabricated server denominator', () => {
  const snapshot = sample()
  const method = snapshot.generatedMethods[0]
  method.identities = [
    {
      method: 'GET',
      path: '/api/example/{id}',
      specification: snapshot.operations[0].specification,
    },
  ]
  snapshotSchema.parse(snapshot)
  method.identities[0].path = '/different'
  assert.equal(snapshotSchema.safeParse(snapshot).success, false)
  method.identities[0].path = '/api/example/{id}'
  snapshot.generatedMethods.push({
    ...method,
    id: 'orphan',
    symbol: 'Api.orphan',
    mapping: 'unresolved',
    operationIds: [],
    identities: [
      {
        method: 'GET',
        path: '/different',
        specification: {
          state: 'missing',
          reason: 'Not in audited contract',
          evidence,
        },
      },
    ],
  })
  snapshotSchema.parse(snapshot)
  snapshot.measurements.generatedTransportCounts = {
    available: {
      state: 'measured',
      value: 2,
      completeness: 'complete',
      basis: 'Invalid count',
      evidence,
    },
    missing: unassessed,
    ambiguous: unassessed,
    unresolved: unassessed,
  }
  assert.equal(snapshotSchema.safeParse(snapshot).success, false)
})

test('missing generated output constrains transport eligibility without erasing independently assessed specification coverage', () => {
  const snapshot = percentageSample()
  snapshot.provenance.inputs.find(
    (input) => input.kind === 'generated-client',
  )!.content = {
    state: 'unavailable',
    reason: 'No committed generated output',
  }
  snapshot.measurements.specificationCoverage = eligible
  snapshot.operations[0].generatedTransport = {
    state: 'unknown',
    reason: 'Output unavailable',
  }
  snapshotSchema.parse(snapshot)
  snapshot.measurements.generatedTransportCoverage = eligible
  assert.equal(snapshotSchema.safeParse(snapshot).success, false)
})

test('eligible specification and transport percentages require every relevant input kind at the matching revision', () => {
  for (const [field, required] of [
    [
      'specificationCoverage',
      ['server-source', 'specification', 'configuration'],
    ],
    [
      'generatedTransportCoverage',
      ['server-source', 'generated-client', 'configuration'],
    ],
  ] as const) {
    const valid = percentageSample()
    valid.measurements[field] = eligible
    valid.modules[0].measurements[field] = eligible
    snapshotSchema.parse(valid)
    for (const kind of required) {
      for (const failure of [
        'missing-kind',
        'unavailable',
        'unknown-revision',
        'mismatched-revision',
      ] as const) {
        const snapshot = structuredClone(valid)
        const input = snapshot.provenance.inputs.find(
          (entry) => entry.kind === kind,
        )!
        if (failure === 'missing-kind') {
          // Keep source locations valid while reproducing absent required kinds and
          // the former empty-filter success. The replacement is not measurement evidence.
          input.kind = 'production-client'
          input.revision = {
            state: 'unknown',
            reason: 'Unrelated input revision is unknown',
          }
        } else if (failure === 'unavailable') {
          input.content = {
            state: 'unavailable',
            reason: 'Input bytes are missing',
          }
        } else if (failure === 'unknown-revision') {
          input.revision = {
            state: 'unknown',
            reason: 'Storage revision is unknown',
          }
        } else {
          input.revision = { state: 'known', commit: 'c'.repeat(40) }
        }
        const result = snapshotSchema.safeParse(snapshot)
        assert.equal(result.success, false, `${field}: ${kind} ${failure}`)
        if (!result.success)
          assert.ok(
            result.error.issues.some((issue) =>
              issue.message.includes('all required matching available inputs'),
            ),
          )
      }
    }
    const empty = structuredClone(valid)
    for (const input of empty.provenance.inputs)
      input.kind = 'production-client'
    assert.equal(
      snapshotSchema.safeParse(empty).success,
      false,
      `${field}: no required input kinds`,
    )
  }
})

test('complete adoption and call-site counts reject applicable unbound callers and parse diagnostics', () => {
  const complete = percentageSample()
  complete.operations[0].adoption = {
    state: 'generated-only',
    callerIds: ['call'],
    analysis: 'complete',
    evidence,
    reason: 'Complete static source assessment',
  }
  complete.modules[0].measurements.productionAdoption = eligible
  assert.equal(snapshotSchema.safeParse(complete).success, true)
  for (const limitation of ['caller', 'parse-diagnostic']) {
    const snapshot = structuredClone(complete)
    if (limitation === 'caller')
      snapshot.callers.push({
        ...snapshot.callers[0],
        id: 'unbound',
        transport: 'unresolved',
        traffic: 'unresolved',
        mapping: 'unresolved',
        generatedMethodId: undefined,
        operationIds: [],
      })
    else
      snapshot.diagnostics.push({
        id: 'parse',
        stage: 'adoption',
        severity: 'warning',
        operationIds: [],
        moduleIds: [],
        evidence,
        reason: 'Unparsed production source',
        nextStep: 'Repair source analysis',
      })
    assert.equal(snapshotSchema.safeParse(snapshot).success, false, limitation)
    snapshot.operations[0].adoption = {
      state: 'generated-detected',
      callerIds: ['call'],
      evidence,
      reason: 'Applicable shared source limitation',
      analysis: 'incomplete-analysis',
    }
    snapshot.modules[0].measurements.productionAdoption = unassessed
    snapshot.modules[0].measurements.manualCallSites = {
      state: 'measured',
      value: 0,
      completeness: 'complete',
      basis: 'Invalid completeness claim',
      evidence,
    }
    assert.equal(snapshotSchema.safeParse(snapshot).success, false, limitation)
  }
})
