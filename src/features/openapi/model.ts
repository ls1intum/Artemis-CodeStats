import { z } from 'zod'

export const schemaVersion = 1
const text = z.string().trim().min(1)
const count = z.number().int().nonnegative()
const commit = z.string().regex(/^[a-f0-9]{40}$/)
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const date = z.string().datetime({ offset: true })
const ids = z.array(text)
const relativePath = text.refine(
  (path) =>
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !path.split('/').some((part) => part === '..' || part === '.' || !part),
  'Use a repository-relative POSIX path',
)

export const sourceLocationSchema = z
  .object({
    inputId: text,
    path: relativePath,
    line: z.number().int().positive(),
    symbol: text.optional(),
  })
  .strict()
const evidence = z.array(sourceLocationSchema).min(1)

// No defaults: absence of evidence cannot become a zero count or a passing state.
export const unavailableSchema = z
  .object({
    state: z.enum([
      'unknown',
      'unassessed',
      'not-applicable',
      'incomplete-analysis',
    ]),
    reason: text,
    evidence: evidence.optional(),
  })
  .strict()

export const operationIdentitySchema = z
  .object({
    method: z.enum([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'HEAD',
      'OPTIONS',
      'TRACE',
    ]),
    path: text.refine(
      (path) =>
        path.startsWith('/') && !path.startsWith('//') && !/[?#\s]/.test(path),
      'Use a normalized path without a query, fragment, or origin',
    ),
  })
  .strict()

export const specificationStateSchema = z.union([
  z
    .object({
      state: z.enum(['present', 'missing', 'ambiguous']),
      evidence,
      reason: text,
    })
    .strict(),
  unavailableSchema,
])
export const generatedTransportStateSchema = z.union([
  z
    .object({
      state: z.enum(['available', 'missing', 'ambiguous']),
      methodIds: ids,
      evidence,
      reason: text,
    })
    .strict()
    .refine(
      (value) =>
        value.state === 'missing'
          ? value.methodIds.length === 0
          : value.methodIds.length > 0,
      'Available/ambiguous transport needs methods; missing transport has none',
    ),
  unavailableSchema,
])
export const adoptionStateSchema = z.union([
  z
    .object({
      state: z.enum([
        'generated-detected',
        'generated-only',
        'manual',
        'mixed',
        'no-calls',
      ]),
      callerIds: ids,
      analysis: z.enum(['complete', 'incomplete-analysis']),
      evidence,
      reason: text,
    })
    .strict()
    .refine(
      (value) =>
        (value.state === 'no-calls'
          ? value.callerIds.length === 0
          : value.callerIds.length > 0) &&
        (!['generated-only', 'no-calls'].includes(value.state) ||
          value.analysis === 'complete'),
      'Exclusive generated use and no-calls require complete analysis',
    ),
  unavailableSchema,
])
export const webRelevanceSchema = z.union([
  z
    .object({
      state: z.literal('relevant'),
      basis: z.enum(['production-caller', 'explicit-metadata']),
      evidence,
    })
    .strict(),
  z
    .object({ state: z.literal('server-only'), reason: text, evidence })
    .strict(),
  z
    .object({
      state: z.enum(['unknown', 'unassessed', 'incomplete-analysis']),
      reason: text,
    })
    .strict(),
])

export const countSchema = z.union([
  z
    .object({
      state: z.literal('measured'),
      value: count,
      completeness: z.enum(['complete', 'incomplete-analysis']),
      basis: text,
      evidence,
    })
    .strict(),
  unavailableSchema,
])
export const percentageSchema = z.union([
  z
    .object({
      state: z.literal('eligible'),
      numerator: count,
      denominator: z.number().int().positive(),
      denominatorComplete: z.literal(true),
      analysisComplete: z.literal(true),
      basis: text,
      evidence,
    })
    .strict()
    .refine(
      (value) => value.numerator <= value.denominator,
      'Numerator exceeds denominator',
    ),
  unavailableSchema,
])
// Ratios count unique operations. Call-site counts are separate observations, never denominators.
export const measurementsSchema = z
  .object({
    uniqueOperations: countSchema,
    generatedCallSites: countSchema,
    manualCallSites: countSchema,
    unresolvedCallSites: countSchema,
    specificationCoverage: percentageSchema,
    generatedTransportCoverage: percentageSchema,
    productionAdoption: percentageSchema,
    specificationCounts: z
      .object({
        present: countSchema,
        missing: countSchema,
        ambiguous: countSchema,
        unresolved: countSchema,
      })
      .strict()
      .optional(),
    generatedTransportCounts: z
      .object({
        available: countSchema,
        missing: countSchema,
        ambiguous: countSchema,
        unresolved: countSchema,
      })
      .strict()
      .optional(),
  })
  .strict()

export const moduleAssessmentSchema = z
  .object({
    id: text,
    role: z.enum([
      'server-module',
      'shared-infrastructure',
      'client-only',
      'unresolved',
    ]),
    roots: evidence,
    inventory: z.union([
      z
        .object({
          state: z.literal('inventoried'),
          operationIds: ids.min(1),
          completeness: z.enum(['complete', 'incomplete-analysis']),
          evidence,
        })
        .strict(),
      z
        .object({ state: z.literal('no-rest'), evidence, reason: text })
        .strict(),
      z
        .object({
          state: z.literal('limited'),
          analysis: z.enum(['unknown', 'unassessed', 'incomplete-analysis']),
          evidence,
          reason: text,
          nextStep: text,
        })
        .strict(),
    ]),
    measurements: measurementsSchema,
  })
  .strict()

export const operationSchema = operationIdentitySchema
  .extend({
    id: text,
    ownership: z.union([
      z
        .object({ state: z.literal('resolved'), moduleId: text, evidence })
        .strict(),
      z
        .object({
          state: z.enum(['ambiguous', 'unresolved']),
          candidateModuleIds: ids,
          evidence,
          reason: text,
        })
        .strict(),
    ]),
    // Handlers sharing an identity remain variants, including media/header/parameter conditions.
    variants: z.array(
      z
        .object({
          id: text,
          handler: sourceLocationSchema,
          declaredPaths: z.array(text).min(1),
          conditions: z.array(text),
          mappingAttributes: z.record(text, z.array(text)),
        })
        .strict(),
    ),
    specification: specificationStateSchema,
    generatedTransport: generatedTransportStateSchema,
    adoption: adoptionStateSchema,
    webRelevance: webRelevanceSchema,
  })
  .strict()
  .refine(
    (value) => value.id === `${value.method} ${value.path}`,
    'Operation id must be METHOD path',
  )

const mapping = z.enum(['resolved', 'ambiguous', 'unresolved'])
export const generatedMethodSchema = z
  .object({
    id: text,
    symbol: text,
    location: sourceLocationSchema,
    transport: z.enum(['observable', 'resource-helper']),
    operationIds: ids,
    mapping,
    reason: text,
    // Actual transport identities survive even when the independent server inventory has no match.
    identities: z
      .array(
        operationIdentitySchema
          .extend({ specification: specificationStateSchema })
          .strict(),
      )
      .optional(),
    implementations: evidence.optional(),
  })
  .strict()
  .refine(
    (value) => value.mapping !== 'resolved' || value.operationIds.length === 1,
    'Resolved transport must identify one operation',
  )
export const callerSchema = z
  .object({
    id: text,
    symbol: text,
    area: text,
    location: sourceLocationSchema,
    kind: z.enum([
      'production',
      'test',
      'mock',
      'fixture',
      'generated-implementation',
      'wrapper-implementation',
    ]),
    transport: z.enum(['generated', 'manual', 'unresolved']),
    traffic: z.enum([
      'artemis-rest',
      'external-api',
      'asset',
      'websocket',
      'unresolved',
    ]),
    operationIds: ids,
    mapping,
    generatedMethodId: text.optional(),
    via: z.array(sourceLocationSchema),
    reason: text,
  })
  .strict()
  .refine(
    (value) =>
      (value.mapping !== 'resolved' || value.operationIds.length === 1) &&
      (value.transport !== 'generated' ||
        value.generatedMethodId !== undefined),
    'Resolved callers need one operation; generated callers need a method reference',
  )

// Call-site measurements form a disjoint partition; excluded traffic has no REST bucket.
export function callSiteBucket(
  caller: z.infer<typeof callerSchema>,
): 'generated' | 'manual' | 'unresolved' | undefined {
  if (
    caller.kind !== 'production' ||
    !['artemis-rest', 'unresolved'].includes(caller.traffic)
  )
    return undefined
  return caller.traffic === 'artemis-rest' &&
    caller.mapping === 'resolved' &&
    caller.transport !== 'unresolved'
    ? caller.transport
    : 'unresolved'
}
export const diagnosticSchema = z
  .object({
    id: text,
    stage: z.enum([
      'modules',
      'server',
      'specification',
      'generated',
      'adoption',
      'provenance',
      'verification',
      'enforcement',
    ]),
    severity: z.enum(['warning', 'error']),
    moduleIds: ids,
    operationIds: ids,
    evidence,
    reason: text,
    nextStep: text,
  })
  .strict()

export const bindingSchema = z
  .object({
    artemisCommit: commit,
    inputHashes: z
      .record(text, hash)
      .refine(
        (value) => Object.keys(value).length > 0,
        'Bind evidence to input hashes',
      ),
  })
  .strict()
const scopeSchema = z
  .object({ moduleIds: ids, operationIds: ids, callerIds: ids })
  .strict()
  .refine(
    (scope) =>
      scope.moduleIds.length +
        scope.operationIds.length +
        scope.callerIds.length >
      0,
    'Evidence needs an explicit scope',
  )
export const exceptionSchema = z
  .object({
    id: text,
    binding: bindingSchema,
    bindingStatus: z.enum(['matched', 'mismatched', 'unknown']).optional(),
    scope: scopeSchema,
    evidence,
    reason: text,
    reviewCondition: text,
    removalCondition: text,
    maintainer: text.optional(),
  })
  .strict()
export const verificationSchema = z
  .object({
    id: text,
    binding: bindingSchema,
    bindingStatus: z.enum(['matched', 'mismatched', 'unknown']),
    scope: scopeSchema,
    kind: z.enum(['client-compilation', 'wire-compatibility', 'runtime-flow']),
    result: z.enum(['passed', 'failed', 'unknown']),
    recordedAt: date,
    evidence,
    reason: text,
  })
  .strict()
export const enforcementSchema = z
  .object({
    id: text,
    binding: bindingSchema,
    bindingStatus: z.enum(['matched', 'mismatched', 'unknown']),
    scope: scopeSchema,
    rule: text,
    state: z.enum(['enabled', 'disabled', 'unknown']),
    exclusions: z.array(text),
    exceptionIds: ids,
    coverage: z.enum(['complete', 'partial', 'unknown']).optional(),
    checks: z.array(z.enum(['specification', 'manual-transport'])).optional(),
    recordedAt: date,
    evidence,
    reason: text,
  })
  .strict()

export const nextStepSchema = z
  .object({
    id: text,
    category: z.enum([
      'inventory',
      'specification',
      'generated-transport',
      'manual-transport',
      'unresolved-analysis',
      'web-relevance',
      'exception-review',
      'verification',
      'enforcement',
      'provenance',
    ]),
    moduleIds: ids,
    operationIds: ids,
    callerIds: ids,
    evidence,
    reason: text,
    action: text,
  })
  .strict()
export const readinessSchema = z
  .object({
    moduleId: text,
    migration: z.enum(['blocked', 'candidate', 'verified', 'not-applicable']),
    protection: z.enum([
      'blocked',
      'candidate',
      'protected',
      'unknown',
      'not-applicable',
    ]),
    prerequisiteIds: ids,
    verificationIds: ids,
    enforcementIds: ids,
    evidence,
    reason: text,
  })
  .strict()

export const inputSchema = z
  .object({
    id: text,
    kind: z.enum([
      'server-source',
      'specification',
      'raw-specification',
      'generated-client',
      'production-client',
      'configuration',
      'verification',
      'enforcement',
    ]),
    path: relativePath,
    // Storage revision is separate from the revision used to generate an artifact.
    revision: z.union([
      z.object({ state: z.literal('known'), commit }).strict(),
      z.object({ state: z.literal('unknown'), reason: text }).strict(),
      z.object({ state: z.literal('not-applicable'), reason: text }).strict(),
    ]),
    content: z.union([
      z.object({ state: z.literal('available'), sha256: hash }).strict(),
      z.object({ state: z.literal('unavailable'), reason: text }).strict(),
    ]),
  })
  .strict()
  .refine(
    (input) =>
      input.revision.state !== 'not-applicable' ||
      input.kind === 'configuration',
    'Only collector configuration may have a non-Artemis storage revision',
  )
export const provenanceSchema = z
  .object({
    artemisCommit: commit,
    repositoryUrl: z.string().url(),
    analyzerVersion: text,
    fingerprint: hash.optional(),
    analyzedAt: date,
    inputs: z.array(inputSchema).min(1),
    moduleMapping: z.object({ version: text, sha256: hash }).strict(),
    assumptions: z.array(z.object({ reason: text, evidence }).strict()),
    generation: z.union([
      z
        .object({
          state: z.literal('unknown'),
          reason: text,
          declarations: z.array(text),
        })
        .strict(),
      z
        .object({
          state: z.literal('recorded'),
          binding: bindingSchema,
          runId: text,
          generatorArtifactSha256: hash,
          profiles: z.array(text),
          properties: z.record(text, text),
          evidence,
        })
        .strict(),
    ]),
    pruning: z.union([
      z.object({ state: z.literal('unknown'), reason: text }).strict(),
      z
        .object({
          state: z.literal('observed'),
          runId: text,
          rawInputId: text,
          derivedInputId: text,
          removedOperations: z.array(operationIdentitySchema),
          evidence,
        })
        .strict(),
    ]),
  })
  .strict()
  .superRefine((value, ctx) => {
    const pruning = value.pruning
    if (pruning.state !== 'observed') return
    const raw = value.inputs.find((input) => input.id === pruning.rawInputId)
    const derived = value.inputs.find(
      (input) => input.id === pruning.derivedInputId,
    )
    if (
      value.generation.state !== 'recorded' ||
      value.generation.runId !== pruning.runId ||
      raw?.kind !== 'raw-specification' ||
      derived?.kind !== 'specification' ||
      raw.content.state !== 'available' ||
      derived.content.state !== 'available' ||
      raw.revision.state !== 'known' ||
      derived.revision.state !== 'known' ||
      raw.revision.commit !== value.artemisCommit ||
      derived.revision.commit !== value.artemisCommit ||
      value.generation.binding.inputHashes[raw.id] !== raw.content.sha256 ||
      value.generation.binding.inputHashes[derived.id] !==
        derived.content.sha256
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Observed pruning needs raw/derived inputs bound to the same generation run and revision',
      })
    }
  })

