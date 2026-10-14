import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, test } from 'node:test'
import {
  callSiteBucket,
  manifestSchema,
  snapshotSchema,
  type Provenance,
} from '../../src/features/openapi/model'
import {
  defaultMapping,
  generateReport,
  inventorySnapshot,
  sha256,
} from './generate'
import { discoverModules, mappingSchema, ownerOf } from './scope'
import { createServerExtractor, type ServerExtraction } from './server'
import { parseSpecification, reconcileSpecification } from './spec'
import { verifyReport } from './verify'
import { validateArtifacts } from './artifacts'

const fixture = fileURLToPath(new URL('./fixtures/inventory', import.meta.url))
const mapping = mappingSchema.parse({
  version: 'fixture-1',
  serverRoot: 'server',
  clientRoot: 'client',
  roleOverrides: {
    'shared-ui': {
      role: 'shared-infrastructure',
      reason: 'Shared fixture area',
    },
  },
  ownershipOverrides: [],
})
const commit = 'a'.repeat(40)
const hash = 'b'.repeat(64)
const provenance: Provenance = {
  artemisCommit: commit,
  repositoryUrl: 'https://github.com/ls1intum/Artemis',
  analyzerVersion: 'fixture',
  analyzedAt: '2026-10-05T12:00:00Z',
  inputs: [
    {
      id: 'server',
      kind: 'server-source',
      path: 'server',
      revision: { state: 'known', commit },
      content: { state: 'available', sha256: hash },
    },
    {
      id: 'client',
      kind: 'production-client',
      path: 'client',
      revision: { state: 'known', commit },
      content: { state: 'available', sha256: hash },
    },
    {
      id: 'module-mapping',
      kind: 'configuration',
      path: 'report/openapi/module-mapping.json',
      revision: { state: 'not-applicable', reason: 'CodeStats configuration' },
      content: { state: 'available', sha256: hash },
    },
    {
      id: 'specification',
      kind: 'specification',
      path: 'openapi.yaml',
      revision: { state: 'known', commit },
      content: { state: 'available', sha256: hash },
    },
  ],
  moduleMapping: { version: 'fixture-1', sha256: hash },
  assumptions: [],
  generation: { state: 'unknown', reason: 'No run evidence', declarations: [] },
  pruning: { state: 'unknown', reason: 'No raw input' },
}
let extractor: Awaited<ReturnType<typeof createServerExtractor>>
let server: ServerExtraction
before(async () => {
  extractor = await createServerExtractor()
  server = await extractor.extract(fixture, mapping.serverRoot)
})
after(async () => {
  await extractor?.close()
})
const specContent = await readFile(path.join(fixture, 'openapi.yaml'), 'utf8')
const specification = parseSpecification(
  specContent,
  'specification',
  'openapi.yaml',
)
const fixtureFiles = () => [
  ...server.files.map((file) => file.path),
  'client/shared-ui/service.ts',
]
const collect = (config = mapping) =>
  inventorySnapshot({
    provenance,
    mapping: config,
    modules: discoverModules(fixtureFiles(), config),
    server,
    specification,
    specRevisionMatches: true,
  })

test('discovery anchors skip empty files without dropping areas that have only empty files', () => {
  const files = [
    'server/alpha/.gitkeep',
    'server/alpha/Resource.java',
    'client/empty/.gitkeep',
  ]
  const modules = discoverModules(
    files,
    mapping,
    new Set(['server/alpha/Resource.java']),
  )
  assert.equal(
    modules.find((module) => module.id === 'alpha')!.roots[0].path,
    'server/alpha/Resource.java',
  )
  const empty = modules.find((module) => module.id === 'empty')!
  assert.match(empty.limitation!, /only empty files/)
  const snapshot = inventorySnapshot({
    provenance,
    mapping,
    modules,
    server: { files: [], mappings: [], issues: [] },
    specRevisionMatches: true,
  })
  assert.equal(
    snapshot.modules.find((module) => module.id === 'empty')!.inventory.state,
    'limited',
  )
  assert.ok(
    snapshot.diagnostics.some(
      (diagnostic) =>
        diagnostic.stage === 'modules' &&
        diagnostic.moduleIds.includes('empty') &&
        diagnostic.nextStep.includes('nonempty'),
    ),
  )
})

test('JavaParser composes every class/method alternative, constants and explicit HTTP method set', () => {
  const read = server.mappings.find(
    (entry) => entry.symbol === 'fixture.alpha.Resource.read',
  )!
  assert.deepEqual(read.paths, [
    '/api/alias/all',
    '/api/alias/{id}',
    '/api/alpha/all',
    '/api/alpha/{id}',
  ])
  assert.deepEqual(read.methods, ['GET'])
  assert.equal(
    read.line,
    15,
    'Handler symbol line, not the start of its annotations',
  )
  assert.ok(
    read.conditions.some((condition) =>
      condition.includes('@Profile(CORE) => [core]'),
    ),
  )
  assert.ok(
    read.conditions.some((condition) =>
      condition.includes('@Conditional(FeatureEnabled.class)'),
    ),
  )
  assert.deepEqual(read.attributes['method.params'], ['"view=full"'])
  assert.ok(read.declaredPaths[0].includes('ROOT + "/alpha"'))
  const write = server.mappings.find(
    (entry) => entry.symbol === 'fixture.alpha.Resource.write',
  )!
  assert.deepEqual(write.paths, ['/api/alias/write', '/api/alpha/write'])
  assert.deepEqual(write.methods, ['POST', 'PUT'])
  const combined = server.mappings.find(
    (entry) => entry.symbol === 'fixture.methods.Resource.combined',
  )!
  assert.deepEqual(
    combined.methods,
    ['GET', 'POST'],
    'Spring combines class/method request method conditions by union',
  )
  assert.deepEqual(
    combined.paths,
    ['/api/methods'],
    'An empty method path leaves the class path intact',
  )
})

