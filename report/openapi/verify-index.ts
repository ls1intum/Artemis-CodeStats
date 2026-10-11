import { execFileSync } from 'node:child_process'
import path from 'node:path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { verifyReport } from './verify'

const options = yargs(hideBin(process.argv))
  .strict()
  .option('repo', { type: 'string', default: 'artemis' })
  .option('ref', {
    type: 'string',
    description: 'Defaults to the committed CodeStats submodule pin',
  })
  .option('output', { type: 'string', default: 'public/openapi' })
  .option('ui-manifest', {
    type: 'string',
    default: 'public/migrations/index.json',
  })
  .help()
  .parseSync()

const ref =
  options.ref ??
  execFileSync('git', ['rev-parse', 'HEAD:artemis'], {
    encoding: 'utf8',
  }).trim()
const result = await verifyReport({
  repo: path.resolve(options.repo),
  ref,
  output: path.resolve(options.output),
  uiManifest: path.resolve(options.uiManifest),
})
console.log(
  `Verified ${result.snapshots} OpenAPI snapshots; reproduced pinned Artemis ${result.commit} with matching UI evidence`,
)
