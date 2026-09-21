import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { analyzeTree } from './analyze'
import { planHistory } from './history'
import {
  analyzerVersion,
  applyPatch,
  detailSchema,
  makePatch,
  manifestSchema,
  storedDetailSchema,
  type Detail,
  type Manifest,
  type Summary,
} from '../../src/features/migrations/model'

const analyzedPaths = [
  'src/main/webapp/app',
  'src/main/webapp/content',
  'src/main/webapp/tailwind.css',
  'rules/no-bootstrap-classes.mjs',
  'eslint.config.mjs',
  'packages/tum-ui/src/lib',
]

export async function generateReports({
  repo,
  output,
  baseline,
  packageAdoption,
  rebuild = false,
}: {
  repo: string
  output: string
  baseline: string
  packageAdoption: string
  rebuild?: boolean
}): Promise<Manifest> {
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }).trim()
  if (!existsSync(join(repo, '.git')))
    throw new Error(
      'Initialize the Artemis submodule first: git submodule update --init artemis',
    )
  const head = git('rev-parse', 'HEAD')
  git('merge-base', '--is-ancestor', baseline, head)
  git('merge-base', '--is-ancestor', packageAdoption, head)
  const revision = (row: string) => {
    const [commit, date, subject] = row.split('\x1f')
    return { commit, date, subject }
  }
  const history = git(
    'log',
    '--first-parent',
    '--reverse',
    '--format=%H%x1f%cI%x1f%s',
    `${baseline}..${head}`,
  )
    .split('\n')
    .filter(Boolean)
    .map(revision)
  const planned = planHistory(
    [
      revision(git('show', '-s', '--format=%H%x1f%cI%x1f%s', baseline)),
      ...history,
    ],
    packageAdoption,
  )
  mkdirSync(output, { recursive: true })
  const cachePath = join(output, 'index.json')
  const cached =
    !rebuild && existsSync(cachePath)
      ? manifestSchema.safeParse(JSON.parse(readFileSync(cachePath, 'utf8')))
      : undefined
  const manifest: Manifest = {
    schemaVersion: 4,
    analyzerVersion,
    generatedAt: new Date().toISOString(),
    baseline,
    packageAdoption,
    bases: planned.bases,
    snapshots: [],
  }
  const atomicWrite = (path: string, value: unknown) => {
    writeFileSync(`${path}.tmp`, JSON.stringify(value) + '\n')
    renameSync(`${path}.tmp`, path)
  }
  const detailPath = (commit: string) => join(output, `${commit}.json`)
  // Reads a stored detail, resolving a patch through its base; undefined when absent or unusable.
  const readStored = (commit: string): Detail | undefined => {
    if (!existsSync(detailPath(commit))) return undefined
    const parsed = storedDetailSchema.safeParse(
      JSON.parse(readFileSync(detailPath(commit), 'utf8')),
    )
    if (!parsed.success || parsed.data.commit !== commit) return undefined
    if (!('base' in parsed.data)) return parsed.data
    const base = readStored(parsed.data.base)
    return base && applyPatch(base, parsed.data)
  }
  const consistent = (detail: Detail, summary: Summary) =>
    detail.units.length === summary.totals.units &&
    detail.units.filter((u) => u.status === 'dirty').length ===
      summary.totals.dirty &&
    detail.lockable.length === summary.totals.lockableDirs
  let base: Detail | undefined
  for (const rev of planned.snapshots) {
    const { commit, date } = rev
    const isBase = planned.bases.includes(commit)
    const prior =
      cached?.success && cached.data.snapshots.find((s) => s.commit === commit)
    let detail = prior ? readStored(commit) : undefined
    if (detail && prior && !consistent(detail, prior))
      throw new Error(
        `Cached detail does not match ${commit}; run with --rebuild`,
      )
    let summary = prior && detail ? prior : undefined
    if (!summary) {
      const temp = mkdtempSync(join(tmpdir(), 'codestats-ui-'))
      try {
        // Read committed trees without checkout or mutation of the Artemis submodule.
        const present = git(
          'ls-tree',
          '--name-only',
          commit,
          '--',
          ...analyzedPaths,
        )
          .split('\n')
          .filter(Boolean)
        const archive = execFileSync(
          'git',
          ['-C', repo, 'archive', commit, '--', ...present],
          { maxBuffer: 256 * 1024 * 1024 },
        )
        execFileSync('tar', ['-x', '-C', temp], { input: archive })
        const analyzed = await analyzeTree(temp, rev)
        summary = analyzed.summary
        // Normalize key order through the schema so patches compare stored and fresh details alike.
        detail = detailSchema.parse(analyzed.detail)
        const t = summary.totals
        console.log(
          `${date.slice(0, 10)} ${commit.slice(0, 8)}: ${t.units} units, ${t.locked} locked, ${t.clean} clean, ${t.dirty} dirty, ${t.classHits + t.styleHits} hits, ${detail.diagnostics.length} diagnostics`,
        )
      } finally {
        rmSync(temp, { recursive: true, force: true })
      }
    }
    manifest.snapshots.push(summary)
    // Base commits keep the full detail; every other commit stores a patch against the base before it.
    if (isBase) {
      base = detail
      atomicWrite(detailPath(commit), detail)
    } else {
      if (!base) throw new Error(`No base detail before ${commit}`)
      atomicWrite(detailPath(commit), makePatch(base, detail!))
    }
  }
  if (
    cached?.success &&
    JSON.stringify(cached.data.snapshots) === JSON.stringify(manifest.snapshots)
  )
    manifest.generatedAt = cached.data.generatedAt
  atomicWrite(cachePath, manifestSchema.parse(manifest))
  const retained = new Set(manifest.snapshots.map((s) => `${s.commit}.json`))
  for (const file of readdirSync(output))
    if (/^[a-f0-9]{40}\.json$/.test(file) && !retained.has(file))
      rmSync(join(output, file))
  console.log(`Published ${manifest.snapshots.length} snapshots to ${output}`)
  return manifest
}