test('unknown/dynamic/constrained paths, unconstrained methods and inherited/custom/programmatic forms stay actionable', () => {
  const reasons = server.issues.map((issue) => issue.reason).join('\n')
  for (const pattern of [
    /Unresolved constant/,
    /dynamic path/,
    /login:/,
    /Unconstrained RequestMapping/,
    /Programmatic route/,
    /Inherited\/interface/,
    /Custom composed mapping/,
  ])
    assert.match(reasons, pattern)
  assert.ok(
    server.issues.every(
      (issue) => issue.nextStep.length > 10 && issue.line > 0,
    ),
  )
  assert.equal(
    server.mappings.filter((entry) => entry.path.includes('/unsupported/'))
      .length,
    0,
  )
  assert.equal(
    collect().modules.find((module) => module.id === 'unsupported')!.inventory
      .state,
    'limited',
  )
})

test('modern unnamed variables, lambda/catch parameters and record patterns parse without hiding mappings or no-REST evidence', async () => {
  const modern = await extractor.extract(
    fileURLToPath(new URL('./fixtures/java-modern', import.meta.url)),
    'server',
  )
  assert.ok(modern.files.every((file) => file.parsed))
  assert.deepEqual(modern.issues, [])
  assert.deepEqual(
    modern.mappings.map((entry) => [entry.symbol, entry.methods, entry.paths]),
    [['fixture.modern.Resource.read', ['GET'], ['/api/modern']]],
  )
  const snapshot = inventorySnapshot({
    provenance,
    mapping,
    modules: discoverModules(
      modern.files.map((file) => file.path),
      mapping,
    ),
    server: modern,
    specRevisionMatches: true,
  })
  assert.equal(
    snapshot.modules.find((module) => module.id === 'modern')!.inventory.state,
    'inventoried',
  )
  assert.equal(
    snapshot.modules.find((module) => module.id === 'quiet')!.inventory.state,
    'no-rest',
  )
})

