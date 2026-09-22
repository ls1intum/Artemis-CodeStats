import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contributions, leaderboard } from './contributions'
import type { Summary, Totals } from './model'

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
  ...patch,
})
const sha = (n: number) => n.toString(16).padStart(40, '0')
const snapshot = (
  n: number,
  parent: number | undefined,
  author: Summary['author'],
  patch: Partial<Totals> = {},
  rule = 'r1',
  credits?: Summary['credits'],
): Summary => ({
  commit: sha(n),
  parent: parent === undefined ? undefined : sha(parent),
  date: `2026-09-${String(n).padStart(2, '0')}T10:00:00+02:00`,
  subject: `change ${n} (#${n})`,
  author,
  rule,
  credits,
  totals: totals(patch),
  sections: {},
})

const ada = { name: 'Ada', login: 'ada' }
const bob = { name: 'Bob' }
const bot = { name: 'dependabot[bot]', login: 'dependabot[bot]' }

test('contributions are deltas against the previous snapshot, attributable only to a direct child', () => {
  const series = [
    snapshot(1, undefined, ada),
    snapshot(2, 1, ada, { classHits: 90, legacyFree: 3 }),
    snapshot(3, 9, bob, { classHits: 50 }),
    snapshot(4, 3, bob, { classHits: 50, primeng: 3, tumUi: 2 }),
    snapshot(5, 4, ada, { classHits: 60, primeng: 3, tumUi: 2 }, 'r2'),
    snapshot(
      6,
      5,
      bot,
      { classHits: 60, primeng: 3, tumUi: 2, lockedDirs: 2 },
      'r2',
    ),
  ]
  const list = contributions(series)
  assert.deepEqual(
    list.map((c) => [
      c.hits,
      c.legacyFree,
      c.primeng,
      c.tumUi,
      c.locks,
      c.attributable,
      c.ruleChanged,
    ]),
    [
      [-10, 1, 0, 0, 0, true, false],
      [-40, -1, 0, 0, 0, false, false],
      [0, 0, -1, 1, 0, true, false],
      [10, 0, 0, 0, 0, true, true],
      [0, 0, 0, 0, 1, true, false],
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
      r.legacyFree,
      r.primeng,
      r.tumUi,
    ]),
    [
      [1, 'ada', 1, 10, 0, 1, 0, 0],
      [2, 'Bob', 1, 0, 0, 0, 1, 1],
    ],
    'weekly samples, rule changes and bots do not count',
  )
  assert.equal(board[0].last.commit, sha(2))
})

test('ranking prefers hits removed, then legacy-free units; a name without login is its own key', () => {
  const series = [
    snapshot(1, undefined, ada),
    snapshot(2, 1, bob, { classHits: 80 }),
    snapshot(3, 2, { name: 'Bob', login: 'bob' }, { classHits: 70 }),
    snapshot(4, 3, ada, { classHits: 50, legacyFree: 4 }),
    snapshot(
      5,
      4,
      { name: 'Cy', login: 'cy' },
      { classHits: 30, legacyFree: 3 },
    ),
  ]
  const board = leaderboard(contributions(series))
  assert.deepEqual(
    board.map((r) => [r.rank, r.key, r.hitsRemoved, r.legacyFree]),
    [
      [1, 'ada', 20, 2],
      [2, 'Bob', 20, 0],
      [3, 'cy', 20, -1],
      [4, 'bob', 10, 0],
    ],
  )
})

test('credits split a commit between the people who worked on its branch', () => {
  const cy = { name: 'Cy', login: 'cy' }
  const series = [
    snapshot(1, undefined, ada),
    snapshot(2, 1, ada, { classHits: 60, legacyFree: 4, tumUi: 3 }, 'r1', [
      { author: ada, share: 0.75 },
      { author: cy, share: 0.25 },
    ]),
    snapshot(3, 2, cy, { classHits: 50, legacyFree: 4, tumUi: 3 }),
  ]
  const board = leaderboard(contributions(series))
  assert.deepEqual(
    board.map((r) => [
      r.rank,
      r.key,
      r.prs,
      r.hitsRemoved,
      r.legacyFree,
      r.tumUi,
    ]),
    [
      [1, 'ada', 1, 30, 1.5, 1.5],
      [2, 'cy', 2, 20, 0.5, 0.5],
    ],
  )
  assert.equal(board[1].last.commit, sha(3))
})
