import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  analyzeScript,
  analyzeStyles,
  analyzeTemplate,
  loadRule,
  readKit,
  styleHits,
  type Kit,
  type Rule,
} from './analyze'
import { loginFromEmail, type LoginLookup } from './authors'
import type { Author, Credit } from '../../src/features/migrations/model'

// Who did the work behind a squash-merged pull request: the commits on the pull request
// branch (GitHub keeps refs/pull/<n>/head after the merge) are walked from the merge base, and
// each author is weighted by the legacy they removed in those commits — Bootstrap hits, PrimeNG
// and ng-bootstrap occurrences — plus TUM UI occurrences they added; when nobody touched legacy
// the weight is client lines changed. Authors without a GitHub account (unlinked addresses,
// coding agents) fold into the pull request author, who drove that work, and so do shares
// below five percent.

const client = /^src\/main\/webapp\/.*\.(html|scss|ts)$/
const excluded = /\.(spec|stories|d)\.ts$/

type Legacy = {
  hits: number
  primeng: number
  ngBootstrap: number
  tumUi: number
}
const none: Legacy = { hits: 0, primeng: 0, ngBootstrap: 0, tumUi: 0 }
const sum = (u: Record<string, number>) =>
  Object.values(u).reduce((a, b) => a + b, 0)

// Legacy and kit usage inside one file, for the forms the tree analyzer counts per unit.
export function legacyOf(
  path: string,
  text: string,
  rule: Rule,
  kit: Kit,
): Legacy {
  if (path.endsWith('.scss'))
    return { ...none, hits: styleHits(analyzeStyles(text)) }
  if (path.endsWith('.html')) {
    const t = analyzeTemplate(text, path, rule, kit)
    return {
      hits: sum(t.tokens),
      primeng: sum(t.primeng),
      ngBootstrap: sum(t.ngBootstrap),
      tumUi: sum(t.tumUi),
    }
  }
  const script = analyzeScript(path, text)
  const result: Legacy = {
    hits: sum(script.tokens),
    primeng: sum(script.services.primeng),
    ngBootstrap: sum(script.services.ngBootstrap),
    tumUi: 0,
  }
  for (const d of script.declarations)
    if (d.template) {
      const t = analyzeTemplate(d.template, path, rule, kit)
      result.hits += sum(t.tokens)
      result.primeng += sum(t.primeng)
      result.ngBootstrap += sum(t.ngBootstrap)
      result.tumUi += sum(t.tumUi)
    }
  return result
}

// Weight of a change: legacy removed and kit adopted; additions of legacy earn nothing.
export const weightOf = (before: Legacy, after: Legacy) =>
  Math.max(0, before.hits - after.hits) +
  Math.max(0, before.primeng - after.primeng) +
  Math.max(0, before.ngBootstrap - after.ngBootstrap) +
  Math.max(0, after.tumUi - before.tumUi)

type BranchCommit = { commit: string; name: string; email: string }

export type Git = (...args: string[]) => string
export const minimumShare = 0.05

// Fetches the pull request heads that are not present yet, in one round trip.
export function fetchPullHeads(git: Git, numbers: string[]) {
  const missing = numbers.filter((n) => {
    try {
      git('rev-parse', '--verify', '-q', `refs/remotes/pr/${n}`)
      return false
    } catch {
      return true
    }
  })
  for (let i = 0; i < missing.length; i += 50)
    try {
      git(
        'fetch',
        '-q',
        'origin',
        ...missing
          .slice(i, i + 50)
          .map((n) => `+refs/pull/${n}/head:refs/remotes/pr/${n}`),
      )
    } catch (error) {
      console.warn(
        `Pull request heads could not be fetched: ${error instanceof Error ? error.message.split('\n')[0] : error}`,
      )
    }
}

