import { z } from 'zod'
import { manifestSchema, schemaVersion, snapshotSchema } from './model'

function validate<T>(value: unknown, schema: z.ZodType<T>, file: string): T {
  if (
    value &&
    typeof value === 'object' &&
    'schemaVersion' in value &&
    value.schemaVersion !== schemaVersion
  )
    throw new Error(
      `Unsupported OpenAPI schema in ${file}. Publish matching reports and dashboard code.`,
    )
  const parsed = schema.safeParse(value)
  if (!parsed.success)
    throw new Error(
      `Invalid OpenAPI report (${file}: ${parsed.error.issues[0]?.path.join('.') || 'schema'}). Regenerate and publish validated reports.`,
    )
  return parsed.data
}

/** Read immutable artifacts, never the live Artemis API. The override is for loader tests. */
export async function loadOpenApiReport(
  requested: { snapshot?: string },
  signal: AbortSignal,
  baseUrl = import.meta.env?.BASE_URL ?? '/',
) {
  const read = async (file: string, cache: RequestCache) => {
    const response = await fetch(`${baseUrl}openapi/${file}`, { signal, cache })
    if (!response.ok)
      throw new Error(
        `OpenAPI report unavailable (HTTP ${response.status}). Collect and publish public/openapi/ artifacts, then retry.`,
      )
    return response.text()
  }
  const json = (bytes: string, file: string): unknown => {
    try {
      return JSON.parse(bytes)
    } catch {
      throw new Error(
        `Invalid JSON in OpenAPI report ${file}. Publish validated artifacts.`,
      )
    }
  }
  const manifest = validate(
    json(await read('index.json', 'no-cache'), 'index.json'),
    manifestSchema,
    'index.json',
  )
  const entry = requested.snapshot
    ? manifest.snapshots.find(
        (snapshot) => snapshot.artemisCommit === requested.snapshot,
      )
    : [...manifest.snapshots]
        .sort((a, b) => Date.parse(a.analyzedAt) - Date.parse(b.analyzedAt))
        .at(-1)
  if (!entry)
    throw new Error(
      'The requested OpenAPI revision is not in the report history. Clear the snapshot filter to load the latest report.',
    )
  if (entry.file !== `${entry.artemisCommit}.json`)
    throw new Error(
      'OpenAPI report identity mismatch: snapshot filename does not match its revision.',
    )
  const bytes = await read(entry.file, 'default')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(bytes),
  )
  signal.throwIfAborted()
  const hash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  if (hash !== entry.sha256)
    throw new Error(
      'OpenAPI report integrity mismatch. Publish the manifest and snapshot from the same collection, then retry.',
    )
  const snapshot = validate(json(bytes, entry.file), snapshotSchema, entry.file)
  if (
    snapshot.provenance.artemisCommit !== entry.artemisCommit ||
    snapshot.provenance.analyzerVersion !== entry.analyzerVersion ||
    snapshot.provenance.analyzedAt !== entry.analyzedAt
  )
    throw new Error(
      'OpenAPI report identity mismatch. Publish a matching manifest and snapshot, then retry.',
    )
  signal.throwIfAborted()
  return { manifest, snapshot }
}

export type OpenApiReport = Awaited<ReturnType<typeof loadOpenApiReport>>
