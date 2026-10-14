import { resolve } from 'node:path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { generateReport } from './generate'

const options = yargs(hideBin(process.argv))
  .strict()
  .option('repo', {
    type: 'string',
    default: 'artemis',
    description: 'Read-only Artemis Git repository',
  })
  .option('ref', {
    type: 'string',
    demandOption: true,
    description: 'Explicit committed Artemis revision/ref',
  })
  .option('output', {
    type: 'string',
    default: 'public/openapi',
    description: 'Isolated report output directory',
  })
  .option('spec', {
    type: 'string',
    description:
      'Committed specification path (discover current or legacy Artemis location)',
  })
  .option('spec-ref', {
    type: 'string',
    description: 'Specification storage ref, if different from --ref',
  })
  .option('raw-spec', {
    type: 'string',
    description: 'Optional committed raw specification path',
  })
  .option('raw-spec-ref', {
    type: 'string',
    description: 'Raw specification storage ref, if different',
  })
  .option('generation-evidence', {
    type: 'string',
    description: 'Optional local JSON generation-run evidence record',
  })
  .option('evidence', {
    type: 'string',
    description:
      'Assessment records: exceptions, web relevance, verification and enforcement (defaults to tracked evidence.json)',
  })
  .option('mapping', {
    type: 'string',
    description: 'Tracked module mapping configuration override',
  })
  .option('rebuild', {
    type: 'boolean',
    default: false,
    description: 'Re-extract instead of reusing a valid fingerprint cache',
  })
  .check((argv) => {
    if (argv.rawSpecRef && !argv.rawSpec)
      throw new Error('--raw-spec-ref requires --raw-spec')
    return true
  })
  .help()
  .parseSync()

const result = await generateReport({
  repo: resolve(options.repo),
  ref: options.ref,
  output: resolve(options.output),
  spec: options.spec,
  specRef: options.specRef,
  rawSpec: options.rawSpec,
  rawSpecRef: options.rawSpecRef,
  generationEvidence: options.generationEvidence,
  evidence: options.evidence,
  mapping: options.mapping,
  rebuild: options.rebuild,
})
console.log(
  `${result.cached ? 'Reused' : 'Generated'} ${result.snapshot.provenance.artemisCommit}: ${result.snapshot.modules.length} modules/areas, ${result.snapshot.operations.length} known unique operations, ${result.snapshot.diagnostics.length} diagnostics`,
)
