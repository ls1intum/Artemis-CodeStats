import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { planHistory } from './history'
import { generateReports } from './generate'
import type { LoginLookup } from './authors'
import { fixtureFiles, writeFixture } from './fixture'

const revision = (commit: string, day: number) => ({
  commit,
  date: `2026-01-${String(day).padStart(2, '0')}T12:00:00Z`,
  subject: `day ${day}`,
})

test('history retains every integrated commit since adoption, with sparse earlier history and bounded evidence', () => {
  const history = [
    revision('pilot', 1),
    revision('early', 2),
    revision('package', 3),
    revision('a', 3),
    revision('b', 4),
    revision('weekly', 10),
    revision('head', 11),
  ]
  const result = planHistory(history, 'package')
  assert.deepEqual(
    result.snapshots.map((s) => s.commit),
    ['pilot', 'package', 'a', 'b', 'weekly', 'head'],
  )
  assert.deepEqual(result.bases, ['pilot', 'package', 'weekly'])
  assert.throws(() => planHistory(history, 'not-on-first-parent'), /missing/)
})

test('generator catches up missed commits, preserves source checkout, is idempotent and rejects corrupt evidence', async () => {
  const root = mkdtempSync(join(tmpdir(), 'codestats-history-test-'))
  const repo = join(root, 'source')
  const output = join(root, 'reports')
  mkdirSync(repo)
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
  const file = join(
    repo,
    'src/main/webapp/app/exam/manage/dialog/dialog.component.html',
  )
  const commit = (day: number, html: string) => {
    writeFileSync(file, html)
    git('add', '.')
    execFileSync(
      'git',
      [
        '-C',
        repo,
        '-c',
        'commit.gpgsign=false',
        'commit',
        '-qm',
        `day ${day} (#${day})`,
      ],
      {
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: revision('', day).date,
          GIT_COMMITTER_DATE: revision('', day).date,
        },
      },
    )
    return git('rev-parse', 'HEAD')
  }
  try {
    git('init', '-q')
    git('config', 'user.name', 'Test')
    git('config', 'user.email', 'test@example.com')
    writeFixture(repo, fixtureFiles)
    const baseline = commit(1, '<div class="btn"></div>')
    const packageAdoption = commit(2, '<div class="flex"></div>')
    const oldHead = commit(3, '<div class="btn"></div>')
    // First run: the lookup is rate-limited, so nothing is resolved and nothing is remembered.
    const lookups: string[] = []
    const limited: LoginLookup = async (commit) => {
      lookups.push(commit)
      return undefined
    }
    limited.unavailable = () => true
    await generateReports({
      repo,
      output,
      baseline,
      packageAdoption,
      lookupLogin: limited,
    })
    assert.deepEqual(lookups, [baseline, packageAdoption, oldHead])
    // Later runs: one lookup per author address resolves every commit of that author.
    lookups.length = 0
    const options = {
      repo,
      output,
      baseline,
      packageAdoption,
      lookupLogin: async (commit: string) => {
        lookups.push(commit)
        return 'octocat'
      },
    }
    const removed = commit(4, '<div class="flex"></div>')
    const head = commit(5, '<div class="btn row"></div>')
    writeFileSync(file, 'uncommitted local work')
    const before = git('status', '--porcelain')
    const report = await generateReports(options)
    assert.equal(git('rev-parse', 'HEAD'), head)
    assert.equal(git('status', '--porcelain'), before)
    assert.equal(readFileSync(file, 'utf8'), 'uncommitted local work')
    assert.deepEqual(
      report.snapshots.map((s) => s.commit),
      [baseline, packageAdoption, oldHead, removed, head],
    )
    assert.deepEqual(
      report.snapshots.map((s) => s.totals.dirty),
      [6, 5, 6, 5, 6],
    )
    assert.deepEqual(
      report.snapshots.map((s) => s.totals.lockableDirs),
      [2, 3, 2, 3, 2],
    )
    assert.deepEqual(
      report.snapshots.map(
        (s) => s.flow && [s.flow.hitsRemoved, s.flow.hitsAdded],
      ),
      [undefined, [1, 0], [0, 1], [1, 0], [0, 2]],
      'gross flows per commit, none for the first snapshot',
    )
    assert.equal(report.snapshots.at(-1)?.subject, 'day 5 (#5)')
    assert.deepEqual(
      report.snapshots.map((s) => s.author.login),
      ['octocat', 'octocat', 'octocat', 'octocat', 'octocat'],
      'missing logins are looked up again, once per author address',
    )
    assert.deepEqual(
      report.snapshots.map((s) => s.parent),
      [undefined, baseline, packageAdoption, oldHead, removed],
    )
    assert.deepEqual(lookups, [baseline], 'one lookup for the shared address')
    const stored = (commit: string) =>
      JSON.parse(readFileSync(join(output, `${commit}.json`), 'utf8'))
    assert.equal(
      stored(packageAdoption).base,
      undefined,
      'milestones are bases',
    )
    assert.equal(
      stored(head).base,
      packageAdoption,
      'later commits are patches',
    )
    assert.deepEqual(
      stored(head).units.changed.map((u: { id: string }) =>
        u.id.split('/').pop(),
      ),
      ['dialog.component.ts'],
      'only the unit whose own facts changed',
    )
    assert.deepEqual(stored(removed).units.changed, [])
    const manifest = readFileSync(join(output, 'index.json'), 'utf8')
    await generateReports(options)
    assert.equal(readFileSync(join(output, 'index.json'), 'utf8'), manifest)
    rmSync(join(output, `${head}.json`))
    await generateReports(options)
    assert.equal(existsSync(join(output, `${head}.json`)), true)
    assert.equal(readFileSync(join(output, 'index.json'), 'utf8'), manifest)
    const detailPath = join(output, `${packageAdoption}.json`)
    const detail = stored(packageAdoption)
    detail.units = detail.units.slice(1)
    writeFileSync(detailPath, JSON.stringify(detail))
    await assert.rejects(generateReports(options), /Cached detail/)
    assert.equal(readFileSync(join(output, 'index.json'), 'utf8'), manifest)
    writeFileSync(join(output, 'index.json'), '{broken JSON')
    await generateReports({ ...options, rebuild: true })
    assert.equal(stored(packageAdoption).units.length, 11)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
