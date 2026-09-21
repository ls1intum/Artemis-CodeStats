import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lockEntries, pullRequest, unitPath, type Summary } from './model'
import { day, percent, velocity } from './format'
import { bootstrapTarget, kitTarget } from './targets'

const summary = (day: number, hits: number): Summary => ({
  commit: 'a'.repeat(40),
  date: `2026-09-${String(day).padStart(2, '0')}T12:00:00Z`,
  subject: '',
  totals: {
    units: 1,
    locked: 0,
    clean: 0,
    dirty: 1,
    classHits: hits,
    styleHits: 0,
    lockedResidue: 0,
    lockedDirs: 0,
    lockableDirs: 0,
    primeng: 0,
    ngBootstrap: 0,
    tumUi: 0,
    kit: 0,
  },
})

test('lock entries follow the three Artemis lists', () => {
  assert.deepEqual(lockEntries('src/main/webapp/app/exam/manage/clean'), {
    eslint: "'src/main/webapp/app/exam/manage/clean/**/*.html',",
    stylelint: '"src/main/webapp/app/exam/manage/clean/**/*.scss",',
    tailwind: "@source './app/exam/manage/clean';",
  })
})

test('pull request parsing keeps the subject when no number exists', () => {
  assert.deepEqual(pullRequest('Fix: things (#13314)'), {
    title: 'Fix: things',
    number: '13314',
    url: 'https://github.com/ls1intum/Artemis/pull/13314',
  })
  assert.deepEqual(pullRequest('chore: no pr'), { title: 'chore: no pr' })
  assert.equal(unitPath('a/b.ts#2'), 'a/b.ts')
})

test('velocity needs at least a week inside the window', () => {
  const series = [summary(1, 1000), summary(10, 900), summary(21, 700)]
  assert.equal(velocity(series, series[2], 3), undefined)
  assert.deepEqual(velocity(series, series[2], 14), {
    perWeek: -200 / (11 / 7),
    weeks: 11 / 7,
  })
  assert.equal(velocity(series, series[2], Infinity)?.perWeek, -105)
})

test('formatting', () => {
  assert.equal(percent(1, 3), '33.3%')
  assert.equal(percent(1, 1), '100%')
  assert.equal(percent(0, 0), '—')
  assert.equal(day('2026-09-21T23:30:00+02:00', true), 'Sep 21, 2026')
})

test('targets come from the guideline table, not from prefixes', () => {
  assert.equal(bootstrapTarget('btn-primary'), 'tum-ui-button / tumUiButton')
  assert.equal(bootstrapTarget('nav-tabs'), 'tum-ui-tabs')
  assert.equal(bootstrapTarget('navbar-course-image'), '')
  assert.equal(bootstrapTarget('card-resizable'), 'tum-ui-card / tum-ui-panel')
  const kit = new Set(['tum-ui-dialog', 'tum-ui-progress-bar', 'tumUiTooltip'])
  assert.equal(kitTarget('p-dialog', kit), 'tum-ui-dialog')
  assert.equal(kitTarget('p-progressbar', kit), 'tum-ui-progress-bar')
  assert.equal(kitTarget('pTooltip', kit), 'tumUiTooltip')
  assert.equal(kitTarget('p-table', kit), '')
})
