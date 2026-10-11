import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import {
  bindingSchema,
  callSiteBucket,
  manifestSchema,
  schemaVersion,
  snapshotSchema,
  type Diagnostic,
  type Manifest,
  type ModuleAssessment,
  type Operation,
  type Provenance,
  type Snapshot,
  type SourceLocation,
} from '../../src/features/openapi/model'
import {
  discoverModules,
  mappingLocation,
  mappingSchema,
  ownerOf,
  type DiscoveredModule,
  type ModuleMapping,
} from './scope'
import {
  createServerExtractor,
  extractorLibraries,
  extractorSource,
  type ServerExtraction,
} from './server'
import {
  parseSpecification,
  reconcileSpecification,
  type Specification,
} from './spec'
import { analyzeGenerated, reconcileGenerated } from './generated'
import { analyzeAdoption, reconcileAdoption } from './adoption'
import {
  applyEvidence,
  assessmentEvidenceSchema,
  type AssessmentEvidence,
} from './evidence'
import {
  callersForOperations,
  ownersOf,
} from '../../src/features/openapi/scope'
import { assessReadiness } from '../../src/features/openapi/assessment'
import { readManifest, readSnapshot, sha256 } from './artifacts'

export { sha256 } from './artifacts'

export const analyzerVersion = 'openapi-inventory-10'
const directory = path.dirname(fileURLToPath(import.meta.url))
export const defaultMapping = path.join(directory, 'module-mapping.json')
export const defaultEvidence = path.join(directory, 'evidence.json')
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const unassessed = (reason: string) => ({
  state: 'unassessed' as const,
  reason,
})
const inputAnchor = (input: Provenance['inputs'][number]): SourceLocation => ({
  inputId: input.id,
  path: input.path,
  line: 1,
})
const generationEvidenceSchema = z
  .object({
    binding: bindingSchema,
    runId: z.string().min(1),
    generatorArtifactSha256: z.string().regex(/^[a-f0-9]{64}$/),
    profiles: z.array(z.string().min(1)),
    properties: z.record(z.string()),
  })
  .strict()

