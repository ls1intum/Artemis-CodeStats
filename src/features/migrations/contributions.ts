import { row, type Author, type Credit, type Summary } from './model'
import { hits } from './format'

// What one integrated commit changed against the snapshot before it.
export type Contribution = {
  commit: string
  parent?: string
  date: string
  subject: string
  author: Author
  // Who did the work, by share of legacy removed on the pull request branch; the author alone
  // when the branch was not analyzed, nobody when the change is not attributable.
  credits: Credit[]
  // Net change of the totals; negative hits, PrimeNG and ng-bootstrap are progress.
  hits: number
  legacyFree: number
  primeng: number
  ngBootstrap: number
  tumUi: number
  // Existing units newly under the lock list (new files in locked paths do not count).
  locked: number
  // Gross change, unit by unit with moves matched: Bootstrap hits removed and added, units
  // that became legacy-free and units that lost it. Absent flows fall back to the net change.
  hitsRemoved: number
  hitsAdded: number
  converted: number
  regressed: number
  // The previous snapshot is this commit's parent, so the change is this commit's work.
  // Weekly samples before package adoption span many commits and are not attributable.
  attributable: boolean
  // The Bootstrap rule itself changed: the hit change is not migration work, and the commit is
  // left out of credit, pace and last progress.
  ruleChanged: boolean
}

export function contributions(series: Summary[]): Contribution[] {
  return series.slice(1).map((s, i) => {
    const p = series[i]
    const net = hits(s.totals) - hits(p.totals)
    const attributable = s.parent === p.commit
    return {
      commit: s.commit,
      parent: s.parent,
      date: s.date,
      subject: s.subject,
      author: s.author,
      credits: attributable
        ? (s.credits ?? [{ author: s.author, share: 1 }])
        : [],
      hits: net,
      legacyFree: s.totals.legacyFree - p.totals.legacyFree,
      primeng: s.totals.primeng - p.totals.primeng,
      ngBootstrap: s.totals.ngBootstrap - p.totals.ngBootstrap,
      tumUi: s.totals.tumUi - p.totals.tumUi,
      locked: s.flow?.locked ?? 0,
      hitsRemoved: s.flow?.hitsRemoved ?? Math.max(0, -net),
      hitsAdded: s.flow?.hitsAdded ?? Math.max(0, net),
      converted: s.flow?.converted ?? 0,
      regressed: s.flow?.regressed ?? 0,
      attributable,
      ruleChanged: s.rule !== p.rule,
    }
  })
}

export const moved = (c: Contribution) =>
  c.hits !== 0 ||
  c.hitsRemoved !== 0 ||
  c.hitsAdded !== 0 ||
  c.legacyFree !== 0 ||
  c.converted !== 0 ||
  c.regressed !== 0 ||
  c.primeng !== 0 ||
  c.ngBootstrap !== 0 ||
  c.tumUi !== 0 ||
  c.locked !== 0

// Work towards the target: Bootstrap removed, units converted, libraries dropped, kit adopted,
// directories locked. Commits that change the rule itself are not progress.
export const progressed = (c: Contribution) =>
  !c.ruleChanged &&
  (c.hitsRemoved > 0 ||
    c.converted > 0 ||
    c.primeng < 0 ||
    c.ngBootstrap < 0 ||
    c.tumUi > 0 ||
    c.locked > 0)

export const authorKey = (a: Author) => a.login ?? a.name
export const isBot = (a: Author) => /\[bot\]$/i.test(a.login ?? a.name)

export type Contributor = {
  key: string
  author: Author
  rank: number
  // Commits with progress the person shared in.
  prs: number
  hitsRemoved: number
  hitsAdded: number
  converted: number
  regressed: number
  primeng: number
  ngBootstrap: number
  tumUi: number
  locked: number
  first: Contribution
  last: Contribution
}

// Progress per credited author over attributable commits, each commit split by the credit
// shares, ranked by Bootstrap hits removed, then units converted, then TUM UI adoption. Hits
// added and units that lost legacy-free stay visible next to the progress. Bots, rule changes
// and authors without progress are not listed.
export function leaderboard(list: Contribution[]): Contributor[] {
  const byAuthor = new Map<string, Contributor>()
  for (const c of list) {
    if (!c.attributable || c.ruleChanged || !moved(c)) continue
    for (const { author, share } of c.credits) {
      if (isBot(author) || share <= 0) continue
      const key = authorKey(author)
      const row = byAuthor.get(key) ?? {
        key,
        author,
        rank: 0,
        prs: 0,
        hitsRemoved: 0,
        hitsAdded: 0,
        converted: 0,
        regressed: 0,
        primeng: 0,
        ngBootstrap: 0,
        tumUi: 0,
        locked: 0,
        first: c,
        last: c,
      }
      if (author.login && !row.author.login) row.author = author
      if (progressed(c)) {
        if (!row.prs) row.first = c
        row.prs++
        row.last = c
      }
      row.hitsRemoved += c.hitsRemoved * share
      row.hitsAdded += c.hitsAdded * share
      row.converted += c.converted * share
      row.regressed += c.regressed * share
      row.primeng -= c.primeng * share
      row.ngBootstrap -= c.ngBootstrap * share
      row.tumUi += c.tumUi * share
      row.locked += c.locked * share
      byAuthor.set(key, row)
    }
  }
  return [...byAuthor.values()]
    .filter((r) => r.prs > 0)
    .sort(
      (a, b) =>
        b.hitsRemoved - a.hitsRemoved ||
        b.converted - a.converted ||
        b.tumUi - a.tumUi ||
        a.author.name.localeCompare(b.author.name),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

// Latest commit with progress in a module: Bootstrap hits removed or a unit converted (from the
// gross flow), fewer units using PrimeNG or ng-bootstrap, or more using TUM UI. Rule changes and
// new legacy-free units do not count.
export const lastProgress = (series: Summary[], name: string) =>
  series.findLast((x, i) => {
    const now = x.sections[name]
    const before = series[i - 1]?.sections[name]
    if (!now || !before || x.rule !== series[i - 1].rule) return false
    const flow = x.flow?.sections[name]
    return (
      (flow ? flow[0] > 0 || flow[2] > 0 : hitsOf(now) < hitsOf(before)) ||
      now[row.primeng] < before[row.primeng] ||
      now[row.ngBootstrap] < before[row.ngBootstrap] ||
      now[row.tumUi] > before[row.tumUi]
    )
  })
const hitsOf = (r: Summary['sections'][string]) =>
  r[row.classHits] + r[row.styleHits]