export const snapshotSchema = z
  .object({
    schemaVersion: z.literal(schemaVersion),
    provenance: provenanceSchema,
    modules: z.array(moduleAssessmentSchema).min(1),
    operations: z.array(operationSchema),
    generatedMethods: z.array(generatedMethodSchema),
    callers: z.array(callerSchema),
    diagnostics: z.array(diagnosticSchema),
    exceptions: z.array(exceptionSchema),
    measurements: measurementsSchema,
    verification: z.array(verificationSchema).optional(),
    enforcement: z.array(enforcementSchema).optional(),
    readiness: z.array(readinessSchema).optional(),
    nextSteps: z.array(nextStepSchema).optional(),
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const fail = (message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message })
    const index = <T extends { id: string }>(records: T[], name: string) => {
      const result = new Map(records.map((record) => [record.id, record]))
      if (result.size !== records.length) fail(`Duplicate ${name} id`)
      return result
    }
    const modules = index(snapshot.modules, 'module')
    const operations = index(snapshot.operations, 'operation')
    const methods = index(snapshot.generatedMethods, 'generated method')
    const callers = index(snapshot.callers, 'caller')
    const inputs = index(snapshot.provenance.inputs, 'input')
    const exceptions = index(snapshot.exceptions, 'exception')
    index(snapshot.diagnostics, 'diagnostic')
    const nextSteps = index(snapshot.nextSteps ?? [], 'next step')
    const references = (
      values: string[],
      known: Map<string, unknown>,
      label: string,
    ) => {
      if (new Set(values).size !== values.length)
        fail(`Duplicate ${label} reference`)
      for (const id of values)
        if (!known.has(id)) fail(`Unknown ${label}: ${id}`)
    }
    for (const module of snapshot.modules) {
      if (module.inventory.state === 'inventoried') {
        references(module.inventory.operationIds, operations, 'operation')
        for (const id of module.inventory.operationIds) {
          const owner = operations.get(id)?.ownership
          if (owner?.state === 'resolved' && owner.moduleId !== module.id)
            fail(`Inventory contains another module's operation: ${id}`)
        }
      }
    }
    const adoptionLimited = (operationIds: string[]) =>
      snapshot.callers.some(
        (caller) =>
          callSiteBucket(caller) === 'unresolved' &&
          (!caller.operationIds.length ||
            caller.operationIds.some((id) => operationIds.includes(id))),
      ) ||
      snapshot.diagnostics.some(
        (diagnostic) =>
          diagnostic.stage === 'adoption' &&
          (!diagnostic.operationIds.length ||
            diagnostic.operationIds.some((id) => operationIds.includes(id))),
      )
    for (const operation of snapshot.operations) {
      references(
        operation.ownership.state === 'resolved'
          ? [operation.ownership.moduleId]
          : operation.ownership.candidateModuleIds,
        modules,
        'module',
      )
      if ('methodIds' in operation.generatedTransport) {
        references(
          operation.generatedTransport.methodIds,
          methods,
          'generated method',
        )
        if (
          operation.generatedTransport.state === 'available' &&
          operation.generatedTransport.methodIds.some((id) => {
            const method = methods.get(id)
            return (
              method?.mapping !== 'resolved' ||
              !method.operationIds.includes(operation.id)
            )
          })
        )
          fail(
            `Available transport needs a resolved operation mapping: ${operation.id}`,
          )
      }
      if ('callerIds' in operation.adoption) {
        const adoption = operation.adoption
        references(adoption.callerIds, callers, 'caller')
        const observed = snapshot.callers.filter(
          (caller) =>
            caller.kind === 'production' &&
            ['artemis-rest', 'unresolved'].includes(caller.traffic) &&
            caller.operationIds.includes(operation.id),
        )
        if (observed.some((caller) => !adoption.callerIds.includes(caller.id)))
          fail(`Adoption omits a detected production caller: ${operation.id}`)
        const production = adoption.callerIds
          .map((id) => callers.get(id))
          .filter(
            (caller) =>
              caller?.kind === 'production' &&
              ['artemis-rest', 'unresolved'].includes(caller.traffic),
          )
        if (production.length !== operation.adoption.callerIds.length)
          fail(`Adoption includes excluded callers: ${operation.id}`)
        const generated = production.some(
          (caller) =>
            caller?.transport === 'generated' && caller.mapping === 'resolved',
        )
        const manual = production.some(
          (caller) =>
            caller?.transport === 'manual' && caller.mapping === 'resolved',
        )
        const unresolved = production.some(
          (caller) =>
            caller?.transport === 'unresolved' ||
            caller?.mapping !== 'resolved',
        )
        if (
          adoption.analysis === 'complete' &&
          (unresolved || adoptionLimited([operation.id]))
        )
          fail(
            `Complete adoption analysis contains unresolved callers: ${operation.id}`,
          )
        if (
          production.some(
            (caller) => !caller?.operationIds.includes(operation.id),
          )
        )
          fail(`Caller does not reference adoption operation: ${operation.id}`)
        if (operation.adoption.state === 'generated-detected' && !generated)
          fail(`Generated adoption needs generated calls: ${operation.id}`)
        if (operation.adoption.state === 'manual' && (!manual || generated))
          fail(
            `Manual usage needs manual calls without detected generated calls: ${operation.id}`,
          )
        if (operation.adoption.state === 'mixed' && !(generated && manual))
          fail(`Mixed usage needs both transports: ${operation.id}`)
        if (
          operation.adoption.state === 'generated-only' &&
          (!generated || manual || unresolved)
        )
          fail(
            `Exclusive adoption has unresolved or manual callers: ${operation.id}`,
          )
        if (operation.adoption.state === 'generated-detected' && manual)
          fail(
            `Detected manual and generated calls must remain mixed: ${operation.id}`,
          )
        if (
          operation.adoption.state === 'no-calls' &&
          snapshot.callers.some(
            (caller) =>
              caller.kind === 'production' &&
              caller.operationIds.includes(operation.id),
          )
        )
          fail(`No-calls conflicts with production evidence: ${operation.id}`)
      }
      if (
        operation.webRelevance.state === 'relevant' &&
        operation.webRelevance.basis === 'production-caller' &&
        !snapshot.callers.some(
          (caller) =>
            caller.kind === 'production' &&
            caller.traffic === 'artemis-rest' &&
            caller.mapping === 'resolved' &&
            caller.operationIds.includes(operation.id),
        )
      )
        fail(
          `Web relevance needs a production caller or explicit metadata: ${operation.id}`,
        )
      if (
        operation.webRelevance.state === 'server-only' &&
        snapshot.callers.some(
          (caller) =>
            caller.kind === 'production' &&
            caller.traffic === 'artemis-rest' &&
            caller.operationIds.includes(operation.id),
        )
      )
        fail(`Server-only conflicts with a production caller: ${operation.id}`)
      if (operation.ownership.state === 'resolved') {
        const owner = modules.get(operation.ownership.moduleId)
        if (
          owner?.inventory.state === 'no-rest' ||
          (owner?.inventory.state === 'inventoried' &&
            !owner.inventory.operationIds.includes(operation.id))
        )
          fail(
            `Operation is absent from its owner's inventory: ${operation.id}`,
          )
      }
    }
    for (const method of snapshot.generatedMethods) {
      references(method.operationIds, operations, 'operation')
      if (method.identities) {
        const identityIds = method.identities.map(
          (identity) => `${identity.method} ${identity.path}`,
        )
        if (new Set(identityIds).size !== identityIds.length)
          fail(`Duplicate generated identity: ${method.id}`)
        if (
          method.mapping === 'resolved' &&
          (identityIds.length !== 1 ||
            identityIds[0] !== method.operationIds[0])
        )
          fail(
            `Resolved generated identity disagrees with server mapping: ${method.id}`,
          )
      }
    }
    for (const caller of snapshot.callers) {
      references(caller.operationIds, operations, 'operation')
      if (caller.generatedMethodId) {
        references([caller.generatedMethodId], methods, 'generated method')
        const method = methods.get(caller.generatedMethodId)
        if (
          caller.mapping === 'resolved' &&
          (method?.mapping !== 'resolved' ||
            !method.operationIds.includes(caller.operationIds[0]))
        )
          fail(`Caller and generated method disagree: ${caller.id}`)
      }
    }
    for (const diagnostic of snapshot.diagnostics) {
      references(diagnostic.moduleIds, modules, 'module')
      references(diagnostic.operationIds, operations, 'operation')
    }
    // These gates validate claims, not extraction. Later collectors must supply the evidence.
    const analyzedInputs = snapshot.provenance.inputs.filter(
      (input) => input.kind !== 'verification' && input.kind !== 'enforcement',
    )
    const validInputs = (kinds?: z.infer<typeof inputSchema>['kind'][]) =>
      analyzedInputs.length > 0 &&
      (!kinds ||
        kinds.every((kind) =>
          analyzedInputs.some((input) => input.kind === kind),
        )) &&
      analyzedInputs
        .filter((input) => !kinds || kinds.includes(input.kind))
        .every(
          (input) =>
            input.content.state === 'available' &&
            ((input.revision.state === 'known' &&
              input.revision.commit === snapshot.provenance.artemisCommit) ||
              (input.kind === 'configuration' &&
                input.revision.state === 'not-applicable')),
        )
    const inventoryComplete = (
      module: z.infer<typeof moduleAssessmentSchema>,
    ) =>
      module.inventory.state === 'no-rest' ||
      (module.inventory.state === 'inventoried' &&
        module.inventory.completeness === 'complete')
    const percentages = (
      measurements: z.infer<typeof measurementsSchema>,
      scopedOperations: z.infer<typeof operationSchema>[],
      complete: boolean,
    ) => {
      const spec = measurements.specificationCoverage
      const generated = measurements.generatedTransportCoverage
      const adoption = measurements.productionAdoption
      const unique = measurements.uniqueOperations
      if (measurements.specificationCounts) {
        for (const [state, value] of Object.entries(
          measurements.specificationCounts,
        )) {
          const expected = scopedOperations.filter((operation) =>
            state === 'unresolved'
              ? !['present', 'missing', 'ambiguous'].includes(
                  operation.specification.state,
                )
              : operation.specification.state === state,
          ).length
          if (
            value.state === 'measured' &&
            (value.value !== expected ||
              (value.completeness === 'complete' && !complete))
          )
            fail('Specification counts conflict with inventory or completeness')
        }
      }
      if (measurements.generatedTransportCounts) {
        for (const [state, value] of Object.entries(
          measurements.generatedTransportCounts,
        )) {
          const expected = scopedOperations.filter((operation) =>
            state === 'unresolved'
              ? !['available', 'missing', 'ambiguous'].includes(
                  operation.generatedTransport.state,
                )
              : operation.generatedTransport.state === state,
          ).length
          if (
            value.state === 'measured' &&
            (value.value !== expected ||
              (value.completeness === 'complete' && !complete))
          )
            fail(
              'Generated transport counts conflict with inventory or completeness',
            )
        }
      }
      if (
        unique.state === 'measured' &&
        (unique.value !== scopedOperations.length ||
          (unique.completeness === 'complete' && !complete))
      )
        fail('Unique-operation count conflicts with inventory or completeness')
      if (
        [spec, generated, adoption].some(
          (value) => value.state === 'eligible',
        ) &&
        (!complete ||
          scopedOperations.some(
            (operation) => operation.ownership.state !== 'resolved',
          ))
      )
        fail(
          'Eligible percentages need a complete independent inventory, resolved ownership and matching available inputs',
        )
      if (
        (spec.state === 'eligible' &&
          !validInputs(['server-source', 'specification', 'configuration'])) ||
        (generated.state === 'eligible' &&
          !validInputs([
            'server-source',
            'generated-client',
            'configuration',
          ])) ||
        (adoption.state === 'eligible' &&
          !validInputs([
            'server-source',
            'production-client',
            'generated-client',
            'configuration',
          ]))
      )
        fail(
          'Eligible percentages need all required matching available inputs for their measurement',
        )
      if (
        spec.state === 'eligible' &&
        (scopedOperations.some(
          (operation) =>
            !['present', 'missing'].includes(operation.specification.state),
        ) ||
          spec.denominator !== scopedOperations.length ||
          spec.numerator !==
            scopedOperations.filter(
              (operation) => operation.specification.state === 'present',
            ).length)
      )
        fail(
          'Specification percentage does not reconcile with the independent inventory',
        )
      if (
        generated.state === 'eligible' &&
        (scopedOperations.some(
          (operation) =>
            !['available', 'missing'].includes(
              operation.generatedTransport.state,
            ),
        ) ||
          generated.denominator !== scopedOperations.length ||
          generated.numerator !==
            scopedOperations.filter(
              (operation) => operation.generatedTransport.state === 'available',
            ).length)
      )
        fail(
          'Generated percentage does not reconcile with the independent inventory',
        )
      const relevant = scopedOperations.filter(
        (operation) => operation.webRelevance.state === 'relevant',
      )
      if (
        adoption.state === 'eligible' &&
        (adoptionLimited(scopedOperations.map((operation) => operation.id)) ||
          scopedOperations.some(
            (operation) =>
              !['relevant', 'server-only'].includes(
                operation.webRelevance.state,
              ),
          ) ||
          relevant.some(
            (operation) =>
              !('analysis' in operation.adoption) ||
              operation.adoption.analysis !== 'complete' ||
              operation.adoption.state === 'generated-detected',
          ) ||
          adoption.denominator !== relevant.length ||
          adoption.numerator !==
            relevant.filter(
              (operation) => operation.adoption.state === 'generated-only',
            ).length)
      )
        fail(
          'Adoption percentage needs complete web relevance and production analysis; mixed calls remain in the denominator',
        )
    }
    percentages(
      snapshot.measurements,
      snapshot.operations,
      snapshot.modules.every(inventoryComplete),
    )
    for (const module of snapshot.modules)
      percentages(
        module.measurements,
        module.inventory.state === 'inventoried'
          ? snapshot.operations.filter(
              (operation) =>
                module.inventory.state === 'inventoried' &&
                module.inventory.operationIds.includes(operation.id),
            )
          : [],
        inventoryComplete(module),
      )
    const validateCallCounts = (
      measurements: z.infer<typeof measurementsSchema>,
      operationIds?: string[],
    ) => {
      for (const bucket of ['generated', 'manual', 'unresolved'] as const) {
        const measurement = measurements[`${bucket}CallSites`]
        const observed = snapshot.callers.filter(
          (caller) =>
            callSiteBucket(caller) === bucket &&
            (!operationIds ||
              caller.operationIds.some((id) => operationIds.includes(id))),
        )
        if (
          measurement.state === 'measured' &&
          measurement.completeness === 'complete' &&
          adoptionLimited(
            operationIds ??
              snapshot.operations.map((operation) => operation.id),
          )
        )
          fail(
            'Complete call-site counts contain applicable unresolved source analysis',
          )
        if (
          measurement.state === 'measured' &&
          measurement.value !== observed.length
        )
          fail(`Call-site count disagrees with ${bucket} production records`)
      }
    }
    validateCallCounts(snapshot.measurements)
    for (const module of snapshot.modules)
      validateCallCounts(
        module.measurements,
        module.inventory.state === 'inventoried'
          ? module.inventory.operationIds
          : [],
      )
    const scoped = (scope: z.infer<typeof scopeSchema>) => {
      references(scope.moduleIds, modules, 'module')
      references(scope.operationIds, operations, 'operation')
      references(scope.callerIds, callers, 'caller')
    }
    for (const exception of snapshot.exceptions) scoped(exception.scope)
    for (const step of snapshot.nextSteps ?? []) scoped(step)
    if (
      snapshot.readiness &&
      new Set(snapshot.readiness.map((record) => record.moduleId)).size !==
        snapshot.readiness.length
    )
      fail('Duplicate module readiness assessment')
    for (const record of snapshot.readiness ?? []) {
      references([record.moduleId], modules, 'module')
      references(record.prerequisiteIds, nextSteps, 'next step')
      references(
        record.verificationIds,
        new Map((snapshot.verification ?? []).map((item) => [item.id, item])),
        'verification',
      )
      references(
        record.enforcementIds,
        new Map((snapshot.enforcement ?? []).map((item) => [item.id, item])),
        'enforcement',
      )
      const module = modules.get(record.moduleId)
      const scopedOperations = snapshot.operations.filter((operation) =>
        operation.ownership.state === 'resolved'
          ? operation.ownership.moduleId === record.moduleId
          : operation.ownership.candidateModuleIds.includes(record.moduleId),
      )
      const covers = (scope: z.infer<typeof scopeSchema>) =>
        scope.moduleIds.includes(record.moduleId) ||
        (scopedOperations.length > 0 &&
          scopedOperations.every((operation) =>
            scope.operationIds.includes(operation.id),
          ))
      if (
        (record.migration === 'not-applicable' ||
          record.protection === 'not-applicable') &&
        (module?.inventory.state !== 'no-rest' ||
          scopedOperations.length ||
          record.prerequisiteIds.length)
      )
        fail(
          `Not-applicable readiness needs an evidenced no-REST scope: ${record.moduleId}`,
        )
      if (
        ['candidate', 'verified'].includes(record.migration) ||
        ['candidate', 'protected'].includes(record.protection)
      ) {
        if (
          !module ||
          !inventoryComplete(module) ||
          !scopedOperations.length ||
          !validInputs([
            'server-source',
            'specification',
            'generated-client',
            'production-client',
            'configuration',
          ]) ||
          snapshot.callers.some(
            (caller) =>
              callSiteBucket(caller) === 'unresolved' &&
              (!caller.operationIds.length ||
                caller.operationIds.some((id) =>
                  scopedOperations.some((operation) => operation.id === id),
                )),
          ) ||
          scopedOperations.some(
            (operation) =>
              operation.ownership.state !== 'resolved' ||
              operation.specification.state !== 'present' ||
              (operation.webRelevance.state !== 'server-only' &&
                (operation.webRelevance.state !== 'relevant' ||
                  operation.generatedTransport.state !== 'available' ||
                  operation.adoption.state !== 'generated-only')),
          ) ||
          snapshot.exceptions.some(
            (exception) =>
              exception.scope.moduleIds.includes(record.moduleId) ||
              exception.scope.operationIds.some((id) =>
                scopedOperations.some((operation) => operation.id === id),
              ) ||
              exception.scope.callerIds.some((id) =>
                callers
                  .get(id)
                  ?.operationIds.some((operationId) =>
                    scopedOperations.some(
                      (operation) => operation.id === operationId,
                    ),
                  ),
              ),
          ) ||
          record.prerequisiteIds.some(
            (id) =>
              !['verification', 'enforcement'].includes(
                nextSteps.get(id)?.category ?? '',
              ),
          )
        )
          fail(
            `Candidate readiness has incomplete inventory, transport, adoption, inputs or exceptions: ${record.moduleId}`,
          )
      }
      if (
        (record.protection === 'protected' && record.prerequisiteIds.length) ||
        (record.migration === 'verified' &&
          record.prerequisiteIds.some(
            (id) => nextSteps.get(id)?.category !== 'enforcement',
          ))
      )
        fail(
          `Verified/protected scope still has prerequisites: ${record.moduleId}`,
        )
      if (
        record.migration === 'verified' &&
        !['wire-compatibility', 'runtime-flow'].every((kind) =>
          snapshot.verification?.some(
            (item) =>
              record.verificationIds.includes(item.id) &&
              item.kind === kind &&
              item.bindingStatus === 'matched' &&
              item.result === 'passed' &&
              covers(item.scope),
          ),
        )
      )
        fail(
          `Verified migration requires wire and runtime evidence: ${record.moduleId}`,
        )
      if (
        record.protection === 'protected' &&
        (record.migration !== 'verified' ||
          !snapshot.enforcement?.some(
            (item) =>
              record.enforcementIds.includes(item.id) &&
              item.bindingStatus === 'matched' &&
              item.state === 'enabled' &&
              item.coverage === 'complete' &&
              item.exclusions.length === 0 &&
              item.exceptionIds.length === 0 &&
              covers(item.scope) &&
              ['specification', 'manual-transport'].every((check) =>
                item.checks?.includes(
                  check as 'specification' | 'manual-transport',
                ),
              ),
          ))
      )
        fail(
          `Protected scope requires enabled complete enforcement without exclusions: ${record.moduleId}`,
        )
    }
    const hashes = Object.fromEntries(
      analyzedInputs.flatMap((input) =>
        input.content.state === 'available'
          ? [[input.id, input.content.sha256]]
          : [],
      ),
    )
    const matches = (binding: z.infer<typeof bindingSchema>) =>
      binding.artemisCommit === snapshot.provenance.artemisCommit &&
      Object.keys(hashes).length === analyzedInputs.length &&
      Object.keys(binding.inputHashes).length === analyzedInputs.length &&
      Object.entries(hashes).every(
        ([id, value]) => binding.inputHashes[id] === value,
      ) &&
      analyzedInputs.every(
        (input) =>
          (input.revision.state === 'known' &&
            input.revision.commit === binding.artemisCommit) ||
          (input.kind === 'configuration' &&
            input.revision.state === 'not-applicable'),
      )
    if (
      snapshot.provenance.generation.state === 'recorded' &&
      !matches(snapshot.provenance.generation.binding)
    )
      fail('Recorded generation must bind the analyzed revision and inputs')
    index(snapshot.verification ?? [], 'verification')
    index(snapshot.enforcement ?? [], 'enforcement')
    for (const record of [
      ...snapshot.exceptions,
      ...(snapshot.verification ?? []),
      ...(snapshot.enforcement ?? []),
    ]) {
      scoped(record.scope)
      if (record.bindingStatus === 'matched' && !matches(record.binding))
        fail(`Evidence binding mismatch: ${record.id}`)
      if ('exceptionIds' in record)
        references(record.exceptionIds, exceptions, 'exception')
    }
    // Validate every nested source reference, including diagnostics and external evidence.
    const locations = (value: unknown): void => {
      if (!value || typeof value !== 'object') return
      if ('inputId' in value && 'path' in value) {
        const location = value as z.infer<typeof sourceLocationSchema>
        const input = inputs.get(location.inputId)
        if (
          !input ||
          input.content.state !== 'available' ||
          !(
            location.path === input.path ||
            location.path.startsWith(`${input.path}/`)
          )
        )
          fail(`Source is not backed by an available input: ${location.path}`)
      }
      for (const child of Object.values(value)) locations(child)
    }
    locations(snapshot)
  })

