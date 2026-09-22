import { test } from 'node:test'
import assert from 'node:assert/strict'
import { githubLoginLookup, loginFromEmail } from './authors'

test('logins come from noreply addresses', () => {
  assert.equal(
    loginFromEmail('92953467+az108@users.noreply.github.com'),
    'az108',
  )
  assert.equal(
    loginFromEmail('maximiliansoelch@users.noreply.github.com'),
    'maximiliansoelch',
  )
  assert.equal(loginFromEmail('krusche@tum.de'), undefined)
})

test('the commits API resolves logins and every failure ends lookups for the run', async () => {
  const calls: string[] = []
  const respond = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status })
  const fetcher: typeof fetch = async (url, init) => {
    calls.push(String(url).split('/').pop()!)
    assert.equal(
      new Headers(init?.headers).get('authorization'),
      'Bearer token',
    )
    if (String(url).endsWith('/limited')) return respond(403, {})
    if (String(url).endsWith('/unknown')) return respond(404, {})
    if (String(url).endsWith('/offline')) throw new Error('ENOTFOUND')
    if (String(url).endsWith('/rejected')) return respond(401, {})
    return respond(200, { author: { login: 'octocat' } })
  }
  const limited = githubLoginLookup('token', fetcher)
  assert.equal(await limited('known'), 'octocat')
  assert.equal(await limited('unknown'), undefined)
  assert.equal(await limited('limited'), undefined)
  assert.equal(await limited('known'), undefined, 'no calls after the limit')
  assert.deepEqual(calls, ['known', 'unknown', 'limited'])

  const offline = githubLoginLookup('token', fetcher)
  assert.equal(
    await offline('offline'),
    undefined,
    'network errors do not throw',
  )
  assert.equal(await offline('known'), undefined)

  const rejected = githubLoginLookup('token', fetcher)
  assert.equal(await rejected('rejected'), undefined)
  assert.equal(await rejected('known'), undefined)

  const budgeted = githubLoginLookup('token', fetcher, 2)
  assert.equal(await budgeted('known'), 'octocat')
  assert.equal(await budgeted('known'), 'octocat')
  assert.equal(await budgeted('known'), undefined, 'budget exhausted')
  assert.equal(calls.length, 3 + 1 + 1 + 2)
})

// Runs where a token exists (CI provides github.token) and proves the token can read the
// Artemis commits API, which the hourly collection depends on.
test(
  'the GitHub token resolves the author of the package adoption commit',
  { skip: !process.env.GITHUB_TOKEN && 'GITHUB_TOKEN is not set' },
  async () => {
    const lookup = githubLoginLookup(process.env.GITHUB_TOKEN!)
    assert.equal(
      await lookup('45bcba707254de4ccee7bb4c83526fbdfa45c6fc'),
      'FelixTJDietrich',
    )
  },
)
