import { z } from 'zod'

const revision = z.string().regex(/^[a-f0-9]{40}$/)
const dashboard = z
  .object({
    state: z.enum(['success', 'failed']),
    publishedCommit: revision.nullable(),
  })
  .strict()
export const collectionStatusSchema = z
  .object({
    schemaVersion: z.literal(1),
    updatedAt: z.string().datetime(),
    attemptedCommit: revision,
    runUrl: z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value)
        return url.protocol === 'https:' && url.hostname === 'github.com'
      }),
    dashboards: z.object({ ui: dashboard, openapi: dashboard }).strict(),
  })
  .strict()
export type CollectionStatus = z.infer<typeof collectionStatusSchema>