test('parse failure prevents no-REST/complete claims and is retained with source evidence', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'openapi-broken-'))
  try {
    await mkdir(path.join(temporary, 'server/broken'), { recursive: true })
    await writeFile(
      path.join(temporary, 'server/broken/Resource.java'),
      'class Resource { invalid syntax ! }',
    )
    const broken = await extractor.extract(temporary, 'server')
    assert.equal(broken.files[0].parsed, false)
    const snapshot = inventorySnapshot({
      provenance,
      mapping,
      modules: discoverModules(['server/broken/Resource.java'], mapping),
      server: broken,
      specification,
      specRevisionMatches: true,
    })
    assert.equal(snapshot.modules[0].inventory.state, 'limited')
    assert.equal(
      snapshot.measurements.specificationCoverage.state,
      'incomplete-analysis',
    )
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test('transitive composed mappings and direct/inherited HTTP exchanges cannot become no-REST evidence', () => {
  const snapshot = collect()
  for (const id of ['meta', 'exchange']) {
    const module = snapshot.modules.find((entry) => entry.id === id)!
    assert.equal(module.inventory.state, 'limited')
    assert.equal(
      module.measurements.specificationCoverage.state,
      'incomplete-analysis',
    )
    assert.equal(
      server.mappings.some((entry) => entry.path.startsWith(`server/${id}/`)),
      false,
    )
  }
  assert.ok(
    server.issues.some(
      (issue) =>
        issue.symbol === 'fixture.meta.Resource.read' &&
        issue.reason.includes('Custom composed mapping'),
    ),
  )
  assert.ok(
    server.issues.some(
      (issue) =>
        issue.symbol === 'fixture.exchange.Resource.read' &&
        issue.reason.includes('HTTP exchange mapping'),
    ),
  )
  assert.ok(
    server.issues.some(
      (issue) =>
        issue.symbol === 'fixture.exchange.Implementation' &&
        issue.reason.includes('Inherited/interface'),
    ),
  )
})

test('discovery includes new and absent-from-spec modules, client areas, no-REST evidence and global deduplication', () => {
  const modules = discoverModules(
    [...fixtureFiles(), 'server/newmodule/Metadata.java'],
    mapping,
  )
  assert.ok(
    modules.some(
      (module) => module.id === 'newmodule' && module.role === 'server-module',
    ),
  )
  const snapshot = collect()
  assert.equal(
    snapshot.modules.find((module) => module.id === 'quiet')!.inventory.state,
    'no-rest',
  )
  assert.equal(
    snapshot.modules.find((module) => module.id === 'shared-ui')!.role,
    'shared-infrastructure',
  )
  const shared = snapshot.operations.find(
    (operation) => operation.id === 'GET /api/alpha/all',
  )!
  assert.equal(shared.variants.length, 3)
  assert.equal(shared.ownership.state, 'ambiguous')
  assert.equal(
    snapshot.operations.filter((operation) => operation.id === shared.id)
      .length,
    1,
  )
  assert.ok(
    snapshot.operations.some(
      (operation) =>
        operation.specification.state === 'missing' &&
        operation.path.startsWith('/api/alias'),
    ),
  )
  assert.equal(snapshot.generatedMethods.length, 0)
  assert.ok(
    snapshot.operations.every(
      (operation) =>
        operation.generatedTransport.state === 'unknown' &&
        operation.adoption.state === 'unassessed' &&
        operation.webRelevance.state === 'unassessed',
    ),
  )
})

test('tracked ownership overrides retain variant evidence and allow independent eligible denominators', () => {
  const config = mappingSchema.parse({
    ...mapping,
    ownershipOverrides: [
      {
        prefix: 'server/beta',
        moduleId: 'alpha',
        reason: 'Fixture relocation evidence',
      },
    ],
  })
  const snapshot = collect(config)
  const alpha = snapshot.modules.find((module) => module.id === 'alpha')!
  const coverage = alpha.measurements.specificationCoverage
  assert.equal(coverage.state, 'eligible')
  if (coverage.state === 'eligible') {
    assert.equal(coverage.numerator, 2)
    assert.equal(coverage.denominator, 8)
  }
  assert.equal(
    snapshot.modules.find((module) => module.id === 'beta')!.inventory.state,
    'no-rest',
  )
  assert.equal(
    snapshot.operations.find(
      (operation) => operation.id === 'GET /api/alpha/all',
    )!.variants.length,
    3,
  )
  assert.ok(
    ownerOf('server/beta/Resource.java', config, {
      inputId: 'module-mapping',
      path: 'report/openapi/module-mapping.json',
      line: 1,
    }).evidence.length,
  )
  assert.throws(
    () =>
      discoverModules(fixtureFiles(), {
        ...config,
        ownershipOverrides: [
          { ...config.ownershipOverrides[0], moduleId: 'nonexistent' },
        ],
      }),
    /undiscovered/,
  )
  assert.equal(
    mappingSchema.safeParse({
      ...config,
      ownershipOverrides: [
        ...config.ownershipOverrides,
        ...config.ownershipOverrides,
      ],
    }).success,
    false,
  )
})

test('proper YAML/JSON parsing resolves internal references and preserves exact identity/source lines', () => {
  assert.equal(
    reconcileSpecification('GET /api/alpha/{id}', specification, true).state,
    'present',
  )
  assert.equal(specification.operations.get('GET /api/alpha/{id}')![0].line, 8)
  assert.equal(
    reconcileSpecification('GET /api/alias/{id}', specification, true).state,
    'missing',
  )
  const parsed = parseSpecification(
    JSON.stringify({
      openapi: '3.1.0',
      paths: { '/api/ref': { $ref: '#/components/pathItems/Shared' } },
      components: {
        pathItems: {
          Shared: {
            get: {
              responses: { '200': { $ref: '#/components/responses/Ok' } },
            },
          },
        },
        responses: { Ok: { description: 'OK' } },
        schemas: {
          Recursive: {
            properties: { child: { $ref: '#/components/schemas/Recursive' } },
          },
        },
      },
    }),
    'specification',
    'openapi.yaml',
  )
  assert.equal(parsed.complete, true)
  assert.equal(
    reconcileSpecification('GET /api/ref', parsed, true).state,
    'present',
  )
})

test('invalid/external references, duplicate keys and template ambiguity prevent percentages or false absence', () => {
  for (const ref of ['#/components/schemas/Missing', './other.yaml#/Schema']) {
    const parsed = parseSpecification(
      JSON.stringify({
        openapi: '3.0.3',
        paths: {
          '/api/test': { get: { responses: { '200': { $ref: ref } } } },
        },
      }),
      'specification',
      'openapi.yaml',
    )
    assert.equal(parsed.complete, false)
    assert.equal(
      reconcileSpecification('GET /api/missing', parsed, true).state,
      'incomplete-analysis',
    )
    assert.ok(parsed.issues.some((issue) => issue.reason.includes('reference')))
  }
  const duplicate = parseSpecification(
    'openapi: 3.0.3\npaths:\n  /api/test:\n    get: {}\n    get: {}\n',
    'specification',
    'openapi.yaml',
  )
  assert.equal(
    reconcileSpecification('GET /api/test', duplicate, true).state,
    'ambiguous',
  )
  const ambiguous = parseSpecification(
    'openapi: 3.0.3\npaths:\n  /api/{id}:\n    get: {}\n  /api/{other}:\n    get: {}\n',
    'specification',
    'openapi.yaml',
  )
  assert.equal(
    reconcileSpecification('GET /api/{id}', ambiguous, true).state,
    'ambiguous',
  )
  const cycle = parseSpecification(
    'openapi: 3.0.3\npaths:\n  /api/test:\n    $ref: "#/paths/~1api~1test"\n',
    'specification',
    'openapi.yaml',
  )
  assert.equal(cycle.complete, false)
  assert.equal(
    reconcileSpecification('GET /api/alpha/{id}', specification, false).state,
    'unknown',
  )
})

test('server URL prefixes and variables at every scope prevent false specification absence', () => {
  const parse = (data: unknown) =>
    parseSpecification(JSON.stringify(data), 'specification', 'openapi.yaml')
  for (const url of [
    '/',
    'https://example.invalid',
    'https://example.invalid/',
  ]) {
    const spec = parse({
      openapi: '3.0.3',
      servers: [{ url }],
      paths: { '/api/test': { get: {} } },
    })
    assert.equal(spec.complete, true)
    assert.equal(
      reconcileSpecification('GET /api/test', spec, true).state,
      'present',
    )
  }
  for (const url of [
    '/api',
    'https://example.invalid/api',
    'https://{host}/',
    '/{base}',
    'ftp://example.invalid/',
  ]) {
    for (const scope of ['root', 'path', 'operation', 'reference']) {
      const servers = [{ url }]
      const spec = parse({
        openapi: '3.1.0',
        ...(scope === 'root' ? { servers } : {}),
        paths: {
          '/test':
            scope === 'reference'
              ? { $ref: '#/components/pathItems/Shared' }
              : {
                  ...(scope === 'path' ? { servers } : {}),
                  get: scope === 'operation' ? { servers } : {},
                },
        },
        ...(scope === 'reference'
          ? { components: { pathItems: { Shared: { servers, get: {} } } } }
          : {}),
      })
      assert.equal(spec.complete, false, `${scope}: ${url}`)
      assert.equal(
        reconcileSpecification('GET /api/test', spec, true).state,
        'incomplete-analysis',
      )
      assert.equal(
        reconcileSpecification('GET /test', spec, true).state,
        'incomplete-analysis',
      )
      assert.ok(
        spec.issues.some((issue) =>
          /server URL|server base path/.test(issue.reason),
        ),
      )
      assert.ok(
        spec.issues.every((issue) =>
          issue.evidence[0].symbol?.includes('servers'),
        ),
      )
    }
  }
  assert.equal(
    parse({ openapi: '3.0.3', servers: {}, paths: {} }).complete,
    false,
  )
  assert.equal(
    parse({ openapi: '3.0.3', servers: [{}], paths: {} }).complete,
    false,
  )
})

test('unavailable specification keeps coverage counts unknown instead of zero-filled success', () => {
  const snapshot = inventorySnapshot({
    provenance: {
      ...provenance,
      inputs: provenance.inputs.filter((input) => input.id !== 'specification'),
    },
    mapping,
    modules: discoverModules(fixtureFiles(), mapping),
    server,
    specRevisionMatches: true,
  })
  assert.equal(
    snapshot.measurements.specificationCounts!.present.state,
    'unknown',
  )
  assert.equal(snapshot.measurements.specificationCoverage.state, 'unknown')
  assert.ok(
    snapshot.operations.every(
      (operation) => operation.specification.state === 'unknown',
    ),
  )
})

test('isolated committed collection validates artifacts, regeneration, cache, provenance, revision mismatches and specification relocation', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'openapi-git-'))
  const repo = path.join(temporary, 'repo')
  const output = path.join(temporary, 'output')
  const configFile = path.join(temporary, 'mapping.json')
  try {
    await cp(fixture, repo, { recursive: true })
    await writeFile(
      path.join(repo, 'client/openapi/fake.spec.ts'),
      'import { HttpClient } from "@angular/common/http"; import { inject } from "@angular/core"; export class FakeApi { private readonly http = inject(HttpClient); read() { return this.http.get("/api/alias/all"); } }',
    )
    await writeFile(
      path.join(repo, 'client/openapi/model.ts'),
      'export interface Alpha { value: string; }',
    )
    await writeFile(
      path.join(repo, 'raw.yaml'),
      specContent + '  /api/pruned:\n    get: {}\n',
    )
    const directClient =
      'import { inject } from "@angular/core"; import { HttpClient } from "@angular/common/http"; import { AlphaApi as Api } from "app/openapi/api"; export class SharedConsumer { api = inject(Api); http = inject(HttpClient); read(id: number) { this.api.read(id); this.http.get("api/alpha/" + id); } }'
    await writeFile(
      path.join(repo, 'client/shared-ui/service.ts'),
      directClient,
    )
    await writeFile(
      path.join(repo, 'client/shared-ui/service.spec.ts'),
      directClient,
    )
    await writeFile(configFile, JSON.stringify(mapping))
    const git = (...args: string[]) =>
      execFileSync('git', ['-C', repo, ...args], {
        encoding: 'utf8',
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: '2026-10-05T12:00:00Z',
          GIT_COMMITTER_DATE: '2026-10-05T12:00:00Z',
          GIT_AUTHOR_NAME: 'Fixture',
          GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
          GIT_COMMITTER_NAME: 'Fixture',
          GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
        },
      }).trim()
    git('init', '-q')
    git('add', '.')
    git('commit', '-qm', 'Independent inventory fixture')
    const ref = git('rev-parse', 'HEAD')
    const options = {
      repo,
      ref,
      output,
      mapping: configFile,
      spec: 'openapi.yaml',
    }
    // Dirty working tree bytes cannot influence a committed analysis.
    await writeFile(path.join(repo, 'openapi.yaml'), 'invalid dirty input')
    const first = await generateReport(options)
    assert.equal(first.cached, false)
    snapshotSchema.parse(first.snapshot)
    manifestSchema.parse(first.manifest)
    assert.equal(first.snapshot.generatedMethods.length, 2)
    const scan = first.snapshot.generatedSourceScan!
    assert.equal(scan.complete, true)
    assert.deepEqual(
      scan.evidence.map((location) => location.path),
      ['client/openapi/api.ts', 'client/openapi/model.ts'],
    )
    const missingTransports = first.snapshot.operations.flatMap((operation) =>
      operation.generatedTransport.state === 'missing'
        ? [operation.generatedTransport]
        : [],
    )
    assert.ok(missingTransports.length > 1)
    for (const transport of missingTransports) {
      assert.equal(transport.scanEvidenceId, scan.id)
      assert.equal(transport.evidence.length, 1)
      assert.deepEqual(transport.evidence[0], scan.evidence[0])
    }
    assert.equal(
      first.snapshot.operations.find(
        (operation) => operation.id === 'GET /api/alpha/{id}',
      )!.generatedTransport.state,
      'available',
    )
    assert.equal(first.snapshot.provenance.generation.state, 'unknown')
    if (first.snapshot.provenance.generation.state === 'unknown')
      assert.ok(
        first.snapshot.provenance.generation.declarations.some((declaration) =>
          declaration.includes('7.21.0'),
        ),
      )
    assert.equal(first.snapshot.callers.length, 2)
    assert.ok(
      first.snapshot.callers.every((caller) => caller.area === 'shared-ui'),
    )
    assert.equal(
      first.snapshot.operations.find(
        (operation) => operation.id === 'GET /api/alpha/{id}',
      )!.adoption.state,
      'mixed',
    )
    const alpha = first.snapshot.modules.find(
      (module) => module.id === 'alpha',
    )!
    assert.equal(
      alpha.measurements.generatedCallSites.state === 'measured' &&
        alpha.measurements.generatedCallSites.value,
      1,
    )
    assert.equal(
      alpha.measurements.manualCallSites.state === 'measured' &&
        alpha.measurements.manualCallSites.value,
      1,
    )
    const shared = first.snapshot.modules.find(
      (module) => module.id === 'shared-ui',
    )!
    assert.equal(
      shared.measurements.generatedCallSites.state === 'measured' &&
        shared.measurements.generatedCallSites.value,
      0,
    )
    assert.equal(
      first.snapshot.measurements.productionAdoption.state,
      'incomplete-analysis',
    )
    const firstBytes = await readFile(path.join(output, `${ref}.json`), 'utf8')
    assert.equal(sha256(firstBytes), first.manifest.snapshots[0].sha256)
    const cached = await generateReport(options)
    assert.equal(cached.cached, true)
    const assessmentFile = path.join(temporary, 'assessment.json')
    const assessmentRecord = {
      version: 1,
      exceptions: [
        {
          id: 'temporary-manual',
          binding: {
            artemisCommit: ref,
            inputHashes: Object.fromEntries(
              first.snapshot.provenance.inputs
                .filter(
                  (input) =>
                    !['verification', 'enforcement'].includes(input.kind),
                )
                .flatMap((input) =>
                  input.content.state === 'available'
                    ? [[input.id, input.content.sha256]]
                    : [],
                ),
            ),
          },
          scope: {
            moduleIds: ['alpha'],
            operationIds: [],
            callerIds: [
              first.snapshot.callers.find(
                (caller) => caller.transport === 'manual',
              )!.id,
            ],
          },
          reason: 'Temporary handwritten endpoint',
          reviewCondition: 'generated response conversion is reviewed',
          removalCondition: 'the generated adapter passes wire/runtime checks',
          evidence: [
            {
              inputId: 'assessment-evidence',
              path: 'report/openapi/evidence.json',
              line: 1,
            },
          ],
        },
      ],
      verification: [],
      enforcement: [],
      webRelevance: [],
    }
    await writeFile(assessmentFile, JSON.stringify(assessmentRecord))
    const assessed = await generateReport({
      ...options,
      evidence: assessmentFile,
      output: path.join(temporary, 'assessment-output'),
    })
    assert.equal(assessed.snapshot.exceptions[0].bindingStatus, 'matched')
    assert.equal(
      assessed.snapshot.measurements.manualCallSites.state === 'measured' &&
        assessed.snapshot.measurements.manualCallSites.value,
      1,
    )
    assert.ok(
      assessed.snapshot.nextSteps!.some(
        (step) => step.category === 'exception-review',
      ),
    )
    assert.notEqual(
      assessed.snapshot.provenance.fingerprint,
      first.snapshot.provenance.fingerprint,
    )
    assert.deepEqual(
      assessed.snapshot.provenance.inputs.find(
        (input) => input.id === 'client',
      ),
      first.snapshot.provenance.inputs.find((input) => input.id === 'client'),
    )
    assert.equal(
      (
        await generateReport({
          ...options,
          evidence: assessmentFile,
          output: path.join(temporary, 'assessment-output'),
        })
      ).cached,
      true,
    )
    assessmentRecord.exceptions[0].binding.artemisCommit = 'd'.repeat(40)
    await writeFile(assessmentFile, JSON.stringify(assessmentRecord))
    const stale = await generateReport({
      ...options,
      evidence: assessmentFile,
      output: path.join(temporary, 'assessment-output'),
    })
    assert.equal(stale.cached, false)
    assert.equal(stale.snapshot.exceptions[0].bindingStatus, 'mismatched')
    assert.notEqual(
      stale.snapshot.provenance.fingerprint,
      assessed.snapshot.provenance.fingerprint,
    )
    await writeFile(
      path.join(repo, 'client/shared-ui/service.ts'),
      directClient.replace(
        'this.api.read(id);',
        'this.api.read(id); this.api.read(id);',
      ),
    )
    git('add', 'client/shared-ui/service.ts')
    git('commit', '-qm', 'Only committed production caller changed')
    const clientChange = await generateReport({
      ...options,
      ref: git('rev-parse', 'HEAD'),
    })
    assert.equal(clientChange.cached, false)
    assert.equal(clientChange.snapshot.callers.length, 3)
    assert.notEqual(
      clientChange.snapshot.provenance.fingerprint,
      first.snapshot.provenance.fingerprint,
    )
    assert.notDeepEqual(
      clientChange.snapshot.provenance.inputs.find(
        (input) => input.id === 'client',
      )!.content,
      first.snapshot.provenance.inputs.find((input) => input.id === 'client')!
        .content,
    )
    assert.deepEqual(
      clientChange.snapshot.provenance.inputs.find(
        (input) => input.id === 'generated',
      )!.content,
      first.snapshot.provenance.inputs.find(
        (input) => input.id === 'generated',
      )!.content,
    )
    const rebuilt = await generateReport({
      ...options,
      output: path.join(temporary, 'fresh'),
      rebuild: true,
    })
    assert.deepEqual(rebuilt.manifest, first.manifest)
    assert.equal(
      await readFile(path.join(temporary, 'fresh', `${ref}.json`), 'utf8'),
      firstBytes,
    )
    assert.equal((await verifyReport(options)).commit, ref)
    assert.equal(
      await readFile(path.join(output, `${ref}.json`), 'utf8'),
      firstBytes,
    )
    await writeFile(path.join(output, 'untracked.json'), '{}')
    await assert.rejects(verifyReport(options), /Unlisted OpenAPI artifact/)
    await rm(path.join(output, 'untracked.json'))
    await rm(path.join(output, `${ref}.json`))
    await assert.rejects(verifyReport(options), /ENOENT/)
    await writeFile(path.join(output, `${ref}.json`), firstBytes)
    await writeFile(path.join(output, `${ref}.json`), firstBytes + ' ')
    await assert.rejects(verifyReport(options), /digest mismatch/)
    assert.equal(
      (await generateReport(options)).cached,
      false,
      'Manifest digest prevents tampered-cache reuse',
    )
    await writeFile(
      configFile,
      JSON.stringify({ ...mapping, version: 'fixture-2' }),
    )
    await assert.rejects(verifyReport(options), /Stale OpenAPI artifacts/)
    const changed = await generateReport(options)
    assert.equal(changed.cached, false)
    assert.notEqual(
      changed.snapshot.provenance.fingerprint,
      first.snapshot.provenance.fingerprint,
    )
    const withRaw = await generateReport({ ...options, rawSpec: 'raw.yaml' })
    assert.equal(withRaw.cached, false)
    assert.equal(
      withRaw.snapshot.provenance.pruning.state,
      'unknown',
      'Raw presence alone does not prove pruning',
    )
    const evidenceFile = path.join(temporary, 'generation.json')
    const record = {
      binding: {
        artemisCommit: ref,
        inputHashes: Object.fromEntries(
          withRaw.snapshot.provenance.inputs
            .filter(
              (input) => !['verification', 'enforcement'].includes(input.kind),
            )
            .flatMap((input) =>
              input.content.state === 'available'
                ? [[input.id, input.content.sha256]]
                : [],
            ),
        ),
      },
      runId: 'fixture-run',
      generatorArtifactSha256: 'c'.repeat(64),
      profiles: ['core'],
      properties: { 'springdoc.api-docs.enabled': 'true' },
    }
    await writeFile(evidenceFile, JSON.stringify(record))
    const evidenced = await generateReport({
      ...options,
      rawSpec: 'raw.yaml',
      generationEvidence: evidenceFile,
    })
    assert.equal(evidenced.snapshot.provenance.generation.state, 'recorded')
    const pruning = evidenced.snapshot.provenance.pruning
    assert.equal(pruning.state, 'observed')
    if (pruning.state === 'observed')
      assert.deepEqual(pruning.removedOperations, [
        { method: 'GET', path: '/api/pruned' },
      ])
    await writeFile(
      evidenceFile,
      JSON.stringify({
        ...record,
        binding: {
          ...record.binding,
          inputHashes: {
            ...record.binding.inputHashes,
            server: 'd'.repeat(64),
          },
        },
      }),
    )
    const wrong = await generateReport({
      ...options,
      rawSpec: 'raw.yaml',
      generationEvidence: evidenceFile,
    })
    assert.equal(wrong.cached, false)
    assert.equal(wrong.snapshot.provenance.pruning.state, 'unknown')
    assert.ok(
      wrong.snapshot.diagnostics.some((item) => item.stage === 'provenance'),
    )
    await writeFile(
      path.join(repo, 'openapi.yaml'),
      specContent.replace('read', 'changed'),
    )
    await mkdir(path.join(repo, 'server/newmodule'), { recursive: true })
    await writeFile(
      path.join(repo, 'server/newmodule/NewResource.java'),
      'package fixture.newmodule; @RestController class NewResource { @GetMapping("/new") public void get() {} }',
    )
    git('add', '.')
    git('commit', '-qm', 'Changed committed inputs and new module')
    const next = git('rev-parse', 'HEAD')
    const nextReport = await generateReport({ ...options, ref: next })
    const uiManifest = path.join(temporary, 'ui.json')
    const ui = JSON.parse(
      await readFile(
        new URL('../../public/migrations/index.json', import.meta.url),
        'utf8',
      ),
    )
    ui.snapshots.at(-1).commit = ref
    await writeFile(uiManifest, JSON.stringify(ui))
    await assert.rejects(
      verifyReport({ ...options, ref: next, uiManifest }),
      /do not share/,
    )
    ui.snapshots.at(-1).commit = next
    await writeFile(uiManifest, JSON.stringify(ui))
    assert.equal(
      (await verifyReport({ ...options, ref: next, uiManifest })).commit,
      next,
    )
    assert.ok(
      nextReport.manifest.snapshots.some(
        (entry) => entry.artemisCommit === ref,
      ),
    )
    const preservedBytes = await readFile(
      path.join(output, `${ref}.json`),
      'utf8',
    )
    await generateReport({ ...options, ref: next, rebuild: true })
    assert.equal(
      await readFile(path.join(output, `${ref}.json`), 'utf8'),
      preservedBytes,
    )
    await validateArtifacts(output)
    await assert.rejects(
      verifyReport({
        ...options,
        ref: 'HEAD~1',
        output: path.join(temporary, 'fresh'),
      }),
      /Missing OpenAPI snapshot/,
    )
    assert.notEqual(
      nextReport.snapshot.provenance.fingerprint,
      changed.snapshot.provenance.fingerprint,
    )
    assert.equal(
      nextReport.snapshot.modules.find((module) => module.id === 'newmodule')!
        .inventory.state,
      'inventoried',
    )
    const mismatch = await generateReport({ ...options, specRef: next })
    await assert.rejects(
      verifyReport({ ...options, specRef: next }),
      /inputs do not match/,
    )
    assert.equal(mismatch.cached, false)
    assert.ok(
      mismatch.snapshot.operations.every(
        (operation) => operation.specification.state === 'unknown',
      ),
    )
    assert.ok(
      mismatch.snapshot.diagnostics.some((item) =>
        item.reason.includes('storage revision'),
      ),
    )
    assert.equal(
      mismatch.snapshot.measurements.specificationCounts!.present.state,
      'unknown',
    )
    const missing = await generateReport({ ...options, spec: 'absent.yaml' })
    assert.equal(
      missing.snapshot.provenance.inputs.find(
        (input) => input.id === 'specification',
      )!.content.state,
      'unavailable',
    )
    assert.equal(missing.snapshot.provenance.pruning.state, 'unknown')
    assert.ok(
      await readFile(defaultMapping, 'utf8'),
      'Default configuration stays tracked outside agents/',
    )
    await mkdir(path.join(repo, 'openapi'), { recursive: true })
    await writeFile(path.join(repo, 'openapi/openapi.yaml'), specContent)
    git('add', '.')
    git('commit', '-qm', 'Legacy specification location')
    const legacyRef = git('rev-parse', 'HEAD')
    const automatic = { repo, output, mapping: configFile, ref: legacyRef }
    const specInput = (report: Awaited<ReturnType<typeof generateReport>>) =>
      report.snapshot.provenance.inputs.find(
        (input) => input.id === 'specification',
      )!
    const legacy = await generateReport(automatic)
    assert.equal(specInput(legacy).path, 'openapi/openapi.yaml')
    assert.equal(specInput(legacy).content.state, 'available')

    await rm(path.join(repo, 'openapi'), { recursive: true })
    await mkdir(path.join(repo, 'config/openapi'), { recursive: true })
    await writeFile(path.join(repo, 'config/openapi/openapi.yaml'), specContent)
    git('add', '.')
    git('commit', '-qm', 'Relocated specification')
    const modernRef = git('rev-parse', 'HEAD')
    const modern = await generateReport({ ...automatic, ref: modernRef })
    assert.equal(specInput(modern).path, 'config/openapi/openapi.yaml')
    assert.equal(specInput(modern).content.state, 'available')
    const relocatedMismatch = await generateReport({
      ...automatic,
      ref: modernRef,
      specRef: legacyRef,
    })
    assert.equal(specInput(relocatedMismatch).path, 'openapi/openapi.yaml')
    assert.equal(specInput(relocatedMismatch).content.state, 'available')
    assert.ok(
      relocatedMismatch.snapshot.operations.every(
        (operation) => operation.specification.state === 'unknown',
      ),
    )

    await mkdir(path.join(repo, 'openapi'), { recursive: true })
    await writeFile(path.join(repo, 'openapi/openapi.yaml'), specContent)
    git('add', '.')
    git('commit', '-qm', 'Two available specifications')
    const duplicateRef = git('rev-parse', 'HEAD')
    await assert.rejects(
      generateReport({ ...automatic, ref: duplicateRef }),
      /Multiple committed OpenAPI specifications/,
    )
    const selected = await generateReport({
      ...automatic,
      ref: duplicateRef,
      spec: 'config/openapi/openapi.yaml',
    })
    assert.equal(specInput(selected).path, 'config/openapi/openapi.yaml')
    const generatedFile = path.join(repo, 'client/openapi/api.ts')
    await writeFile(
      generatedFile,
      (await readFile(generatedFile, 'utf8')).replace(
        '/api/alpha/all',
        '/api/added',
      ),
    )
    await writeFile(
      path.join(repo, 'client/openapi/.openapi-generator/VERSION'),
      '8.0.0\n',
    )
    git('add', '.')
    git(
      'commit',
      '-qm',
      'Changed generated implementation and generic metadata',
    )
    const generatedChange = await generateReport({
      ...automatic,
      ref: git('rev-parse', 'HEAD'),
      spec: 'config/openapi/openapi.yaml',
    })
    const inputHash = (report: typeof selected, id: string) =>
      report.snapshot.provenance.inputs.find((input) => input.id === id)!
        .content
    assert.deepEqual(
      inputHash(generatedChange, 'server'),
      inputHash(selected, 'server'),
    )
    assert.deepEqual(
      inputHash(generatedChange, 'specification'),
      inputHash(selected, 'specification'),
    )
    assert.notDeepEqual(
      inputHash(generatedChange, 'generated'),
      inputHash(selected, 'generated'),
    )
    assert.notEqual(
      generatedChange.snapshot.provenance.fingerprint,
      selected.snapshot.provenance.fingerprint,
    )
    assert.equal(generatedChange.cached, false)
    assert.ok(
      generatedChange.snapshot.generatedMethods.some((method) =>
        method.identities?.some((identity) => identity.path === '/api/added'),
      ),
    )
    assert.equal(
      generatedChange.snapshot.provenance.generation.state,
      'unknown',
    )
    await rm(generatedFile)
    await rm(path.join(repo, 'client/openapi/model.ts'))
    git('add', '.')
    git(
      'commit',
      '-qm',
      'Only generic generation metadata and excluded test remain',
    )
    const metadataOnly = await generateReport({
      ...automatic,
      ref: git('rev-parse', 'HEAD'),
      spec: 'config/openapi/openapi.yaml',
    })
    assert.deepEqual(metadataOnly.snapshot.generatedMethods, [])
    assert.ok(
      metadataOnly.snapshot.operations.every(
        (operation) =>
          operation.generatedTransport.state === 'incomplete-analysis',
      ),
    )
    assert.ok(
      metadataOnly.snapshot.diagnostics.some((diagnostic) =>
        diagnostic.reason.includes('no assessable TypeScript'),
      ),
    )
    const generatedSites = selected.snapshot.callers.filter(
      (caller) => callSiteBucket(caller) === 'generated',
    )
    const assertMissingTransportCalls = (report: typeof selected) => {
      assert.ok(generatedSites.length > 0)
      assert.deepEqual(
        report.snapshot.callers.map((caller) => caller.id),
        selected.snapshot.callers.map((caller) => caller.id),
        'Losing generated inputs must not erase production call sites',
      )
      for (const original of generatedSites) {
        const caller = report.snapshot.callers.find(
          (item) => item.id === original.id,
        )!
        assert.equal(callSiteBucket(caller), 'unresolved')
        assert.deepEqual(caller.operationIds, [])
        assert.equal(caller.generatedMethodId, undefined)
        assert.ok(
          report.snapshot.diagnostics.some(
            (diagnostic) =>
              diagnostic.stage === 'adoption' &&
              diagnostic.evidence.some(
                (location) =>
                  location.path === caller.location.path &&
                  location.line === caller.location.line,
              ),
          ),
        )
      }
    }
    assertMissingTransportCalls(metadataOnly)
    await rm(path.join(repo, 'client/openapi'), { recursive: true })
    git('add', '.')
    git('commit', '-qm', 'Unavailable generated output')
    const absentOutput = await generateReport({
      ...automatic,
      ref: git('rev-parse', 'HEAD'),
      spec: 'config/openapi/openapi.yaml',
    })
    assert.equal(
      absentOutput.snapshot.provenance.inputs.find(
        (input) => input.id === 'generated',
      )!.content.state,
      'unavailable',
    )
    assert.ok(
      absentOutput.snapshot.operations.every(
        (operation) => operation.generatedTransport.state === 'unknown',
      ),
    )
    assert.equal(
      absentOutput.snapshot.measurements.generatedTransportCounts!.available
        .state,
      'unknown',
    )
    assertMissingTransportCalls(absentOutput)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

