import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contributions, lastProgress, leaderboard } from './contributions'
import type { Flow, Summary, Totals } from './model'

const totals = (patch: Partial<Totals> = {}): Totals => ({
  units: 10,
  locked: 1,
  clean: 3,
  dirty: 6,
  classHits: 100,
  styleHits: 10,
  lockedResidue: 0,
  lockedDirs: 1,
  lockableDirs: 0,
  primeng: 4,
  ngBootstrap: 3,
  tumUi: 1,
  kit: 5,
  pages: 3,
  pagesClean: 1,
  legacyFree: 2,
  bootstrapUnits: 6,
  ...patch,
})
const flow = (patch: Partial<Flow> = {}): Flow => ({
  hitsRemoved: 0,
  hitsAdded: 0,
  converted: 0,
  regressed: 0,
  locked: 0,
  sections: {},
  ...patch,
})
const sha = (n: number) => n.toString(16).padStart(40, '0')
const snapshot = (
  n: number,
  parent: number | undefined,
  author: Summary['author'],
  patch: Partial<Totals> = {},
  options: { rule?: string; credits?: Summary['credits']; flow?: Flow } = {},
): Summary => ({
  commit: sha(n),
  parent: parent === undefined ? undefined : sha(parent),
  date: `2026-09-${String(n).padStart(2, '0')}T10:00:00+02:00`,
  subject: `change ${n} (#${n})`,
  author,
  rule: options.rule ?? 'r1',
  credits: options.credits,
  flow: options.flow,
  totals: totals(patch),
  sections: {},
})

const ada = { name: 'Ada', login: 'ada' }
const bob = { name: 'Bob' }
const bot = { name: 'dependabot[bot]', login: 'dependabot[bot]' }

test('contributions use the gross flow, are attributable only to a direct child and carry no author otherwise', () => {
  const series = [
    snapshot(1, undefined, ada),
    // Removed 30 hits in one place, added 20 elsewhere, converted one unit.
    snapshot(
      2,
      1,
      ada,
      { classHits: 90, legacyFree: 3 },
      { flow: flow({ hitsRemoved: 30, hitsAdded: 20, converted: 1 }) },
    ),
    // A weekly sample spanning several commits.
    snapshot(3, 9, bob, { classHits: 50 }),
    snapshot(
      4,
      3,
      bob,
      { classHits: 50, primeng: 3, tumUi: 2 },
      { flow: flow() },
    ),
    snapshot(
      5,
      4,
      ada,
      { classHits: 60, primeng: 3, tumUi: 2 },
      { rule: 'r2', flow: flow({ hitsAdded: 10 }) },
    ),
    snapshot(
      6,
      5,
      bot,
      { classHits: 60, primeng: 3, tumUi: 2, lockedDirs: 2, locked: 3 },
      { rule: 'r2', flow: flow({ locked: 2 }) },
    ),
  ]
  const list = contributions(series)
  assert.deepEqual(
    list.map((c) => [
      c.hits,
      c.hitsRemoved,
      c.hitsAdded,
      c.converted,
      c.locked,
      c.credits.length,
      c.attributable,
      c.ruleChanged,
    ]),
    [
      [-10, 30, 20, 1, 0, 1, true, false],
      [-40, 40, 0, 0, 0, 0, false, false],
      [0, 0, 0, 0, 0, 1, true, false],
      [10, 0, 10, 0, 0, 1, true, true],
      [0, 0, 0, 0, 2, 1, true, false],
    ],
  )
  const board = leaderboard(list)
  assert.deepEqual(
    board.map((r) => [
      r.rank,
      r.key,
      r.prs,
      r.hitsRemoved,
      r.hitsAdded,
      r.converted,
      r.primeng,
      r.tumUi,
    ]),
    [
      [1, 'ada', 1, 30, 20, 1, 0, 0],
      [2, 'Bob', 1, 0, 0, 0, 1, 1],
    ],
    'weekly samples, rule changes and bots do not count',
  )
  assert.equal(board[0].first.commit, sha(2))
})

