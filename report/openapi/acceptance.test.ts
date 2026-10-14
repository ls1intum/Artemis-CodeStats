import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import {
  operationIdentitySchema,
  sourceLocationSchema,
} from '../../src/features/openapi/model'
import { scopeReport } from '../../src/features/openapi/scope'
import { sha256, readManifest, readSnapshot } from './artifacts'

const location = sourceLocationSchema.omit({ inputId: true })
const expectations = z
  .object({
    kind: z.literal('source-expectations'),
    artemisCommit: z.string().regex(/^[a-f0-9]{40}$/),
    sourceTrees: z.array(
      z.object({
        inputId: z.string(),
        path: z.string(),
        sha256: z.string(),
        files: z.number(),
      }),
    ),
    modules: z.array(z.string()),
    noRestModules: z.array(z.string()),
    sharedInfrastructure: z.array(z.string()),
    specification: z.object({
      path: z.string(),
      sha256: z.string(),
      uniqueOperations: z.number(),
    }),
    absentGeneratedPaths: z.array(z.string()),
    inputs: z.array(
      z.object({
        path: z.string(),
        sha256: z.string(),
        excerpts: z.array(z.object({ line: z.number(), text: z.string() })),
      }),
    ),
    cases: z.array(
      z.object({
        id: z.string(),
        operation: operationIdentitySchema,
        module: z.string(),
        server: location,
        specification: z.object({
          state: z.enum(['present', 'missing']),
          location: location.optional(),
        }),
        generatedTransport: z.enum(['available', 'missing']),
        generatedMethods: z.array(
          z.object({ location, transport: z.string() }),
        ),
        adoption: z.enum(['generated-detected', 'manual']),
        webRelevance: z.literal('relevant'),
        callers: z.array(
          z.object({
            location,
            area: z.string(),
            transport: z.enum(['generated', 'manual']),
            kind: z.enum(['production', 'wrapper-implementation']),
            via: z.array(location),
          }),
        ),
        uncertainty: z.array(z.string()).min(1),
      }),
    ),
  })
  .parse(
    JSON.parse(
      await readFile(
        new URL('./fixtures/acceptance.json', import.meta.url),
        'utf8',
      ),
    ),
  )
const reportDirectory = path.resolve('public/openapi')
const reportManifest = await readManifest(reportDirectory)
const { snapshot } = await readSnapshot(
  reportDirectory,
  reportManifest.snapshots.find(
    (entry) => entry.artemisCommit === expectations.artemisCommit,
  )!,
)

test('acceptance report matches independent current source identities, transport and production chains', () => {
  for (const tree of expectations.sourceTrees) {
    const input = snapshot.provenance.inputs.find(
      (input) => input.id === tree.inputId,
    )!
    assert.deepEqual(input.revision, {
      state: 'known',
      commit: expectations.artemisCommit,
    })
    assert.deepEqual(input.content, { state: 'available', sha256: tree.sha256 })
  }
  const spec = snapshot.provenance.inputs.find(
    (input) => input.id === 'specification',
  )!
  assert.equal(spec.path, expectations.specification.path)
  assert.deepEqual(spec.content, {
    state: 'available',
    sha256: expectations.specification.sha256,
  })
  for (const expected of expectations.cases) {
    const id = `${expected.operation.method} ${expected.operation.path}`
    const operation = snapshot.operations.find(
      (operation) => operation.id === id,
    )!
    assert.ok(operation, expected.id)
    assert.equal(
      operation.ownership.state === 'resolved' && operation.ownership.moduleId,
      expected.module,
    )
    assert.ok(
      operation.variants.some(
        (variant) =>
          variant.handler.path === expected.server.path &&
          variant.handler.line === expected.server.line &&
          variant.handler.symbol?.endsWith(expected.server.symbol!),
      ),
      expected.id,
    )
    assert.equal(
      operation.specification.state,
      expected.specification.state,
      expected.id,
    )
    assert.equal(
      operation.generatedTransport.state,
      expected.generatedTransport,
      expected.id,
    )
    assert.equal(operation.adoption.state, expected.adoption, expected.id)
    assert.equal(
      operation.webRelevance.state,
      expected.webRelevance,
      expected.id,
    )
    const methods = snapshot.generatedMethods.filter((method) =>
      method.operationIds.includes(id),
    )
    assert.equal(methods.length, expected.generatedMethods.length, expected.id)
    for (const method of expected.generatedMethods)
      assert.ok(
        methods.some(
          (item) =>
            item.symbol === method.location.symbol &&
            item.location.path === method.location.path &&
            item.location.line === method.location.line &&
            item.transport === method.transport,
        ),
        expected.id,
      )
    const scope = scopeReport(snapshot, expected.module)
    for (const caller of expected.callers) {
      const actual = scope.callers.find(
        (item) =>
          item.operationIds.includes(id) &&
          item.location.path === caller.location.path &&
          item.location.line === caller.location.line,
      )
      assert.ok(
        actual,
        `${expected.id}: ${caller.location.path}:${caller.location.line}`,
      )
      assert.equal(actual.symbol, caller.location.symbol)
      assert.equal(actual.area, caller.area)
      assert.equal(actual.transport, caller.transport)
      assert.equal(actual.kind, caller.kind)
      for (const via of caller.via)
        assert.ok(
          actual.via.some(
            (item) => item.path === via.path && item.line === via.line,
          ),
          `${expected.id}: chain ${via.path}:${via.line}`,
        )
    }
  }
})

