import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { DtoViolationsReport } from './types'

const source = new URL('../data/server/dtoViolations/', import.meta.url)
const destination = new URL('../src/generated/', import.meta.url)
const reports = []
for (const filename of (await readdir(source))
  .filter((name) => name.endsWith('.json'))
  .sort()) {
  const report: DtoViolationsReport = JSON.parse(
    await readFile(new URL(filename, source), 'utf8'),
  )
  reports.push({
    filename,
    metadata: report.metadata,
    dtoViolations: {
      totals: report.dtoViolations.totals,
      modules: Object.fromEntries(
        Object.entries(report.dtoViolations.modules).map(([name, counts]) => [
          name,
          {
            entityReturnViolations: counts.entityReturnViolations,
            entityInputViolations: counts.entityInputViolations,
            dtoEntityFieldViolations: counts.dtoEntityFieldViolations,
          },
        ]),
      ),
    },
  })
}
await mkdir(destination, { recursive: true })
await writeFile(
  new URL('dto-summaries.json', destination),
  JSON.stringify(reports),
)
console.log(
  `Prepared ${reports.length} DTO archive summaries in ${fileURLToPath(destination)}`,
)
