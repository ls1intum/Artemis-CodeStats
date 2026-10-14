import {
  callSiteBucket,
  type Snapshot,
  type Operation,
  type Caller,
} from './model'

export const ownersOf = (operation: Operation) =>
  operation.ownership.state === 'resolved'
    ? [operation.ownership.moduleId]
    : operation.ownership.candidateModuleIds

export function callersForOperations(
  callers: Caller[],
  operations: Operation[],
  global = false,
) {
  const ids = new Set(operations.map((operation) => operation.id))
  return callers.filter(
    (caller) => global || caller.operationIds.some((id) => ids.has(id)),
  )
}

/** Scope by server ownership; caller directories are deliberately independent. */
export function scopeReport(snapshot: Snapshot, moduleId?: string) {
  if (moduleId && !snapshot.modules.some((module) => module.id === moduleId))
    throw new Error(`Unknown OpenAPI module: ${moduleId}`)
  const modules = snapshot.modules.filter(
    (module) => !moduleId || module.id === moduleId,
  )
  const operations = snapshot.operations.filter(
    (operation) => !moduleId || ownersOf(operation).includes(moduleId),
  )
  const callers = callersForOperations(snapshot.callers, operations, !moduleId)
  const operationIds = new Set(operations.map((operation) => operation.id))
  const callerIds = new Set(callers.map((caller) => caller.id))
  const unscopedCallers = snapshot.callers.filter(
    (caller) =>
      caller.kind === 'production' &&
      callSiteBucket(caller) === 'unresolved' &&
      !caller.operationIds.length,
  )
  const unscopedCallerIds = new Set(unscopedCallers.map((caller) => caller.id))
  const intersects = (scope: {
    moduleIds: string[]
    operationIds: string[]
    callerIds?: string[]
  }) =>
    !moduleId ||
    (!scope.moduleIds.length &&
      !scope.operationIds.length &&
      (!scope.callerIds?.length ||
        scope.callerIds.some((id) => unscopedCallerIds.has(id)))) ||
    scope.moduleIds.includes(moduleId) ||
    scope.operationIds.some((id) => operationIds.has(id)) ||
    scope.callerIds?.some((id) => callerIds.has(id))
  const diagnostics = snapshot.diagnostics.filter(intersects)
  const nextSteps = (snapshot.nextSteps ?? []).filter(intersects)
  const states = (key: 'specification' | 'generatedTransport' | 'adoption') =>
    Object.fromEntries(
      [...new Set(operations.map((operation) => operation[key].state))]
        .sort()
        .map((state) => [
          state,
          operations.filter((operation) => operation[key].state === state)
            .length,
        ]),
    )
  return {
    modules,
    operations,
    callers,
    diagnostics,
    nextSteps,
    unscopedCallers: moduleId ? unscopedCallers : [],
    generatedMethods: snapshot.generatedMethods.filter(
      (method) =>
        !moduleId || method.operationIds.some((id) => operationIds.has(id)),
    ),
    exceptions: snapshot.exceptions.filter((record) =>
      intersects(record.scope),
    ),
    verification: (snapshot.verification ?? []).filter((record) =>
      intersects(record.scope),
    ),
    enforcement: (snapshot.enforcement ?? []).filter((record) =>
      intersects(record.scope),
    ),
    readiness: (snapshot.readiness ?? []).filter(
      (record) => !moduleId || record.moduleId === moduleId,
    ),
    counts: {
      uniqueOperations: operations.length,
      generatedCallSites: callers.filter(
        (caller) => callSiteBucket(caller) === 'generated',
      ).length,
      manualCallSites: callers.filter(
        (caller) => callSiteBucket(caller) === 'manual',
      ).length,
      unresolvedCallSites: callers.filter(
        (caller) => callSiteBucket(caller) === 'unresolved',
      ).length,
      specification: states('specification'),
      generatedTransport: states('generatedTransport'),
      adoption: states('adoption'),
    },
  }
}
