import { z } from 'zod'
import {
  manifestSchema,
  schemaVersion,
  snapshotSchema,
  snapshotFileMatches,
} from './model'

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
  request: typeof fetch = fetch,
) {
  const read = async (file: string, cache: RequestCache) => {
    const response = await request(`${baseUrl}openapi/${file}`, {
      signal,
      cache,
    })
    if (!response.ok)
      throw new Error(
        `OpenAPI report unavailable (HTTP ${response.status}). Collect and publish public/openapi/ artifacts, then retry.`,
      )
    if (!file.endsWith('.gz')) return response.text()
    const bytes = await response.arrayBuffer()
    // Some hosts decode Content-Encoding themselves; GitHub Pages serves .gz files raw.
    const header = new Uint8Array(bytes)
    if (header[0] !== 0x1f || header[1] !== 0x8b)
      return new TextDecoder().decode(bytes)
    try {
      return await new Response(
        new Response(bytes).body!.pipeThrough(new DecompressionStream('gzip')),
      ).text()
    } catch {
      throw new Error(
        'Invalid compressed OpenAPI report. Publish matching artifacts, then retry.',
      )
    }
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
  if (!snapshotFileMatches(entry.file, entry.artemisCommit))
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
