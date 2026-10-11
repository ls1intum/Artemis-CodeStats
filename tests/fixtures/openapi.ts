import { snapshotSchema, type Snapshot } from '../../src/features/openapi/model'
import { assessReadiness } from '../../src/features/openapi/assessment'

// Synthetic UI/loader evidence only. Never published as an Artemis collection.
export function openApiFixture(includeUnassigned = false): Snapshot {
  const commit = 'a'.repeat(40)
  const hash = 'b'.repeat(64)
  const server = { inputId: 'server', path: 'server/Resource.java', line: 12 }
  const client = {
    inputId: 'client',
    path: 'client/core/consumer.ts',
    line: 25,
  }
  const generated = { inputId: 'generated', path: 'generated/api.ts', line: 40 }
  const spec = { inputId: 'spec', path: 'openapi.yaml', line: 8 }
  const unknown = {
    state: 'unassessed' as const,
    reason:
      'Partial fixture analysis; denominator eligibility has not been established.',
  }
  const measurements = (
    operations: number,
    generatedCalls: number,
    manualCalls: number,
    unresolvedCalls: number,
    complete = false,
  ): Snapshot['measurements'] => {
    const measured = (value: number) => ({
      state: 'measured' as const,
      value,
      completeness: complete
        ? ('complete' as const)
        : ('incomplete-analysis' as const),
      basis: 'Independent synthetic source observations',
      evidence: [server, client],
    })
    const ratio = complete
      ? {
          state: 'eligible' as const,
          numerator: 1,
          denominator: 1,
          denominatorComplete: true as const,
          analysisComplete: true as const,
          basis: 'Complete synthetic operation scope',
          evidence: [server, client, spec, generated],
        }
      : unknown
    return {
      uniqueOperations: measured(operations),
      generatedCallSites: measured(generatedCalls),
      manualCallSites: measured(manualCalls),
      unresolvedCallSites: measured(unresolvedCalls),
      specificationCoverage: ratio,
      generatedTransportCoverage: ratio,
      productionAdoption: ratio,
    }
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
  const caller = (
    id: string,
    owner: string,
    transport: 'manual' | 'generated',
  ): Snapshot['callers'][number] => ({
    id,
    symbol: `Core.${id}`,
    area: 'core',
    location: client,
    kind: 'production',
    transport,
    traffic: 'artemis-rest',
    operationIds: [`GET /api/${owner}`],
    mapping: 'resolved',
    ...(transport === 'generated' ? { generatedMethodId: `Api.${owner}` } : {}),
    via: [{ ...client, path: 'client/shared/base-http.ts', line: 63 }],
    reason: `Synthetic ${transport} production caller for ${owner}`,
  })
  const operation = (owner: string): Snapshot['operations'][number] => ({
    id: `GET /api/${owner}`,
    method: 'GET',
    path: `/api/${owner}`,
    ownership: { state: 'resolved', moduleId: owner, evidence: [server] },
    variants: [
      {
        id: `${owner}-handler`,
        handler: { ...server, symbol: `${owner}.read` },
        declaredPaths: [`/api/${owner}`],
        conditions: ['@Profile(core)'],
        mappingAttributes: { produces: ['application/json'] },
      },
    ],
    specification: {
      state: 'present',
      reason: 'Synthetic contract match',
      evidence: [spec],
    },
    generatedTransport: {
      state: 'available',
      methodIds: [`Api.${owner}`],
      reason: 'Synthetic actual transport match',
      evidence: [generated],
    },
    adoption: {
      state: owner === 'alpha' ? 'mixed' : 'generated-only',
      callerIds:
        owner === 'alpha'
          ? ['alpha-generated', 'alpha-manual']
          : ['beta-generated'],
      analysis: 'complete',
      reason: 'Synthetic source reconciliation',
      evidence: [client],
    },
    webRelevance: {
      state: 'relevant',
      basis: 'production-caller',
      evidence: [client],
    },
  })
  const snapshot: Snapshot = {
    schemaVersion: 1,
    provenance: {
      artemisCommit: commit,
      repositoryUrl: 'https://github.com/ls1intum/Artemis',
      analyzerVersion: 'synthetic-ui-test',
      analyzedAt: '2026-10-11T00:00:00Z',
      moduleMapping: { version: 'fixture', sha256: hash },
      assumptions: [
        {
          reason:
            'Static synthetic analysis does not establish deployed profile activation.',
          evidence: [server],
        },
      ],
      generation: {
        state: 'recorded',
        binding,
        runId: 'synthetic-run',
        generatorArtifactSha256: hash,
        profiles: ['core'],
        properties: { useHttpResource: 'false' },
        evidence: [generated],
      },
      pruning: {
        state: 'unknown',
        reason: 'No paired raw and derived specification inputs',
      },
      inputs: [
        { id: 'server', kind: 'server-source', path: 'server' },
        { id: 'client', kind: 'production-client', path: 'client' },
        { id: 'generated', kind: 'generated-client', path: 'generated' },
        { id: 'spec', kind: 'specification', path: 'openapi.yaml' },
        { id: 'mapping', kind: 'configuration', path: 'mapping.json' },
      ].map((input) => ({
        ...input,
        revision: { state: 'known', commit },
        content: { state: 'available', sha256: hash },
      })) as Snapshot['provenance']['inputs'],
    },
    modules: [
      {
        id: 'alpha',
        role: 'server-module',
        roots: [server],
        inventory: {
          state: 'inventoried',
          operationIds: ['GET /api/alpha', 'GET /api/alpha/unknown'],
          completeness: 'incomplete-analysis',
          evidence: [server],
        },
        measurements: measurements(2, 1, 1, 0),
      },
      {
        id: 'beta',
        role: 'server-module',
        roots: [server],
        inventory: {
          state: 'inventoried',
          operationIds: ['GET /api/beta'],
          completeness: 'complete',
          evidence: [server],
        },
        measurements: measurements(1, 1, 0, 0, true),
      },
      {
        id: 'shared-ui',
        role: 'client-only',
        roots: [client],
        inventory: {
          state: 'no-rest',
          reason: 'No owned REST mappings in the synthetic shared UI scope',
          evidence: [client],
        },
        measurements: {
          ...measurements(0, 0, 0, 0),
          specificationCoverage: {
            state: 'not-applicable',
            reason: 'Evidenced no-REST scope',
          },
          generatedTransportCoverage: {
            state: 'not-applicable',
            reason: 'Evidenced no-REST scope',
          },
          productionAdoption: {
            state: 'not-applicable',
            reason: 'Evidenced no-REST scope',
          },
        },
      },
      {
        id: 'limited',
        role: 'unresolved',
        roots: [server],
        inventory: {
          state: 'limited',
          analysis: 'incomplete-analysis',
          reason: 'Synthetic unsupported controller mapping',
          nextStep: 'Reconcile the custom mapping annotation',
          evidence: [server],
        },
        measurements: {
          ...measurements(0, 0, 0, 0),
          uniqueOperations: unknown,
        },
      },
    ],
    operations: [
      operation('alpha'),
      operation('beta'),
      {
        ...operation('alpha'),
        id: 'GET /api/alpha/unknown',
        path: '/api/alpha/unknown',
        variants: [
          {
            id: 'unknown-handler',
            handler: server,
            declaredPaths: ['/api/alpha/unknown'],
            conditions: [],
            mappingAttributes: {},
          },
        ],
        specification: {
          state: 'unknown',
          reason: 'No specification evidence for this handler',
        },
        generatedTransport: {
          state: 'unassessed',
          reason: 'Generated binding has not been assessed',
        },
        adoption: unknown,
        webRelevance: {
          state: 'unassessed',
          reason: 'No detected caller is insufficient to declare server-only',
        },
      },
    ],
    generatedMethods: ['alpha', 'beta'].map((owner) => ({
      id: `Api.${owner}`,
      symbol: `Api.${owner}`,
      location: generated,
      transport: 'observable',
      operationIds: [`GET /api/${owner}`],
      mapping: 'resolved',
      reason: 'Synthetic generated implementation',
    })),
    callers: [
      caller('alpha-generated', 'alpha', 'generated'),
      caller('alpha-manual', 'alpha', 'manual'),
      caller('beta-generated', 'beta', 'generated'),
      {
        ...caller('alpha-wrapper', 'alpha', 'manual'),
        kind: 'wrapper-implementation',
        symbol: 'BaseHttp.get',
      },
    ],
    diagnostics: ['alpha', 'beta'].map((owner) => ({
      id: `${owner}-diagnostic`,
      stage: 'provenance',
      severity: 'warning',
      moduleIds: [owner],
      operationIds: [],
      evidence: [server],
      reason: `${owner} deployment profile not recorded`,
      nextStep: `Record ${owner} deployment profile evidence`,
    })),
    exceptions: [
      {
        id: 'alpha-exception',
        binding,
        bindingStatus: 'matched',
        scope: { moduleIds: ['alpha'], operationIds: [], callerIds: [] },
        evidence: [client],
        reason: 'Temporary handwritten alpha transport',
        reviewCondition: 'Alpha transport is generated',
        removalCondition: 'Alpha flow has matching verification',
      },
    ],
    verification: [
      {
        id: 'alpha-compilation',
        binding,
        bindingStatus: 'matched',
        scope: { moduleIds: ['alpha'], operationIds: [], callerIds: [] },
        kind: 'client-compilation',
        result: 'passed',
        recordedAt: '2026-10-11T00:00:00Z',
        reason: 'Synthetic compilation evidence only',
        evidence: [client],
      },
    ],
    enforcement: [
      {
        id: 'alpha-rule',
        binding,
        bindingStatus: 'matched',
        scope: { moduleIds: ['alpha'], operationIds: [], callerIds: [] },
        rule: 'Alpha manual transport check',
        state: 'disabled',
        recordedAt: '2026-10-11T00:00:00Z',
        exclusions: ['client/core'],
        exceptionIds: ['alpha-exception'],
        coverage: 'partial',
        checks: ['manual-transport'],
        reason: 'Synthetic disabled partial rule',
        evidence: [client],
      },
    ],
    measurements: measurements(3, 2, 1, includeUnassigned ? 1 : 0),
  }
  if (includeUnassigned) {
    snapshot.callers.push({
      ...caller('unassigned', 'alpha', 'manual'),
      symbol: 'Core.dynamic',
      transport: 'unresolved',
      traffic: 'unresolved',
      mapping: 'unresolved',
      operationIds: [],
      via: [],
      reason: 'Dynamic target cannot be attributed to an operation',
    })
    snapshot.modules[1].measurements.productionAdoption = unknown
  }
  assessReadiness(snapshot)
  return snapshotSchema.parse(snapshot)
}
