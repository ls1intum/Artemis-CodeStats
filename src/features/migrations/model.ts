import { z } from 'zod'

export const analyzerVersion = 3

export const dimensions = {
  primeng: {
    label: 'PrimeNG',
    kind: 'legacy',
    description:
      'Files importing PrimeNG or using p-* elements / PrimeNG directives.',
  },
  ngBootstrap: {
    label: 'ng-bootstrap',
    kind: 'legacy',
    description:
      'Files importing @ng-bootstrap or using ngb elements / directives.',
  },
  bootstrap: {
    label: 'Bootstrap classes',
    kind: 'legacy',
    description:
      'Files with unambiguous Bootstrap classes; shared spacing names are excluded.',
  },
  legacyTokens: {
    label: 'Legacy style tokens',
    kind: 'legacy',
    description: 'Files referencing --bs-* or --p-* CSS variables.',
  },
  tumUi: {
    label: 'TUM UI',
    kind: 'modern',
    description:
      'Files importing the owned kit or using tum-ui-* elements / tumUi directives.',
  },
  tailwind: {
    label: 'Tailwind evidence',
    kind: 'modern',
    description:
      'Templates with distinctive Tailwind utilities; not proof of complete migration.',
  },
} as const
export type Dimension = keyof typeof dimensions
export const dimensionKeys = Object.keys(dimensions) as Dimension[]
export const legacyKeys = dimensionKeys.filter(
  (key) => dimensions[key].kind === 'legacy',
)
const count = z.number().int().nonnegative()
export const countsSchema = z.object({
  primeng: count,
  ngBootstrap: count,
  bootstrap: count,
  legacyTokens: count,
  tumUi: count,
  tailwind: count,
})
export type Counts = z.infer<typeof countsSchema>
export const emptyCounts = (): Counts => ({
  primeng: 0,
  ngBootstrap: 0,
  bootstrap: 0,
  legacyTokens: 0,
  tumUi: 0,
  tailwind: 0,
})
const sha = z.string().regex(/^[a-f0-9]{40}$/)
const moduleSchema = z.object({
  name: z.string(),
  files: count,
  legacyFiles: count,
  counts: countsSchema,
})
export const snapshotSchema = z
  .object({
    commit: sha,
    date: z.string().datetime({ offset: true }),
    files: count,
    templates: count,
    legacyFiles: count,
    counts: countsSchema,
    modules: z.array(moduleSchema),
    diagnostics: z.array(z.object({ path: z.string(), message: z.string() })),
  })
  .superRefine((snapshot, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: 'custom', message })
    if (
      new Set(snapshot.modules.map((module) => module.name)).size !==
      snapshot.modules.length
    )
      invalid('Duplicate modules')
    for (const scope of [snapshot, ...snapshot.modules]) {
      if (
        scope.legacyFiles > scope.files ||
        dimensionKeys.some((key) => scope.counts[key] > scope.files)
      )
        invalid('Affected-file counts exceed scanned files')
      if (
        legacyKeys.some((key) => scope.counts[key] > scope.legacyFiles) ||
        scope.legacyFiles >
          legacyKeys.reduce((sum, key) => sum + scope.counts[key], 0)
      )
        invalid('Legacy union contradicts dimension counts')
    }
    for (const key of ['files', 'legacyFiles'] as const)
      if (
        snapshot.modules.reduce((sum, module) => sum + module[key], 0) !==
        snapshot[key]
      )
        invalid(`Module ${key} do not reconcile`)
    for (const key of dimensionKeys)
      if (
        snapshot.modules.reduce(
          (sum, module) => sum + module.counts[key],
          0,
        ) !== snapshot.counts[key]
      )
        invalid(`Module ${key} counts do not reconcile`)
  })
export const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    analyzerVersion: z.literal(analyzerVersion),
    generatedAt: z.string().datetime(),
    baseline: sha,
    packageAdoption: sha,
    snapshots: z.array(snapshotSchema).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.snapshots[0]?.commit !== data.baseline)
      ctx.addIssue({ code: 'custom', message: 'Missing adoption baseline' })
    if (!data.snapshots.some((s) => s.commit === data.packageAdoption))
      ctx.addIssue({
        code: 'custom',
        message: 'Missing package-adoption milestone',
      })
    if (
      data.snapshots.some(
        (s, i) =>
          i > 0 && Date.parse(s.date) < Date.parse(data.snapshots[i - 1].date),
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Snapshots must be chronological',
      })
    if (
      new Set(data.snapshots.map((s) => s.commit)).size !==
      data.snapshots.length
    )
      ctx.addIssue({ code: 'custom', message: 'Duplicate snapshots' })
  })
export const findingSchema = z.object({
  path: z.string(),
  module: z.string(),
  line: z.number().int().positive(),
  dimension: z.enum([
    'primeng',
    'ngBootstrap',
    'bootstrap',
    'legacyTokens',
    'tumUi',
    'tailwind',
  ]),
  evidence: z.string(),
})
export const detailSchema = z.object({
  analyzerVersion: z.literal(analyzerVersion),
  commit: sha,
  findings: z.array(findingSchema),
})
export type Detail = z.infer<typeof detailSchema>
export type Finding = z.infer<typeof findingSchema>
export type Snapshot = z.infer<typeof snapshotSchema>
export type Manifest = z.infer<typeof manifestSchema>
export function sourceUrl(commit: string, path: string, line?: number) {
  return `https://github.com/ls1intum/Artemis/blob/${commit}/${path.split('/').map(encodeURIComponent).join('/')}${line ? `#L${line}` : ''}`
}
// Negative reduction is a regression; zero baseline is deliberately not 100%.
export function reduction(baseline: number, current: number): number | null {
  return baseline === 0 ? null : ((baseline - current) / baseline) * 100
}

export const commitUrl = (sha: string) =>
  `https://github.com/ls1intum/Artemis/commit/${sha}`
