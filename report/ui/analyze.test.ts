import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  analyzeStyles,
  analyzeTemplate,
  analyzeTree,
  parseLockGlobs,
  parseTailwindSources,
  type Kit,
  type Rule,
} from './analyze'
import {
  detailSchema,
  summarySchema,
} from '../../src/features/migrations/model'
import { fixtureFiles as files, writeFixture } from './fixture'

const app = 'src/main/webapp/app'
let root: string
before(() => {
  root = mkdtempSync(join(tmpdir(), 'codestats-fixture-'))
  writeFixture(root, files)
})
after(() => rmSync(root, { recursive: true, force: true }))

const meta = {
  commit: 'a'.repeat(40),
  date: '2026-09-21T10:00:00+02:00',
  subject: 'Migrate the list (#1)',
}

test('lock globs come from the no-bootstrap-classes block only', () => {
  assert.deepEqual(parseLockGlobs(files['eslint.config.mjs']), [
    `${app}/admin/**/*.html`,
    `${app}/core/alert/alert.component.html`,
    'packages/tum-ui/src/lib/**/*.html',
  ])
  assert.throws(() => parseLockGlobs('export default []'), /lock block/)
  assert.throws(
    () =>
      parseLockGlobs(
        `export default [{ files: [dynamic], rules: { 'localRules/no-bootstrap-classes': 'error' } }]`,
      ),
    /non-literal/,
  )
})

test('tailwind sources ignore negations and inline sources', () => {
  assert.deepEqual(
    parseTailwindSources(files['src/main/webapp/tailwind.css']),
    [`${app}/admin`, `${app}/exam/manage`],
  )
})

test('style residue follows the stylelint lock plus Bootstrap Sass imports', () => {
  assert.equal(
    analyzeStyles(files[`${app}/exam/manage/page/page.component.scss`]),
    2,
  )
  assert.equal(analyzeStyles(files[`${app}/exam/manage/shared.scss`]), 1)
  assert.equal(
    analyzeStyles('// var(--bs-x)\n.a { color: var(--primary); }'),
    0,
  )
})

test('template hits match the lint forms and add the forms it cannot see', async () => {
  const rule = (await import(
    join(root, 'rules/no-bootstrap-classes.mjs')
  )) as Rule
  const kit: Kit = { elements: new Set(), attributes: new Set(), components: 0 }
  const { tokens, primeng, ngBootstrap } = analyzeTemplate(
    files[`${app}/exam/manage/page/page.component.html`],
    'page.html',
    rule,
    kit,
  )
  assert.deepEqual(tokens, {
    btn: 1,
    'd-flex': 1,
    table: 1,
    row: 1,
    'col-md-2': 1,
    'text-danger': 1,
  })
  assert.deepEqual(primeng, { 'p-dialog': 1 })
  assert.deepEqual(ngBootstrap, { ngbTooltip: 1 })
  assert.deepEqual(
    analyzeTemplate(`<a *ngIf="x" class="btn"></a>`, 'x.html', rule, kit)
      .tokens,
    { btn: 1 },
    'structural directive hosts are counted once',
  )
})

test('tree analysis derives units, status, closure, lockability and inventories', async () => {
  const { summary, detail } = await analyzeTree(root, meta)
  summarySchema.parse(summary)
  detailSchema.parse(detail)
  assert.deepEqual(summary.totals, {
    units: 6,
    locked: 2,
    clean: 2,
    dirty: 2,
    classHits: 12,
    styleHits: 6,
    lockedResidue: 2,
    lockedDirs: 2,
    lockableDirs: 1,
    primeng: 2,
    ngBootstrap: 1,
    tumUi: 1,
    kit: 1,
  })
  const unit = (id: string) => detail.units.find((u) => u.id.endsWith(id))!
  const list = unit('list.component.ts')
  assert.equal(list.status, 'locked')
  assert.deepEqual(list.tokens, { row: 1 })
  assert.equal(list.styleHits, 1)
  assert.deepEqual(list.tumUi, {
    TumUiButtonComponent: 1,
    'tum-ui-button': 1,
    tumUiButton: 1,
  })
  assert.deepEqual(list.primeng, { ButtonModule: 1, pButton: 1 })
  const alert = unit('alert.component.ts')
  assert.equal(alert.status, 'locked')
  assert.equal(alert.classHits, 0, 'custom alert-* names are not Bootstrap')
  const button = unit('button.component.ts')
  assert.deepEqual(button.tokens, {
    'd-flex': 1,
    btn: 1,
    'btn-primary': 1,
    'btn-sm': 1,
  })
  assert.equal(button.blocks, 1, 'blocks the clean unit that renders it')
  const page = unit('page.component.ts')
  assert.equal(page.status, 'dirty')
  assert.equal(page.styleHits, 3)
  assert.equal(page.closureHits, 4)
  assert.deepEqual(
    page.blockers,
    [],
    'blockers are listed for clean units only',
  )
  assert.deepEqual(page.styles, [
    `${app}/exam/manage/page/page.component.scss`,
    `${app}/exam/manage/shared.scss`,
  ])
  const dialog = unit('dialog.component.ts')
  assert.equal(dialog.status, 'clean')
  assert.equal(dialog.scanned, true)
  const clean = unit('clean.component.ts')
  assert.deepEqual(clean.tokens, {})
  assert.equal(clean.status, 'clean')
  assert.equal(clean.closureHits, 4)
  assert.deepEqual(clean.blockers, [button.id])
  assert.deepEqual(detail.lockable, [
    { dir: `${app}/exam/manage/dialog`, units: 1 },
  ])
  assert.deepEqual(
    detail.files.map((f) => [f.path, f.classHits, f.styleHits]),
    [
      [`${app}/shared-ui/util.ts`, 1, 0],
      ['src/main/webapp/content/scss/global.scss', 0, 2],
    ],
  )
  assert.deepEqual(
    detail.sections.map((s) => [
      s.name,
      s.units,
      s.classHits,
      s.styleHits,
      s.blockers,
    ]),
    [
      ['exam', 3, 6, 3, 1],
      ['shared-ui', 1, 5, 0, 0],
      ['admin', 1, 1, 1, 0],
      ['content', 0, 0, 2, 0],
      ['core', 1, 0, 0, 0],
    ],
  )
  assert.deepEqual(detail.inventory.bootstrap.slice(0, 2), [
    { name: 'row', occurrences: 3, units: 3 },
    { name: 'btn', occurrences: 2, units: 2 },
  ])
  assert.deepEqual(detail.inventory.ngBootstrap.map((e) => e.name).sort(), [
    'NgbTooltip',
    'ngbTooltip',
  ])
  assert.equal(detail.diagnostics.length, 0)
  assert.match(detail.rule, /^[a-f0-9]{40}$/)
})

test('missing Angular units fail loudly instead of reporting success', async () => {
  const empty = mkdtempSync(join(tmpdir(), 'codestats-empty-'))
  try {
    writeFixture(
      empty,
      Object.fromEntries(
        [
          'rules/no-bootstrap-classes.mjs',
          'eslint.config.mjs',
          'src/main/webapp/tailwind.css',
        ].map((path) => [path, files[path]]),
      ),
    )
    mkdirSync(join(empty, app), { recursive: true })
    mkdirSync(join(empty, 'src/main/webapp/content'), { recursive: true })
    mkdirSync(join(empty, 'packages/tum-ui/src/lib'), { recursive: true })
    await assert.rejects(analyzeTree(empty, meta), /No Angular units/)
  } finally {
    rmSync(empty, { recursive: true, force: true })
  }
})