export function inventorySnapshot({
  provenance,
  mapping,
  modules,
  server,
  specification,
  rawSpecification,
  specRevisionMatches,
  generatedSources,
  clientSources,
  assessmentEvidence,
}: {
  provenance: Provenance
  mapping: ModuleMapping
  modules: DiscoveredModule[]
  server: ServerExtraction
  specification?: Specification
  rawSpecification?: Specification
  specRevisionMatches: boolean
  generatedSources?: { path: string; content: string }[]
  clientSources?: { path: string; content: string }[]
  assessmentEvidence?: AssessmentEvidence
}): Snapshot {
  const diagnostics: Diagnostic[] = []
  const sourceAnchor = (input: Provenance['inputs'][number]) =>
    modules
      .flatMap((module) => module.roots)
      .find((location) => location.inputId === input.id) ??
    (['server-source', 'production-client', 'generated-client'].includes(
      input.kind,
    )
      ? mappingLocation
      : inputAnchor(input))
  const diagnostic = (
    stage: Diagnostic['stage'],
    moduleIds: string[],
    operationIds: string[],
    evidence: SourceLocation[],
    reason: string,
    nextStep: string,
  ) => {
    const id = `${stage}:${sha256(JSON.stringify({ moduleIds, operationIds, evidence, reason })).slice(0, 20)}`
    if (!diagnostics.some((item) => item.id === id))
      diagnostics.push({
        id,
        stage,
        severity: 'warning',
        moduleIds,
        operationIds,
        evidence,
        reason,
        nextStep,
      })
  }
  const known = new Map<string, Operation>()
  const candidates = new Map<string, Set<string>>()
  for (const module of modules)
    if (module.limitation)
      diagnostic(
        'modules',
        [module.id],
        [],
        module.roots,
        module.limitation,
        'Provide committed nonempty source evidence for this area or review the configured source roots before assessing its inventory.',
      )
  for (const issue of server.issues) {
    const owner = ownerOf(issue.path, mapping, mappingLocation)
    diagnostic(
      'server',
      [owner.moduleId],
      [],
      [
        {
          inputId: 'server',
          path: issue.path,
          line: issue.line,
          symbol: issue.symbol,
        },
      ],
      issue.reason,
      issue.nextStep,
    )
  }
  for (const item of server.mappings) {
    const handler = {
      inputId: 'server',
      path: item.path,
      line: item.line,
      symbol: item.symbol,
    }
    const owner = ownerOf(item.path, mapping, mappingLocation)
    for (const method of item.methods)
      for (const operationPath of item.paths) {
        const id = `${method} ${operationPath}`
        const variant = {
          id: `${item.path}:${item.line}:${sha256(JSON.stringify(item)).slice(0, 16)}`,
          handler,
          declaredPaths: item.declaredPaths,
          conditions: item.conditions,
          mappingAttributes: item.attributes,
        }
        if (!known.has(id))
          known.set(id, {
            id,
            method,
            path: operationPath,
            ownership: {
              state: 'resolved',
              moduleId: owner.moduleId,
              evidence: [handler, ...owner.evidence],
            },
            variants: [],
            specification: reconcileSpecification(
              id,
              specification,
              specRevisionMatches,
            ),
            generatedTransport: {
              state: 'unknown',
              reason: 'Generated output has not been supplied',
            },
            adoption: unassessed('Production call analysis has not run'),
            webRelevance: unassessed(
              'No production caller analysis or explicit web-relevance metadata was supplied',
            ),
          })
        const operation = known.get(id)!
        if (!operation.variants.some((existing) => existing.id === variant.id))
          operation.variants.push(variant)
        if (!candidates.has(id)) candidates.set(id, new Set())
        candidates.get(id)!.add(owner.moduleId)
      }
  }
  const operations = [...known.values()].sort((a, b) => compare(a.id, b.id))
  for (const operation of operations) {
    operation.variants.sort((a, b) => compare(a.id, b.id))
    const owners = [...candidates.get(operation.id)!].sort()
    if (owners.length > 1) {
      const evidence = operation.variants.map((variant) => variant.handler)
      operation.ownership = {
        state: 'ambiguous',
        candidateModuleIds: owners,
        evidence,
        reason: 'The same identity is declared in multiple server modules',
      }
      diagnostic(
        'modules',
        owners,
        [operation.id],
        evidence,
        operation.ownership.reason,
        'Reconcile ownership/conditional variants and record an evidenced mapping override if appropriate.',
      )
    }
  }
  const generated =
    generatedSources === undefined
      ? undefined
      : analyzeGenerated(
          generatedSources,
          operations,
          specification,
          specRevisionMatches,
        )
  for (const operation of operations)
    operation.generatedTransport = reconcileGenerated(operation.id, generated)
  const moduleIdsFor = (ids: string[]) =>
    [
      ...new Set(
        ids.flatMap((id) => {
          const ownership = known.get(id)?.ownership
          return !ownership
            ? []
            : ownership.state === 'resolved'
              ? [ownership.moduleId]
              : ownership.candidateModuleIds
        }),
      ),
    ].sort()
  for (const issue of generated?.issues ?? [])
    diagnostic(
      'generated',
      [],
      [],
      issue.evidence.length ? issue.evidence : [mappingLocation],
      issue.reason,
      issue.nextStep,
    )
  for (const method of generated?.methods ?? []) {
    if (method.mapping !== 'resolved')
      diagnostic(
        'generated',
        moduleIdsFor(method.operationIds),
        method.operationIds,
        [method.location],
        `${method.symbol}: ${method.reason}`,
        'Reconcile the actual method/path with independent server evidence; preserve unsupported and orphan identities without changing the denominator.',
      )
    for (const identity of method.identities ?? [])
      if (identity.specification.state === 'missing')
        diagnostic(
          'generated',
          moduleIdsFor(method.operationIds),
          method.operationIds,
          [method.location, ...identity.specification.evidence],
          `Generated identity ${identity.method} ${identity.path} is absent from the audited specification`,
          'Review stale output, missing specification coverage or the generation inputs; static presence does not prove current generation provenance.',
        )
  }
  if (!generated)
    diagnostic(
      'generated',
      [],
      [],
      [mappingLocation],
      'Committed generated output is unavailable; transport coverage remains unknown',
      'Supply the generated output at the analyzed revision or configure its committed source root.',
    )
  if (generated?.complete && specification?.complete && specRevisionMatches)
    for (const [id, evidence] of specification.operations)
      if (
        !generated.methods.some((method) =>
          method.identities?.some(
            (identity) => `${identity.method} ${identity.path}` === id,
          ),
        )
      )
        diagnostic(
          'generated',
          moduleIdsFor([id]),
          known.has(id) ? [id] : [],
          evidence,
          `Specification identity ${id} has no generated HTTP implementation`,
          'Reconcile generation inputs, pruning and output; generate the missing transport or document its exclusion without treating it as adoption.',
        )
  for (const issue of [
    ...(specification?.issues ?? []),
    ...(rawSpecification?.issues ?? []),
  ])
    diagnostic(
      'specification',
      [],
      [],
      issue.evidence,
      issue.reason,
      'Repair the specification/reference or supply its complete local reference inputs; re-run reconciliation.',
    )
  for (const operation of operations)
    if (operation.specification.state === 'ambiguous')
      diagnostic(
        'specification',
        [...candidates.get(operation.id)!],
        [operation.id],
        operation.specification.evidence,
        operation.specification.reason,
        'Reconcile the distinct template names/duplicate entries with handler evidence; preserve ambiguity until resolved.',
      )
  const runEvidence = provenance.inputs.find(
    (input) => input.id === 'generation-evidence',
  )
  if (runEvidence && provenance.generation.state === 'unknown')
    diagnostic(
      'provenance',
      [],
      [],
      [inputAnchor(runEvidence)],
      provenance.generation.reason,
      'Supply a run record bound to the analyzed revision and every available analysis input hash; declarations are insufficient.',
    )
  for (const input of provenance.inputs) {
    if (input.content.state === 'unavailable')
      diagnostic(
        'provenance',
        [],
        [],
        [sourceAnchor(provenance.inputs.find((item) => item.id === 'server')!)],
        `${input.id}: ${input.content.reason}`,
        'Supply an available committed input path/ref and regenerate; unavailable artifacts cannot establish absence or coverage.',
      )
    if (
      input.revision.state === 'known' &&
      input.revision.commit !== provenance.artemisCommit &&
      input.content.state === 'available'
    ) {
      diagnostic(
        'provenance',
        [],
        [],
        [sourceAnchor(input)],
        `${input.id} storage revision ${input.revision.commit} differs from Artemis ${provenance.artemisCommit}`,
        'Supply inputs at the analyzed revision or establish independently verified generation provenance; percentages remain withheld.',
      )
    }
  }
  if (specification?.complete && specRevisionMatches) {
    for (const [id, evidence] of specification.operations)
      if (!known.has(id))
        diagnostic(
          'specification',
          [],
          [],
          evidence,
          `Specification-only identity ${id} has no resolved independent server mapping`,
          'Reconcile unsupported/server registrations or stale specification content; do not add it to the expected denominator from the specification alone.',
        )
  }
  const inputsMatch = (kinds: Provenance['inputs'][number]['kind'][]) =>
    kinds.every((kind) =>
      provenance.inputs.some((input) => input.kind === kind),
    ) &&
    provenance.inputs
      .filter((input) => kinds.includes(input.kind))
      .every(
        (input) =>
          input.content.state === 'available' &&
          ((input.revision.state === 'known' &&
            input.revision.commit === provenance.artemisCommit) ||
            (input.kind === 'configuration' &&
              input.revision.state === 'not-applicable')),
      )
  const adoption =
    clientSources === undefined
      ? undefined
      : analyzeAdoption(clientSources, operations, generated?.methods ?? [], {
          clientRoot: mapping.clientRoot,
          generatedRoot:
            mapping.generatedRoot ?? `${mapping.clientRoot}/openapi`,
        })
  if (adoption) {
    for (const operation of operations) reconcileAdoption(operation, adoption)
    for (const issue of adoption.issues)
      diagnostic(
        'adoption',
        [
          ...new Set(
            issue.operationIds.flatMap((id) => [...candidates.get(id)!]),
          ),
        ],
        issue.operationIds,
        issue.evidence,
        issue.reason,
        issue.nextStep,
      )
    const anchor =
      adoption.evidence[0] ??
      sourceAnchor(provenance.inputs.find((input) => input.id === 'client')!)
    diagnostic(
      'adoption',
      [],
      [],
      [anchor],
      'Supported source-chain analysis: direct and aliased receivers, inherited helpers and single-terminal adapters are assessed. Dynamic dispatch, callbacks, mutable arguments, multiple terminal branches and unseen runtime registrations can still hide callers. No caller does not establish server-only status or migration.',
      'Reconcile unsupported source chains and web relevance with explicit evidence before claiming exclusive adoption or complete candidate analysis.',
    )
  }
  const callerCount = (
    bucket: 'generated' | 'manual' | 'unresolved',
    scoped: Operation[],
    global: boolean,
  ) => {
    if (!adoption) return unassessed('Production caller analysis has not run')
    const callers = callersForOperations(
      adoption.callers,
      scoped,
      global,
    ).filter((caller) => callSiteBucket(caller) === bucket)
    return {
      state: 'measured' as const,
      value: callers.length,
      completeness: 'incomplete-analysis' as const,
      basis:
        'Disjoint source-site partition: resolved generated REST / resolved manual REST / unresolved production transport. Shared scoping follows candidate server ownership independently of caller area; unbound sites are global-only. Wrapper implementation records are excluded; unsupported chains remain incomplete.',
      evidence: callers.length
        ? callers.map((caller) => caller.location)
        : adoption.evidence.length
          ? [adoption.evidence[0]]
          : [
              sourceAnchor(
                provenance.inputs.find((input) => input.id === 'client')!,
              ),
            ],
    }
  }
  const measurements = (
    scoped: Operation[],
    complete: boolean,
    evidence: SourceLocation[],
    global = false,
  ): Snapshot['measurements'] => {
    const measured = (value: number) => ({
      state: 'measured' as const,
      value,
      completeness: complete
        ? ('complete' as const)
        : ('incomplete-analysis' as const),
      basis:
        'Unique identities in the independent static potential-mapping inventory; incomplete counts are lower bounds',
      evidence,
    })
    const eligible =
      complete &&
      inputsMatch(['server-source', 'specification', 'configuration']) &&
      scoped.length > 0 &&
      scoped.every(
        (operation) =>
          operation.ownership.state === 'resolved' &&
          ['present', 'missing'].includes(operation.specification.state),
      )
    const specificationAvailable =
      specification?.complete && specRevisionMatches
    const specCount = (state: 'present' | 'missing' | 'ambiguous') =>
      specificationAvailable
        ? measured(
            scoped.filter(
              (operation) => operation.specification.state === state,
            ).length,
          )
        : {
            state: 'unknown' as const,
            reason:
              'A complete revision-matching specification is required to count assessed coverage states',
          }
    const generatedEligible =
      complete &&
      generated?.complete &&
      inputsMatch(['server-source', 'generated-client', 'configuration']) &&
      scoped.length > 0 &&
      scoped.every(
        (operation) =>
          operation.ownership.state === 'resolved' &&
          ['available', 'missing'].includes(operation.generatedTransport.state),
      )
    const generatedCount = (
      state: 'available' | 'missing' | 'ambiguous' | 'unresolved',
    ) => {
      if (!generated)
        return {
          state: 'unknown' as const,
          reason: 'Generated output is unavailable',
        }
      const count = measured(
        scoped.filter((operation) =>
          state === 'unresolved'
            ? !['available', 'missing', 'ambiguous'].includes(
                operation.generatedTransport.state,
              )
            : operation.generatedTransport.state === state,
        ).length,
      )
      return {
        ...count,
        completeness:
          complete && generated.complete
            ? ('complete' as const)
            : ('incomplete-analysis' as const),
        basis:
          'Unique independent server identities classified against actual generated implementations; incomplete counts are lower bounds',
      }
    }
    return {
      uniqueOperations: measured(scoped.length),
      specificationCounts: {
        present: specCount('present'),
        missing: specCount('missing'),
        ambiguous: specCount('ambiguous'),
        unresolved: measured(
          scoped.filter(
            (operation) =>
              !['present', 'missing', 'ambiguous'].includes(
                operation.specification.state,
              ),
          ).length,
        ),
      },
      generatedTransportCounts: {
        available: generatedCount('available'),
        missing: generatedCount('missing'),
        ambiguous: generatedCount('ambiguous'),
        unresolved: generatedCount('unresolved'),
      },
      specificationCoverage: eligible
        ? {
            state: 'eligible',
            numerator: scoped.filter(
              (operation) => operation.specification.state === 'present',
            ).length,
            denominator: scoped.length,
            denominatorComplete: true,
            analysisComplete: true,
            basis:
              'Exact specification identities / independent potential server identities; conditional routes are included, runtime activation is unknown',
            evidence,
          }
        : {
            state:
              complete && scoped.length === 0
                ? 'not-applicable'
                : !specification || !specRevisionMatches
                  ? 'unknown'
                  : 'incomplete-analysis',
            reason:
              complete && scoped.length === 0
                ? 'Evidenced scope has no potential REST operations'
                : 'Incomplete inventory, unresolved ownership/specification, or unavailable/mismatched inputs prevent a complete denominator',
          },
      generatedCallSites: callerCount('generated', scoped, global),
      manualCallSites: callerCount('manual', scoped, global),
      unresolvedCallSites: callerCount('unresolved', scoped, global),
      generatedTransportCoverage: generatedEligible
        ? {
            state: 'eligible',
            numerator: scoped.filter(
              (operation) => operation.generatedTransport.state === 'available',
            ).length,
            denominator: scoped.length,
            denominatorComplete: true,
            analysisComplete: true,
            basis:
              'Actual generated transport availability / independent potential server operations; this measures neither specification coverage nor production adoption',
            evidence,
          }
        : {
            state:
              complete && scoped.length === 0
                ? 'not-applicable'
                : !generated
                  ? 'unknown'
                  : 'incomplete-analysis',
            reason:
              complete && scoped.length === 0
                ? 'Evidenced scope has no potential REST operations'
                : 'Unavailable output, unsupported implementations, incomplete server inventory or ambiguous identities prevent a complete generated-transport percentage',
          },
      productionAdoption: adoption
        ? {
            state: 'incomplete-analysis',
            reason:
              'Direct callers and supported source chains are assessed; unresolved dispatch, dynamic cases and unassessed web relevance prevent an exclusive-adoption denominator.',
          }
        : unassessed(
            'Production caller analysis and web-relevance assessment have not run',
          ),
    }
  }
  const assessments: ModuleAssessment[] = modules.map((module) => {
    const scoped = operations.filter((operation) =>
      ownersOf(operation).includes(module.id),
    )
    const limitations = diagnostics.filter(
      (item) =>
        ['server', 'modules'].includes(item.stage) &&
        item.moduleIds.includes(module.id),
    )
    const complete = limitations.length === 0
    const serverFiles = server.files.filter(
      (file) =>
        ownerOf(file.path, mapping, mappingLocation).moduleId === module.id,
    )
    const scanEvidence = module.roots
    const evidence = scoped.length
      ? [scoped[0].variants[0].handler]
      : scanEvidence
    return {
      id: module.id,
      role: module.role,
      roots: module.roots,
      inventory: scoped.length
        ? {
            state: 'inventoried',
            operationIds: scoped.map((operation) => operation.id),
            completeness: complete ? 'complete' : 'incomplete-analysis',
            evidence,
          }
        : limitations.length
          ? {
              state: 'limited',
              analysis: 'incomplete-analysis',
              evidence: limitations.flatMap((item) => item.evidence),
              reason: limitations.map((item) => item.reason).join('; '),
              nextStep: limitations.map((item) => item.nextStep).join('; '),
            }
          : {
              state: 'no-rest',
              evidence,
              reason: serverFiles.length
                ? `All ${serverFiles.length} committed Java files in this ownership scope parsed and assessed; no potential annotation mappings or detected unsupported registrations`
                : module.roots.some((root) => root.inputId === 'server')
                  ? 'Tracked ownership overrides assign this directory’s server files to another discovered scope; no independently owned mappings remain'
                  : 'Source-root discovery establishes a client area with no server ownership scope; its callers remain independently attributed to their server operations',
            },
      measurements: measurements(scoped, complete, evidence),
    }
  })
  const complete = assessments.every(
    (module) =>
      module.inventory.state === 'no-rest' ||
      (module.inventory.state === 'inventoried' &&
        module.inventory.completeness === 'complete'),
  )
  const snapshot = snapshotSchema.parse({
    schemaVersion,
    provenance,
    modules: assessments,
    operations,
    generatedMethods: generated?.methods ?? [],
    callers: adoption?.callers ?? [],
    exceptions: [],
    diagnostics: diagnostics.sort((a, b) => compare(a.id, b.id)),
    measurements: measurements(
      operations,
      complete,
      [assessments[0].roots[0]],
      true,
    ),
  })
  if (assessmentEvidence)
    applyEvidence(snapshot, assessmentEvidence, {
      inputId: 'assessment-evidence',
      path: 'report/openapi/evidence.json',
      line: 1,
    })
  assessReadiness(snapshot)
  snapshot.diagnostics.sort((a, b) => compare(a.id, b.id))
  return snapshotSchema.parse(snapshot)
}

