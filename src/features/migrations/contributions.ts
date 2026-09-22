import type { Author, Summary } from './model'
import { hits } from './format'

// What one integrated commit changed against the snapshot before it.
export type Contribution = {
  commit: string
  parent?: string
  date: string
  subject: string
  author: Author
  // Deltas of the totals; negative hits, PrimeNG and ng-bootstrap are progress.
  hits: number
  legacyFree: number
  primeng: number
  ngBootstrap: number
  tumUi: number
  locks: number
  // The previous snapshot is this commit's parent, so the deltas are this author's work.
  // Weekly samples before package adoption span many commits and are not attributable.
  attributable: boolean
  // The Bootstrap rule itself changed, so the hit delta is not migration work.
  ruleChanged: boolean
}

export function contributions(series: Summary[]): Contribution[] {
  return series.slice(1).map((s, i) => {
    const p = series[i]
    return {
      commit: s.commit,
      parent: s.parent,
      date: s.date,
      subject: s.subject,
      author: s.author,
      hits: hits(s.totals) - hits(p.totals),
      legacyFree: s.totals.legacyFree - p.totals.legacyFree,
      primeng: s.totals.primeng - p.totals.primeng,
      ngBootstrap: s.totals.ngBootstrap - p.totals.ngBootstrap,
      tumUi: s.totals.tumUi - p.totals.tumUi,
      locks: s.totals.lockedDirs - p.totals.lockedDirs,
      attributable: s.parent === p.commit,
      ruleChanged: s.rule !== p.rule,
    }
  })
}

export const moved = (c: Contribution) =>
  c.hits !== 0 ||
  c.legacyFree !== 0 ||
  c.primeng !== 0 ||
  c.ngBootstrap !== 0 ||
  c.tumUi !== 0 ||
  c.locks !== 0

export const progressed = (c: Contribution) =>
  (c.hits < 0 && !c.ruleChanged) ||
  c.legacyFree > 0 ||
  c.primeng < 0 ||
  c.ngBootstrap < 0 ||
  c.tumUi > 0 ||
  c.locks > 0

export const authorKey = (a: Author) => a.login ?? a.name
export const isBot = (a: Author) => /\[bot\]$/i.test(a.login ?? a.name)

export type Contributor = {
  key: string
  author: Author
  rank: number
  // Commits that made progress on at least one measure.
  prs: number
  hitsRemoved: number
  hitsAdded: number
  legacyFree: number
  primeng: number
  ngBootstrap: number
  tumUi: number
  locks: number
  first: Contribution
  last: Contribution
}

// Progress per author over attributable commits, ranked by Bootstrap hits removed, then units
// made legacy-free, then TUM UI adoption. Bots and authors without progress are not listed;
// legacy an author added alongside progress stays visible.
export function leaderboard(list: Contribution[]): Contributor[] {
  const byAuthor = new Map<string, Contributor>()
  for (const c of list) {
    if (!c.attributable || isBot(c.author) || !moved(c)) continue
    const key = authorKey(c.author)
    const row = byAuthor.get(key) ?? {
      key,
      author: c.author,
      rank: 0,
      prs: 0,
      hitsRemoved: 0,
      hitsAdded: 0,
      legacyFree: 0,
      primeng: 0,
      ngBootstrap: 0,
      tumUi: 0,
      locks: 0,
      first: c,
      last: c,
    }
    if (c.author.login && !row.author.login) row.author = c.author
    if (progressed(c)) row.prs++
    if (!c.ruleChanged) {
      if (c.hits < 0) row.hitsRemoved -= c.hits
      else row.hitsAdded += c.hits
    }
    row.legacyFree += c.legacyFree
    row.primeng -= c.primeng
    row.ngBootstrap -= c.ngBootstrap
    row.tumUi += c.tumUi
    row.locks += c.locks
    if (progressed(c)) row.last = c
    byAuthor.set(key, row)
  }
  return [...byAuthor.values()]
    .filter((r) => r.prs > 0)
    .sort(
      (a, b) =>
        b.hitsRemoved - a.hitsRemoved ||
        b.legacyFree - a.legacyFree ||
        b.tumUi - a.tumUi ||
        a.author.name.localeCompare(b.author.name),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }))
}
