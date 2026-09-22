import { z } from 'zod'

export const analyzerVersion = 4

const count = z.number().int().nonnegative()
const sha = z.string().regex(/^[a-f0-9]{40}$/)

export const statuses = ['locked', 'clean', 'dirty'] as const
export const views = [
  'overview',
  'sections',
  'pages',
  'next',
  'inventory',
] as const
export type View = (typeof views)[number]
export type Status = (typeof statuses)[number]

export const totalsSchema = z.object({
  units: count,
  locked: count,
  clean: count,
  dirty: count,
  classHits: count,
  styleHits: count,
  lockedResidue: count,
  lockedDirs: count,
  lockableDirs: count,
  primeng: count,
  ngBootstrap: count,
  tumUi: count,
  kit: count,
  pages: count,
  pagesClean: count,
  // Units with no Bootstrap hits and no PrimeNG or ng-bootstrap usage: the modernization target.
  legacyFree: count,
})
export type Totals = z.infer<typeof totalsSchema>

// Per-section rows are compact tuples:
// units, locked, clean, dirty, classHits, styleHits, legacyFree, primeng, ngBootstrap, tumUi.
export const sectionRowSchema = z.tuple([
  count,
  count,
  count,
  count,
  count,
  count,
  count,
  count,
  count,
  count,
])
export type SectionRow = z.infer<typeof sectionRowSchema>
export const summarySchema = z.object({
  commit: sha,
  date: z.string().datetime({ offset: true }),
  subject: z.string(),
  totals: totalsSchema,
  sections: z.record(z.string(), sectionRowSchema),
})
export type Summary = z.infer<typeof summarySchema>

export const manifestSchema = z
  .object({
    schemaVersion: z.literal(4),
    analyzerVersion: z.literal(analyzerVersion),
    generatedAt: z.string().datetime(),
    baseline: sha,
    packageAdoption: sha,
    // Commits with a full detail file; every other commit's detail is a patch against the base before it.
    bases: z.array(sha).min(1),
    snapshots: z.array(summarySchema).min(1),
  })
  .superRefine((data, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: 'custom', message })
    const commits = data.snapshots.map((s) => s.commit)
    if (new Set(commits).size !== commits.length) invalid('Duplicate snapshots')
    if (commits[0] !== data.baseline) invalid('Missing baseline snapshot')
    if (
      [data.baseline, data.packageAdoption].some(
        (c) => !data.bases.includes(c),
      ) ||
      data.bases.some((c) => !commits.includes(c))
    )
      invalid('Invalid base commits')
    if (
      data.snapshots.some(
        (s, i) =>
          i > 0 && Date.parse(s.date) < Date.parse(data.snapshots[i - 1].date),
      )
    )
      invalid('Snapshots must be chronological')
  })
export type Manifest = z.infer<typeof manifestSchema>

const usage = z.record(z.string(), count)
export const unitSchema = z.object({
  id: z.string(),
  kind: z.enum(['component', 'directive']),
  selector: z.string().optional(),
  section: z.string(),
  template: z.string().optional(),
  styles: z.array(z.string()),
  status: z.enum(statuses),
  scanned: z.boolean(),
  tailwind: z.boolean(),
  // Full route path from app.routes.ts; `:dynamic` marks a non-literal segment.
  route: z.string().optional(),
  // Route components this page renders inside, outermost first.
  routeParents: z.array(z.string()).optional(),
  spacing: count,
  classHits: count,
  styleHits: count,
  // Units whose decorated class this unit imports; closures are derived from these edges.
  imports: z.array(z.string()),
  tokens: usage,
  primeng: usage,
  ngBootstrap: usage,
  tumUi: usage,
})
export type Unit = z.infer<typeof unitSchema>

export const sectionSchema = z.object({
  name: z.string(),
  units: count,
  locked: count,
  clean: count,
  dirty: count,
  classHits: count,
  styleHits: count,
  lockableDirs: count,
  blockers: count,
  legacyFree: count,
  primeng: count,
  ngBootstrap: count,
  tumUi: count,
})
export type Section = z.infer<typeof sectionSchema>