const staticGenerated = {
  path: 'client/openapi/api.ts',
  content: `import { HttpClient } from '@angular/common/http';
    import { inject } from '@angular/core';
    export class Api {
      http = inject(HttpClient);
      alpha() { return this.http.get('/api/alpha'); }
      beta() { return this.http.get('/api/beta'); }
    }`,
}
const staticImports = `import { HttpClient } from '@angular/common/http';
  import { inject } from '@angular/core'; import { Api } from 'app/openapi/api';`
const staticProvenance: Provenance = {
  ...provenance,
  inputs: [
    ...provenance.inputs,
    {
      id: 'generated',
      kind: 'generated-client',
      path: 'client/openapi',
      revision: { state: 'known', commit },
      content: { state: 'available', sha256: hash },
    },
  ],
}
const staticServer: ServerExtraction = {
  files: ['alpha', 'beta', 'quiet'].map((id) => ({
    path: `server/${id}/Resource.java`,
    line: 1,
    symbol: id,
    parsed: true,
  })),
  mappings: ['alpha', 'beta'].map((id) => ({
    path: `server/${id}/Resource.java`,
    line: 1,
    symbol: `${id}.read`,
    paths: [`/api/${id}`],
    methods: ['GET'],
    declaredPaths: [`/api/${id}`],
    conditions: [],
    attributes: {},
  })),
  issues: [],
}
const staticReport = (
  content: string,
  extra: {
    provenance?: Provenance
    assessmentEvidence?: Parameters<
      typeof inventorySnapshot
    >[0]['assessmentEvidence']
  } = {},
) =>
  inventorySnapshot({
    provenance: staticProvenance,
    mapping,
    modules: discoverModules(
      [
        ...staticServer.files.map((file) => file.path),
        'client/shared-ui/consumer.ts',
      ],
      mapping,
    ),
    server: staticServer,
    specRevisionMatches: true,
    specification: parseSpecification(
      'openapi: 3.0.3\npaths:\n  /api/alpha:\n    get: {}\n  /api/beta:\n    get: {}\n',
      'specification',
      'openapi.yaml',
    ),
    generatedSources: [staticGenerated],
    clientSources: [
      staticGenerated,
      {
        path: 'client/shared-ui/consumer.ts',
        content: staticImports + content,
      },
    ],
    ...extra,
  })
