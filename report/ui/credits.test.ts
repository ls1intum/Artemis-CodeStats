import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { creditsOf } from './credits'
import type { LoginLookup } from './authors'
import { fixtureFiles, writeFixture } from './fixture'

const template = 'src/main/webapp/app/exam/manage/dialog/dialog.component.html'
const script = 'src/main/webapp/app/exam/manage/dialog/dialog.component.ts'

test('credits follow the legacy removed on the pull request branch, or lines when nobody touched legacy', async () => {
  const repo = mkdtempSync(join(tmpdir(), 'codestats-credits-test-'))
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', repo, '-c', 'commit.gpgsign=false', ...args], {
      encoding: 'utf8',
    }).trim()
  const commit = (
    message: string,
    author: string,
    files: Record<string, string>,
  ) => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(repo, path)), { recursive: true })
      writeFileSync(join(repo, path), text)
    }
    git('add', '.')
    git('commit', '-qm', message, `--author=${author}`)
    return git('rev-parse', 'HEAD')
  }
  const ada = 'Ada <1+ada@users.noreply.github.com>'
  const bob = 'Bob <2+bob@users.noreply.github.com>'
  const agent = 'Claude <noreply@anthropic.com>'
  const author = { name: 'Ada', login: 'ada' }
  try {
    git('init', '-q', '-b', 'main')
    git('config', 'user.name', 'Test')
    git('config', 'user.email', 'test@example.com')
    writeFixture(repo, fixtureFiles)
    const base = commit('base', ada, {
      [template]: '<div class="btn row"><span class="badge"></span></div>',
    })
    // A branch where Ada removes two hits, an agent removes one and Bob only edits TypeScript.
    git('checkout', '-qb', 'feature')
    commit('remove btn', ada, {
      [template]: '<div class="row"><span class="badge"></span></div>',
    })
    commit('remove badge', ada, { [template]: '<div class="row"></div>' })
    commit('remove row', agent, { [template]: '<div></div>' })
    commit('tidy', bob, {
      [script]: `${git('show', `HEAD:${script}`)}\n// tidy\n`,
    })
    const head = git('rev-parse', 'HEAD')
    git('checkout', '-q', 'main')
    const squash = commit('Migrate the dialog (#7)', ada, {
      [template]: '<div></div>',
      [script]: git('show', `${head}:${script}`),
    })
    git('update-ref', 'refs/remotes/pr/7', head)
    const lookups: string[] = []
    const lookup: LoginLookup = async (sha) => {
      lookups.push(sha)
      return undefined
    }
    const credits = await creditsOf({
      git,
      repo,
      commit: squash,
      parent: base,
      number: '7',
      author,
      authorEmail: '1+ada@users.noreply.github.com',
      lookupLogin: lookup,
    })
    assert.deepEqual(
      credits,
      [{ author, share: 1 }],
      'agent work folds into the author, Bob removed no legacy',
    )
    assert.equal(lookups.length, 1, 'only the agent address needed a lookup')

    // A branch that touches no legacy: shares follow client lines changed, small ones fold.
    git('checkout', '-qb', 'lines', base)
    commit('ada lines', ada, {
      [script]: `${git('show', `${base}:${script}`)}\n${'// a\n'.repeat(30)}`,
    })
    commit('bob lines', bob, {
      [script]: `${git('show', 'HEAD:' + script)}\n${'// b\n'.repeat(10)}`,
    })
    commit('tiny', 'Cy <3+cy@users.noreply.github.com>', {
      [script]: `${git('show', 'HEAD:' + script)}\n// c\n`,
    })
    const linesHead = git('rev-parse', 'HEAD')
    git('checkout', '-q', 'main')
    const squash2 = commit('Comment the dialog (#8)', ada, {
      [script]: git('show', `${linesHead}:${script}`),
    })
    git('update-ref', 'refs/remotes/pr/8', linesHead)
    const byLines = (await creditsOf({
      git,
      repo,
      commit: squash2,
      parent: squash,
      number: '8',
      author,
      authorEmail: '1+ada@users.noreply.github.com',
    }))!
    assert.deepEqual(
      byLines.map((c) => c.author),
      [author, { name: 'Bob', login: 'bob' }],
      'Cy changed one line of forty and folds into the largest share',
    )
    assert.ok(byLines[0].share > 0.7 && byLines[0].share < 0.8)
    assert.equal(byLines[0].share + byLines[1].share, 1)

    // Without a usable lookup for an unknown address the credits wait for a later run.
    const stopped: LoginLookup = async () => undefined
    stopped.unavailable = () => true
    assert.equal(
      await creditsOf({
        git,
        repo,
        commit: squash,
        parent: base,
        number: '7',
        author,
        authorEmail: '1+ada@users.noreply.github.com',
        lookupLogin: stopped,
      }),
      undefined,
    )
    assert.equal(
      await creditsOf({
        git,
        repo,
        commit: squash,
        parent: base,
        number: '9',
        author,
        authorEmail: '1+ada@users.noreply.github.com',
      }),
      undefined,
      'no branch, no credits',
    )
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})