// A unit's modernization stage: Bootstrap first, then the remaining component libraries.
export const stages = ['modern', 'components', 'bootstrap'] as const
export type Stage = (typeof stages)[number]
export const usesLibrary = (usage: Record<string, number>) =>
  Object.keys(usage).length > 0
export const stageOf = (u: {
  classHits: number
  styleHits: number
  primeng: Record<string, number>
  ngBootstrap: Record<string, number>
}): Stage =>
  u.classHits + u.styleHits > 0
    ? 'bootstrap'
    : usesLibrary(u.primeng) || usesLibrary(u.ngBootstrap)
      ? 'components'
      : 'modern'

const styleFileSchema = z.object({
  path: z.string(),
  section: z.string(),
  variables: count,
  colors: count,
  imports: count,
  units: count,
})
export type StyleFile = z.infer<typeof styleFileSchema>

const detailBase = z.object({
  analyzerVersion: z.literal(analyzerVersion),
  commit: sha,
  rule: sha,
  kit: z.array(z.string()),
  lockGlobs: z.array(z.string()),
  lockable: z.array(z.object({ dir: z.string(), units: count })),
  sections: z.array(sectionSchema),
  files: z.array(
    z.object({
      path: z.string(),
      section: z.string(),
      classHits: count,
      styleHits: count,
      tokens: usage,
    }),
  ),
  diagnostics: z.array(z.object({ path: z.string(), message: z.string() })),
})
export const detailSchema = detailBase.extend({
  units: z.array(unitSchema),
  styles: z.array(styleFileSchema),
})
export type Detail = z.infer<typeof detailSchema>
// Every commit has a detail file; most are patches against the previous base commit.
export const patchSchema = detailBase.extend({
  base: sha,
  units: z.object({
    changed: z.array(unitSchema),
    removed: z.array(z.string()),
  }),
  styles: z.object({
    changed: z.array(styleFileSchema),
    removed: z.array(z.string()),
  }),
})
export type Patch = z.infer<typeof patchSchema>
export const storedDetailSchema = z.union([detailSchema, patchSchema])

const patched = <T extends { [k in K]: string }, K extends keyof T>(
  key: K,
  base: T[],
  changed: T[],
  removed: string[],
) => {
  const replaced = new Map(changed.map((item) => [item[key] as string, item]))
  const gone = new Set(removed)
  const kept = base
    .filter((item) => !gone.has(item[key] as string))
    .map((item) => replaced.get(item[key] as string) ?? item)
  const known = new Set(base.map((item) => item[key] as string))
  return [...kept, ...changed.filter((item) => !known.has(item[key] as string))]
}
export function applyPatch(base: Detail, patch: Patch): Detail {
  if (patch.base !== base.commit)
    throw new Error(`Patch ${patch.commit} does not apply to ${base.commit}`)
  return {
    analyzerVersion: patch.analyzerVersion,
    commit: patch.commit,
    rule: patch.rule,
    kit: patch.kit,
    lockGlobs: patch.lockGlobs,
    lockable: patch.lockable,
    sections: patch.sections,
    files: patch.files,
    diagnostics: patch.diagnostics,
    units: patched(
      'id',
      base.units,
      patch.units.changed,
      patch.units.removed,
    ).sort((a, b) => a.id.localeCompare(b.id)),
    styles: patched(
      'path',
      base.styles,
      patch.styles.changed,
      patch.styles.removed,
    ),
  }
}
export function makePatch(base: Detail, detail: Detail): Patch {
  const diff = <T extends { [k in K]: string }, K extends keyof T>(
    key: K,
    before: T[],
    after: T[],
  ) => {
    const previous = new Map(before.map((item) => [item[key] as string, item]))
    const next = new Set(after.map((item) => item[key] as string))
    return {
      changed: after.filter((item) => {
        const old = previous.get(item[key] as string)
        return !old || JSON.stringify(old) !== JSON.stringify(item)
      }),
      removed: before
        .map((item) => item[key] as string)
        .filter((id) => !next.has(id)),
    }
  }
  const { units, styles, ...rest } = detail
  return {
    ...rest,
    base: base.commit,
    units: diff('id', base.units, units),
    styles: diff('path', base.styles, styles),
  }
}