export async function creditsOf({
  git,
  repo,
  commit,
  parent,
  number,
  author,
  authorEmail,
  lookupLogin,
  logins = new Map(),
}: {
  git: Git
  repo: string
  commit: string
  parent: string
  number: string
  author: Author
  // Address of the squash commit's author; commits with it need no lookup.
  authorEmail: string
  lookupLogin?: LoginLookup
  // Login per author address, shared across pull requests of one run.
  logins?: Map<string, string | undefined>
}): Promise<Credit[] | undefined> {
  const head = `refs/remotes/pr/${number}`
  let base: string
  try {
    base = git('merge-base', head, parent)
  } catch {
    return undefined
  }
  const commits: BranchCommit[] = git(
    'rev-list',
    '--no-merges',
    '--reverse',
    '--format=%H%x1f%an%x1f%ae',
    `${base}..${head}`,
  )
    .split('\n')
    .filter((line) => line.includes('\x1f'))
    .map((line) => {
      const [commit, name, email] = line.split('\x1f')
      return { commit, name, email }
    })
  if (!commits.length) return [{ author, share: 1 }]
  const temp = mkdtempSync(join(tmpdir(), 'codestats-credits-'))
  const byAuthor = new Map<
    string,
    { author: Author; weight: number; lines: number }
  >()
  try {
    const present = git(
      'ls-tree',
      '--name-only',
      commit,
      '--',
      'rules/no-bootstrap-classes.mjs',
      'packages/tum-ui/src/lib',
      'src/main/webapp/app/shared-ui/tum-ui',
    )
      .split('\n')
      .filter(Boolean)
    execFileSync('tar', ['-x', '-C', temp], {
      input: execFileSync(
        'git',
        ['-C', repo, 'archive', commit, '--', ...present],
        {
          maxBuffer: 64 * 1024 * 1024,
        },
      ),
    })
    const { rule } = await loadRule(temp)
    const kit = readKit(temp)
    const blob = (rev: string, path: string) => {
      try {
        return git('show', `${rev}:${path}`)
      } catch {
        return ''
      }
    }
    const measure = (rev: string, path: string) => {
      const text = blob(rev, path)
      if (!text) return none
      try {
        return legacyOf(path, text, rule, kit)
      } catch {
        return none
      }
    }
    for (const c of commits) {
      let login = logins.get(c.email)
      if (!logins.has(c.email)) {
        login = loginFromEmail(c.email)
        if (!login && c.email !== authorEmail) {
          // Without a working lookup the credits would be stored incomplete; defer them.
          if (!lookupLogin || lookupLogin.unavailable?.()) return undefined
          login = await lookupLogin(c.commit)
          if (lookupLogin.unavailable?.()) return undefined
        }
        logins.set(c.email, login)
      }
      // Credit goes to the pull request author unless the commit author has an account of their own.
      const credited: Author =
        login && login !== author.login ? { name: c.name, login } : author
      const key = credited.login ?? credited.name
      const row = byAuthor.get(key) ?? { author: credited, weight: 0, lines: 0 }
      for (const line of git(
        'diff-tree',
        '--no-commit-id',
        '-r',
        '-M',
        '--name-status',
        c.commit,
      )
        .split('\n')
        .filter(Boolean)) {
        const [status, from, to] = line.split('\t')
        const after = to ?? from
        const before = status.startsWith('R') ? from : after
        if (!client.test(after) || excluded.test(after)) continue
        row.weight += weightOf(
          status === 'A' ? none : measure(`${c.commit}^`, before),
          status === 'D' ? none : measure(c.commit, after),
        )
      }
      for (const line of git('diff', '--numstat', `${c.commit}^`, c.commit)
        .split('\n')
        .filter(Boolean)) {
        const [added, deleted, path] = line.split('\t')
        if (client.test(path)) row.lines += Number(added) + Number(deleted) || 0
      }
      byAuthor.set(key, row)
    }
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
  const rows = [...byAuthor.values()]
  const weighted = rows.some((r) => r.weight > 0) ? 'weight' : 'lines'
  const total = rows.reduce((n, r) => n + r[weighted], 0)
  if (!total) return [{ author, share: 1 }]
  const shares = rows
    .map((r) => ({ author: r.author, share: r[weighted] / total }))
    .sort((a, b) => b.share - a.share)
  // Small shares fold into the largest one.
  const kept = shares.filter((c) => c.share >= minimumShare)
  const credits = kept.length ? kept : shares.slice(0, 1)
  credits[0].share += shares
    .filter((c) => !credits.includes(c))
    .reduce((n, c) => n + c.share, 0)
  // Three decimals that still sum to one.
  const rounded = credits.map((c) => ({
    ...c,
    share: Math.round(c.share * 1000) / 1000,
  }))
  rounded[0].share =
    Math.round((1 - rounded.slice(1).reduce((n, c) => n + c.share, 0)) * 1000) /
    1000
  return rounded
}
