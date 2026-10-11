import { scopeReport, ownersOf } from './scope'
import {
  callSiteBucket,
  type Snapshot,
  type NextStep,
  type Verification,
  type Enforcement,
} from './model'

const staticCategories = new Set<NextStep['category']>([
  'inventory',
  'specification',
  'generated-transport',
  'manual-transport',
  'unresolved-analysis',
  'web-relevance',
  'exception-review',
])

/** Candidates describe static prerequisites; verified/protected states need current external evidence. */
export function assessReadiness(snapshot: Snapshot) {
  const nextSteps: NextStep[] = []
  const add = (step: Omit<NextStep, 'id'>, key: string) => {
    const id = `${step.category}:${key}`
    if (!nextSteps.some((item) => item.id === id))
      nextSteps.push({ id, ...step })
    return id
  }
  for (const module of snapshot.modules) {
    if (
      module.inventory.state === 'limited' ||
      (module.inventory.state === 'inventoried' &&
        module.inventory.completeness !== 'complete')
    )
      add(
        {
          category: 'inventory',
          moduleIds: [module.id],
          operationIds: [],
          callerIds: [],
          evidence: module.inventory.evidence,
          reason: 'The independent server inventory is incomplete.',
          action:
            module.inventory.state === 'limited'
              ? module.inventory.nextStep
              : 'Resolve this module’s server extraction diagnostics and reconcile its complete potential-operation inventory.',
        },
        module.id,
      )
  }
  for (const operation of snapshot.operations) {
    const base = {
      moduleIds: ownersOf(operation),
      operationIds: [operation.id],
      callerIds: [],
      evidence: operation.variants.map((variant) => variant.handler),
    }
    if (operation.ownership.state !== 'resolved')
      add(
        {
          ...base,
          category: 'inventory',
          reason: 'Server ownership is ambiguous or unresolved.',
          action:
            'Reconcile handler ownership using a source-bound mapping override.',
        },
        `ownership:${operation.id}`,
      )
    if (operation.specification.state !== 'present')
      add(
        {
          ...base,
          category: 'specification',
          reason: `Specification coverage is ${operation.specification.state}.`,
          action:
            'Reconcile this handler with the specification and its generation profiles; add the missing contract or resolve its mapping diagnostic.',
        },
        operation.id,
      )
    if (
      operation.webRelevance.state !== 'server-only' &&
      operation.generatedTransport.state !== 'available'
    )
      add(
        {
          ...base,
          category: 'generated-transport',
          reason: `Generated transport is ${operation.generatedTransport.state}.`,
          action:
            'Reconcile the contract and generated implementation; generate the missing transport or resolve its ambiguous/unsupported mapping.',
        },
        operation.id,
      )
    if (!['relevant', 'server-only'].includes(operation.webRelevance.state))
      add(
        {
          ...base,
          category: 'web-relevance',
          reason:
            'Web relevance remains unassessed; absence of a caller does not establish server-only status.',
          action:
            'Find the production caller or supply explicit revision/input-bound web-relevance metadata.',
        },
        operation.id,
      )
    if (
      operation.webRelevance.state !== 'server-only' &&
      operation.adoption.state !== 'generated-only'
    )
      add(
        {
          ...base,
          category: 'unresolved-analysis',
          reason: 'Observed callers do not establish exclusive adoption.',
          action:
            'Review the supported-chain limits and unresolved calls before claiming a complete operation adoption assessment.',
        },
        `operation:${operation.id}`,
      )
  }
  for (const caller of snapshot.callers) {
    const bucket = callSiteBucket(caller)
    if (bucket !== 'manual' && bucket !== 'unresolved') continue
    add(
      {
        category:
          bucket === 'manual' ? 'manual-transport' : 'unresolved-analysis',
        moduleIds: [
          ...new Set(
            snapshot.operations
              .filter((operation) => caller.operationIds.includes(operation.id))
              .flatMap(ownersOf),
          ),
        ],
        operationIds: caller.operationIds,
        callerIds: [caller.id],
        evidence: [caller.location, ...caller.via],
        reason: caller.reason,
        action:
          bucket === 'manual'
            ? 'Replace this endpoint-specific handwritten transport with its generated API, preserving existing request/response behavior and verifying the affected flow.'
            : 'Inspect the receiver, arguments and recorded chain; extend focused analysis or provide supporting evidence without inventing an operation binding.',
      },
      `caller:${caller.id}`,
    )
  }
  for (const diagnostic of snapshot.diagnostics)
    add(
      {
        category:
          diagnostic.stage === 'provenance'
            ? 'provenance'
            : diagnostic.stage === 'verification'
              ? 'verification'
              : diagnostic.stage === 'enforcement'
                ? 'enforcement'
                : 'unresolved-analysis',
        moduleIds: diagnostic.moduleIds,
        operationIds: diagnostic.operationIds,
        callerIds: [],
        evidence: diagnostic.evidence,
        reason: diagnostic.reason,
        action: diagnostic.nextStep,
      },
      `diagnostic:${diagnostic.id}`,
    )
  for (const exception of snapshot.exceptions)
    add(
      {
        category: 'exception-review',
        ...exception.scope,
        evidence: exception.evidence,
        reason: `Transition exception ${exception.id} (${exception.bindingStatus ?? 'unknown'} binding): ${exception.reason}`,
        action: `Review when ${exception.reviewCondition}. Remove when ${exception.removalCondition}. The underlying manual/analysis work is still counted.`,
      },
      exception.id,
    )
  if (snapshot.provenance.generation.state !== 'recorded')
    add(
      {
        category: 'provenance',
        moduleIds: [],
        operationIds: [],
        callerIds: [],
        evidence: [snapshot.modules[0].roots[0]],
        reason:
          'The generator artifact/run used for committed output is unknown.',
        action:
          'Supply a matching generation-run record with actual artifact and input/output hashes; a declared version is insufficient.',
      },
      'generation',
    )

  snapshot.nextSteps = nextSteps
  snapshot.readiness = snapshot.modules.map((module) => {
    const scoped = scopeReport(snapshot, module.id)
    const notApplicable =
      module.inventory.state === 'no-rest' && !scoped.operations.length
    const scopeCovers = (record: Verification | Enforcement) =>
      record.scope.moduleIds.includes(module.id) ||
      (scoped.operations.length > 0 &&
        scoped.operations.every((operation) =>
          record.scope.operationIds.includes(operation.id),
        ))
    const verified = (kind: Verification['kind']) =>
      scoped.verification.filter(
        (record) =>
          record.kind === kind &&
          record.bindingStatus === 'matched' &&
          record.result === 'passed' &&
          scopeCovers(record),
      )
    const proof = [
      ...verified('wire-compatibility'),
      ...verified('runtime-flow'),
    ]
    const runtimeVerified =
      verified('wire-compatibility').length > 0 &&
      verified('runtime-flow').length > 0
    const rules = scoped.enforcement.filter(
      (record) =>
        record.bindingStatus === 'matched' &&
        record.state === 'enabled' &&
        record.coverage === 'complete' &&
        !record.exclusions.length &&
        !record.exceptionIds.length &&
        ['specification', 'manual-transport'].every((check) =>
          record.checks?.includes(
            check as 'specification' | 'manual-transport',
          ),
        ) &&
        scopeCovers(record),
    )
    const prerequisites = scoped.nextSteps
      .filter((step) => staticCategories.has(step.category))
      .map((step) => step.id)
    const inputs = snapshot.provenance.inputs.filter(
      (input) => !['verification', 'enforcement'].includes(input.kind),
    )
    if (
      !notApplicable &&
      (![
        'server-source',
        'specification',
        'generated-client',
        'production-client',
        'configuration',
      ].every((kind) => inputs.some((input) => input.kind === kind)) ||
        inputs.some(
          (input) =>
            input.content.state !== 'available' ||
            (input.revision.state === 'known'
              ? input.revision.commit !== snapshot.provenance.artemisCommit
              : !(
                  input.kind === 'configuration' &&
                  input.revision.state === 'not-applicable'
                )),
        ))
    )
      prerequisites.push(
        add(
          {
            category: 'inventory',
            moduleIds: [module.id],
            operationIds: [],
            callerIds: [],
            evidence: module.roots,
            reason: 'Inputs are unavailable, unknown or revision-mismatched.',
            action:
              'Collect matching committed server, specification, generated and production-client inputs before assessing readiness.',
          },
          `inputs:${module.id}`,
        ),
      )
    const staticReady = prerequisites.length === 0
    if (!notApplicable && !runtimeVerified)
      for (const kind of ['wire-compatibility', 'runtime-flow'] as const)
        if (!verified(kind).length)
          prerequisites.push(
            add(
              {
                category: 'verification',
                moduleIds: [module.id],
                operationIds: [],
                callerIds: [],
                evidence: module.roots,
                reason: `Current ${kind} evidence covering the whole server scope is unknown or insufficient.`,
                action: `Verify ${kind} for this module’s operations and cross-area callers; record the revision, all input hashes, scope and result. Client compilation alone cannot establish runtime migration.`,
              },
              `${kind}:${module.id}`,
            ),
          )
    if (!notApplicable && !rules.length)
      prerequisites.push(
        add(
          {
            category: 'enforcement',
            moduleIds: [module.id],
            operationIds: [],
            callerIds: [],
            evidence: module.roots,
            reason:
              'Enabled enforcement covering specification and manual transport, including cross-area callers, is unknown, incomplete or excluded.',
            action:
              'Record enabled rules with matching inputs, complete explicit scope, covered checks and reviewed exclusions/exceptions before claiming protection.',
          },
          module.id,
        ),
      )
    return {
      moduleId: module.id,
      migration: notApplicable
        ? ('not-applicable' as const)
        : !staticReady
          ? ('blocked' as const)
          : runtimeVerified
            ? ('verified' as const)
            : ('candidate' as const),
      protection: notApplicable
        ? ('not-applicable' as const)
        : !staticReady
          ? ('blocked' as const)
          : runtimeVerified && rules.length
            ? ('protected' as const)
            : ('candidate' as const),
      prerequisiteIds: notApplicable ? [] : [...new Set(prerequisites)],
      verificationIds: proof.map((record) => record.id),
      enforcementIds: rules.map((record) => record.id),
      evidence: module.roots,
      reason: notApplicable
        ? 'This evidenced server scope has no REST operations to migrate or protect.'
        : !staticReady
          ? 'Remaining source/contract/transport/relevance/exception work prevents a migration or protection candidate.'
          : runtimeVerified
            ? 'Static prerequisites and current wire/runtime evidence are satisfied; protection additionally requires complete enabled enforcement.'
            : 'Static prerequisites suggest a candidate; runtime/wire verification and enabled enforcement remain separate prerequisites.',
    }
  })
  snapshot.nextSteps.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
