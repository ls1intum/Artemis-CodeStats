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
  'history',
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
})
export type Totals = z.infer<typeof totalsSchema>

// Per-section rows are compact tuples: units, locked, clean, dirty, classHits, styleHits.
export const sectionRowSchema = z.tuple([
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
    schemaVersion: z.literal(3),
    analyzerVersion: z.literal(analyzerVersion),
    generatedAt: z.string().datetime(),
    baseline: sha,
    packageAdoption: sha,
    evidenceCommits: z.array(sha).min(1),
    snapshots: z.array(summarySchema).min(1),
  })
  .superRefine((data, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: 'custom', message })
    const commits = data.snapshots.map((s) => s.commit)
    if (new Set(commits).size !== commits.length) invalid('Duplicate snapshots')
    if (commits[0] !== data.baseline) invalid('Missing baseline snapshot')
    if (
      [data.baseline, data.packageAdoption, commits.at(-1)].some(
        (c) => !c || !data.evidenceCommits.includes(c),
      ) ||
      data.evidenceCommits.some((c) => !commits.includes(c))
    )
      invalid('Invalid evidence commits')
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
  route: z.string().optional(),
  spacing: count,
  classHits: count,
  styleHits: count,
  closureHits: count,
  blocked: count,
  blocks: count,
  blockers: z.array(z.string()),
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
})
export type Section = z.infer<typeof sectionSchema>

const inventoryEntry = z.object({
  name: z.string(),
  occurrences: count,
  units: count,
})
export type InventoryEntry = z.infer<typeof inventoryEntry>

export const detailSchema = z.object({
  analyzerVersion: z.literal(analyzerVersion),
  commit: sha,
  rule: sha,
  kit: z.array(z.string()),
  lockGlobs: z.array(z.string()),
  lockable: z.array(z.object({ dir: z.string(), units: count })),
  sections: z.array(sectionSchema),
  units: z.array(unitSchema),
  styles: z.array(
    z.object({
      path: z.string(),
      section: z.string(),
      variables: count,
      colors: count,
      imports: count,
      units: count,
    }),
  ),
  files: z.array(
    z.object({
      path: z.string(),
      section: z.string(),
      classHits: count,
      styleHits: count,
      tokens: usage,
    }),
  ),
  inventory: z.object({
    bootstrap: z.array(inventoryEntry),
    primeng: z.array(inventoryEntry),
    ngBootstrap: z.array(inventoryEntry),
    tumUi: z.array(inventoryEntry),
  }),
  diagnostics: z.array(z.object({ path: z.string(), message: z.string() })),
})
export type Detail = z.infer<typeof detailSchema>

export const siteUrl = 'https://ls1intum.github.io/Artemis-CodeStats/'
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
  `https://github.com/ls1intum/Artemis/blob/${commit}/${path.split('/').map(encodeURIComponent).join('/')}`
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
  eslint: `'${dir}/**/*.html',`,
  stylelint: `"${dir}/**/*.scss",`,
  tailwind: `@source '${dir.replace(/^src\/main\/webapp\//, './')}';`,
})
