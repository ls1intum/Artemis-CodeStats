import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, test } from 'node:test'
import {
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
        operation.generatedTransport.state === 'unassessed' &&
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
      path.join(repo, 'raw.yaml'),
      specContent + '  /api/pruned:\n    get: {}\n',
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
    const firstBytes = await readFile(path.join(output, `${ref}.json`), 'utf8')
    assert.equal(sha256(firstBytes), first.manifest.snapshots[0].sha256)
    const cached = await generateReport(options)
    assert.equal(cached.cached, true)
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
    await writeFile(path.join(output, `${ref}.json`), firstBytes + ' ')
    assert.equal(
      (await generateReport(options)).cached,
      false,
      'Manifest digest prevents tampered-cache reuse',
    )
    await writeFile(
      configFile,
      JSON.stringify({ ...mapping, version: 'fixture-2' }),
    )
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
          withRaw.snapshot.provenance.inputs.flatMap((input) =>
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
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})
