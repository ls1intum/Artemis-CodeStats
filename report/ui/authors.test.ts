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

test('the commits API resolves logins and stops at the rate limit', async () => {
  const calls: string[] = []
  const respond = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status })
  const lookup = githubLoginLookup('token', async (url, init) => {
    calls.push(String(url))
    assert.equal(
      new Headers(init?.headers).get('authorization'),
      'Bearer token',
    )
    if (String(url).endsWith('/limited')) return respond(403, {})
    if (String(url).endsWith('/unknown')) return respond(404, {})
    return respond(200, { author: { login: 'octocat' } })
  })
  assert.equal(await lookup('known'), 'octocat')
  assert.equal(await lookup('unknown'), undefined)
  assert.equal(await lookup('limited'), undefined)
  assert.equal(await lookup('known'), undefined, 'no calls after the limit')
  assert.equal(calls.length, 3)
})
