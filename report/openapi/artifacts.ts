import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import {
  manifestSchema,
  snapshotSchema,
  snapshotFileMatches,
  type Manifest,
} from '../../src/features/openapi/model'

export const sha256 = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex')

export async function readManifest(output: string): Promise<Manifest> {
  return manifestSchema.parse(
    JSON.parse(await readFile(path.join(output, 'index.json'), 'utf8')),
  )
}

export async function readSnapshot(
  output: string,
  entry: Manifest['snapshots'][number],
) {
  if (!snapshotFileMatches(entry.file, entry.artemisCommit))
    throw new Error(`OpenAPI filename/revision mismatch: ${entry.file}`)
  const stored = await readFile(path.join(output, entry.file))
  const bytes = entry.file.endsWith('.gz')
    ? gunzipSync(stored, { maxOutputLength: 64 * 1024 * 1024 })
    : stored
  if (sha256(bytes) !== entry.sha256)
    throw new Error(`OpenAPI digest mismatch: ${entry.file}`)
  const snapshot = snapshotSchema.parse(JSON.parse(bytes.toString()))
  if (
    snapshot.provenance.artemisCommit !== entry.artemisCommit ||
    snapshot.provenance.analyzerVersion !== entry.analyzerVersion ||
    snapshot.provenance.analyzedAt !== entry.analyzedAt
  )
    throw new Error(
      `OpenAPI manifest/snapshot identity mismatch: ${entry.file}`,
    )
  return { bytes, snapshot }
}

/** Validate retained history as well as new files, without changing artifacts. */
export async function validateArtifacts(output: string) {
  const manifest = await readManifest(output)
  const listed = new Set([
    'index.json',
    ...manifest.snapshots.map((s) => s.file),
  ])
  for (const file of await readdir(output))
    if (!listed.has(file)) throw new Error(`Unlisted OpenAPI artifact: ${file}`)
  for (const entry of manifest.snapshots) await readSnapshot(output, entry)
  const latestTime = manifest.snapshots
    .map((s) => s.analyzedAt)
    .sort()
    .at(-1)
  if (manifest.generatedAt !== latestTime)
    throw new Error(
      'OpenAPI manifest timestamp does not match retained history',
    )
  return manifest
}
