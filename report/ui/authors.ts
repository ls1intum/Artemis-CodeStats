// GitHub logins for commit authors: from a noreply address when git has one, otherwise from the
// commits API of the Artemis repository, which knows the account behind every integrated commit.
export const loginFromEmail = (email: string) =>
  /^(?:\d+\+)?([a-z\d](?:[a-z\d-]*[a-z\d])?)@users\.noreply\.github\.com$/i.exec(
    email,
  )?.[1]

export type LoginLookup = (commit: string) => Promise<string | undefined>

export function githubLoginLookup(
  token: string,
  fetcher: typeof fetch = fetch,
): LoginLookup {
  let exhausted = false
  return async (commit) => {
    if (exhausted) return undefined
    const response = await fetcher(
      `https://api.github.com/repos/ls1intum/Artemis/commits/${commit}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Artemis-CodeStats',
        },
      },
    )
    if (response.status === 403 || response.status === 429) {
      exhausted = true
      console.warn(`GitHub API rate limit reached; logins resolve next run`)
      return undefined
    }
    if (!response.ok) return undefined
    const body = (await response.json()) as { author?: { login?: string } }
    return body.author?.login
  }
}
