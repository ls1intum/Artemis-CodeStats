import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { ModuleAssessment, Snapshot } from './model'
import { Evidence, Section, State } from './presentation'
import {
  coverageRows,
  moduleRows,
  productionRows,
  partitionWork,
  sortModules,
  type ModuleSort,
  type ReportScope,
} from './summary'

const number = (value: number) => value.toLocaleString('en-US')
const count = (value: Snapshot['measurements']['uniqueOperations']) =>
  value.state === 'measured'
    ? `${number(value.value)}${value.completeness === 'incomplete-analysis' ? ' (partial)' : ''}`
    : value.state
const percentage = (value: Snapshot['measurements']['productionAdoption']) =>
  value.state === 'eligible'
    ? `${Math.round((value.numerator / value.denominator) * 100)}% (${number(value.numerator)}/${number(value.denominator)})`
    : value.state

export function SnapshotSummary({
  snapshot,
  scope,
  module,
  onEvidence,
}: {
  snapshot: Snapshot
  scope: ReportScope
  module?: ModuleAssessment
  onEvidence: () => void
}) {
  const measurements = module?.measurements ?? snapshot.measurements
  const partial = [
    measurements.uniqueOperations,
    ...productionRows(measurements).map((row) => row.measurement),
  ].some(
    (value) => value.state !== 'measured' || value.completeness !== 'complete',
  )
  const sharedIds = new Set(
    partitionWork(snapshot, scope.nextSteps).shared.map((step) => step.id),
  )
  const sharedWarning = scope.readiness.some((record) =>
    record.prerequisiteIds.some((id) => sharedIds.has(id)),
  )
  return (
    <Section title="Inventory and analysis coverage">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ['Unique operations', measurements.uniqueOperations],
            [
              'Generated production call sites',
              measurements.generatedCallSites,
            ],
            ['Manual production call sites', measurements.manualCallSites],
            [
              'Unresolved production call sites',
              measurements.unresolvedCallSites,
            ],
          ] as const
        ).map(([title, value]) => (
          <div key={title} className="rounded-md border p-3">
            <h3 className="text-sm text-muted-foreground">{title}</h3>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {value.state === 'measured' ? number(value.value) : value.state}
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {scope.modules.length} module/area assessments ·{' '}
        {scope.generatedMethods.length} generated methods ·{' '}
        {partial
          ? 'Partial static observations; completion is not established.'
          : 'Static observations; runtime verification is separate.'}{' '}
        {sharedWarning && 'Shared uncertainty still constrains readiness. '}
        <Button variant="link" className="h-auto p-0" onClick={onEvidence}>
          Analysis details
        </Button>
      </p>
    </Section>
  )
}

const coverageConfig = {
  available: { label: 'Present / available', color: 'var(--chart-2)' },
  missing: { label: 'Missing', color: 'var(--color-remaining)' },
  ambiguous: { label: 'Ambiguous', color: 'var(--chart-3)' },
  unassessed: { label: 'Unassessed', color: 'var(--muted-foreground)' },
}
const callConfig = {
  generated: { label: 'Generated', color: 'var(--chart-2)' },
  manual: { label: 'Handwritten', color: 'var(--color-remaining)' },
  unresolved: { label: 'Unresolved', color: 'var(--muted-foreground)' },
}

