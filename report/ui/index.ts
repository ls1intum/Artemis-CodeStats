import { resolve } from 'node:path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { generateReports } from './generate'

const options = yargs(hideBin(process.argv))
  .strict()
  .option('repo', { type: 'string', default: 'artemis' })
  .option('ref', { type: 'string', default: 'HEAD' })
  .option('output', { type: 'string', default: 'public/migrations' })
  .option('rebuild', { type: 'boolean', default: false })
  .help()
  .parseSync()

await generateReports({
  repo: resolve(options.repo),
  ref: options.ref,
  output: resolve(options.output),
  baseline: 'e6e7c9cca1e961ce05463177bc316dc42c8d1c38',
  packageAdoption: '45bcba707254de4ccee7bb4c83526fbdfa45c6fc',
  rebuild: options.rebuild,
})