test('ranking prefers hits removed, then units converted; a name without login is its own key', () => {
  const series = [
    snapshot(1, undefined, ada),
    snapshot(2, 1, bob, { classHits: 80 }, { flow: flow({ hitsRemoved: 20 }) }),
    snapshot(
      3,
      2,
      { name: 'Bob', login: 'bob' },
      { classHits: 70 },
      { flow: flow({ hitsRemoved: 10 }) },
    ),
    snapshot(
      4,
      3,
      ada,
      { classHits: 50, legacyFree: 4 },
      { flow: flow({ hitsRemoved: 20, converted: 2 }) },
    ),
    snapshot(
      5,
      4,
      { name: 'Cy', login: 'cy' },
      { classHits: 30, legacyFree: 3 },
      { flow: flow({ hitsRemoved: 20, converted: 1, regressed: 2 }) },
    ),
  ]
  const board = leaderboard(contributions(series))
  assert.deepEqual(
    board.map((r) => [r.rank, r.key, r.hitsRemoved, r.converted, r.regressed]),
    [
      [1, 'ada', 20, 2, 0],
      [2, 'cy', 20, 1, 2],
      [3, 'Bob', 20, 0, 0],
      [4, 'bob', 10, 0, 0],
    ],
  )
})

test('credits split a commit between the people who worked on its branch', () => {
  const cy = { name: 'Cy', login: 'cy' }
  const series = [
    snapshot(1, undefined, ada),
    snapshot(
      2,
      1,
      ada,
      { classHits: 60, legacyFree: 4, tumUi: 3 },
      {
        credits: [
          { author: ada, share: 0.75 },
          { author: cy, share: 0.25 },
        ],
        flow: flow({ hitsRemoved: 40, converted: 2 }),
      },
    ),
    snapshot(
      3,
      2,
      cy,
      { classHits: 50, legacyFree: 4, tumUi: 3 },
      { flow: flow({ hitsRemoved: 10 }) },
    ),
  ]
  const board = leaderboard(contributions(series))
  assert.deepEqual(
    board.map((r) => [
      r.rank,
      r.key,
      r.prs,
      r.hitsRemoved,
      r.converted,
      r.tumUi,
    ]),
    [
      [1, 'ada', 1, 30, 1.5, 1.5],
      [2, 'cy', 2, 20, 0.5, 0.5],
    ],
  )
  assert.equal(board[1].last.commit, sha(3))
})

test('last progress per module ignores rule changes and new units, and counts library work', () => {
  const r = (hits: number, legacyFree: number, primeng = 2) =>
    [
      5,
      0,
      1,
      4,
      hits,
      0,
      legacyFree,
      primeng,
      0,
      0,
      0,
      4,
    ] as Summary['sections'][string]
  const at = (
    n: number,
    row: Summary['sections'][string],
    options: Parameters<typeof snapshot>[4] = {},
  ) => ({
    ...snapshot(n, n - 1, ada, {}, options),
    sections: { course: row },
  })
  const series = [
    at(1, r(10, 1)),
    at(2, r(8, 1), { flow: flow({ sections: { course: [2, 0, 0, 0, 0] } }) }),
    // A new legacy-free unit is not progress.
    at(3, r(8, 2), { flow: flow() }),
    // PrimeNG dropped from one unit is.
    at(4, r(8, 2, 1), { flow: flow() }),
    // The rule changed and hits fell: not progress.
    at(5, r(2, 2, 1), {
      rule: 'r2',
      flow: flow({ sections: { course: [6, 0, 0, 0, 0] } }),
    }),
  ]
  assert.equal(lastProgress(series, 'course')?.commit, sha(4))
  assert.equal(lastProgress(series.slice(0, 3), 'course')?.commit, sha(2))
})
