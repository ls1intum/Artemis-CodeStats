import { Button } from '@/components/ui/button'
import type { ModuleAssessment, Operation, Snapshot } from './model'
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
      <details>
        <summary className="cursor-pointer text-sm">
          Inventory evidence and discovered roots
        </summary>
        <Evidence
          provenance={snapshot.provenance}
          locations={module.inventory.evidence}
        />
        <Evidence provenance={snapshot.provenance} locations={module.roots} />
      </details>
    </Section>
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
                generatedSourceScan={snapshot.generatedSourceScan}
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
        {snapshot.generatedSourceScan && (
          <details>
            <summary className="cursor-pointer text-sm">
              Generated-source scan:{' '}
              {snapshot.generatedSourceScan.evidence.length} files ·{' '}
              {snapshot.generatedSourceScan.complete
                ? 'complete'
                : 'incomplete analysis'}
            </summary>
            <Evidence
              provenance={snapshot.provenance}
              locations={snapshot.generatedSourceScan.evidence}
            />
          </details>
        )}
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