const generatedConsumer = `class Consumer { api = inject(Api); read() { this.api.alpha(); this.api.beta(); } }`
const moduleAdoption = (
  snapshot: ReturnType<typeof staticReport>,
  id: string,
) =>
  snapshot.modules.find((module) => module.id === id)!.measurements
    .productionAdoption

test('complete committed-source adoption unlocks eligible percentages and candidates, without claiming runtime verification', () => {
  const snapshot = staticReport(generatedConsumer)
  const adoption = snapshot.measurements.productionAdoption
  assert.equal(adoption.state, 'eligible')
  if (adoption.state === 'eligible')
    assert.deepEqual([adoption.numerator, adoption.denominator], [2, 2])
  assert.ok(
    snapshot.operations.every(
      (operation) => operation.adoption.state === 'generated-only',
    ),
  )
  assert.equal(snapshot.measurements.generatedCallSites.state, 'measured')
  if (snapshot.measurements.generatedCallSites.state === 'measured')
    assert.equal(
      snapshot.measurements.generatedCallSites.completeness,
      'complete',
    )
  for (const id of ['alpha', 'beta']) {
    assert.equal(
      snapshot.readiness!.find((record) => record.moduleId === id)!.migration,
      'candidate',
    )
    assert.equal(
      snapshot.readiness!.find((record) => record.moduleId === id)!.protection,
      'candidate',
    )
  }
  assert.deepEqual(snapshot.verification ?? [], [])
  assert.deepEqual(snapshot.enforcement ?? [], [])
  assert.equal(moduleAdoption(snapshot, 'quiet').state, 'not-applicable')
  assert.equal(moduleAdoption(snapshot, 'shared-ui').state, 'not-applicable')
  assert.equal(snapshot.provenance.generation.state, 'unknown')
})

