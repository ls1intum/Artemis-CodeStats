import { z } from 'zod'
import {
  bindingSchema,
  exceptionSchema,
  verificationSchema,
  enforcementSchema,
  sourceLocationSchema,
  type Snapshot,
  type SourceLocation,
} from '../../src/features/openapi/model'

export const assessmentEvidenceSchema = z
  .object({
    version: z.literal(1),
    exceptions: z.array(exceptionSchema),
    verification: z.array(
      verificationSchema.extend({
        bindingStatus: verificationSchema.shape.bindingStatus.optional(),
      }),
    ),
    enforcement: z.array(
      enforcementSchema.extend({
        bindingStatus: enforcementSchema.shape.bindingStatus.optional(),
      }),
    ),
    webRelevance: z.array(
      z
        .object({
          operationId: z.string().min(1),
          binding: bindingSchema,
          state: z.enum(['relevant', 'server-only']),
          reason: z.string().trim().min(1),
          evidence: z.array(sourceLocationSchema).min(1),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((document, ctx) => {
    for (const records of [
      document.exceptions,
      document.verification,
      document.enforcement,
    ])
      if (new Set(records.map((record) => record.id)).size !== records.length)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate evidence record id',
        })
    if (
      new Set(document.webRelevance.map((record) => record.operationId))
        .size !== document.webRelevance.length
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate web relevance scope',
      })
  })
export type AssessmentEvidence = z.infer<typeof assessmentEvidenceSchema>

export function bindingStatus(
  snapshot: Snapshot,
  binding: z.infer<typeof bindingSchema>,
): 'matched' | 'mismatched' | 'unknown' {
  const inputs = snapshot.provenance.inputs.filter(
    (input) => !['verification', 'enforcement'].includes(input.kind),
  )
  if (binding.artemisCommit !== snapshot.provenance.artemisCommit)
    return 'mismatched'
  if (
    !inputs.length ||
    inputs.some(
      (input) =>
        input.content.state !== 'available' ||
        input.revision.state === 'unknown',
    )
  )
    return 'unknown'
  const hashes = Object.fromEntries(
    inputs.flatMap((input) =>
      input.content.state === 'available'
        ? [[input.id, input.content.sha256]]
        : [],
    ),
  )
  return Object.keys(hashes).length ===
    Object.keys(binding.inputHashes).length &&
    inputs.every(
      (input) =>
        binding.inputHashes[input.id] === hashes[input.id] &&
        ((input.revision.state === 'known' &&
          input.revision.commit === binding.artemisCommit) ||
          (input.kind === 'configuration' &&
            input.revision.state === 'not-applicable')),
    )
    ? 'matched'
    : 'mismatched'
}

/** Claimed status in an external document is never trusted; compute it from the analyzed inputs. */
export function applyEvidence(
  snapshot: Snapshot,
  document: AssessmentEvidence,
  anchor: SourceLocation,
) {
  const validLocation = (location: SourceLocation) =>
    snapshot.provenance.inputs.some(
      (input) =>
        input.id === location.inputId &&
        input.content.state === 'available' &&
        (location.path === input.path ||
          location.path.startsWith(`${input.path}/`)),
    )
  const validScope = (scope: {
    moduleIds: string[]
    operationIds: string[]
    callerIds: string[]
  }) =>
    scope.moduleIds.every((id) =>
      snapshot.modules.some((module) => module.id === id),
    ) &&
    scope.operationIds.every((id) =>
      snapshot.operations.some((operation) => operation.id === id),
    ) &&
    scope.callerIds.every((id) =>
      snapshot.callers.some((caller) => caller.id === id),
    )
  const diagnostic = (
    stage: 'verification' | 'enforcement' | 'provenance',
    id: string,
    reason: string,
  ) =>
    snapshot.diagnostics.push({
      id: `${stage}:evidence:${id}`,
      stage,
      severity: 'warning',
      moduleIds: [],
      operationIds: [],
      evidence: [anchor],
      reason,
      nextStep:
        'Review this evidence record, update its scope and revision/input hashes, and rerun the collector; stale or unavailable evidence cannot establish success.',
    })
  for (const [kind, records] of [
    ['exceptions', document.exceptions],
    ['verification', document.verification],
    ['enforcement', document.enforcement],
  ] as const) {
    for (const record of records) {
      const stage = kind === 'exceptions' ? 'provenance' : kind
      if (!validScope(record.scope) || !record.evidence.every(validLocation)) {
        diagnostic(
          stage,
          `${kind}:${record.id}:unapplied`,
          `Unapplied ${kind} record ${record.id}: scope or source evidence is absent from the analyzed inputs.`,
        )
        continue
      }
      const status = bindingStatus(snapshot, record.binding)
      if (status !== 'matched')
        diagnostic(
          stage,
          `${kind}:${record.id}:binding`,
          `${kind} record ${record.id} has ${status} revision/input binding; its claimed result is not current evidence.`,
        )
      if (kind === 'exceptions')
        snapshot.exceptions.push({
          ...record,
          bindingStatus: status,
        } as Snapshot['exceptions'][number])
      else if (kind === 'verification')
        (snapshot.verification ??= []).push({
          ...record,
          bindingStatus: status,
        } as NonNullable<Snapshot['verification']>[number])
      else
        (snapshot.enforcement ??= []).push({
          ...record,
          bindingStatus: status,
        } as NonNullable<Snapshot['enforcement']>[number])
    }
  }
  for (const record of document.webRelevance) {
    const operation = snapshot.operations.find(
      (operation) => operation.id === record.operationId,
    )
    if (
      !operation ||
      bindingStatus(snapshot, record.binding) !== 'matched' ||
      !record.evidence.every(validLocation)
    ) {
      diagnostic(
        'provenance',
        `web-relevance:${record.operationId}:unapplied`,
        `Unapplied web-relevance metadata for ${record.operationId}: missing scope, source evidence or matching revision/input binding.`,
      )
    } else if (
      record.state === 'server-only' &&
      operation.webRelevance.state === 'relevant' &&
      operation.webRelevance.basis === 'production-caller'
    ) {
      diagnostic(
        'provenance',
        `web-relevance:${record.operationId}:conflict`,
        `Server-only metadata conflicts with a detected production caller for ${record.operationId}; caller evidence is retained.`,
      )
    } else
      operation.webRelevance =
        record.state === 'relevant'
          ? {
              state: 'relevant',
              basis: 'explicit-metadata',
              evidence: record.evidence,
            }
          : {
              state: 'server-only',
              reason: record.reason,
              evidence: record.evidence,
            }
  }
  // An enforcement rule cannot hide an unknown/unapplied exception reference.
  snapshot.enforcement = snapshot.enforcement?.filter((record) => {
    if (
      record.exceptionIds.every((id) =>
        snapshot.exceptions.some((exception) => exception.id === id),
      )
    )
      return true
    diagnostic(
      'enforcement',
      `${record.id}:exception-reference`,
      `Unapplied enforcement record ${record.id}: an exception reference is unavailable.`,
    )
    return false
  })
}
