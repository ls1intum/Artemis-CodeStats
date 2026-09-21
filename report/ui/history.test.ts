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

const revision = (commit: string, day: number) => ({
  commit,
  date: `2026-01-${String(day).padStart(2, '0')}T12:00:00Z`,
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
  assert.deepEqual(result.evidenceCommits, [
    'pilot',
    'package',
    'weekly',
    'head',
  ])
  assert.throws(() => planHistory(history, 'not-on-first-parent'), /missing/)
})

test('generator catches up missed commits, preserves source checkout, is idempotent and rejects corrupt evidence', () => {
  const root = mkdtempSync(join(tmpdir(), 'codestats-history-test-'))
  const repo = join(root, 'source')
  const output = join(root, 'reports')
  mkdirSync(repo)
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
  const file = join(repo, 'src/main/webapp/app/exam/test.component.html')
  const commit = (day: number, html: string) => {
    writeFileSync(file, html)
    git('add', '.')
    execFileSync(
      'git',
      ['-C', repo, '-c', 'commit.gpgsign=false', 'commit', '-qm', `day ${day}`],
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
    mkdirSync(join(repo, 'src/main/webapp/app/exam'), { recursive: true })
    mkdirSync(join(repo, 'src/main/webapp/content'), { recursive: true })
    writeFileSync(join(repo, 'src/main/webapp/content/style.css'), 'body {}')
    const baseline = commit(1, '<p-dialog />')
    const packageAdoption = commit(2, '<tum-ui-button />')
    const oldHead = commit(3, '<p-dialog /><tum-ui-button />')
    const options = { repo, output, baseline, packageAdoption }
    generateReports(options)
    const removed = commit(4, '<tum-ui-button />')
    const head = commit(5, '<p-dialog /><p-select />')
    writeFileSync(file, 'uncommitted local work')
    const before = git('status', '--porcelain')
    const report = generateReports(options)
    assert.equal(git('rev-parse', 'HEAD'), head)
    assert.equal(git('status', '--porcelain'), before)
    assert.equal(readFileSync(file, 'utf8'), 'uncommitted local work')
    assert.deepEqual(
      report.snapshots.map((s) => s.commit),
      [baseline, packageAdoption, oldHead, removed, head],
    )
    assert.deepEqual(
      report.snapshots.map((s) => s.counts.primeng),
      [1, 0, 1, 0, 1],
    )
    assert.equal(existsSync(join(output, `${oldHead}.json`)), false)
    assert.equal(existsSync(join(output, `${head}.json`)), true)
    const manifest = readFileSync(join(output, 'index.json'), 'utf8')
    generateReports(options)
    assert.equal(readFileSync(join(output, 'index.json'), 'utf8'), manifest)
    rmSync(join(output, `${head}.json`))
    generateReports(options)
    assert.equal(existsSync(join(output, `${head}.json`)), true)
    assert.equal(readFileSync(join(output, 'index.json'), 'utf8'), manifest)
    const detailPath = join(output, `${head}.json`)
    const detail = JSON.parse(readFileSync(detailPath, 'utf8'))
    detail.findings = []
    writeFileSync(detailPath, JSON.stringify(detail))
    assert.throws(() => generateReports(options), /Cached evidence counts/)
    assert.equal(readFileSync(join(output, 'index.json'), 'utf8'), manifest)
    writeFileSync(join(output, 'index.json'), '{broken JSON')
    generateReports({ ...options, rebuild: true })
    assert.ok(JSON.parse(readFileSync(detailPath, 'utf8')).findings.length > 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
