import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  readdir,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { collectReports, type Pipeline } from './collect-reports'

const before = 'a'.repeat(40)
const after = 'b'.repeat(40)
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'collection-test-'))
  for (const directory of ['migrations', 'openapi']) {
    await mkdir(path.join(root, 'public', directory), { recursive: true })
    await writeIndex(
      path.join(root, 'public', directory),
      directory === 'migrations' ? 'ui' : 'openapi',
      before,
    )
    await writeFile(
      path.join(root, 'public', directory, 'last-good'),
      'original evidence',
    )
  }
  return {
    root,
    repo: path.join(root, 'artemis'),
    ref: after,
    runUrl: 'https://github.com/owner/repo/actions/runs/1',
  }
}
async function writeIndex(output: string, dashboard: string, commit: string) {
  await writeFile(
    path.join(output, 'index.json'),
    JSON.stringify({
      snapshots: [
        dashboard === 'ui'
          ? { commit }
          : { artemisCommit: commit, analyzedAt: '2026-10-14T00:00:00Z' },
      ],
    }),
  )
}
for (const failed of ['ui', 'openapi'] as const)
  test(`${failed} failure retains last-good files while the other dashboard advances`, async () => {
    const options = await fixture()
    try {
      const pipeline: Pipeline = async (dashboard, output) => {
        await writeFile(path.join(output, 'last-good'), 'partial replacement')
        if (dashboard === failed)
          throw new Error('Injected analyzer or verification failure')
        await writeIndex(output, dashboard, after)
      }
      const status = await collectReports(options, pipeline)
      assert.equal(status.dashboards[failed].state, 'failed')
      assert.equal(status.dashboards[failed].publishedCommit, before)
      const successful = failed === 'ui' ? 'openapi' : 'ui'
      assert.equal(status.dashboards[successful].publishedCommit, after)
      const directory = failed === 'ui' ? 'migrations' : 'openapi'
      assert.equal(
        await readFile(
          path.join(options.root, 'public', directory, 'last-good'),
          'utf8',
        ),
        'original evidence',
      )
      assert.equal(
        (await readdir(path.join(options.root, 'public'))).some((file) =>
          file.startsWith('.report-install-'),
        ),
        false,
      )
      const saved = await readFile(
        path.join(options.root, 'public/collection-status.json'),
        'utf8',
      )
      await collectReports(
        { ...options, runUrl: 'https://github.com/owner/repo/actions/runs/2' },
        pipeline,
      )
      assert.equal(
        await readFile(
          path.join(options.root, 'public/collection-status.json'),
          'utf8',
        ),
        saved,
        'Repeated results must not generate heartbeat commits',
      )
    } finally {
      await rm(options.root, { recursive: true, force: true })
    }
  })

test('both failed collectors preserve both published datasets', async () => {
  const options = await fixture()
  try {
    const status = await collectReports(options, async () => {
      throw new Error('Broken collector')
    })
    for (const result of Object.values(status.dashboards))
      assert.deepEqual(result, { state: 'failed', publishedCommit: before })
  } finally {
    await rm(options.root, { recursive: true, force: true })
  }
})

test('a timed-out producer cannot install its partial report or stop the other producer', async () => {
  const options = await fixture()
  try {
    const status = await collectReports(
      { ...options, timeoutMs: 25 },
      async (dashboard, output, signal) => {
        await writeIndex(output, dashboard, after)
        if (dashboard === 'ui') {
          await new Promise<void>((_, reject) => {
            const timer = setTimeout(
              () => reject(new Error('Timeout test did not abort')),
              200,
            )
            signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer)
                reject(signal.reason)
              },
              { once: true },
            )
          })
        }
      },
    )
    assert.equal(status.dashboards.ui.publishedCommit, before)
    assert.equal(status.dashboards.openapi.publishedCommit, after)
  } finally {
    await rm(options.root, { recursive: true, force: true })
  }
})

test('wrong-revision output cannot replace validated evidence', async () => {
  const options = await fixture()
  try {
    const status = await collectReports(options, async () => {})
    assert(
      Object.values(status.dashboards).every(
        (result) =>
          result.state === 'failed' && result.publishedCommit === before,
      ),
    )
  } finally {
    await rm(options.root, { recursive: true, force: true })
  }
})
