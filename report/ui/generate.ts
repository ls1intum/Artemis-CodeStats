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
import { renderBrief } from '../../src/features/migrations/brief'
import {
  analyzerVersion,
  detailSchema,
  manifestSchema,
  type Manifest,
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
    schemaVersion: 3,
    analyzerVersion,
    generatedAt: new Date().toISOString(),
    baseline,
    packageAdoption,
    evidenceCommits: planned.evidenceCommits,
    snapshots: [],
  }
  const atomicWrite = (path: string, value: unknown) => {
    writeFileSync(`${path}.tmp`, JSON.stringify(value) + '\n')
    renameSync(`${path}.tmp`, path)
  }
  for (const revision of planned.snapshots) {
    const { commit, date } = revision
    const retainEvidence = planned.evidenceCommits.includes(commit)
    const detailPath = join(output, `${commit}.json`)
    const prior =
      cached?.success && cached.data.snapshots.find((s) => s.commit === commit)
    if (prior && (!retainEvidence || existsSync(detailPath))) {
      if (retainEvidence) {
        const detail = detailSchema.parse(
          JSON.parse(readFileSync(detailPath, 'utf8')),
        )
        const units = detail.units.length
        if (
          detail.commit !== commit ||
          units !== prior.totals.units ||
          detail.units.filter((u) => u.status === 'dirty').length !==
            prior.totals.dirty ||
          detail.lockable.length !== prior.totals.lockableDirs
        )
          throw new Error(
            `Cached evidence does not match ${commit}; run with --rebuild`,
          )
      }
      manifest.snapshots.push(prior)
      continue
    }
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
      const { summary, detail } = await analyzeTree(temp, revision)
      manifest.snapshots.push(summary)
      if (retainEvidence) atomicWrite(detailPath, detailSchema.parse(detail))
      const t = summary.totals
      console.log(
        `${date.slice(0, 10)} ${commit.slice(0, 8)}: ${t.units} units, ${t.locked} locked, ${t.clean} clean, ${t.dirty} dirty, ${t.classHits + t.styleHits} hits, ${detail.diagnostics.length} diagnostics`,
      )
    } finally {
      rmSync(temp, { recursive: true, force: true })
    }
  }
  if (
    cached?.success &&
    JSON.stringify(cached.data.snapshots) === JSON.stringify(manifest.snapshots)
  )
    manifest.generatedAt = cached.data.generatedAt
  atomicWrite(cachePath, manifestSchema.parse(manifest))
  // Agent-facing entry points: a markdown brief and its JSON twin for the latest checkpoint.
  const latest = manifest.snapshots.at(-1)!
  const brief = renderBrief(
    latest,
    detailSchema.parse(
      JSON.parse(readFileSync(join(output, `${latest.commit}.json`), 'utf8')),
    ),
  )
  writeFileSync(join(output, 'brief.md'), brief.markdown)
  atomicWrite(join(output, 'brief.json'), brief.json)
  const retained = new Set(
    manifest.evidenceCommits.map((commit) => `${commit}.json`),
  )
  for (const file of readdirSync(output))
    if (/^[a-f0-9]{40}\.json$/.test(file) && !retained.has(file))
      rmSync(join(output, file))
  console.log(`Published ${manifest.snapshots.length} snapshots to ${output}`)
  return manifest
}
