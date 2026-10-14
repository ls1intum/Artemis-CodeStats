import { useState } from 'react'
import type { NextStep, Snapshot } from './model'
import { Section, State, StepList } from './presentation'
import { partitionWork, workGroups, type ReportScope } from './summary'

function WorkGroup({
  group,
  snapshot,
}: {
  group: ReturnType<typeof workGroups>[number]
  snapshot: Snapshot
}) {
  const [open, setOpen] = useState(false)
  return (
    <details
      className="rounded-md border p-3"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium">
        {group.label} ({group.steps.length.toLocaleString('en-US')}{' '}
        {group.steps.length === 1 ? 'record' : 'records'})
      </summary>
      {open && (
        <div className="pt-3">
          <StepList
            title={group.label}
            steps={group.steps}
            provenance={snapshot.provenance}
          />
        </div>
      )}
    </details>
  )
}

function GroupedWork({
  steps,
  snapshot,
}: {
  steps: NextStep[]
  snapshot: Snapshot
}) {
  const groups = workGroups(steps)
  return groups.length ? (
    <div className="grid gap-3">
      {groups.map((group) => (
        <WorkGroup key={group.id} group={group} snapshot={snapshot} />
      ))}
    </div>
  ) : (
    <p className="text-sm">
      No attributed work records. Missing assessments do not establish
      completion.
    </p>
  )
}

export function SharedWork({
  snapshot,
  steps,
}: {
  snapshot: Snapshot
  steps: NextStep[]
}) {
  if (!steps.length) return null
  return (
    <Section
      title="Shared analysis limitations"
      description="These records have no established server owner. They still constrain readiness, but are not assigned to each module as migration tasks."
    >
      <GroupedWork snapshot={snapshot} steps={steps} />
    </Section>
  )
}

export function Readiness({
  scope,
  snapshot,
}: {
  scope: ReportScope
  snapshot: Snapshot
}) {
  if (scope.modules.length !== 1) return null
  const record = scope.readiness[0]
  const work = partitionWork(
    snapshot,
    scope.nextSteps.filter((step) => record?.prerequisiteIds.includes(step.id)),
  )
  return (
    <Section
      title="Migration and protection prerequisites"
      description="Runtime verification and enabled enforcement remain separate from static progress."
    >
      {record ? (
        <>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            Migration: <State value={record.migration} /> Protection:{' '}
            <State value={record.protection} />
          </p>
          <p className="text-sm">{record.reason}</p>
          {work.shared.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Shared analysis uncertainty still constrains this module. Review
              Shared analysis limitations below.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Verification records:{' '}
            {record.verificationIds.join(', ') || 'none recorded'} · Enforcement
            records: {record.enforcementIds.join(', ') || 'none recorded'}
          </p>
        </>
      ) : (
        <p>Readiness is unassessed; no record establishes completion.</p>
      )}
    </Section>
  )
}

export function Work({
  scope,
  snapshot,
}: {
  scope: ReportScope
  snapshot: Snapshot
}) {
  const { attributed, shared } = partitionWork(snapshot, scope.nextSteps)
  return (
    <div className="grid gap-6">
      <Readiness scope={scope} snapshot={snapshot} />
      <Section
        title="Next steps"
        description="Grouped evidence records, not an estimated task count. Categories can concern the same operation or caller; follow source evidence before making changes."
      >
        <GroupedWork snapshot={snapshot} steps={attributed} />
      </Section>
      <SharedWork snapshot={snapshot} steps={shared} />
    </div>
  )
}