export const manifestSchema = z
  .object({
    schemaVersion: z.literal(schemaVersion),
    generatedAt: date,
    snapshots: z
      .array(
        z
          .object({
            artemisCommit: commit,
            file: relativePath,
            sha256: hash,
            analyzerVersion: text,
            analyzedAt: date,
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.snapshots.map((snapshot) => snapshot.artemisCommit))
        .size === value.snapshots.length,
    'Duplicate snapshot revision',
  )

export type Manifest = z.infer<typeof manifestSchema>
export type Snapshot = z.infer<typeof snapshotSchema>
export type ModuleAssessment = z.infer<typeof moduleAssessmentSchema>
export type Operation = z.infer<typeof operationSchema>
export type GeneratedMethod = z.infer<typeof generatedMethodSchema>
export type Caller = z.infer<typeof callerSchema>
export type Diagnostic = z.infer<typeof diagnosticSchema>
export type Exception = z.infer<typeof exceptionSchema>
export type Verification = z.infer<typeof verificationSchema>
export type Enforcement = z.infer<typeof enforcementSchema>
export type NextStep = z.infer<typeof nextStepSchema>
export type Readiness = z.infer<typeof readinessSchema>
export type Provenance = z.infer<typeof provenanceSchema>
export type SourceLocation = z.infer<typeof sourceLocationSchema>
