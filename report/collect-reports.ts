import { spawn } from 'node:child_process'
import {
  cp,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
  appendFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  collectionStatusSchema,
  type CollectionStatus,
} from '../src/lib/collection-status'

type Dashboard = 'ui' | 'openapi'
type Options = {
  repo: string
  ref: string
  root: string
  runUrl: string
  timeoutMs?: number
}
export type Pipeline = (
  dashboard: Dashboard,
  output: string,
  signal: AbortSignal,
) => Promise<void>

function command(root: string, args: string[], signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', ...args], {
      cwd: root,
      stdio: 'inherit',
      signal,
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Report command exited with ${code}`)),
    )
  })
}

async function publishedCommit(directory: string, dashboard: Dashboard) {
  try {
    const index = JSON.parse(
      await readFile(path.join(directory, 'index.json'), 'utf8'),
    )
    const entry =
      dashboard === 'ui'
        ? index.snapshots.at(-1)
        : [...index.snapshots]
            .sort((a, b) => Date.parse(a.analyzedAt) - Date.parse(b.analyzedAt))
            .at(-1)
    const commit = dashboard === 'ui' ? entry?.commit : entry?.artemisCommit
    return /^[a-f0-9]{40}$/.test(commit) ? (commit as string) : null
  } catch {
    return null
  }
}

// Copy before the swap; failed collection or copying cannot overwrite last-good reports.
async function install(source: string, destination: string) {
  const parent = path.dirname(destination)
  const staging = await mkdtemp(path.join(parent, '.report-install-'))
  const next = path.join(staging, 'next')
  const previous = path.join(staging, 'previous')
  let backedUp = false
  try {
    await cp(source, next, { recursive: true })
    await rename(destination, previous)
    backedUp = true
    try {
      await rename(next, destination)
    } catch (error) {
      await rename(previous, destination)
      backedUp = false
      throw error
    }
    backedUp = false
  } finally {
    if (backedUp) await rename(previous, destination)
    await rm(staging, { recursive: true, force: true })
  }
}

export async function collectReports(options: Options, pipeline?: Pipeline) {
  const temporary = await mkdtemp(path.join(tmpdir(), 'codestats-collection-'))
  const destinations = {
    ui: path.join(options.root, 'public/migrations'),
    openapi: path.join(options.root, 'public/openapi'),
  }
  const execute: Pipeline =
    pipeline ??
    (async (dashboard, output, signal) => {
      const args = [
        '--repo',
        options.repo,
        '--ref',
        options.ref,
        '--output',
        output,
      ]
      await command(
        options.root,
        [`report/${dashboard}/index.ts`, ...args],
        signal,
      )
      await command(
        options.root,
        dashboard === 'ui'
          ? [
              'report/ui/validate-index.ts',
              '--output',
              output,
              '--ref',
              options.ref,
            ]
          : ['report/openapi/verify-index.ts', ...args],
        signal,
      )
    })
  try {
    const results = await Promise.all(
      (['ui', 'openapi'] as const).map(async (dashboard) => {
        const output = path.join(temporary, dashboard)
        try {
          await cp(destinations[dashboard], output, { recursive: true })
          await execute(
            dashboard,
            output,
            AbortSignal.timeout(options.timeoutMs ?? 15 * 60_000),
          )
          const commit = await publishedCommit(output, dashboard)
          if (commit !== options.ref)
            throw new Error(
              'Collected report does not match the requested revision',
            )
          await install(output, destinations[dashboard])
          return {
            dashboard,
            state: 'success' as const,
            publishedCommit: commit,
          }
        } catch (error) {
          console.error(
            `${dashboard} collection failed; published reports retained: ${String(error)}`,
          )
          return {
            dashboard,
            state: 'failed' as const,
            publishedCommit: await publishedCommit(
              destinations[dashboard],
              dashboard,
            ),
          }
        }
      }),
    )
    const status = collectionStatusSchema.parse({
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      attemptedCommit: options.ref,
      runUrl: options.runUrl,
      dashboards: Object.fromEntries(
        results.map(({ dashboard, ...result }) => [dashboard, result]),
      ),
    })
    const statusPath = path.join(options.root, 'public/collection-status.json')
    let prior: CollectionStatus | undefined
    try {
      prior = collectionStatusSchema.parse(
        JSON.parse(await readFile(statusPath, 'utf8')),
      )
    } catch {
      /* first collection */
    }
    // Do not create heartbeat-only commits on unchanged or repeatedly failed runs.
    if (
      prior?.attemptedCommit === status.attemptedCommit &&
      JSON.stringify(prior.dashboards) === JSON.stringify(status.dashboards)
    )
      return prior
    await writeFile(`${statusPath}.tmp`, JSON.stringify(status) + '\n')
    await rename(`${statusPath}.tmp`, statusPath)
    return status
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const {
    GITHUB_SERVER_URL = 'https://github.com',
    GITHUB_REPOSITORY = 'ls1intum/Artemis-CodeStats',
    GITHUB_RUN_ID,
    GITHUB_OUTPUT,
  } = process.env
  const ref = process.argv[2]
  if (!/^[a-f0-9]{40}$/.test(ref ?? ''))
    throw new Error('Pass the explicit Artemis commit as the first argument')
  const status = await collectReports({
    repo: path.resolve('artemis'),
    root: process.cwd(),
    ref,
    runUrl: GITHUB_RUN_ID
      ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
      : `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/workflows/daily-report.yml`,
  })
  console.log(JSON.stringify(status, null, 2))
  if (GITHUB_OUTPUT)
    await appendFile(
      GITHUB_OUTPUT,
      `ui=${status.dashboards.ui.state}\nopenapi=${status.dashboards.openapi.state}\n`,
    )
}
