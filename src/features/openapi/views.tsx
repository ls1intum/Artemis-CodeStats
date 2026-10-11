import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type {
  ModuleAssessment,
  Operation,
  Snapshot,
  Readiness as ReadinessAssessment,
} from './model'
import { scopeReport } from './scope'
import {
  Assessment,
  CallerList,
  Evidence,
  PagedList,
  Section,
  Source,
  State,
  StepList,
} from './presentation'

type Scope = ReturnType<typeof scopeReport>
type Measurements = Snapshot['measurements']
const number = (value: number) => value.toLocaleString('en-US')
function count(value: Measurements['uniqueOperations']) {
  return value.state === 'measured'
    ? `${number(value.value)}${value.completeness === 'incomplete-analysis' ? ' (partial)' : ''}`
    : value.state
}
function percentage(value: Measurements['productionAdoption']) {
  return value.state === 'eligible'
    ? `${Math.round((value.numerator / value.denominator) * 100)}% (${number(value.numerator)}/${number(value.denominator)})`
    : value.state
}

export function Overview({
  snapshot,
  scope,
  module,
}: {
  snapshot: Snapshot
  scope: Scope
  module?: ModuleAssessment
}) {
  const measurements = module?.measurements ?? snapshot.measurements
  const tiles = [
    [
      'Unique operations',
      scope.counts.uniqueOperations,
      measurements.uniqueOperations,
    ],
    [
      'Generated production call sites',
      scope.counts.generatedCallSites,
      measurements.generatedCallSites,
    ],
    [
      'Manual production call sites',
      scope.counts.manualCallSites,
      measurements.manualCallSites,
    ],
    [
      'Unresolved production call sites',
      scope.counts.unresolvedCallSites,
      measurements.unresolvedCallSites,
    ],
  ] as const
  return (
    <>
      <Section
        title="Inventory and analysis coverage"
        description="Static source observations at the selected revision. Operation counts and production call-site counts are separate; wrapper implementations are not additional production calls."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map(([title, observed, measurement]) => (
            <div key={title} className="grid gap-2 rounded-md border p-3">
              <h3 className="font-medium">{title}</h3>
              <p className="text-2xl font-semibold">
                {measurement.state === 'measured'
                  ? number(observed)
                  : measurement.state}
              </p>
              <p className="text-sm">
                {measurement.state === 'measured'
                  ? `${measurement.completeness} · ${measurement.basis}`
                  : measurement.reason}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm">
          {scope.modules.length} discovered module/area assessments ·{' '}
          {scope.generatedMethods.length} generated methods ·{' '}
          {scope.diagnostics.length} diagnostics · {scope.nextSteps.length} next
          steps.
        </p>
        {scope.unscopedCallers.length > 0 && (
          <p className="text-sm text-destructive">
            {number(scope.unscopedCallers.length)} production calls have no
            operation binding and remain shared uncertainty. They are listed
            separately in Callers and prevent an exclusive adoption claim.
          </p>
        )}
      </Section>
      <Section
        title="Percentage eligibility"
        description="Percentages appear only when the report establishes complete analysis and a complete unique-operation denominator. Detected calls or compilation cannot establish runtime migration."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {(
            [
              ['Specification coverage', measurements.specificationCoverage],
              [
                'Generated transport coverage',
                measurements.generatedTransportCoverage,
              ],
              ['Production adoption', measurements.productionAdoption],
            ] as const
          ).map(([title, measurement]) => {
            return (
              <div key={title} className="grid gap-2 rounded-md border p-3">
                <h3 className="font-medium">{title}</h3>
                <p>{percentage(measurement)}</p>
                <p className="text-sm">
                  {measurement.state === 'eligible'
                    ? `Complete denominator and analysis · ${measurement.basis}`
                    : measurement.reason}
                </p>
                <Evidence
                  provenance={snapshot.provenance}
                  locations={measurement.evidence}
                />
              </div>
            )
          })}
        </div>
      </Section>
      <Section
        title="Independent operation states"
        description="Specification presence, transport availability, and production adoption describe different evidence. No detected caller does not establish server-only status."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {(
            [
              ['Specification', scope.counts.specification],
              ['Generated transport', scope.counts.generatedTransport],
              ['Adoption', scope.counts.adoption],
            ] as const
          ).map(([title, states]) => (
            <div key={title}>
              <h3 className="mb-2 font-medium">{title}</h3>
              <ul className="grid gap-2">
                {Object.entries(states).map(([state, total]) => (
                  <li key={state}>
                    <State value={state} /> {number(total)}
                  </li>
                ))}
              </ul>
              {!Object.keys(states).length && (
                <p className="text-sm">
                  No inventoried operations in this scope. Check the module's
                  inventory evidence.
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

export function Modules({
  modules,
  onSelect,
}: {
  modules: ModuleAssessment[]
  onSelect: (id: string) => void
}) {
  const [sort, setSort] = useState<'id' | 'operations'>('id')
  const [descending, setDescending] = useState(false)
  const ordered = [...modules].sort((a, b) => {
    const operations = (module: ModuleAssessment) =>
      module.measurements.uniqueOperations.state === 'measured'
        ? module.measurements.uniqueOperations.value
        : -1
    const comparison =
      sort === 'id'
        ? a.id.localeCompare(b.id)
        : operations(a) - operations(b) || a.id.localeCompare(b.id)
    return descending ? -comparison : comparison
  })
  const changeSort = (key: typeof sort) => {
    setSort(key)
    setDescending(key === sort ? !descending : key === 'operations')
  }
  return (
    <Section
      title="All module assessments"
      description="Module identity and REST ownership are independent of client caller area. Every discovered area has an inventory, evidenced no-REST state, or actionable limitation."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">OpenAPI module inventory</caption>
          <thead>
            <tr className="border-b">
              {[
                ['id', 'Module'],
                ['operations', 'Unique operations'],
              ].map(([key, title]) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    sort === key
                      ? descending
                        ? 'descending'
                        : 'ascending'
                      : 'none'
                  }
                  className="p-2"
                >
                  <Button
                    variant="ghost"
                    onClick={() => changeSort(key as typeof sort)}
                  >
                    {title}
                  </Button>
                </th>
              ))}
              {[
                'Role / inventory',
                'Specification',
                'Generated transport',
                'Production adoption',
              ].map((title) => (
                <th key={title} scope="col" className="p-2">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((module) => (
              <tr key={module.id} className="border-b">
                <td className="p-2">
                  <Button variant="link" onClick={() => onSelect(module.id)}>
                    {module.id}
                  </Button>
                </td>
                <td className="p-2">
                  {count(module.measurements.uniqueOperations)}
                </td>
                <td className="p-2">
                  <p>{module.role}</p>
                  <State value={module.inventory.state} />
                </td>
                <td className="p-2">
                  {percentage(module.measurements.specificationCoverage)}
                </td>
                <td className="p-2">
                  {percentage(module.measurements.generatedTransportCoverage)}
                </td>
                <td className="p-2">
                  {percentage(module.measurements.productionAdoption)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

export function ModuleDetail({
  module,
  snapshot,
}: {
  module: ModuleAssessment
  snapshot: Snapshot
}) {
  return (
    <Section
      title={`${module.id} module`}
      description={`Role: ${module.role}. Inventory describes owned REST operations, not traffic sent from this client area.`}
    >
      <div>
        <State value={module.inventory.state} />{' '}
        {module.inventory.state === 'inventoried' && (
          <State value={module.inventory.completeness} />
        )}
      </div>
      {'reason' in module.inventory && <p>{module.inventory.reason}</p>}
      {module.inventory.state === 'limited' && (
        <p>Next step: {module.inventory.nextStep}</p>
      )}
      {module.inventory.state === 'no-rest' && (
        <p>
          No owned REST mappings were found in the evidenced scope. This area
          may still call operations owned by another module.
        </p>
      )}
      <Evidence
        provenance={snapshot.provenance}
        locations={module.inventory.evidence}
      />
      <details>
        <summary className="cursor-pointer text-sm">Discovered roots</summary>
        <Evidence provenance={snapshot.provenance} locations={module.roots} />
      </details>
    </Section>
  )
}

export function Readiness({
  scope,
  snapshot,
}: {
  scope: Scope
  snapshot: Snapshot
}) {
  return (
    <Section
      title="Migration and protection prerequisites"
      description="A source candidate still requires matching wire and runtime verification. Protection requires evidenced enabled rules and coverage; missing evidence stays unknown."
    >
      <PagedList
        title="Readiness assessments"
        items={scope.readiness.map((record) => ({
          ...record,
          id: record.moduleId,
        }))}
        text={(record) =>
          `${record.moduleId} ${record.migration} ${record.protection} ${record.reason}`
        }
        empty="Readiness is unassessed; no recorded assessment establishes completion."
      >
        {(record) => (
          <>
            <h3 className="font-medium">{record.moduleId}</h3>
            <p className="text-sm">
              Migration: <State value={record.migration} /> Protection:{' '}
              <State value={record.protection} />
            </p>
            <p className="text-sm">{record.reason}</p>
            <Evidence
              provenance={snapshot.provenance}
              locations={record.evidence}
            />
            <Prerequisites record={record} scope={scope} snapshot={snapshot} />
            <p className="text-sm">
              Verification records:{' '}
              {record.verificationIds.join(', ') || 'none recorded'} ·
              Enforcement records:{' '}
              {record.enforcementIds.join(', ') || 'none recorded'}
            </p>
          </>
        )}
      </PagedList>
    </Section>
  )
}

function Prerequisites({
  record,
  scope,
  snapshot,
}: {
  record: ReadinessAssessment
  scope: Scope
  snapshot: Snapshot
}) {
  const [open, setOpen] = useState(false)
  const ids = new Set(record.prerequisiteIds)
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm">
        Candidate prerequisites ({ids.size})
      </summary>
      {open && (
        <StepList
          title="Prerequisites"
          steps={scope.nextSteps.filter((step) => ids.has(step.id))}
          provenance={snapshot.provenance}
        />
      )}
    </details>
  )
}

export function Endpoints({
  scope,
  snapshot,
  onSelect,
  operation,
}: {
  scope: Scope
  snapshot: Snapshot
  onSelect: (id: string) => void
  operation?: Operation
}) {
  return (
    <>
      {operation && (
        <Section
          title={operation.id}
          description="Endpoint details preserve handler variants and independent evidence states."
        >
          <p className="text-sm">
            Server ownership:{' '}
            {operation.ownership.state === 'resolved'
              ? operation.ownership.moduleId
              : `${operation.ownership.state}: ${operation.ownership.candidateModuleIds.join(', ')} · ${operation.ownership.reason}`}
          </p>
          <Evidence
            provenance={snapshot.provenance}
            locations={operation.ownership.evidence}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                ['Specification', operation.specification],
                ['Generated transport', operation.generatedTransport],
                ['Production adoption', operation.adoption],
                ['Web relevance', operation.webRelevance],
              ] as const
            ).map(([title, value]) => (
              <Assessment
                key={title}
                title={title}
                value={value}
                provenance={snapshot.provenance}
              />
            ))}
          </div>
          <h3 className="font-medium">
            Server handlers and conditional variants
          </h3>
          {operation.variants.length === 0 && (
            <p>
              No resolved handler variant; inspect the ownership and inventory
              limitations.
            </p>
          )}
          {operation.variants.map((variant) => (
            <div key={variant.id} className="grid gap-2 rounded-md border p-3">
              <Source
                provenance={snapshot.provenance}
                location={variant.handler}
              />
              <p className="text-sm">
                Declared paths: {variant.declaredPaths.join(' + ')}
              </p>
              <p className="text-sm">
                Conditions:{' '}
                {variant.conditions.join('; ') || 'No conditions recorded'}
              </p>
              <pre className="overflow-auto text-xs">
                {JSON.stringify(variant.mappingAttributes, null, 2)}
              </pre>
            </div>
          ))}
          <h3 className="font-medium">Generated methods</h3>
          <GeneratedMethods
            snapshot={snapshot}
            methods={scope.generatedMethods.filter((method) =>
              method.operationIds.includes(operation.id),
            )}
          />
          <h3 className="font-medium">
            Production callers and wrapper implementations
          </h3>
          <CallerList
            callers={scope.callers.filter((caller) =>
              caller.operationIds.includes(operation.id),
            )}
            provenance={snapshot.provenance}
          />
          <h3 className="font-medium">Endpoint work</h3>
          <StepList
            title="Endpoint steps"
            steps={scope.nextSteps.filter((step) =>
              step.operationIds.includes(operation.id),
            )}
            provenance={snapshot.provenance}
          />
        </Section>
      )}
      <Section
        title="Endpoints"
        description="One row per uppercase method and normalized path. Ambiguous ownership and conditional variants remain explicit."
      >
        <PagedList
          title="Endpoints"
          items={scope.operations}
          text={(operation) =>
            `${operation.id} ${operation.specification.state} ${operation.generatedTransport.state} ${operation.adoption.state} ${operation.webRelevance.state}`
          }
          empty="No inventoried operations; inspect the module's no-REST evidence or inventory limitation."
        >
          {(operation) => (
            <>
              <Button
                variant="link"
                className="h-auto justify-start whitespace-normal p-0 text-left break-all"
                onClick={() => onSelect(operation.id)}
              >
                {operation.id}
              </Button>
              <p className="text-sm">
                Specification: <State value={operation.specification.state} />{' '}
                Transport: <State value={operation.generatedTransport.state} />{' '}
                Adoption: <State value={operation.adoption.state} /> Web:{' '}
                <State value={operation.webRelevance.state} />
              </p>
              <Evidence
                provenance={snapshot.provenance}
                locations={operation.variants.map((variant) => variant.handler)}
              />
            </>
          )}
        </PagedList>
      </Section>
    </>
  )
}

function GeneratedMethods({
  snapshot,
  methods,
}: {
  snapshot: Snapshot
  methods: Scope['generatedMethods']
}) {
  return (
    <PagedList
      title="Generated methods"
      items={methods}
      text={(method) =>
        `${method.symbol} ${method.transport} ${method.mapping} ${method.operationIds.join(' ')} ${method.reason}`
      }
      empty="No matching generated method was inventoried; availability depends on the operation assessment."
    >
      {(method) => (
        <>
          <h3 className="font-medium break-all">{method.symbol}</h3>
          <p className="text-sm">
            <State value={method.transport} /> <State value={method.mapping} />{' '}
            {method.operationIds.join(', ') || 'No resolved server operation'}
          </p>
          <p className="text-sm">{method.reason}</p>
          <Source provenance={snapshot.provenance} location={method.location} />
          <Evidence
            provenance={snapshot.provenance}
            locations={method.implementations}
          />
          {method.identities?.map((identity) => (
            <p key={`${identity.method} ${identity.path}`} className="text-sm">
              {identity.method} {identity.path} · Specification:{' '}
              {identity.specification.state}
            </p>
          ))}
        </>
      )}
    </PagedList>
  )
}

export function EvidenceView({
  snapshot,
  scope,
}: {
  snapshot: Snapshot
  scope: Scope
}) {
  return (
    <>
      <Section
        title="Analysis diagnostics"
        description="Scoped diagnostics include shared limitations that could affect this module. An absence of diagnostics alone is not proof of completeness."
      >
        <PagedList
          title="Diagnostics"
          items={scope.diagnostics}
          text={(record) =>
            `${record.stage} ${record.moduleIds.join(' ')} ${record.operationIds.join(' ')} ${record.reason} ${record.nextStep}`
          }
        >
          {(record) => (
            <>
              <p>
                <State value={record.stage} /> <State value={record.severity} />
              </p>
              <p>{record.reason}</p>
              <p className="text-sm">Next step: {record.nextStep}</p>
              <p className="break-all text-sm">
                {record.moduleIds.join(', ') || 'Shared limitation'} ·{' '}
                {record.operationIds.join(', ')}
              </p>
              <Evidence
                provenance={snapshot.provenance}
                locations={record.evidence}
              />
            </>
          )}
        </PagedList>
      </Section>
      <Section title="Generated transport inventory">
        <GeneratedMethods
          snapshot={snapshot}
          methods={scope.generatedMethods}
        />
      </Section>
      <Section
        title="Exceptions"
        description="Exceptions retain reasons, input bindings, and conditions for review and removal. They do not establish migration or enforcement."
      >
        <PagedList
          title="Exceptions"
          items={scope.exceptions}
          text={(record) =>
            `${record.id} ${record.reason} ${record.reviewCondition} ${record.removalCondition}`
          }
          empty="No exceptions recorded. This does not establish full analysis or policy coverage."
        >
          {(record) => (
            <>
              <h3 className="font-medium">{record.id}</h3>
              <p>{record.reason}</p>
              <p className="text-sm">
                Binding: {record.bindingStatus ?? 'unknown'} ·{' '}
                {record.binding.artemisCommit}
              </p>
              <p className="text-sm">Review: {record.reviewCondition}</p>
              <p className="text-sm">Removal: {record.removalCondition}</p>
              {record.maintainer && (
                <p className="text-sm">Maintainer: {record.maintainer}</p>
              )}
              <RecordBinding record={record} />
              <Evidence
                provenance={snapshot.provenance}
                locations={record.evidence}
              />
            </>
          )}
        </PagedList>
      </Section>
      <Section
        title="Verification evidence"
        description="Compilation, wire compatibility, and runtime flow remain distinct. Only revision/input-matched evidence can support the corresponding claim."
      >
        <PagedList
          title="Verification records"
          items={scope.verification}
          text={(record) =>
            `${record.id} ${record.kind} ${record.result} ${record.reason}`
          }
          empty="Verification unknown: no records supplied for this scope."
        >
          {(record) => (
            <>
              <h3 className="font-medium">{record.id}</h3>
              <p>
                <State value={record.kind} /> <State value={record.result} />{' '}
                <State value={record.bindingStatus} />
              </p>
              <p>{record.reason}</p>
              <p className="text-sm">Recorded: {record.recordedAt}</p>
              <RecordBinding record={record} />
              <Evidence
                provenance={snapshot.provenance}
                locations={record.evidence}
              />
            </>
          )}
        </PagedList>
      </Section>
      <Section
        title="Enforcement evidence"
        description="Enabled rules, covered checks, scope, exclusions, and reviewed exceptions are required to claim protection."
      >
        <PagedList
          title="Enforcement records"
          items={scope.enforcement}
          text={(record) =>
            `${record.id} ${record.rule} ${record.state} ${record.reason}`
          }
          empty="Enforcement unknown: no records supplied for this scope."
        >
          {(record) => (
            <>
              <h3 className="font-medium">{record.rule}</h3>
              <p>
                <State value={record.state} />{' '}
                <State value={record.bindingStatus} /> Coverage:{' '}
                {record.coverage ?? 'unknown'}
              </p>
              <p>{record.reason}</p>
              <p className="text-sm">
                Checks: {record.checks?.join(', ') || 'unknown'} · Exclusions:{' '}
                {record.exclusions.join(', ') || 'none recorded'} · Exceptions:{' '}
                {record.exceptionIds.join(', ') || 'none recorded'} · Recorded:{' '}
                {record.recordedAt}
              </p>
              <RecordBinding record={record} />
              <Evidence
                provenance={snapshot.provenance}
                locations={record.evidence}
              />
            </>
          )}
        </PagedList>
      </Section>
    </>
  )
}

function RecordBinding({
  record,
}: {
  record: {
    binding: { artemisCommit: string; inputHashes: Record<string, string> }
    scope: { moduleIds: string[]; operationIds: string[]; callerIds: string[] }
  }
}) {
  return (
    <details>
      <summary className="cursor-pointer text-sm">
        Revision/input binding and scope
      </summary>
      <pre className="overflow-auto text-xs">
        {JSON.stringify(
          { binding: record.binding, scope: record.scope },
          null,
          2,
        )}
      </pre>
    </details>
  )
}

export function Provenance({ snapshot }: { snapshot: Snapshot }) {
  const provenance = snapshot.provenance
  return (
    <Section
      title="Revision and provenance"
      description="Snapshot-wide input context applies to every module. Committed output does not prove a matching generation run or deployed profile."
    >
      <p className="break-all text-sm">
        Artemis revision:{' '}
        <a
          className="underline"
          href={`${provenance.repositoryUrl}/commit/${provenance.artemisCommit}`}
        >
          {provenance.artemisCommit}
        </a>{' '}
        · Analyzer: {provenance.analyzerVersion} · Analyzed:{' '}
        {provenance.analyzedAt}
      </p>
      <p className="break-all text-sm">
        Module mapping {provenance.moduleMapping.version} · SHA-256{' '}
        {provenance.moduleMapping.sha256}
        {provenance.fingerprint &&
          ` · Analysis fingerprint ${provenance.fingerprint}`}
      </p>
      <Assessment
        title="Generation provenance"
        value={
          provenance.generation.state === 'unknown'
            ? provenance.generation
            : {
                state: 'recorded',
                reason: `Run ${provenance.generation.runId} · artifact ${provenance.generation.generatorArtifactSha256} · profiles ${provenance.generation.profiles.join(', ')}`,
                evidence: provenance.generation.evidence,
              }
        }
        provenance={provenance}
      />
      {provenance.generation.state === 'unknown' && (
        <ul className="list-inside list-disc text-sm">
          {provenance.generation.declarations.map((declaration) => (
            <li key={declaration}>{declaration}</li>
          ))}
        </ul>
      )}
      <Assessment
        title="Pruning provenance"
        value={
          provenance.pruning.state === 'unknown'
            ? provenance.pruning
            : {
                state: 'observed',
                reason: `Run ${provenance.pruning.runId} · ${provenance.pruning.removedOperations.length} removed operations`,
                evidence: provenance.pruning.evidence,
              }
        }
        provenance={provenance}
      />
      {provenance.generation.state === 'recorded' && (
        <details>
          <summary className="cursor-pointer text-sm">
            Generation run binding and properties
          </summary>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(provenance.generation, null, 2)}
          </pre>
        </details>
      )}
      {provenance.pruning.state === 'observed' && (
        <details>
          <summary className="cursor-pointer text-sm">
            Raw/derived inputs and removed operations
          </summary>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(provenance.pruning, null, 2)}
          </pre>
        </details>
      )}
      <details>
        <summary className="cursor-pointer">
          Input revisions and hashes ({provenance.inputs.length})
        </summary>
        <ul className="grid gap-3 pt-3">
          {provenance.inputs.map((input) => (
            <li
              key={input.id}
              className="grid gap-1 rounded-md border p-3 text-sm break-all"
            >
              <strong>
                {input.id} · {input.kind}
              </strong>
              <p>{input.path}</p>
              <p>
                Storage revision:{' '}
                {input.revision.state === 'known'
                  ? input.revision.commit
                  : `${input.revision.state}: ${input.revision.reason}`}
              </p>
              <p>
                Content:{' '}
                {input.content.state === 'available'
                  ? `SHA-256 ${input.content.sha256}`
                  : `unavailable: ${input.content.reason}`}
              </p>
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary className="cursor-pointer">
          Extraction assumptions and limitations (
          {provenance.assumptions.length})
        </summary>
        <ul className="grid gap-3 pt-3">
          {provenance.assumptions.map((assumption, index) => (
            <li key={index}>
              <p className="text-sm">{assumption.reason}</p>
              <Evidence
                provenance={provenance}
                locations={assumption.evidence}
              />
            </li>
          ))}
        </ul>
      </details>
    </Section>
  )
}
