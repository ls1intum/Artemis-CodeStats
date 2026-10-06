import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveClosures,
  flowOf,
  matchUnits,
  type Detail,
  type Unit,
} from './model'

const unit = (id: string, patch: Partial<Unit> = {}): Unit => ({
  id,
  kind: 'component',
  selector: `jhi-${id.split('/').pop()!.replace('.component.ts', '')}`,
  section: id.split('/')[1],
  template: id.replace('.ts', '.html'),
  styles: [],
  status: 'dirty',
  scanned: false,
  tailwind: false,
  spacing: 0,
  classHits: 0,
  styleHits: 0,
  imports: [],
  tokens: {},
  primeng: {},
  ngBootstrap: {},
  tumUi: {},
  ...patch,
})
const detail = (units: Unit[]): Detail => ({
  analyzerVersion: 5,
  commit: 'a'.repeat(40),
  rule: 'r',
  kit: [],
  lockGlobs: [],
  lockable: [],
  sections: [],
  files: [],
  diagnostics: [],
  units,
  styles: [],
})

test('a moved unit is matched to its old location, not counted as removed and new', () => {
  const before = [
    unit(
      'app/programming/custom-build-plans/editor/build-phase-editor.component.ts',
      { classHits: 27 },
    ),
    unit('app/course/a/a.component.ts', { classHits: 5 }),
  ]
  const after = [
    unit(
      'app/programming/manage/build-plan-editor/build-phase-editor.component.ts',
      { classHits: 28 },
    ),
    unit('app/course/a/a.component.ts', { classHits: 0 }),
    unit('app/course/b/b.component.ts', { classHits: 3 }),
  ]
  const pairs = matchUnits(before, after)
  assert.equal(pairs.filter(([a, b]) => a && b).length, 2)
  const flow = flowOf(detail(before), detail(after))
  assert.deepEqual(
    [flow.hitsRemoved, flow.hitsAdded, flow.converted, flow.regressed],
    [5, 4, 1, 0],
    'the move adds 1, the new unit 3; the converted unit removes 5',
  )
  assert.deepEqual(flow.sections.course, [5, 3, 1, 0, 0])
})

test('page totals count every unit once across the page, its imports and its layouts', () => {
  const shared = unit('app/course/shared/shared.component.ts', {
    classHits: 10,
  })
  const layout = unit('app/course/layout/layout.component.ts', {
    classHits: 4,
    imports: [shared.id],
  })
  const page = unit('app/course/page/page.component.ts', {
    classHits: 1,
    imports: [shared.id],
    route: '/courses/x',
    routeParents: [layout.id],
  })
  const d = deriveClosures([shared, layout, page]).get(page.id)!
  assert.equal(d.closureHits, 10)
  assert.equal(d.routeHits, 4, 'the shared unit is already in the page closure')
  assert.deepEqual(d.routeBlockers, [layout.id])
})
