import { collectionStatusSchema } from '../../src/lib/collection-status'

export const stalledAfter = 45 * 60_000
export const staleAfter = 3 * 60 * 60_000
export const alertTitle = 'UI migration collection is failing'
export type Run = {
  id: number
  status: string
  created_at: string
  html_url: string
}

export function stalledRuns(runs: Run[], now: number) {
  return runs.filter(
    (run) =>
      run.status !== 'completed' &&
      now - Date.parse(run.created_at) > stalledAfter,
  )
}

// Independent of the collector: a run awaiting deployment has no running job to time out
// and cannot reach the collector's own alert job.
export async function checkHealth(
  repository: string,
  token: string,
  site: string,
  request: typeof fetch = fetch,
  now = Date.now(),
) {
  const api = async (path: string, method = 'GET', body?: unknown) => {
    const response = await request(
      `https://api.github.com/repos/${repository}/${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!response.ok)
      throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`)
    return response.status === 204 ? undefined : response.json()
  }
  const groups = await Promise.all(
    ['waiting', 'pending', 'queued', 'in_progress'].map(async (status) => {
      const result = await api(
        `actions/workflows/daily-report.yml/runs?status=${status}&branch=main&per_page=100`,
      )
      return result.workflow_runs as Run[]
    }),
  )
  const runs = [...new Map(groups.flat().map((run) => [run.id, run])).values()]
  const stalled = stalledRuns(runs, now)
  const problems = stalled.map((run) => `Blocked collector: ${run.html_url}`)
  for (const run of stalled)
    await api(`actions/runs/${run.id}/force-cancel`, 'POST')

  // Compare with upstream, not with the date of the last commit in this repository.
  // Three hours allow for a scheduled run, analysis, deployment and CDN propagation.
  const upstreamResponse = await request(
    'https://api.github.com/repos/ls1intum/Artemis/commits/develop',
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    },
  )
  if (!upstreamResponse.ok)
    throw new Error(`Artemis head: HTTP ${upstreamResponse.status}`)
  const upstream = await upstreamResponse.json()
  for (const dashboard of ['ui', 'openapi'] as const) {
    try {
      let collected: string
      if (dashboard === 'ui') {
        const { manifestSchema } =
          await import('../../src/features/migrations/model')
        const response = await request(
          new URL(`migrations/index.json?health=${now}`, site),
          { signal: AbortSignal.timeout(15_000) },
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const live = manifestSchema.parse(await response.json())
        const { verifyDeployment } = await import('./verify-deployment')
        collected = await verifyDeployment(site, live, request)
      } else {
        const { verifyOpenApiDeployment } =
          await import('../openapi/verify-deployment')
        collected = (await verifyOpenApiDeployment(site, undefined, request))
          .snapshot.provenance.artemisCommit
      }
      if (collected !== upstream.sha) {
        const comparison = await request(
          `https://api.github.com/repos/ls1intum/Artemis/compare/${collected}...${upstream.sha}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(15_000),
          },
        )
        if (!comparison.ok)
          throw new Error(`Upstream comparison: HTTP ${comparison.status}`)
        const compared = await comparison.json()
        if (compared.status !== 'ahead' || !compared.commits?.length)
          throw new Error(
            'Deployed snapshot is not an ancestor of Artemis develop',
          )
        if (
          now - Date.parse(compared.commits[0].commit.committer.date) >
          staleAfter
        )
          problems.push(
            `Deployed ${dashboard} data is behind Artemis develop (${upstream.sha}): ${site}`,
          )
      }
    } catch (error) {
      problems.push(
        `Deployed ${dashboard} report is unavailable or invalid: ${String(error)}`,
      )
    }
  }
  // Older deployments have no status file; absence must not disable independent checks.
  try {
    const response = await request(
      new URL(`collection-status.json?health=${now}`, site),
      { signal: AbortSignal.timeout(15_000) },
    )
    if (response.ok) {
      const status = collectionStatusSchema.safeParse(await response.json())
      if (status.success)
        for (const dashboard of ['ui', 'openapi'] as const)
          if (status.data.dashboards[dashboard].state === 'failed')
            problems.push(
              `${dashboard} collection failed: ${status.data.runUrl}`,
            )
    }
  } catch {
    /* The report checks above remain authoritative. */
  }
  if (problems.length) {
    const issues = await api('issues?state=open&per_page=100')
    const issue = issues.find(
      (item: { title: string; pull_request?: unknown }) =>
        item.title === alertTitle && !item.pull_request,
    )
    const body = `${problems.join('\n\n')}\n\nThe independent health check detected this problem. A recovery collection is requested when no healthy collection is active.`
    if (issue) await api(`issues/${issue.number}/comments`, 'POST', { body })
    else await api('issues', 'POST', { title: alertTitle, body })
    if (!runs.some((run) => !stalled.includes(run)))
      await api('actions/workflows/daily-report.yml/dispatches', 'POST', {
        ref: 'main',
      })
  }
  return problems
}
