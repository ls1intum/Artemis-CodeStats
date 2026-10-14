import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { generateReport, type GenerateOptions } from './generate'
import { readSnapshot, validateArtifacts } from './artifacts'

/** Re-extract in isolation. Neither cached reports nor matching hashes prove reproduction. */
export async function verifyReport(
  options: Omit<GenerateOptions, 'rebuild'> & { uiManifest?: string },
) {
  const commit = execFileSync(
    'git',
    ['-C', options.repo, 'rev-parse', '--verify', `${options.ref}^{commit}`],
    { encoding: 'utf8' },
  ).trim()
  const manifest = await validateArtifacts(options.output)
  const entry = manifest.snapshots.find((s) => s.artemisCommit === commit)
  if (!entry)
    throw new Error(`Missing OpenAPI snapshot for pinned Artemis ${commit}`)
  const { bytes, snapshot } = await readSnapshot(options.output, entry)
  if (
    snapshot.provenance.inputs.some(
      (input) =>
        input.revision.state === 'known' && input.revision.commit !== commit,
    )
  )
    throw new Error('OpenAPI inputs do not match the pinned Artemis revision')
  if (options.uiManifest) {
    const { manifestSchema: uiManifestSchema } =
      await import('../../src/features/migrations/model')
    const ui = uiManifestSchema.parse(
      JSON.parse(await readFile(options.uiManifest, 'utf8')),
    )
    if (ui.snapshots.at(-1)?.commit !== commit)
      throw new Error(
        'UI and OpenAPI reports do not share the pinned Artemis revision',
      )
  }
  const temporary = await mkdtemp(
    path.join(tmpdir(), 'codestats-openapi-verify-'),
  )
  try {
    const reproduced = await generateReport({
      ...options,
      output: temporary,
      rebuild: true,
    })
    const reproducedEntry = reproduced.manifest.snapshots[0]
    const { bytes: actual } = await readSnapshot(temporary, reproducedEntry)
    if (
      !bytes.equals(actual) ||
      JSON.stringify({ ...entry, file: undefined }) !==
        JSON.stringify({ ...reproducedEntry, file: undefined })
    )
      throw new Error(
        'Stale OpenAPI artifacts: regenerate from the pinned revision and current collector inputs',
      )
    return { commit, snapshots: manifest.snapshots.length }
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}
