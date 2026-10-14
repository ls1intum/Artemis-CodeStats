import path from 'node:path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { verifyReport } from './verify'
import { readManifest } from './artifacts'

const options = yargs(hideBin(process.argv))
  .strict()
  .option('repo', { type: 'string', default: 'artemis' })
  .option('ref', {
    type: 'string',
    description: 'Defaults to the newest retained OpenAPI revision',
  })
  .option('output', { type: 'string', default: 'public/openapi' })
  .option('ui-manifest', {
    type: 'string',
    description: 'Optional strict cross-dashboard revision check',
  })
  .help()
  .parseSync()

const retained = await readManifest(path.resolve(options.output))
const ref =
  options.ref ??
  [...retained.snapshots]
    .sort((a, b) => Date.parse(a.analyzedAt) - Date.parse(b.analyzedAt))
    .at(-1)!.artemisCommit
const result = await verifyReport({
  repo: path.resolve(options.repo),
  ref,
  output: path.resolve(options.output),
  uiManifest: options.uiManifest ? path.resolve(options.uiManifest) : undefined,
})
console.log(
  `Verified ${result.snapshots} OpenAPI snapshots; reproduced pinned Artemis ${result.commit} independently of UI collection`,
)
