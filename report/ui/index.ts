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
import { join, resolve } from 'node:path'
import { analyzeDirectory } from './analyze'
import {
  analyzerVersion,
  detailSchema,
  dimensionKeys,
  legacyKeys,
  manifestSchema,
  type Manifest,
} from '../../src/features/migrations/model'

// First owned-kit pilot, then extraction into the internal workspace package.
const baseline = 'e6e7c9cca1e961ce05463177bc316dc42c8d1c38'
const packageAdoption = '45bcba707254de4ccee7bb4c83526fbdfa45c6fc'
const repo = resolve('artemis')
const output = resolve('public/migrations')
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
// Weekly first-parent samples, plus BOTH exact adoption milestones and HEAD.
const history = git(
  'log',
  '--first-parent',
  '--reverse',
  '--format=%H %cI',
  `${baseline}..${head}`,
)
  .split('\n')
  .filter(Boolean)
const commits = new Map<string, string>([
  [baseline, git('show', '-s', '--format=%cI', baseline)],
])
let previous = Date.parse(commits.get(baseline)!)
for (const row of history) {
  const [commit, date] = row.split(' ')
  if (
    Date.parse(date) - previous >= 7 * 86400000 ||
    commit === packageAdoption ||
    commit === head
  ) {
    commits.set(commit, date)
    previous = Date.parse(date)
  }
}
commits.set(packageAdoption, git('show', '-s', '--format=%cI', packageAdoption))
commits.set(head, git('show', '-s', '--format=%cI', head))
mkdirSync(output, { recursive: true })
const cachePath = join(output, 'index.json')
const cached = existsSync(cachePath)
  ? manifestSchema.safeParse(JSON.parse(readFileSync(cachePath, 'utf8')))
  : undefined
const manifest: Manifest = {
  schemaVersion: 1,
  analyzerVersion,
  generatedAt: new Date().toISOString(),
  baseline,
  packageAdoption,
  snapshots: [],
}
const atomicWrite = (path: string, value: unknown) => {
  writeFileSync(`${path}.tmp`, JSON.stringify(value) + '\n')
  renameSync(`${path}.tmp`, path)
}
for (const [commit, date] of [...commits].sort(
  (a, b) => Date.parse(a[1]) - Date.parse(b[1]),
)) {
  const detailPath = join(output, `${commit}.json`)
  const prior =
    cached?.success && cached.data.snapshots.find((s) => s.commit === commit)
  if (!process.argv.includes('--rebuild') && prior && existsSync(detailPath)) {
    const detail = detailSchema.parse(
      JSON.parse(readFileSync(detailPath, 'utf8')),
    )
    if (detail.commit !== commit)
      throw new Error(`Detail identity mismatch: ${commit}`)
    for (const scope of [prior, ...prior.modules]) {
      const findings =
        'name' in scope
          ? detail.findings.filter((finding) => finding.module === scope.name)
          : detail.findings
      const fileCount = (keys: readonly string[]) =>
        new Set(
          findings
            .filter((finding) => keys.includes(finding.dimension))
            .map((finding) => finding.path),
        ).size
      if (
        dimensionKeys.some((key) => fileCount([key]) !== scope.counts[key]) ||
        fileCount(legacyKeys) !== scope.legacyFiles
      )
        throw new Error(
          `Cached evidence counts do not match ${commit}; run with --rebuild`,
        )
    }
    manifest.snapshots.push(prior)
    continue
  }
  const temp = mkdtempSync(join(tmpdir(), 'codestats-ui-'))
  try {
    // Read committed trees without checkout, stash, worktree creation, or mutation of Artemis.
    const archive = execFileSync(
      'git',
      [
        '-C',
        repo,
        'archive',
        commit,
        'src/main/webapp/app',
        'src/main/webapp/content',
      ],
      { maxBuffer: 128 * 1024 * 1024 },
    )
    execFileSync('tar', ['-x', '-C', temp], { input: archive })
    const { snapshot, findings } = analyzeDirectory(temp, commit, date)
    manifest.snapshots.push(snapshot)
    atomicWrite(
      detailPath,
      detailSchema.parse({ analyzerVersion, commit, findings }),
    )
    console.log(
      `${date.slice(0, 10)} ${commit.slice(0, 8)}: ${snapshot.files} files, ${snapshot.legacyFiles} legacy, ${snapshot.diagnostics.length} diagnostics`,
    )
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}
// Do not refresh the freshness timestamp if the source and analysis did not change.
if (
  cached?.success &&
  JSON.stringify(cached.data.snapshots) === JSON.stringify(manifest.snapshots)
)
  manifest.generatedAt = cached.data.generatedAt
atomicWrite(cachePath, manifestSchema.parse(manifest))
// Rolling HEAD samples otherwise leave an unbounded daily pile of unreferenced details.
const retained = new Set(
  manifest.snapshots.map((snapshot) => `${snapshot.commit}.json`),
)
for (const file of readdirSync(output)) {
  if (/^[a-f0-9]{40}\.json$/.test(file) && !retained.has(file))
    rmSync(join(output, file))
}
console.log(`Published ${manifest.snapshots.length} snapshots to ${output}`)
