import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { analyzeFile, analyzeDirectory } from './analyze'
import {
  detailSchema,
  dimensionKeys,
  emptyCounts,
  legacyKeys,
  manifestSchema,
  reduction,
  sourceUrl,
} from '../../src/features/migrations/model'

const path = 'src/main/webapp/app/exam/test.component.html'
const dimensions = (html: string) =>
  new Set(analyzeFile(path, html).findings.map((f) => f.dimension))
test('parses Angular control flow, bindings, elements and directives', () => {
  assert.deepEqual(
    dimensions(
      `@if (ready) { <p-dialog><button pButton [ngbTooltip]="help" tumUiTooltip class="btn d-flex grid grid-cols-2"></button><tum-ui-tag /></p-dialog> }`,
    ),
    new Set(['primeng', 'ngBootstrap', 'tumUi', 'bootstrap', 'tailwind']),
  )
})
test('comments, plain text, shared utilities and custom names are not migration evidence', () => {
  assert.deepEqual(
    dimensions(
      `<!-- <p-dialog class="btn"> --> <div class="p-3 mb-2 gap-2 col-span-2 my-modal-wrapper alert-wrap">p-dialog btn ngbTooltip</div>`,
    ),
    new Set(['tailwind']),
  )
  assert.equal(
    dimensions(
      `<div class="p-3 mb-2 gap-2 my-modal-wrapper alert-wrap">p-dialog btn</div>`,
    ).size,
    0,
  )
})
test('bound class names and literal conditional / map / array classes are detected', () => {
  for (const html of [
    `<div [class.btn]="active"></div>`,
    `<div [ngClass]="{'d-flex': active}"></div>`,
    `<div [class]="active ? 'btn' : 'grid'"></div>`,
    `<div [ngClass]="['btn', dynamic]"></div>`,
  ])
    assert.ok(dimensions(html).has('bootstrap'), html)
  assert.ok(
    !dimensions(`<div [class]="card" [ngClass]="row"></div>`).has('bootstrap'),
    'identifiers must not be mistaken for literals',
  )
})
test('parses aliased imports and inline templates, ignores commented imports', () => {
  const result = analyzeFile(
    path.replace('.html', '.ts'),
    `// import {Button} from 'primeng/button';\nimport { X as Y } from '@tumaet/ui-angular'; import { Component } from '@angular/core';\n@Component({ template: \`<div class="btn">Hello</div>\` }) class Example {}`,
  )
  assert.equal(result.templates, 1)
  assert.equal(result.findings.find((f) => f.dimension === 'tumUi')?.line, 2)
  assert.equal(
    result.findings.find((f) => f.dimension === 'bootstrap')?.line,
    3,
  )
  assert.ok(!result.findings.some((f) => f.dimension === 'primeng'))
})
test('tracks both historical and packaged TUM UI imports', () => {
  for (const pkg of ['app/shared-ui/tum-ui/button', '@tumaet/ui-angular'])
    assert.ok(
      analyzeFile('a.ts', `import { Button } from '${pkg}'`).findings.some(
        (f) => f.dimension === 'tumUi',
      ),
    )
})
test('detects stylesheet imports/tokens without counting commented debt', () => {
  const result = analyzeFile(
    'src/main/webapp/content/scss/a.scss',
    `/* --bs-hidden */\n// --p-hidden\n.a { color: var(--p-red-500); }\n@use 'bootstrap/scss/bootstrap';`,
  )
  assert.equal(result.findings.length, 2)
  assert.equal(result.findings[0].line, 3)
})
test('reports invalid templates rather than claiming full analysis', () => {
  assert.ok(analyzeFile(path, '<div><span></div>').errors.length > 0)
})
test('discovers modules, deduplicates file metrics and excludes kit/test source', () => {
  const root = mkdtempSync(join(tmpdir(), 'codestats-test-'))
  try {
    const files = {
      'app/exam/a.html': '<p-dialog/><p-button/><div class="btn"></div>',
      'app/exam/a.spec.ts': "import {} from 'primeng/button'",
      'app/shared-ui/tum-ui/a.html': '<p-button/>',
      'content/a.scss': '.a { color: var(--bs-blue); }',
    }
    for (const [path, source] of Object.entries(files)) {
      const full = join(root, 'src/main/webapp', path)
      mkdirSync(join(full, '..'), { recursive: true })
      writeFileSync(full, source)
    }
    const result = analyzeDirectory(
      root,
      'a'.repeat(40),
      '2026-01-01T00:00:00Z',
    )
    assert.equal(result.snapshot.files, 2)
    assert.equal(result.snapshot.legacyFiles, 2)
    assert.equal(result.snapshot.counts.primeng, 1)
    assert.equal(result.snapshot.modules.length, 2)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
test('reduction handles no baseline, elimination and regression without clamping', () => {
  assert.equal(reduction(0, 0), null)
  assert.equal(reduction(10, 0), 100)
  assert.equal(reduction(10, 15), -50)
  assert.equal(
    sourceUrl('a'.repeat(40), 'path/file name.html', 7).endsWith(
      'path/file%20name.html#L7',
    ),
    true,
  )
})
test('published reports validate; retained evidence reproduces published file counts', () => {
  const manifest = manifestSchema.parse(
    JSON.parse(readFileSync('public/migrations/index.json', 'utf8')),
  )
  assert.ok(
    manifest.snapshots.some((s) => s.commit === manifest.packageAdoption),
  )
  for (const snapshot of manifest.snapshots.filter((s) =>
    manifest.evidenceCommits.includes(s.commit),
  )) {
    const detail = detailSchema.parse(
      JSON.parse(
        readFileSync(`public/migrations/${snapshot.commit}.json`, 'utf8'),
      ),
    )
    assert.equal(detail.commit, snapshot.commit)
    const counts = emptyCounts()
    for (const dimension of dimensionKeys)
      counts[dimension] = new Set(
        detail.findings
          .filter((f) => f.dimension === dimension)
          .map((f) => f.path),
      ).size
    assert.deepEqual(counts, snapshot.counts)
    assert.equal(
      new Set(
        detail.findings
          .filter((f) => legacyKeys.includes(f.dimension))
          .map((f) => f.path),
      ).size,
      snapshot.legacyFiles,
    )
    for (const module of snapshot.modules) {
      for (const dimension of dimensionKeys)
        assert.equal(
          new Set(
            detail.findings
              .filter(
                (finding) =>
                  finding.module === module.name &&
                  finding.dimension === dimension,
              )
              .map((finding) => finding.path),
          ).size,
          module.counts[dimension],
        )
    }
    for (const dimension of dimensionKeys)
      assert.equal(
        snapshot.modules.reduce((sum, m) => sum + m.counts[dimension], 0),
        counts[dimension],
      )
  }
  assert.equal(
    manifestSchema.safeParse({ ...manifest, baseline: '0'.repeat(40) }).success,
    false,
  )
  assert.equal(
    manifestSchema.safeParse({ ...manifest, schemaVersion: 99 }).success,
    false,
  )
})

test('interpolated literal classes and ng-bootstrap elements are visible', () => {
  assert.deepEqual(
    dimensions(
      `<ngb-alert class="btn {{active ? 'd-flex' : ''}}">Hello</ngb-alert>`,
    ),
    new Set(['ngBootstrap', 'bootstrap']),
  )
})
test('computed class variables are not resolved to invented evidence', () => {
  assert.equal(dimensions(`<div [ngClass]="classesForUser()"></div>`).size, 0)
})
test('empty source trees cannot become a false-green report', () => {
  const root = mkdtempSync(join(tmpdir(), 'codestats-empty-'))
  try {
    mkdirSync(join(root, 'src/main/webapp/app'), { recursive: true })
    mkdirSync(join(root, 'src/main/webapp/content'), { recursive: true })
    assert.throws(
      () => analyzeDirectory(root, 'a'.repeat(40), '2026-01-01T00:00:00Z'),
      /refusing a false-green report/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('class tokens preserve variants and arbitrary values rather than inventing bare classes', () => {
  const result = analyzeFile(
    path,
    '<div class="md:grid hover:btn [content:grid] grid-cols-[1fr,auto]"></div>',
  )
  assert.deepEqual(
    result.findings.map((finding) => finding.evidence),
    ['md:grid'],
  )
  assert.ok(
    !result.findings.some((finding) => finding.dimension === 'bootstrap'),
  )
})

test('component class inputs, button content directives and style-property bindings are evidence', () => {
  const result = analyzeFile(
    path,
    `<p-dialog styleClass="d-flex" [contentStyleClass]="compact ? 'items-center' : ''">
      <fa-icon pButtonIcon /><span pButtonLabel></span>
      <div [style.--bs-body-color]="color"></div>
    </p-dialog>`,
  )
  for (const evidence of [
    'd-flex',
    'items-center',
    'pButtonIcon',
    'pButtonLabel',
    '--bs-body-color',
  ])
    assert.ok(
      result.findings.some((finding) => finding.evidence === evidence),
      evidence,
    )
})

test('runtime contracts reject contradictory totals and stale analyzer evidence', () => {
  const manifest = JSON.parse(
    readFileSync('public/migrations/index.json', 'utf8'),
  )
  const wrongTotal = structuredClone(manifest)
  wrongTotal.snapshots[0].counts.primeng++
  assert.equal(manifestSchema.safeParse(wrongTotal).success, false)
  const duplicateModule = structuredClone(manifest)
  duplicateModule.snapshots[0].modules.push(
    duplicateModule.snapshots[0].modules[0],
  )
  assert.equal(manifestSchema.safeParse(duplicateModule).success, false)
  assert.equal(
    detailSchema.safeParse({
      analyzerVersion: 1,
      commit: 'a'.repeat(40),
      findings: [],
    }).success,
    false,
  )
})

test('class conditions and function arguments are not mistaken for rendered classes', () => {
  for (const html of [
    `<div [class]="kind === 'btn' ? 'grid' : ''"></div>`,
    `<div [ngClass]="{'grid': kind === 'btn'}"></div>`,
    `<div [class]="classesFor('btn')"></div>`,
    `<div [class]="kind === 'btn' && 'grid'"></div>`,
  ])
    assert.ok(!dimensions(html).has('bootstrap'), html)
})

test('inline templates belong to Angular Component metadata, including imported aliases', () => {
  const unrelated = analyzeFile(
    'example.ts',
    `const fixture = { template: '<p-dialog />' }; @Other({template: '<p-button />'}) class Example {}`,
  )
  assert.equal(unrelated.templates, 0)
  assert.deepEqual(unrelated.findings, [])
  for (const declaration of [
    `import { Component as View } from '@angular/core'; @View({'template': '<p-dialog />'}) class Example {}`,
    `import * as ng from '@angular/core'; @ng.Component({template: '<p-dialog />'}) class Example {}`,
  ]) {
    const result = analyzeFile('example.ts', declaration)
    assert.equal(result.templates, 1)
    assert.equal(result.findings[0]?.dimension, 'primeng')
  }
})
