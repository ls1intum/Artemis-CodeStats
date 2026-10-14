import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { openApiFixture } from '../../tests/fixtures/openapi'
import { sha256 } from './artifacts'
import { verifyOpenApiDeployment } from './verify-deployment'

const snapshot = openApiFixture()
const bytes = JSON.stringify(snapshot)
const entry = {
  artemisCommit: snapshot.provenance.artemisCommit,
  file: `${snapshot.provenance.artemisCommit}.json.gz`,
  sha256: sha256(bytes),
  analyzerVersion: snapshot.provenance.analyzerVersion,
  analyzedAt: snapshot.provenance.analyzedAt,
}
const manifest = {
  schemaVersion: 1,
  generatedAt: entry.analyzedAt,
  snapshots: [entry],
}
const request: typeof fetch = async (input) =>
  new Response(
    new URL(String(input)).pathname.endsWith('index.json')
      ? JSON.stringify(manifest)
      : gzipSync(bytes),
  )

test('published OpenAPI evidence is decoded and must match its own revision and expected manifest', async () => {
  const result = await verifyOpenApiDeployment(
    'https://site.test/project',
    entry.artemisCommit,
    request,
    manifest,
  )
  assert.equal(result.snapshot.operations.length, snapshot.operations.length)
  await assert.rejects(
    verifyOpenApiDeployment(
      'https://site.test/project/',
      'c'.repeat(40),
      request,
    ),
    /expected revision/,
  )
  await assert.rejects(
    verifyOpenApiDeployment(
      'https://site.test/project/',
      entry.artemisCommit,
      request,
      { ...manifest, generatedAt: '2000-01-01T00:00:00Z' },
    ),
    /must match/,
  )
})

test('missing, corrupt or partially published OpenAPI artifacts fail deployment verification', async () => {
  const missing: typeof fetch = async (input) =>
    new URL(String(input)).pathname.endsWith('index.json')
      ? request(input)
      : new Response('', { status: 404 })
  await assert.rejects(
    verifyOpenApiDeployment('https://site.test/', entry.artemisCommit, missing),
    /HTTP 404/,
  )
  const corrupt: typeof fetch = async (input) =>
    new URL(String(input)).pathname.endsWith('index.json')
      ? request(input)
      : new Response(gzipSync(bytes + ' '))
  await assert.rejects(
    verifyOpenApiDeployment('https://site.test/', entry.artemisCommit, corrupt),
    /integrity mismatch/,
  )
})
