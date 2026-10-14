import type { ModuleAssessment, NextStep, Snapshot } from './model'
import { scopeReport } from './scope'

export type ReportScope = ReturnType<typeof scopeReport>

/** Counts of observed identities, never an inferred complete denominator. */
export function coverageRows(scope: ReportScope) {
  return [
    {
      name: 'Specification',
      states: scope.counts.specification,
      positive: 'present',
    },
    {
      name: 'Generated transport',
      states: scope.counts.generatedTransport,
      positive: 'available',
    },
  ].map(({ name, states, positive }) => ({
    name,
    available: states[positive] ?? 0,
    missing: states.missing ?? 0,
    ambiguous: states.ambiguous ?? 0,
    unassessed: Object.entries(states)
      .filter(([state]) => ![positive, 'missing', 'ambiguous'].includes(state))
      .reduce((total, [, count]) => total + count, 0),
    states,
  }))
}

export function productionRows(measurements: Snapshot['measurements']) {
  return [
    {
      name: 'Generated',
      key: 'generated',
      measurement: measurements.generatedCallSites,
    },
    {
      name: 'Handwritten',
      key: 'manual',
      measurement: measurements.manualCallSites,
    },
    {
      name: 'Unresolved',
      key: 'unresolved',
      measurement: measurements.unresolvedCallSites,
    },
  ].map(({ name, key, measurement }) => ({
    name,
    key,
    value: measurement.state === 'measured' ? measurement.value : undefined,
    measurement,
  }))
}

/** Caller-only records retain their endpoint ownership; unbound callers stay shared. */
export function partitionWork(snapshot: Snapshot, steps: NextStep[]) {
  const callers = new Map(snapshot.callers.map((caller) => [caller.id, caller]))
  const attributed: NextStep[] = []
  const shared: NextStep[] = []
  for (const step of new Map(steps.map((step) => [step.id, step])).values()) {
    const bound =
      step.moduleIds.length ||
      step.operationIds.length ||
      step.callerIds.some((id) => callers.get(id)?.operationIds.length)
    if (bound) attributed.push(step)
    else shared.push(step)
  }
  return { attributed, shared }
}

const groups: {
  id: string
  label: string
  categories: NextStep['category'][]
}[] = [
  {
    id: 'contracts',
    label: 'Missing contracts',
    categories: ['specification'],
  },
  {
    id: 'transport',
    label: 'Missing generated transport',
    categories: ['generated-transport'],
  },
  {
    id: 'manual',
    label: 'Handwritten calls',
    categories: ['manual-transport'],
  },
  {
    id: 'analysis',
    label: 'Analysis and relevance limitations',
    categories: [
      'inventory',
      'unresolved-analysis',
      'web-relevance',
      'provenance',
    ],
  },
  {
    id: 'exceptions',
    label: 'Exception reviews',
    categories: ['exception-review'],
  },
  { id: 'verification', label: 'Verification', categories: ['verification'] },
  { id: 'enforcement', label: 'Enforcement', categories: ['enforcement'] },
]

export function workGroups(steps: NextStep[]) {
  return groups
    .map((group) => ({
      ...group,
      steps: steps.filter((step) => group.categories.includes(step.category)),
    }))
    .filter((group) => group.steps.length)
}

export function moduleRows(snapshot: Snapshot, modules: ModuleAssessment[]) {
  const sharedIds = new Set(
    partitionWork(snapshot, snapshot.nextSteps ?? []).shared.map(
      (step) => step.id,
    ),
  )
  return modules.map((module) => {
    const scope = scopeReport(snapshot, module.id)
    const inventory = module.measurements.uniqueOperations
    const readiness = scope.readiness[0]
    return {
      module,
      coverage: coverageRows(scope),
      mixed: scope.counts.adoption.mixed ?? 0,
      readiness,
      sharedWarning:
        readiness?.prerequisiteIds.some((id) => sharedIds.has(id)) ?? false,
      operations: inventory.state === 'measured' ? inventory.value : undefined,
      missing:
        inventory.state === 'measured' && scope.operations.length
          ? (scope.counts.specification.missing ?? 0)
          : undefined,
      manual:
        module.measurements.manualCallSites.state === 'measured'
          ? module.measurements.manualCallSites.value
          : undefined,
    }
  })
}

export type ModuleSort = 'id' | 'operations' | 'missing' | 'manual'
export function sortModules(
  rows: ReturnType<typeof moduleRows>,
  key: ModuleSort,
  descending: boolean,
) {
  return [...rows].sort((a, b) => {
    const tie = a.module.id.localeCompare(b.module.id)
    if (key === 'id') return descending ? -tie : tie
    const left = a[key],
      right = b[key]
    if (left === undefined) return right === undefined ? tie : 1
    if (right === undefined) return -1
    return (descending ? right - left : left - right) || tie
  })
}
