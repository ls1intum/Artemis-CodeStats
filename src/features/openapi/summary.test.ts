import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { openApiFixture } from '../../../tests/fixtures/openapi'
import type { NextStep, Snapshot } from './model'
import { scopeReport } from './scope'
import {
  coverageRows,
  moduleRows,
  partitionWork,
  productionRows,
  sortModules,
  workGroups,
} from './summary'

test('coverage charts conserve known unique operations and retain unassessed states', () => {
  const snapshot = openApiFixture()
  const rows = coverageRows(scopeReport(snapshot))
  for (const row of rows) {
    assert.equal(row.available, 2)
    assert.equal(row.unassessed, 1)
    assert.equal(
      row.available + row.missing + row.ambiguous + row.unassessed,
      3,
    )
  }
  assert.equal(rows[0].states.unknown, 1)
  assert.equal(rows[1].states.unassessed, 1)
  snapshot.operations[0].specification = {
    state: 'missing',
    evidence: snapshot.modules[0].roots,
    reason: 'Missing contract',
  }
  snapshot.operations[1].generatedTransport = {
    state: 'ambiguous',
    methodIds: ['Api.beta'],
    evidence: snapshot.modules[1].roots,
    reason: 'Ambiguous implementation',
  }
  assert.equal(coverageRows(scopeReport(snapshot))[0].missing, 1)
  assert.equal(coverageRows(scopeReport(snapshot))[1].ambiguous, 1)
})

test('call charts preserve unavailable evidence, measured zero and excluded wrapper counts', () => {
  const snapshot = openApiFixture(true)
  assert.deepEqual(
    productionRows(snapshot.measurements).map((row) => row.value),
    [2, 1, 1],
  )
  assert.deepEqual(
    productionRows(snapshot.modules[1].measurements).map((row) => row.value),
    [1, 0, 0],
  )
  snapshot.measurements.generatedCallSites = {
    state: 'unknown',
    reason: 'Generated analysis unavailable',
  }
  assert.equal(productionRows(snapshot.measurements)[0].value, undefined)
  assert.equal(
    productionRows(snapshot.measurements)[0].measurement.state,
    'unknown',
  )
  assert.equal(
    snapshot.callers.filter(
      (caller) => caller.kind === 'wrapper-implementation',
    ).length,
    1,
  )
})

test('module comparisons keep mixed use, cross-area calls, shared warnings and unknowns last when sorting', () => {
  const snapshot = openApiFixture(true)
  const rows = moduleRows(snapshot, snapshot.modules)
  const alpha = rows.find((row) => row.module.id === 'alpha')!
  const beta = rows.find((row) => row.module.id === 'beta')!
  assert.equal(alpha.mixed, 1)
  assert.equal(alpha.manual, 1)
  assert.equal(beta.manual, 0)
  assert.equal(beta.sharedWarning, true)
  assert.equal(beta.readiness?.migration, 'blocked')
  assert.equal(
    snapshot.callers.find((caller) => caller.id === 'alpha-manual')?.area,
    'core',
  )
  for (const descending of [false, true])
    assert.equal(
      sortModules(rows, 'operations', descending).at(-1)?.module.id,
      'limited',
    )
  assert.equal(sortModules(rows, 'manual', true)[0].module.id, 'alpha')
  assert.equal(sortModules(rows, 'operations', true)[0].module.id, 'alpha')
  const shared = rows.find((row) => row.module.id === 'shared-ui')!
  assert.equal(shared.readiness?.migration, 'not-applicable')
  assert.equal(shared.operations, 0)
})

test('work partition follows caller bindings and groups preserve every record and overlapping categories', () => {
  const snapshot = openApiFixture(true)
  const step = (
    id: string,
    category: NextStep['category'],
    callerIds: string[],
  ): NextStep => ({
    id,
    category,
    callerIds,
    moduleIds: [],
    operationIds: [],
    evidence: snapshot.modules[0].roots,
    reason: 'Source-bound record',
    action: 'Review source',
  })
  const bound = step('bound', 'manual-transport', ['alpha-manual'])
  const unbound = step('unbound', 'unresolved-analysis', ['unassigned'])
  const global = step('global', 'provenance', [])
  const overlap = { ...bound, id: 'overlap', category: 'verification' as const }
  const parts = partitionWork(snapshot, [
    bound,
    unbound,
    global,
    overlap,
    bound,
  ])
  assert.deepEqual(
    parts.attributed.map((record) => record.id),
    ['bound', 'overlap'],
  )
  assert.deepEqual(
    parts.shared.map((record) => record.id),
    ['unbound', 'global'],
  )
  const all = workGroups([...parts.attributed, ...parts.shared]).flatMap(
    (group) => group.steps,
  )
  assert.deepEqual(all.map((record) => record.id).sort(), [
    'bound',
    'global',
    'overlap',
    'unbound',
  ])
  assert.ok(all.some((record) => record.category === 'provenance'))
  assert.ok(all.some((record) => record.category === 'verification'))
})

test('calendar separates shared limitations from its own records without changing readiness or source evidence', () => {
  const snapshot: Snapshot = JSON.parse(
    readFileSync(
      new URL(
        '../../../public/openapi/1e68e12f48e2992df7ba2fdc3046a025381e5e0b.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  const scope = scopeReport(snapshot, 'calendar')
  const record = scope.readiness[0]
  const original = JSON.stringify(record)
  const prerequisites = scope.nextSteps.filter((step) =>
    record.prerequisiteIds.includes(step.id),
  )
  const parts = partitionWork(snapshot, prerequisites)
  assert.equal(prerequisites.length, 792)
  assert.equal(parts.shared.length, 777)
  assert.equal(parts.attributed.length, 15)
  const groups = workGroups(parts.shared)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].id, 'analysis')
  assert.deepEqual(
    new Set([...parts.attributed, ...parts.shared].map((step) => step.id)),
    new Set(record.prerequisiteIds),
  )
  assert.ok(
    [...parts.attributed, ...parts.shared].every(
      (step) => step.evidence.length,
    ),
  )
  assert.equal(JSON.stringify(record), original)
  assert.equal(record.migration, 'blocked')
})
