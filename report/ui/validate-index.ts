import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  applyPatch,
  manifestSchema,
  storedDetailSchema,
  type Detail,
} from '../../src/features/migrations/model'

export async function validateUiArtifacts(output: string, ref?: string) {
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(path.join(output, 'index.json'), 'utf8')),
  )
  if (ref)
    assert.equal(
      manifest.snapshots.at(-1)!.commit,
      ref,
      'UI report must match the requested revision',
    )
  const bases = new Map<string, Detail>()
  for (const snapshot of manifest.snapshots) {
    const stored = storedDetailSchema.parse(
      JSON.parse(
        await readFile(path.join(output, `${snapshot.commit}.json`), 'utf8'),
      ),
    )
    assert.equal(stored.commit, snapshot.commit)
    let detail: Detail
    if ('base' in stored) {
      assert(manifest.bases.includes(stored.base))
      let base = bases.get(stored.base)
      if (!base) {
        const parsed = storedDetailSchema.parse(
          JSON.parse(
            await readFile(path.join(output, `${stored.base}.json`), 'utf8'),
          ),
        )
        assert(!('base' in parsed))
        assert.equal(parsed.commit, stored.base)
        base = parsed
        bases.set(stored.base, base)
      }
      detail = applyPatch(base, stored)
    } else {
      detail = stored
      bases.set(stored.commit, stored)
    }
    assert.equal(detail.units.length, snapshot.totals.units)
    assert.equal(detail.lockable.length, snapshot.totals.lockableDirs)
    assert.equal(
      detail.sections.reduce(
        (n, section) => n + section.classHits + section.styleHits,
        0,
      ),
      snapshot.totals.classHits + snapshot.totals.styleHits,
    )
  }
  return manifest
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const options = yargs(hideBin(process.argv))
    .strict()
    .option('output', { type: 'string', default: 'public/migrations' })
    .option('ref', { type: 'string' })
    .parseSync()
  const manifest = await validateUiArtifacts(
    path.resolve(options.output),
    options.ref,
  )
  console.log(`Validated ${manifest.snapshots.length} UI snapshots`)
}