test('acceptance inventory preserves all areas, honest denominators, unresolved work and readiness prerequisites', () => {
  assert.deepEqual(
    snapshot.modules.map((module) => module.id),
    expectations.modules,
  )
  assert.deepEqual(
    snapshot.modules
      .filter((module) => module.inventory.state === 'no-rest')
      .map((module) => module.id),
    expectations.noRestModules,
  )
  assert.deepEqual(
    snapshot.modules
      .filter((module) => module.role === 'shared-infrastructure')
      .map((module) => module.id),
    expectations.sharedInfrastructure,
  )
  const deimos = scopeReport(snapshot, 'deimos')
  assert.ok(deimos.operations.length > 0)
  assert.ok(
    deimos.operations.every(
      (operation) =>
        operation.specification.state === 'missing' &&
        operation.generatedTransport.state === 'missing',
    ),
  )
  for (const bucket of ['generated', 'manual', 'unresolved'] as const) {
    // Independent partition: do not use the collector's counting helper here.
    const count = snapshot.callers.filter(
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
    ).length
    const measurement = snapshot.measurements[`${bucket}CallSites`]
    assert.equal(measurement.state === 'measured' && measurement.value, count)
  }
  assert.equal(
    new Set(snapshot.operations.map((operation) => operation.id)).size,
    snapshot.operations.length,
  )
  assert.ok(
    snapshot.callers.every(
      (caller) =>
        caller.kind !== 'production' ||
        !/\.(spec|test)\.ts$/.test(caller.location.path),
    ),
  )
  assert.ok(
    snapshot.callers.some(
      (caller) =>
        caller.kind === 'production' &&
        caller.mapping === 'unresolved' &&
        caller.reason.length > 0,
    ),
  )
  for (const diagnostic of snapshot.diagnostics) {
    assert.ok(
      diagnostic.reason.length &&
        diagnostic.nextStep.length &&
        diagnostic.evidence.length,
    )
    assert.ok(
      snapshot.nextSteps?.some((step) =>
        step.id.endsWith(`diagnostic:${diagnostic.id}`),
      ),
      diagnostic.id,
    )
  }
  for (const module of snapshot.modules) {
    assert.ok(module.roots.length)
    assert.ok(
      module.inventory.state !== 'inventoried' ||
        module.inventory.operationIds.length > 0,
    )
    assert.notEqual(module.measurements.productionAdoption.state, 'eligible')
  }
  assert.equal(
    snapshot.measurements.specificationCoverage.state,
    'incomplete-analysis',
  )
  assert.equal(
    snapshot.measurements.generatedTransportCoverage.state,
    'incomplete-analysis',
  )
  assert.equal(snapshot.provenance.generation.state, 'unknown')
  assert.equal(snapshot.provenance.pruning.state, 'unknown')
  assert.deepEqual(snapshot.exceptions, [])
  assert.ok(!snapshot.verification?.length)
  assert.ok(!snapshot.enforcement?.length)
  for (const record of snapshot.readiness!) {
    assert.ok(['blocked', 'not-applicable'].includes(record.migration))
    assert.ok(['blocked', 'not-applicable'].includes(record.protection))
    if (record.migration === 'blocked')
      assert.ok(record.prerequisiteIds.length > 0)
  }
})