export interface GenerateOptions {
  repo: string
  ref: string
  output: string
  spec?: string
  specRef?: string
  rawSpec?: string
  rawSpecRef?: string
  generationEvidence?: string
  evidence?: string
  mapping?: string
  rebuild?: boolean
}
export async function generateReport(
  options: GenerateOptions,
): Promise<{ snapshot: Snapshot; manifest: Manifest; cached: boolean }> {
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', options.repo, ...args], {
      maxBuffer: 64 * 1024 * 1024,
      stdio: 'pipe',
    })
  const resolveRef = (ref: string) =>
    git('rev-parse', '--verify', `${ref}^{commit}`).toString().trim()
  const commit = resolveRef(options.ref)
  const mappingBytes = await readFile(options.mapping ?? defaultMapping)
  const mapping = mappingSchema.parse(JSON.parse(mappingBytes.toString()))
  const generatedRoot = mapping.generatedRoot ?? `${mapping.clientRoot}/openapi`
  const files = git('ls-tree', '-rz', '--name-only', commit)
    .toString()
    .split('\0')
    .filter(Boolean)
  const metadataPaths = [
    'build.gradle',
    'gradle/openapi.gradle',
    'src/main/resources/config/application.yml',
  ].filter((file) => files.includes(file))
  const archivePaths = [
    mapping.serverRoot,
    mapping.clientRoot,
    generatedRoot,
    ...metadataPaths,
  ].filter((root) =>
    files.some((file) => file === root || file.startsWith(root + '/')),
  )
  if (!archivePaths.includes(mapping.serverRoot))
    throw new Error(`Missing committed server root ${mapping.serverRoot}`)
  const extractedFiles = files.filter((file) =>
    archivePaths.some((root) => file === root || file.startsWith(root + '/')),
  )
  const temporary = await mkdtemp(path.join(tmpdir(), 'codestats-openapi-'))
  try {
    const archive = path.join(temporary, 'source.tar')
    git(
      'archive',
      '--format=tar',
      '--output',
      archive,
      commit,
      '--',
      ...archivePaths,
    )
    const tree = path.join(temporary, 'tree')
    await mkdir(tree)
    execFileSync('tar', ['-xf', archive, '-C', tree])
    const fileHashes = new Map<string, string>()
    const evidenceFiles = new Set<string>()
    for (const file of extractedFiles) {
      if (!(await lstat(path.join(tree, file))).isFile())
        throw new Error(
          `Committed input must be a regular file: ${file}; resolve symlink/submodule provenance explicitly`,
        )
      const bytes = await readFile(path.join(tree, file))
      fileHashes.set(file, sha256(bytes))
      if (bytes.length) evidenceFiles.add(file)
    }
    const modules = discoverModules(extractedFiles, mapping, evidenceFiles)
    const serverAnchor =
      modules
        .flatMap((module) => module.roots)
        .find((location) => location.inputId === 'server') ?? mappingLocation
    const treeHash = (root: string) =>
      sha256(
        [...fileHashes]
          .filter(([file]) => file === root || file.startsWith(root + '/'))
          .map(([file, hash]) => `${file}\0${hash}\n`)
          .join(''),
      )
    const inputs: Provenance['inputs'] = [
      {
        id: 'server',
        kind: 'server-source',
        path: mapping.serverRoot,
        revision: { state: 'known', commit },
        content: { state: 'available', sha256: treeHash(mapping.serverRoot) },
      },
      {
        id: 'module-mapping',
        kind: 'configuration',
        path: mappingLocation.path,
        revision: {
          state: 'not-applicable',
          reason:
            'Collector configuration is stored in CodeStats and bound by its content hash',
        },
        content: { state: 'available', sha256: sha256(mappingBytes) },
      },
    ]
    if (
      extractedFiles.some((file) => file.startsWith(mapping.clientRoot + '/'))
    )
      inputs.push({
        id: 'client',
        kind: 'production-client',
        path: mapping.clientRoot,
        revision: { state: 'known', commit },
        content: { state: 'available', sha256: treeHash(mapping.clientRoot) },
      })
    const generatedFiles = extractedFiles.filter((file) =>
      file.startsWith(generatedRoot + '/'),
    )
    inputs.push({
      id: 'generated',
      kind: 'generated-client',
      path: generatedRoot,
      revision: { state: 'known', commit },
      content: generatedFiles.length
        ? { state: 'available', sha256: treeHash(generatedRoot) }
        : {
            state: 'unavailable',
            reason: `No committed generated output under ${generatedRoot} at ${commit}`,
          },
    })
    for (const file of metadataPaths)
      inputs.push({
        id: file,
        kind: 'configuration',
        path: file,
        revision: { state: 'known', commit },
        content: { state: 'available', sha256: fileHashes.get(file)! },
      })
    const specificationInput = (
      id: string,
      kind: 'specification' | 'raw-specification',
      file: string,
      ref?: string,
    ) => {
      // Reject path traversal/origins before passing a repository path to Git.
      const normalized = z
        .string()
        .refine(
          (value) =>
            !value.startsWith('/') &&
            !value.includes('\\') &&
            value
              .split('/')
              .every((part) => part && part !== '..' && part !== '.'),
        )
        .parse(file)
      const revision = ref ? resolveRef(ref) : commit
      let bytes: Buffer | undefined
      try {
        bytes = git('show', `${revision}:${normalized}`)
      } catch {
        /* Available source still yields a useful report with unknown specification. */
      }
      inputs.push({
        id,
        kind,
        path: normalized,
        revision: { state: 'known', commit: revision },
        content: bytes
          ? { state: 'available', sha256: sha256(bytes) }
          : {
              state: 'unavailable',
              reason: `No committed ${normalized} at ${revision}`,
            },
      })
      return {
        parsed: bytes
          ? parseSpecification(bytes.toString(), id, normalized)
          : undefined,
        revision,
      }
    }
    const specFiles = options.specRef
      ? git('ls-tree', '-rz', '--name-only', resolveRef(options.specRef))
          .toString()
          .split('\0')
      : files
    const discoveredSpecs = [
      'config/openapi/openapi.yaml',
      'openapi/openapi.yaml',
    ].filter((file) => specFiles.includes(file))
    if (!options.spec && discoveredSpecs.length > 1)
      throw new Error(
        'Multiple committed OpenAPI specifications found; select one explicitly with --spec',
      )
    const spec = specificationInput(
      'specification',
      'specification',
      options.spec ?? discoveredSpecs[0] ?? 'config/openapi/openapi.yaml',
      options.specRef,
    )
    const raw = options.rawSpec
      ? specificationInput(
          'raw-specification',
          'raw-specification',
          options.rawSpec,
          options.rawSpecRef,
        )
      : undefined
    let generationRecord: z.infer<typeof generationEvidenceSchema> | undefined
    const evidenceBytes = await readFile(options.evidence ?? defaultEvidence)
    const assessmentEvidence = assessmentEvidenceSchema.parse(
      JSON.parse(evidenceBytes.toString()),
    )
    inputs.push({
      id: 'assessment-evidence',
      kind: 'verification',
      path: 'report/openapi/evidence.json',
      revision: {
        state: 'unknown',
        reason:
          'External CodeStats assessment records; each claim is separately bound to the analyzed Artemis inputs',
      },
      content: { state: 'available', sha256: sha256(evidenceBytes) },
    })
    if (options.generationEvidence) {
      const bytes = await readFile(options.generationEvidence)
      generationRecord = generationEvidenceSchema.parse(
        JSON.parse(bytes.toString()),
      )
      inputs.push({
        id: 'generation-evidence',
        kind: 'verification',
        path: 'evidence/generation.json',
        revision: {
          state: 'unknown',
          reason:
            'External generation-run evidence; its binding is verified separately',
        },
        content: { state: 'available', sha256: sha256(bytes) },
      })
    }
    const analyzerFiles = [
      'index.ts',
      'generate.ts',
      'scope.ts',
      'server.ts',
      'spec.ts',
      'generated.ts',
      'adoption.ts',
      'evidence.ts',
      'artifacts.ts',
    ].map((file) => path.join(directory, file))
    analyzerFiles.push(
      extractorSource,
      ...extractorLibraries,
      path.join(directory, '../../src/features/openapi/model.ts'),
      path.join(directory, '../../src/features/openapi/scope.ts'),
      path.join(directory, '../../src/features/openapi/assessment.ts'),
      path.join(directory, '../../package-lock.json'),
    )
    const analyzerHashes = await Promise.all(
      analyzerFiles.map(async (file) => sha256(await readFile(file))),
    )
    const fingerprint = sha256(
      JSON.stringify({
        schemaVersion,
        analyzerVersion,
        analyzerHashes,
        commit,
        inputs,
        mappingHash: sha256(mappingBytes),
      }),
    )
    // Logical artifact timestamps follow committed inputs, so fresh isolated reproductions are byte-identical.
    const dates = [
      ...new Set(
        inputs.flatMap((input) =>
          input.revision.state === 'known' ? [input.revision.commit] : [],
        ),
      ),
    ]
      .map((revision) =>
        new Date(
          git('show', '-s', '--format=%cI', revision).toString().trim(),
        ).toISOString(),
      )
      .sort()
    const analyzedAt = dates.at(-1)!
    const snapshotPath = path.join(options.output, `${commit}.json`)
    const indexPath = path.join(options.output, 'index.json')
    if (!options.rebuild && existsSync(indexPath) && existsSync(snapshotPath)) {
      try {
        const manifest = manifestSchema.parse(
          JSON.parse(await readFile(indexPath, 'utf8')),
        )
        const bytes = await readFile(snapshotPath)
        const snapshot = snapshotSchema.parse(JSON.parse(bytes.toString()))
        const entry = manifest.snapshots.find(
          (item) => item.artemisCommit === commit,
        )
        if (
          snapshot.provenance.fingerprint === fingerprint &&
          snapshot.provenance.artemisCommit === commit &&
          snapshot.provenance.analyzerVersion === analyzerVersion &&
          JSON.stringify(snapshot.provenance.inputs) ===
            JSON.stringify(inputs) &&
          snapshot.provenance.moduleMapping.sha256 === sha256(mappingBytes) &&
          snapshot.provenance.moduleMapping.version === mapping.version &&
          snapshot.provenance.analyzedAt === analyzedAt &&
          entry?.file === `${commit}.json` &&
          entry.sha256 === sha256(bytes) &&
          entry.analyzerVersion === analyzerVersion &&
          entry.analyzedAt === snapshot.provenance.analyzedAt
        ) {
          return { manifest, snapshot, cached: true }
        }
      } catch {
        /* Invalid/tampered or older cache is rebuilt and validated below. */
      }
    }
    const provenance: Provenance = {
      artemisCommit: commit,
      repositoryUrl: 'https://github.com/ls1intum/Artemis',
      analyzerVersion,
      fingerprint,
      analyzedAt,
      inputs,
      moduleMapping: { version: mapping.version, sha256: sha256(mappingBytes) },
      assumptions: [
        {
          reason:
            'Potential committed mappings include profile/conditional variants; no deployment activation or runtime route completeness is established',
          evidence: [serverAnchor],
        },
        {
          reason:
            'The denominator counts explicitly declared annotation methods only. Framework-provided implicit HEAD/OPTIONS, servlet/filter/security routes and third-party endpoints require a scoped runtime export.',
          evidence: [serverAnchor],
        },
        ...metadataPaths.map((file) => ({
          reason: `Committed ${file} records configuration declarations, not proof of a generation run or enforced production policy`,
          evidence: [{ inputId: file, path: file, line: 1 }],
        })),
        {
          reason:
            'Logical artifact timestamps use the latest analyzed input commit time. Content hashes and fingerprint, rather than wall time, identify analysis changes.',
          evidence: [mappingLocation],
        },
      ],
      generation: {
        state: 'unknown',
        reason:
          'No matching revision/input-bound generation-run record was supplied; committed configuration cannot prove artifact provenance',
        declarations: metadataPaths
          .filter((file) => file.endsWith('openapi.gradle'))
          .map((file) => `Generation configuration: ${file}`),
      },
      pruning: {
        state: 'unknown',
        reason:
          'Pruning needs complete raw and derived specifications tied to the same evidenced generation run',
      },
    }
    if (provenance.generation.state === 'unknown')
      for (const file of generatedFiles.filter((file) =>
        file.endsWith('/.openapi-generator/VERSION'),
      ))
        provenance.generation.declarations.push(
          `Generic OpenAPI Generator version metadata (${file}): ${(await readFile(path.join(tree, file), 'utf8')).trim()}; does not identify the custom generator artifact or run`,
        )
    if (
      provenance.generation.state === 'unknown' &&
      metadataPaths.includes('build.gradle')
    ) {
      const lines = (
        await readFile(path.join(tree, 'build.gradle'), 'utf8')
      ).split('\n')
      for (const [index, line] of lines.entries())
        if (
          line.trim().startsWith('classpath ') &&
          line.includes('openapi-generator-angular22')
        )
          provenance.generation.declarations.push(
            `Source dependency declaration (build.gradle:${index + 1}): ${line.trim()}; not proof of the artifact/run used for committed output`,
          )
    }
    const analyzedInputs = inputs.filter(
      (input) => !['verification', 'enforcement'].includes(input.kind),
    )
    const bindingHashes = Object.fromEntries(
      analyzedInputs.flatMap((input) =>
        input.content.state === 'available'
          ? [[input.id, input.content.sha256]]
          : [],
      ),
    )
    const generationMatches =
      generationRecord &&
      generationRecord.binding.artemisCommit === commit &&
      analyzedInputs.every(
        (input) =>
          input.content.state === 'available' &&
          ((input.revision.state === 'known' &&
            input.revision.commit === commit) ||
            input.revision.state === 'not-applicable'),
      ) &&
      JSON.stringify(
        Object.entries(generationRecord.binding.inputHashes).sort(),
      ) === JSON.stringify(Object.entries(bindingHashes).sort())
    if (generationRecord && generationMatches) {
      provenance.generation = {
        state: 'recorded',
        ...generationRecord,
        evidence: [
          inputAnchor(
            inputs.find((input) => input.id === 'generation-evidence')!,
          ),
        ],
      }
      if (
        raw?.parsed?.complete &&
        spec.parsed?.complete &&
        raw.revision === commit &&
        spec.revision === commit &&
        [...raw.parsed.operations.keys()].every(
          (id) =>
            reconcileSpecification(id, raw.parsed, true).state === 'present' &&
            ['present', 'missing'].includes(
              reconcileSpecification(id, spec.parsed, true).state,
            ),
        ) &&
        [...spec.parsed.operations.keys()].every(
          (id) =>
            reconcileSpecification(id, spec.parsed, true).state === 'present',
        )
      ) {
        provenance.pruning = {
          state: 'observed',
          runId: generationRecord.runId,
          rawInputId: 'raw-specification',
          derivedInputId: 'specification',
          removedOperations: [...raw.parsed.operations.keys()]
            .filter((id) => !spec.parsed!.operations.has(id))
            .sort()
            .map((id) => ({
              method: id.split(' ')[0] as Operation['method'],
              path: id.slice(id.indexOf(' ') + 1),
            })),
          evidence: [
            raw.parsed.anchor,
            spec.parsed.anchor,
            ...provenance.generation.evidence,
          ],
        }
      }
    } else if (generationRecord)
      provenance.generation = {
        state: 'unknown',
        reason:
          'Supplied generation-run evidence does not match all analyzed input hashes and revisions',
        declarations: [`Unverified run: ${generationRecord.runId}`],
      }
    const extractor = await createServerExtractor()
    let server: ServerExtraction
    try {
      server = await extractor.extract(tree, mapping.serverRoot)
    } finally {
      await extractor.close()
    }
    const snapshot = inventorySnapshot({
      provenance,
      assessmentEvidence,
      mapping,
      modules,
      server,
      specification: spec.parsed,
      rawSpecification: raw?.parsed,
      specRevisionMatches: spec.revision === commit,
      clientSources: extractedFiles.some((file) =>
        file.startsWith(`${mapping.clientRoot}/`),
      )
        ? await Promise.all(
            extractedFiles
              .filter(
                (file) =>
                  file.startsWith(`${mapping.clientRoot}/`) &&
                  file.endsWith('.ts'),
              )
              .map(async (file) => ({
                path: file,
                content: await readFile(path.join(tree, file), 'utf8'),
              })),
          )
        : undefined,
      generatedSources: generatedFiles.length
        ? await Promise.all(
            generatedFiles
              .filter(
                (file) =>
                  file.endsWith('.ts') &&
                  !file.endsWith('.d.ts') &&
                  !/\.(spec|test)\.ts$/.test(file) &&
                  !file
                    .split('/')
                    .some((part) =>
                      [
                        '__tests__',
                        'test',
                        'tests',
                        'mock',
                        'mocks',
                        'fixture',
                        'fixtures',
                      ].includes(part),
                    ),
              )
              .map(async (file) => ({
                path: file,
                content: await readFile(path.join(tree, file), 'utf8'),
              })),
          )
        : undefined,
    })
    const bytes = JSON.stringify(snapshot) + '\n'
    const history = existsSync(indexPath)
      ? (await readManifest(options.output)).snapshots.filter(
          (entry) => entry.artemisCommit !== commit,
        )
      : []
    // History stays byte-identical; never silently drop a missing or corrupt retained file.
    for (const entry of history) await readSnapshot(options.output, entry)
    const entries = [
      ...history,
      {
        artemisCommit: commit,
        file: `${commit}.json`,
        sha256: sha256(bytes),
        analyzerVersion,
        analyzedAt,
      },
    ].sort(
      (a, b) =>
        compare(b.analyzedAt, a.analyzedAt) ||
        compare(a.artemisCommit, b.artemisCommit),
    )
    const manifest = manifestSchema.parse({
      schemaVersion,
      generatedAt: entries[0].analyzedAt,
      snapshots: entries,
    })
    await mkdir(options.output, { recursive: true })
    const atomicWrite = async (file: string, content: string) => {
      const temp = `${file}.tmp`
      try {
        await writeFile(temp, content)
        await rename(temp, file)
      } finally {
        await rm(temp, { force: true })
      }
    }
    await atomicWrite(snapshotPath, bytes)
    await atomicWrite(indexPath, JSON.stringify(manifest) + '\n')
    return { manifest, snapshot, cached: false }
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}
