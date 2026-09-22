// GitHub logins for commit authors: from a noreply address when git has one, otherwise from the
// commits API of the Artemis repository, which knows the account behind every integrated commit.
export const loginFromEmail = (email: string) =>
  /^(?:\d+\+)?([a-z\d](?:[a-z\d-]*[a-z\d])?)@users\.noreply\.github\.com$/i.exec(
    email,
  )?.[1]

export type LoginLookup = (commit: string) => Promise<string | undefined>

// Commits the API cannot resolve (author without a linked account) are asked again on every
// run, so the number of requests per run is bounded; the rest wait for the next run.
export const lookupBudget = 200

// The lookup never throws: a rejected token, a rate limit or a network failure ends lookups
// for this run and the report is still produced, with logins resolved on a later run.
export function githubLoginLookup(
  token: string,
  fetcher: typeof fetch = fetch,
  budget = lookupBudget,
): LoginLookup {
  let stopped = false
  let requests = 0
  const stop = (reason: string) => {
    stopped = true
    console.warn(`GitHub login lookup stopped: ${reason}; retried next run`)
    return undefined
  }
  return async (commit) => {
    if (stopped) return undefined
    if (requests >= budget) return stop(`budget of ${budget} requests used`)
    requests++
    let response: Response
    try {
      response = await fetcher(
        `https://api.github.com/repos/ls1intum/Artemis/commits/${commit}`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Artemis-CodeStats',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )
    } catch (error) {
      return stop(error instanceof Error ? error.message : String(error))
    }
    if (response.status === 401) return stop('token rejected')
    if (response.status === 403 || response.status === 429)
      return stop(
        `HTTP ${response.status}, ${response.headers.get('x-ratelimit-remaining') ?? '?'} requests left until ${response.headers.get('x-ratelimit-reset') ?? '?'}`,
      )
    if (!response.ok) return undefined
    const body = (await response.json()) as { author?: { login?: string } }
    return body.author?.login
  }
}
