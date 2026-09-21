import { z } from 'zod'
import { detailSchema, manifestSchema } from './model'

async function loadJson<T>(
  file: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}migrations/${file}`,
    { signal, cache: 'no-cache' },
  )
  if (!response.ok)
    throw new Error(`Report unavailable (HTTP ${response.status}).`)
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success)
    throw new Error(
      'Report data is invalid or uses an unsupported analyzer version. Regenerate and publish matching reports.',
    )
  return parsed.data
}

// Router loader dependencies exclude display filters, so filtering never reloads evidence.
export async function loadMigrationReport(
  commit: string | undefined,
  signal: AbortSignal,
) {
  const manifest = await loadJson('index.json', manifestSchema, signal)
  const current =
    manifest.snapshots.find((snapshot) => snapshot.commit === commit) ??
    manifest.snapshots[manifest.snapshots.length - 1]
  try {
    const detail = await loadJson(
      `${current.commit}.json`,
      detailSchema,
      signal,
    )
    if (detail.commit !== current.commit)
      throw new Error(
        'Report identity mismatch. Regenerate and publish matching reports.',
      )
    return { manifest, current, detail, detailError: undefined }
  } catch (error) {
    if (signal.aborted) throw error
    return {
      manifest,
      current,
      detail: undefined,
      detailError:
        error instanceof Error
          ? error.message
          : 'Could not load source evidence.',
    }
  }
}
