import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const script = resolve('.github/scripts/publish-reports.sh')

function publish(dirty: boolean, ref = 'refs/heads/main') {
  const root = mkdtempSync(join(tmpdir(), 'codestats-publish-test-'))
  const bin = join(root, 'bin')
  mkdirSync(bin)
  const calls = join(root, 'calls.jsonl')
  const output = join(root, 'output')
  writeFileSync(
    join(bin, 'curl'),
    '#!/bin/sh\nprintf \'%s\\n\' \'{"ssh_keys":["ssh-ed25519 TEST"]}\'\n',
    { mode: 0o700 },
  )
  writeFileSync(
    join(bin, 'git'),
    `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
const ssh = process.env.GIT_SSH_COMMAND || ''
const key = ssh.split(' -i ')[1]?.split(' ')[0]
fs.appendFileSync(process.env.GIT_CALLS, JSON.stringify({ args, ssh, keyMode: key ? fs.statSync(key).mode & 0o777 : null }) + '\\n')
if (args[0] === 'diff') process.exit(process.env.TEST_DIRTY === '1' ? 1 : 0)
if (args[0] === 'rev-parse') process.stdout.write('${'b'.repeat(40)}\\n')
`,
    { mode: 0o700 },
  )
  try {
    const result = spawnSync('bash', [script], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        RUNNER_TEMP: root,
        REPORT_BRANCH: 'main',
        GITHUB_REF: ref,
        GITHUB_REPOSITORY: 'ls1intum/Artemis-CodeStats',
        GITHUB_OUTPUT: output,
        REPORT_PUBLISH_KEY: 'test-only-key',
        GIT_CALLS: calls,
        TEST_DIRTY: dirty ? '1' : '0',
      },
    })
    const recorded =
      result.status === 0
        ? readFileSync(calls, 'utf8')
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line))
        : []
    assert(
      !readdirSync(root).some((path) => path.startsWith('report-publish.')),
      'Temporary private key must be removed even after failure',
    )
    return {
      result,
      recorded,
      output: result.status === 0 ? readFileSync(output, 'utf8') : '',
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('publisher uses main-only SSH credentials, stages only evidence and publishes the exact commit', () => {
  const { result, recorded, output } = publish(true)
  assert.equal(result.status, 0, result.stderr)
  assert(recorded.every((call) => call.keyMode === 0o600))
  assert(
    recorded.every(
      (call) =>
        call.ssh.includes('StrictHostKeyChecking=yes') &&
        call.ssh.includes('IdentitiesOnly=yes'),
    ),
  )
  assert.deepEqual(recorded.find((call) => call.args[0] === 'add').args, [
    'add',
    'artemis',
    'public/migrations',
    'public/openapi',
    'public/collection-status.json',
  ])
  assert.deepEqual(recorded.find((call) => call.args[0] === 'push').args, [
    'push',
    'git@github.com:ls1intum/Artemis-CodeStats.git',
    'HEAD:main',
  ])
  assert.equal(output, `commit=${'b'.repeat(40)}\n`)
})

test('unchanged collections check credential access without making a commit or pushing', () => {
  const { result, recorded, output } = publish(false)
  assert.equal(result.status, 0, result.stderr)
  assert(recorded.some((call) => call.args[0] === 'ls-remote'))
  assert(!recorded.some((call) => ['commit', 'push'].includes(call.args[0])))
  assert.equal(output, `commit=${'b'.repeat(40)}\n`)
})

test('feature branches and main-named tags cannot use the publisher', () => {
  for (const ref of ['refs/heads/feature', 'refs/tags/main']) {
    const { result, recorded } = publish(true, ref)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /only from the default branch/)
    assert.deepEqual(recorded, [])
  }
})

test('rules keep history protection separate from narrowly scoped merge and automation exceptions', () => {
  const load = (name: string) =>
    JSON.parse(readFileSync(`.github/rulesets/${name}.json`, 'utf8'))
  const integrity = load('main-integrity')
  assert.deepEqual(integrity.bypass_actors, [])
  assert.deepEqual(
    integrity.rules.map((rule: { type: string }) => rule.type),
    ['deletion', 'non_fast_forward'],
  )
  const mergers = load('main-mergers')
  assert.deepEqual(
    mergers.bypass_actors
      .filter(
        (actor: { actor_type: string }) =>
          actor.actor_type === 'RepositoryRole',
      )
      .map((actor: { actor_id: number; bypass_mode: string }) => [
        actor.actor_id,
        actor.bypass_mode,
      ]),
    [
      [4, 'pull_request'],
      [5, 'pull_request'],
    ],
  )
  const review = load('main-review')
  const checks = review.rules.find(
    (rule: { type: string }) => rule.type === 'required_status_checks',
  ).parameters
  assert.deepEqual(checks.required_status_checks, [
    { context: 'verify', integration_id: 15368 },
    { context: 'reports', integration_id: 15368 },
  ])
  assert.equal(checks.strict_required_status_checks_policy, true)
  assert(
    !review.bypass_actors.some((actor: { actor_type: string }) =>
      ['Integration', 'Team'].includes(actor.actor_type),
    ),
  )
  const collector = readFileSync('.github/workflows/daily-report.yml', 'utf8')
  assert.match(collector, /environment: report-publisher/)
  assert.match(collector, /persist-credentials: false/)
  assert(!collector.includes('contents: write'))
  assert.match(collector, /secrets.REPORT_PUBLISH_KEY/)
  const deploy = readFileSync(
    '.github/workflows/deploy-github-pages.yml',
    'utf8',
  )
  assert.match(
    deploy,
    /paths-ignore:[\s\S]*?'public\/migrations\/\*\*'[\s\S]*?'artemis'/,
  )
})