// Import closures are derived on the client so stored units only carry facts about themselves.
export type Derived = {
  closureHits: number
  blockers: string[]
  blocks: number
  routeHits: number
  // Units in the import closure, and in the parent routes, that still use PrimeNG or ng-bootstrap.
  closureComponents: number
  routeComponents: number
}
export type UnitView = Unit & Derived
export function deriveClosures(units: Unit[]): Map<string, Derived> {
  const byId = new Map(units.map((u) => [u.id, u]))
  const own = (u: Unit) => u.classHits + u.styleHits
  const reach = (id: string): Set<string> => {
    const seen = new Set<string>()
    const stack = [...(byId.get(id)?.imports ?? [])]
    while (stack.length) {
      const next = stack.pop()!
      if (seen.has(next) || !byId.has(next)) continue
      seen.add(next)
      stack.push(...byId.get(next)!.imports)
    }
    seen.delete(id)
    return seen
  }
  const components = (u: Unit) =>
    usesLibrary(u.primeng) || usesLibrary(u.ngBootstrap) ? 1 : 0
  const derived = new Map<string, Derived>()
  for (const u of units) {
    const closure = [...reach(u.id)].map((id) => byId.get(id)!)
    derived.set(u.id, {
      closureHits: closure.reduce((n, o) => n + own(o), 0),
      blockers: closure
        .filter((o) => own(o) > 0)
        .map((o) => o.id)
        .sort(),
      blocks: 0,
      routeHits: 0,
      closureComponents: closure.reduce((n, o) => n + components(o), 0),
      routeComponents: 0,
    })
  }
  for (const u of units) {
    const d = derived.get(u.id)!
    if (u.status === 'clean' && own(u) === 0)
      for (const id of d.blockers) derived.get(id)!.blocks++
    for (const id of u.routeParents ?? []) {
      const parent = byId.get(id)
      if (!parent) continue
      d.routeHits += own(parent) + derived.get(id)!.closureHits
      d.routeComponents +=
        components(parent) + derived.get(id)!.closureComponents
    }
  }
  return derived
}
export const enrich = (units: Unit[]): UnitView[] => {
  const derived = deriveClosures(units)
  return units.map((u) => ({ ...u, ...derived.get(u.id)! }))
}

export type InventoryEntry = {
  name: string
  occurrences: number
  units: number
}
export const inventoryOf = (usages: Record<string, number>[]) => {
  const entries = new Map<string, InventoryEntry>()
  for (const usage of usages)
    for (const [name, occurrences] of Object.entries(usage)) {
      const entry = entries.get(name) ?? { name, occurrences: 0, units: 0 }
      entry.occurrences += occurrences
      entry.units++
      entries.set(name, entry)
    }
  return [...entries.values()].sort(
    (a, b) => b.occurrences - a.occurrences || a.name.localeCompare(b.name),
  )
}

// Stored paths are relative to the Artemis client root, `src/main/webapp/`.
export const webapp = 'src/main/webapp/'
export const appRoot = 'src/main/webapp/app'
export const sectionOf = (path: string) =>
  !path.startsWith(`${appRoot}/`)
    ? 'content'
    : path.slice(appRoot.length + 1).includes('/')
      ? path.slice(appRoot.length + 1).split('/')[0]
      : 'app'

// Files with several declarations produce units `path#1`, `path#2`, … after the first.
export const unitPath = (id: string) => id.replace(/#\d+$/, '')
export const sourceUrl = (commit: string, path: string) =>
  `https://github.com/ls1intum/Artemis/blob/${commit}/${(path.startsWith(webapp)
    ? path
    : webapp + path
  )
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
export const commitUrl = (commit: string) =>
  `https://github.com/ls1intum/Artemis/commit/${commit}`
export const pullRequest = (subject: string) => {
  const match = /^(.*?)\s*\(#(\d+)\)\s*$/.exec(subject)
  return match
    ? {
        title: match[1],
        number: match[2],
        url: `https://github.com/ls1intum/Artemis/pull/${match[2]}`,
      }
    : { title: subject }
}

// The three lists the Artemis migration-source-coverage test keeps consistent.
export const lockEntries = (dir: string) => ({
  eslint: `'${webapp}${dir}/**/*.html',`,
  stylelint: `"${webapp}${dir}/**/*.scss",`,
  tailwind: `@source './${dir}';`,
})