test('complete manual and mixed assessments remain adoption work, rather than artificial analysis gaps', () => {
  const snapshot =
    staticReport(`class Consumer { api = inject(Api); http = inject(HttpClient);
    read() { this.api.alpha(); this.http.get('/api/alpha'); this.http.get('/api/beta'); } }`)
  assert.deepEqual(
    snapshot.operations.map((operation) => operation.adoption.state),
    ['mixed', 'manual'],
  )
  assert.ok(
    snapshot.operations.every(
      (operation) =>
        'analysis' in operation.adoption &&
        operation.adoption.analysis === 'complete',
    ),
  )
  const percentage = snapshot.measurements.productionAdoption
  assert.equal(percentage.state, 'eligible')
  if (percentage.state === 'eligible')
    assert.deepEqual([percentage.numerator, percentage.denominator], [0, 2])
  assert.ok(
    snapshot.nextSteps!.some((step) => step.category === 'manual-transport'),
  )
  assert.ok(
    !snapshot.nextSteps!.some(
      (step) => step.category === 'unresolved-analysis',
    ),
  )
})

test('bound source limitations affect candidate server ownership; unbound dynamic calls and syntax failures constrain every scope', () => {
  const snapshot = staticReport(`class Consumer { api = inject(Api);
    branch(flag: boolean) { return flag ? this.api.beta() : this.api.beta(); }
    read() { this.api.alpha(); this.branch(true); } }`)
  assert.equal(moduleAdoption(snapshot, 'alpha').state, 'eligible')
  assert.equal(moduleAdoption(snapshot, 'beta').state, 'incomplete-analysis')
  assert.equal(
    snapshot.measurements.productionAdoption.state,
    'incomplete-analysis',
  )
  for (const content of [
    generatedConsumer +
      `class Dynamic { http = inject(HttpClient); read(url: string) { this.http.get(url); } }`,
    generatedConsumer + 'class Broken { read( {',
  ]) {
    const partial = staticReport(content)
    for (const id of ['alpha', 'beta'])
      assert.equal(moduleAdoption(partial, id).state, 'incomplete-analysis')
    assert.ok(
      partial.operations.every(
        (operation) => operation.adoption.state !== 'generated-only',
      ),
    )
  }
})