test(
  'independent committed-source audit verifies hashes, tree discovery, negative evidence and every source link',
  {
    skip:
      !process.env.OPENAPI_AUDIT_REPO &&
      'Set OPENAPI_AUDIT_REPO to a read-only Artemis repository to recheck committed source evidence',
  },
  async () => {
    const repo = path.resolve(process.env.OPENAPI_AUDIT_REPO!)
    const git = (...args: string[]) =>
      execFileSync('git', ['-C', repo, ...args], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      })
    const files = git(
      'ls-tree',
      '-r',
      '--name-only',
      expectations.artemisCommit,
    )
      .trim()
      .split('\n')
    const temporary = await mkdtemp(path.join(tmpdir(), 'openapi-acceptance-'))
    try {
      const archive = path.join(temporary, 'source.tar')
      git(
        'archive',
        '--format=tar',
        '--output',
        archive,
        expectations.artemisCommit,
        '--',
        ...expectations.sourceTrees.map((tree) => tree.path),
        ...expectations.inputs.map((input) => input.path),
      )
      execFileSync('tar', ['-xf', archive, '-C', temporary])
      const contents = new Map<string, Buffer>()
      for (const file of files.filter((file) =>
        expectations.sourceTrees.some((tree) =>
          file.startsWith(tree.path + '/'),
        ),
      ))
        contents.set(file, await readFile(path.join(temporary, file)))
      for (const tree of expectations.sourceTrees) {
        const entries = [...contents].filter(([file]) =>
          file.startsWith(tree.path + '/'),
        )
        assert.equal(entries.length, tree.files)
        assert.equal(
          sha256(
            entries
              .map(([file, bytes]) => `${file}\0${sha256(bytes)}\n`)
              .join(''),
          ),
          tree.sha256,
        )
      }
      for (const input of expectations.inputs) {
        const bytes = await readFile(path.join(temporary, input.path))
        contents.set(input.path, bytes)
        assert.equal(sha256(bytes), input.sha256, input.path)
        const lines = bytes.toString().split(/\r?\n/)
        for (const excerpt of input.excerpts)
          assert.equal(
            lines[excerpt.line - 1],
            excerpt.text,
            `${input.path}:${excerpt.line}`,
          )
      }
      const sourceRoots = expectations.sourceTrees.filter(
        (tree) => tree.inputId !== 'generated',
      )
      const modules = new Set(
        sourceRoots.flatMap((tree) =>
          files
            .filter((file) => file.startsWith(tree.path + '/'))
            .map((file) => {
              const suffix = file.slice(tree.path.length + 1)
              return suffix.includes('/') ? suffix.split('/')[0] : 'server-root'
            }),
        ),
      )
      assert.deepEqual([...modules].sort(), expectations.modules)
      const serverRoot = sourceRoots.find(
        (tree) => tree.inputId === 'server',
      )!.path
      for (const module of expectations.noRestModules) {
        const sources = [...contents].filter(
          ([file]) =>
            file.endsWith('.java') &&
            (module === 'server-root'
              ? file.startsWith(serverRoot + '/') &&
                !file.slice(serverRoot.length + 1).includes('/')
              : file.startsWith(`${serverRoot}/${module}/`)),
        )
        for (const [file, bytes] of sources)
          assert.doesNotMatch(
            bytes.toString(),
            /@(Get|Post|Put|Patch|Delete|Request)Mapping\b/,
            file,
          )
      }
      const spec = parseYaml(
        contents.get(expectations.specification.path)!.toString(),
      )
      const identities = Object.entries(
        spec.paths as Record<string, object>,
      ).flatMap(([route, item]) =>
        Object.keys(item)
          .filter((method) =>
            /^(get|post|put|patch|delete|head|options|trace)$/.test(method),
          )
          .map((method) => `${method.toUpperCase()} ${route}`),
      )
      assert.equal(
        identities.length,
        expectations.specification.uniqueOperations,
      )
      for (const expected of expectations.cases)
        assert.equal(
          identities.includes(
            `${expected.operation.method} ${expected.operation.path}`,
          ),
          expected.specification.state === 'present',
          expected.id,
        )
      const generatedRoot = expectations.sourceTrees.find(
        (tree) => tree.inputId === 'generated',
      )!.path
      for (const [file, bytes] of contents)
        if (file.startsWith(generatedRoot + '/') && file.endsWith('.ts'))
          for (const absent of expectations.absentGeneratedPaths)
            assert.ok(
              !bytes.toString().includes(absent),
              `${file}: unexpected ${absent}`,
            )
      let checked = 0
      async function checkLocations(value: unknown): Promise<void> {
        if (!value || typeof value !== 'object') return
        if ('inputId' in value && 'path' in value && 'line' in value) {
          const location = sourceLocationSchema.parse(value)
          const input = snapshot.provenance.inputs.find(
            (input) => input.id === location.inputId,
          )!
          if (
            input.revision.state === 'known' &&
            input.content.state === 'available'
          ) {
            assert.equal(input.revision.commit, expectations.artemisCommit)
            const bytes =
              contents.get(location.path) ??
              (await readFile(path.join(temporary, location.path)))
            contents.set(location.path, bytes)
            assert.ok(
              bytes.length > 0 &&
                location.line <= bytes.toString().split(/\r?\n/).length,
              `${location.path}:${location.line}`,
            )
            checked++
          }
        }
        for (const item of Object.values(value)) await checkLocations(item)
      }
      await checkLocations(snapshot)
      assert.ok(
        checked > 6000,
        'Audit must inspect the whole snapshot, not only the selected examples',
      )
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  },
)
