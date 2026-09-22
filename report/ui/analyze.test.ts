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
  applyPatch,
  detailSchema,
  enrich,
  inventoryOf,
  makePatch,
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
  parent: 'b'.repeat(40),
  date: '2026-09-21T10:00:00+02:00',
  subject: 'Migrate the list (#1)',
  author: { name: 'Ada', login: 'ada' },
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
  assert.deepEqual(
    analyzeStyles(files[`${app}/exam/manage/page/page.component.scss`]),
    { variables: 0, colors: 2, imports: 0 },
  )
  assert.deepEqual(analyzeStyles(files[`${app}/exam/manage/shared.scss`]), {
    variables: 0,
    colors: 0,
    imports: 1,
  })
  assert.deepEqual(
    analyzeStyles('// var(--bs-x)\n.a { color: var(--primary); }'),
    { variables: 0, colors: 0, imports: 0 },
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
  const { summary, detail: stored } = await analyzeTree(root, meta)
  summarySchema.parse(summary)
  detailSchema.parse(stored)
  const detail = { ...stored, units: enrich(stored.units) }
  assert.deepEqual(summary.totals, {
    units: 11,
    locked: 2,
    clean: 4,
    dirty: 5,
    classHits: 12,
    styleHits: 6,
    lockedResidue: 2,
    lockedDirs: 2,
    lockableDirs: 2,
    primeng: 2,
    ngBootstrap: 1,
    tumUi: 1,
    kit: 1,
    pages: 4,
    pagesClean: 1,
    legacyFree: 5,
  })
  assert.deepEqual(summary.sections.exam, [7, 0, 3, 4, 9, 3, 3, 1, 1, 0])
  const unit = (id: string) => detail.units.find((u) => u.id.endsWith(id))!
  const list = unit('list.component.ts')
  assert.equal(list.status, 'locked')
  assert.deepEqual(list.tokens, { row: 1 })
  assert.equal(list.styleHits, 1)
  assert.deepEqual(list.tumUi, { 'tum-ui-button': 1, tumUiButton: 1 })
  assert.deepEqual(list.primeng, { pButton: 1 })
  const alert = unit('alert.component.ts')
  assert.equal(alert.status, 'locked')
  assert.equal(alert.classHits, 0, 'custom alert-* names are not Bootstrap')
  const button = unit('button.component.ts')
  assert.deepEqual(
    button.tokens,
    { 'd-flex': 1, 'btn-sm': 1 },
    'host bindings and addClass count; other strings do not',
  )
  assert.equal(button.blocks, 1, 'blocks the clean unit that renders it')
  const page = unit('page.component.ts')
  assert.equal(page.status, 'dirty')
  assert.equal(page.styleHits, 3)
  assert.equal(page.closureHits, 2)
  assert.deepEqual(page.styles, [
    'app/exam/manage/page/page.component.scss',
    'app/exam/manage/shared.scss',
  ])
  assert.deepEqual(page.primeng, { 'p-dialog': 1 })
  assert.deepEqual(page.ngBootstrap, { ngbTooltip: 1 })
  const clean = unit('clean.component.ts')
  assert.equal(clean.status, 'clean')
  assert.equal(clean.closureHits, 2)
  assert.deepEqual(clean.blockers, [button.id])
  const dialog = unit('dialog.component.ts')
  assert.equal(dialog.status, 'clean')
  assert.equal(dialog.scanned, true)
  assert.equal(dialog.tailwind, true)
  assert.equal(
    dialog.spacing,
    2,
    'gap-2 and mb-3 keep their names but change value',
  )
  assert.equal(
    dialog.route,
    '/exams/page/:id/nested',
    'paths join through children arrays',
  )
  assert.equal(dialog.routeHits, 11, 'route parents with hits block the page')
  assert.equal(page.route, '/exams/page/:id')
  assert.equal(
    clean.route,
    '/exams/:dynamic',
    'non-literal segments are marked',
  )
  assert.equal(button.route, undefined, 'named outlets are not pages')
  assert.equal(unit('app.component.ts').route, '/')
  assert.deepEqual(
    detail.styles.map((f) => [
      f.path.split('/').pop(),
      f.variables,
      f.colors,
      f.imports,
      f.units,
    ]),
    [
      ['list.component.scss', 1, 0, 0, 1],
      ['page.component.scss', 0, 2, 0, 1],
      ['shared.scss', 0, 0, 1, 1],
      ['global.scss', 1, 1, 0, 0],
    ],
    'stylesheets are sorted by path',
  )
  assert.deepEqual(
    page.blockers,
    [button.id],
    'blockers are listed for every unit',
  )
  assert.equal(
    unit('enum-only.component.ts').closureHits,
    0,
    'importing only an enum or a type does not render the component',
  )
  assert.deepEqual(
    detail.units
      .filter((u) => u.id.includes('pair'))
      .map((u) => [
        u.id.slice(u.id.lastIndexOf('/') + 1),
        u.selector,
        u.tokens,
      ]),
    [
      ['pair.component.ts', 'jhi-pair-a', { row: 1, 'd-flex': 1 }],
      ['pair.component.ts#1', 'jhi-pair-b', { btn: 1 }],
      ['pair.component.ts#2', 'jhi-pair-c', { 'd-flex': 1 }],
    ],
    'every declaration is a unit; a shared template counts once in totals',
  )
  assert.equal(unit('app.component.ts').section, 'app')
  assert.deepEqual(detail.lockable, [
    { dir: 'app/exam/manage/dialog', units: 1 },
    { dir: 'app/exam/manage/enum-only', units: 1 },
  ])
  assert.deepEqual(
    detail.files.map((f) => [f.path, f.classHits, f.styleHits]),
    [['content/scss/global.scss', 0, 2]],
  )
  assert.deepEqual(
    detail.sections.map((s) => [
      s.name,
      s.units,
      s.classHits,
      s.styleHits,
      s.blockers,
      s.lockableDirs,
    ]),
    [
      ['exam', 7, 9, 3, 1, 2],
      ['admin', 1, 1, 1, 0, 0],
      ['content', 0, 0, 2, 0, 0],
      ['shared-ui', 1, 2, 0, 0, 0],
      ['app', 1, 0, 0, 0, 0],
      ['core', 1, 0, 0, 0, 0],
    ],
  )
  assert.deepEqual(
    inventoryOf([
      ...detail.units.map((u) => u.tokens),
      ...detail.files.map((f) => f.tokens),
    ]).slice(0, 2),
    [
      { name: 'd-flex', occurrences: 4, units: 4 },
      { name: 'row', occurrences: 3, units: 3 },
    ],
  )
  assert.deepEqual(inventoryOf(detail.units.map((u) => u.ngBootstrap)), [
    { name: 'ngbTooltip', occurrences: 1, units: 1 },
  ])
  assert.deepEqual(
    clean.imports,
    [button.id],
    'edges are stored, closures derived',
  )
  const patch = makePatch(stored, { ...stored, units: stored.units.slice(1) })
  assert.deepEqual(patch.units, { changed: [], removed: [stored.units[0].id] })
  assert.deepEqual(applyPatch(stored, patch).units, stored.units.slice(1))
  assert.equal(detail.diagnostics.length, 0)
  assert.match(detail.rule, /^[a-f0-9]{40}$/)
})

test('a deleted Bootstrap rule means Bootstrap is retired, not an error', async () => {
  const retired = mkdtempSync(join(tmpdir(), 'codestats-retired-'))
  try {
    writeFixture(
      retired,
      Object.fromEntries(
        Object.entries(files).filter(
          ([path]) => !/no-bootstrap-classes|eslint\.config/.test(path),
        ),
      ),
    )
    const { summary, detail } = await analyzeTree(retired, meta)
    assert.equal(detail.rule, 'retired')
    assert.equal(summary.totals.classHits, 0)
    assert.equal(summary.totals.locked, 0)
    assert.equal(summary.totals.lockedDirs, 0)
    assert.equal(summary.totals.styleHits, 6, 'SCSS residue is still counted')
    assert.equal(
      summary.totals.primeng,
      2,
      'component libraries are still counted',
    )
  } finally {
    rmSync(retired, { recursive: true, force: true })
  }
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