test('missing and mismatched production inputs withhold adoption; positive static calls cannot substitute for their evidence', () => {
  for (const inputs of [
    staticProvenance.inputs.map((input) =>
      input.kind === 'production-client'
        ? { ...input, kind: 'configuration' as const }
        : input,
    ),
    staticProvenance.inputs.map((input) =>
      input.kind === 'production-client'
        ? {
            ...input,
            revision: { state: 'known' as const, commit: 'c'.repeat(40) },
          }
        : input,
    ),
  ]) {
    const snapshot = staticReport(generatedConsumer, {
      provenance: { ...staticProvenance, inputs },
    })
    assert.equal(snapshot.measurements.productionAdoption.state, 'unknown')
    assert.ok(
      snapshot.operations.every(
        (operation) => operation.adoption.state === 'generated-detected',
      ),
    )
  }
})

test('no detected calls leaves relevance unassessed; matched relevance metadata participates in denominator calculation', () => {
  const content = `class Consumer { api = inject(Api); read() { this.api.alpha(); } }`
  const absent = staticReport(content)
  assert.equal(absent.operations[1].adoption.state, 'no-calls')
  assert.equal(absent.operations[1].webRelevance.state, 'unassessed')
  assert.equal(
    absent.measurements.productionAdoption.state,
    'incomplete-analysis',
  )
  const binding = {
    artemisCommit: commit,
    inputHashes: Object.fromEntries(
      staticProvenance.inputs.map((input) => [input.id, hash]),
    ),
  }
  for (const state of ['relevant', 'server-only'] as const) {
    const snapshot = staticReport(content, {
      assessmentEvidence: {
        version: 1,
        exceptions: [],
        verification: [],
        enforcement: [],
        webRelevance: [
          {
            operationId: 'GET /api/beta',
            state,
            binding,
            evidence: [
              { inputId: 'server', path: 'server/beta/Resource.java', line: 1 },
            ],
            reason: 'Synthetic revision-bound supporting metadata',
          },
        ],
      },
    })
    const adoption = snapshot.measurements.productionAdoption
    assert.equal(adoption.state, 'eligible')
    if (adoption.state === 'eligible')
      assert.deepEqual(
        [adoption.numerator, adoption.denominator],
        [1, state === 'relevant' ? 2 : 1],
      )
    assert.equal(
      moduleAdoption(snapshot, 'beta').state,
      state === 'server-only' ? 'not-applicable' : 'eligible',
    )
    if (state === 'relevant')
      assert.equal(
        snapshot.readiness!.find((record) => record.moduleId === 'beta')!
          .migration,
        'blocked',
      )
  }
})
