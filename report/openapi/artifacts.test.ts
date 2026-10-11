import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { openApiFixture } from '../../tests/fixtures/openapi'
import { sha256, validateArtifacts } from './artifacts'

test('artifact validation checks all retained snapshots, identities and unlisted files', async (t) => {
  const output = await mkdtemp(path.join(tmpdir(), 'openapi-artifact-test-'))
  const snapshot = openApiFixture()
  const bytes = JSON.stringify(snapshot) + '\n'
  const entry = {
    artemisCommit: snapshot.provenance.artemisCommit,
    file: `${snapshot.provenance.artemisCommit}.json`,
    sha256: sha256(bytes),
    analyzerVersion: snapshot.provenance.analyzerVersion,
    analyzedAt: snapshot.provenance.analyzedAt,
  }
  const manifest = {
    schemaVersion: 1,
    generatedAt: entry.analyzedAt,
    snapshots: [entry],
  }
  const write = async (record = manifest, content = bytes) => {
    await writeFile(
      path.join(output, 'index.json'),
      JSON.stringify(record) + '\n',
    )
    await writeFile(path.join(output, entry.file), content)
  }
  try {
    await write()
    assert.deepEqual(await validateArtifacts(output), manifest)
    assert.equal(await readFile(path.join(output, entry.file), 'utf8'), bytes)
    await t.test('missing history cannot be silently discarded', async () => {
      const absent = {
        ...entry,
        artemisCommit: 'b'.repeat(40),
        file: `${'b'.repeat(40)}.json`,
      }
      await write({ ...manifest, snapshots: [entry, absent] })
      await assert.rejects(validateArtifacts(output), /ENOENT/)
    })
    await t.test(
      'a valid digest cannot hide the wrong analyzer identity',
      async () => {
        await write({
          ...manifest,
          snapshots: [{ ...entry, analyzerVersion: 'mismatched' }],
        })
        await assert.rejects(validateArtifacts(output), /identity mismatch/)
      },
    )
    await t.test('a revision must determine its filename', async () => {
      await write({
        ...manifest,
        snapshots: [{ ...entry, file: 'other.json' }],
      })
      await assert.rejects(
        validateArtifacts(output),
        /Unlisted|filename\/revision mismatch/,
      )
    })
    await t.test(
      'schema errors are rejected even with a matching digest',
      async () => {
        const invalid = JSON.stringify({ ...snapshot, schemaVersion: 99 })
        await write(
          { ...manifest, snapshots: [{ ...entry, sha256: sha256(invalid) }] },
          invalid,
        )
        await assert.rejects(validateArtifacts(output), /Invalid literal value/)
      },
    )
    await t.test(
      'logical manifest time must cover the retained history',
      async () => {
        await write({ ...manifest, generatedAt: '2035-01-01T00:00:00.000Z' })
        await assert.rejects(validateArtifacts(output), /timestamp/)
      },
    )
    await t.test(
      'new files are checked without relying on git diff',
      async () => {
        await write()
        await writeFile(path.join(output, 'new.json'), bytes)
        await assert.rejects(
          validateArtifacts(output),
          /Unlisted OpenAPI artifact/,
        )
      },
    )
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})
