import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lockEntries, pullRequest, unitPath, type Summary } from './model'
import { day, percent, velocity } from './format'
import {
  bootstrapTarget,
  kitCoverage,
  kitTarget,
  ngbTarget,
  partOfHost,
} from './targets'

const summary = (day: number, hits: number): Summary => ({
  commit: String(day).padStart(40, '0'),
  date: `2026-09-${String(day).padStart(2, '0')}T12:00:00Z`,
  subject: '',
  author: { name: 'Ada' },
  rule: 'r',
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
    pages: 0,
    pagesClean: 0,
    legacyFree: 0,
    bootstrapUnits: 0,
  },
  sections: {},
})

test('lock entries follow the three Artemis lists', () => {
  assert.deepEqual(lockEntries('app/exam/manage/clean'), {
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
  assert.equal(
    bootstrapTarget('btn-primary'),
    'tumaet-ui-button / tumAetUiButton',
  )
  assert.equal(bootstrapTarget('nav-tabs'), 'tumaet-ui-tabs')
  assert.equal(bootstrapTarget('d-md-inline'), 'md:inline')
  assert.equal(bootstrapTarget('col-lg-9'), 'lg:col-span-9')
  assert.equal(bootstrapTarget('justify-content-between'), 'justify-between')
  assert.equal(bootstrapTarget('text-danger'), 'text-state-danger')
  assert.equal(bootstrapTarget('form-control-label'), 'tumaet-ui-form-field')
  assert.equal(
    bootstrapTarget('card-resizable'),
    'custom class: rename (banned by prefix only)',
  )
  assert.equal(bootstrapTarget('card-body'), 'tumaet-ui-card / tumaet-ui-panel')
  const kit = new Set([
    'tumaet-ui-dialog',
    'tumaet-ui-progress-bar',
    'tumAetUiTooltip',
    'tumAetUiInput',
  ])
  assert.equal(kitTarget('p-dialog', kit), 'tumaet-ui-dialog')
  assert.equal(kitTarget('DialogService', kit), 'tumaet-ui-dialog')
  assert.equal(kitTarget('pInputText', kit), 'tumAetUiInput')
  assert.equal(kitTarget('p-progressbar', kit), 'tumaet-ui-progress-bar')
  assert.equal(kitTarget('pTooltip', kit), 'tumAetUiTooltip')
  assert.equal(kitTarget('p-table', kit), '', 'not in this kit yet')
  assert.equal(kitTarget('p-skeleton', kit), 'no kit component yet')
  assert.equal(kitTarget('pTemplate', kit), partOfHost)
  // Case and hyphen variants are one component; parts go with their host.
  assert.equal(
    kitTarget('p-confirmDialog', kit),
    kitTarget('p-confirmdialog', kit),
  )
  assert.equal(kitTarget('p-progress-bar', kit), 'tumaet-ui-progress-bar')
  assert.equal(kitTarget('p-accordion-header', kit), partOfHost)
  assert.equal(kitTarget('DynamicDialogRef', kit), 'tumaet-ui-dialog')
  assert.equal(ngbTarget('ngb-highlight', kit), partOfHost)
  assert.equal(ngbTarget('NgbPopover', kit), '', 'no popover in this kit')
  assert.equal(ngbTarget('ngbTooltip', kit), 'tumAetUiTooltip')
  assert.equal(ngbTarget('NgbModal', kit), 'tumaet-ui-dialog')
  assert.equal(ngbTarget('ngb-rating', kit), 'no kit component yet')
  assert.deepEqual(
    kitCoverage(
      [
        { name: 'p-dialog', occurrences: 3 },
        { name: 'p-skeleton', occurrences: 2 },
        { name: 'p-table', occurrences: 1 },
        { name: 'pTemplate', occurrences: 4 },
      ],
      (n) => kitTarget(n, kit),
    ),
    [3, 6],
    'parts count with their host, not on their own',
  )
})