export function Overview({
  snapshot,
  scope,
  module,
}: {
  snapshot: Snapshot
  scope: ReportScope
  module?: ModuleAssessment
}) {
  const measurements = module?.measurements ?? snapshot.measurements
  const coverage = coverageRows(scope)
  const calls = productionRows(measurements)
  const knownInventory = measurements.uniqueOperations.state === 'measured'
  const noRest = module?.inventory.state === 'no-rest'
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2">
      <Section
        title="Operation coverage"
        description="Counts of known unique operations. Specification and generated transport are assessed separately."
      >
        {knownInventory && scope.operations.length > 0 ? (
          <>
            <ChartContainer
              config={coverageConfig}
              className="h-44 w-full aspect-auto"
              aria-hidden="true"
            >
              <BarChart
                data={coverage}
                layout="vertical"
                margin={{ left: 0, right: 12, top: 8, bottom: 8 }}
                accessibilityLayer={false}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {Object.keys(coverageConfig).map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="coverage"
                    fill={`var(--color-${key})`}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ChartContainer>
            <div className="relative overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <caption className="sr-only">Operation coverage counts</caption>
                <thead>
                  <tr>
                    <th scope="col">Operations</th>
                    {Object.entries(coverageConfig).map(([key, value]) => (
                      <th key={key} scope="col" className="p-1 text-right">
                        <span
                          className="mr-1 inline-block h-2 w-2 rounded-sm"
                          style={{ backgroundColor: value.color }}
                        />
                        {value.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((row) => (
                    <tr key={row.name}>
                      <th scope="row" className="py-2 font-medium">
                        {row.name}
                      </th>
                      {(
                        Object.keys(
                          coverageConfig,
                        ) as (keyof typeof coverageConfig)[]
                      ).map((key) => (
                        <td key={key} className="p-1 text-right">
                          {number(row[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              {measurements.uniqueOperations.state === 'measured' &&
              measurements.uniqueOperations.completeness !== 'complete'
                ? 'Partial inventory; these counts are lower bounds. '
                : ''}
              Unassessed includes unknown or incomplete mappings.
            </p>
          </>
        ) : (
          <p className="text-sm">
            {noRest
              ? 'No owned REST operations in the evidenced scope. This area can still call other modules.'
              : 'Operation inventory is unavailable or unassessed; no coverage chart can be established.'}
          </p>
        )}
        <div className="grid gap-1 text-sm">
          <p>
            Specification coverage:{' '}
            {percentage(measurements.specificationCoverage)}
          </p>
          <p>
            Generated transport coverage:{' '}
            {percentage(measurements.generatedTransportCoverage)}
          </p>
        </div>
      </Section>
      <Section
        title="Detected production calls"
        description="Call-site counts, not operation counts or a runtime migration percentage. Wrapper implementations are excluded."
      >
        {!noRest &&
          calls.some((row) => row.value !== undefined && row.value > 0) && (
            <ChartContainer
              config={callConfig}
              className="h-44 w-full aspect-auto"
              aria-hidden="true"
            >
              <BarChart
                data={calls.filter((row) => row.value !== undefined)}
                layout="vertical"
                margin={{ left: 0, right: 42, top: 8, bottom: 8 }}
                accessibilityLayer={false}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
                <Bar dataKey="value" isAnimationActive={false}>
                  {calls
                    .filter((row) => row.value !== undefined)
                    .map((row) => (
                      <Cell
                        key={row.key}
                        fill={
                          callConfig[row.key as keyof typeof callConfig].color
                        }
                      />
                    ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={number}
                    fill="var(--foreground)"
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        {noRest ? (
          <p className="text-sm">
            No owned REST scope for this comparison. Calls from this client area
            may target other modules.
          </p>
        ) : (
          <dl className="grid grid-cols-3 gap-2 text-sm">
            {calls.map((row) => (
              <div key={row.key}>
                <dt className="text-muted-foreground">{row.name}</dt>
                <dd className="font-semibold tabular-nums">
                  {count(row.measurement)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {!noRest && calls.every((row) => row.value === 0) && (
          <p className="text-sm">
            No production calls were detected in this scope; this does not
            establish migration or server-only status.
          </p>
        )}
        <p className="text-sm">
          Production adoption: {percentage(measurements.productionAdoption)}
        </p>
        {scope.unscopedCallers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Unassigned calls remain shared uncertainty and are excluded from
            this module’s counts. See Callers.
          </p>
        )}
      </Section>
    </div>
  )
}

export function Modules({
  snapshot,
  modules,
  onSelect,
}: {
  snapshot: Snapshot
  modules: ModuleAssessment[]
  onSelect: (id: string) => void
}) {
  const [sort, setSort] = useState<ModuleSort>('id')
  const [descending, setDescending] = useState(false)
  const rows = useMemo(() => moduleRows(snapshot, modules), [snapshot, modules])
  const sorted = sortModules(rows, sort, descending)
  const headers: [ModuleSort, string][] = [
    ['id', 'Module'],
    ['operations', 'Unique operations'],
    ['missing', 'Specification'],
    ['manual', 'Production calls'],
  ]
  const sortable = (key: ModuleSort, title: string) => (
    <th
      scope="col"
      className="p-2"
      aria-sort={
        sort === key ? (descending ? 'descending' : 'ascending') : 'none'
      }
    >
      <Button
        variant="ghost"
        className="relative h-auto px-0 py-1 text-left"
        onClick={() => {
          setSort(key)
          setDescending(sort === key ? !descending : key !== 'id')
        }}
      >
        {title}
        {key === 'missing' && (
          <span className="sr-only">
            : sort by missing specification operations
          </span>
        )}
        {key === 'manual' && (
          <span className="sr-only">: sort by handwritten calls</span>
        )}
      </Button>
    </th>
  )
  return (
    <Section
      title="All module assessments"
      description="Compare known coverage and detected calls by server owner. Shared and client-only areas remain visible; no overall completion score is inferred."
    >
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <caption className="sr-only">OpenAPI module inventory</caption>
          <thead>
            <tr>
              {sortable(...headers[0])}
              {sortable(...headers[1])}
              {sortable(...headers[2])}
              <th scope="col" className="p-2">
                Generated transport
              </th>
              {sortable(...headers[3])}
              <th scope="col" className="p-2">
                Assessment
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.module.id} className="border-t align-top">
                <td className="p-2">
                  <Button
                    variant="link"
                    className="h-auto px-0 py-1"
                    onClick={() => onSelect(row.module.id)}
                  >
                    {row.module.id}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {row.module.role}
                  </p>
                </td>
                <td className="p-2 tabular-nums">
                  {count(row.module.measurements.uniqueOperations)}
                </td>
                {row.coverage.map((coverage, index) => (
                  <td key={coverage.name} className="p-2">
                    {row.module.inventory.state === 'no-rest' ? (
                      <span>No owned REST</span>
                    ) : row.operations === undefined ? (
                      <State
                        value={row.module.measurements.uniqueOperations.state}
                      />
                    ) : (
                      <>
                        <p className="tabular-nums">
                          {number(coverage.available)}{' '}
                          {index ? 'available' : 'present'} ·{' '}
                          {number(coverage.missing)} missing
                        </p>
                        {(coverage.ambiguous > 0 ||
                          coverage.unassessed > 0) && (
                          <p className="text-xs text-muted-foreground">
                            {coverage.ambiguous > 0 &&
                              `${number(coverage.ambiguous)} ambiguous`}
                            {coverage.ambiguous > 0 &&
                              coverage.unassessed > 0 &&
                              ' · '}
                            {coverage.unassessed > 0 &&
                              `${number(coverage.unassessed)} unassessed`}
                          </p>
                        )}
                        {(index
                          ? row.module.measurements.generatedTransportCoverage
                          : row.module.measurements.specificationCoverage
                        ).state === 'eligible' && (
                          <p className="text-xs">
                            {percentage(
                              index
                                ? row.module.measurements
                                    .generatedTransportCoverage
                                : row.module.measurements.specificationCoverage,
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </td>
                ))}
                <td className="p-2">
                  <dl className="grid gap-1 text-xs">
                    {productionRows(row.module.measurements).map((call) => (
                      <div
                        key={call.key}
                        className="flex justify-between gap-3"
                      >
                        <dt>{call.name}</dt>
                        <dd className="tabular-nums">
                          {count(call.measurement)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {row.mixed > 0 && (
                    <p className="mt-1 text-xs font-medium">
                      {number(row.mixed)} mixed{' '}
                      {row.mixed === 1 ? 'operation' : 'operations'}
                    </p>
                  )}
                </td>
                <td className="p-2">
                  <State value={row.module.inventory.state} />
                  {row.module.inventory.state === 'inventoried' &&
                    row.module.inventory.completeness !== 'complete' && (
                      <p className="text-xs">Partial inventory</p>
                    )}
                  <p className="mt-1 text-xs">
                    Migration: {row.readiness?.migration ?? 'unassessed'}
                  </p>
                  <p className="text-xs">
                    Protection: {row.readiness?.protection ?? 'unknown'}
                  </p>
                  {row.sharedWarning && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Shared uncertainty applies
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

export function MeasurementDetails({
  snapshot,
  module,
}: {
  snapshot: Snapshot
  module?: ModuleAssessment
}) {
  const measurements = module?.measurements ?? snapshot.measurements
  return (
    <>
      <Section
        title="Percentage eligibility"
        description="Percentages require complete analysis and a complete unique-operation denominator. Detected calls and compilation do not establish runtime migration."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Specification coverage', measurements.specificationCoverage],
            [
              'Generated transport coverage',
              measurements.generatedTransportCoverage,
            ],
            ['Production adoption', measurements.productionAdoption],
          ].map(([title, raw]) => {
            const value = raw as Snapshot['measurements']['productionAdoption']
            return (
              <div
                key={String(title)}
                className="grid gap-2 rounded-md border p-3"
              >
                <h3 className="font-medium">{String(title)}</h3>
                <p>{percentage(value)}</p>
                <p className="text-sm">
                  {value.state === 'eligible' ? value.basis : value.reason}
                </p>
                <Evidence
                  provenance={snapshot.provenance}
                  locations={value.evidence}
                />
              </div>
            )
          })}
        </div>
      </Section>
      <Section
        title="Measurement evidence"
        description="Operation identities and production call sites are different units. Unavailable evidence is never a zero or success."
      >
        {[
          ['Unique operations', measurements.uniqueOperations],
          ['Generated production call sites', measurements.generatedCallSites],
          ['Manual production call sites', measurements.manualCallSites],
          [
            'Unresolved production call sites',
            measurements.unresolvedCallSites,
          ],
        ].map(([title, raw]) => {
          const value = raw as Snapshot['measurements']['uniqueOperations']
          return (
            <details key={String(title)}>
              <summary className="cursor-pointer text-sm">
                {String(title)}: {count(value)}
              </summary>
              <p className="py-2 text-sm">
                {value.state === 'measured' ? value.basis : value.reason}
              </p>
              <Evidence
                provenance={snapshot.provenance}
                locations={value.evidence}
              />
            </details>
          )
        })}
      </Section>
    </>
  )
}
