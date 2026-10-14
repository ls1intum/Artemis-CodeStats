import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

export const extractorSource = fileURLToPath(
  new URL(
    '../server/src/main/java/de/tum/cit/aet/codestats/OpenApiMappingExtractor.java',
    import.meta.url,
  ),
)
export const extractorLibraries = [
  'gson-2.11.0.jar',
  'javaparser-core-3.28.2.jar',
].map((name) =>
  fileURLToPath(new URL(`../server/lib/${name}`, import.meta.url)),
)
const anchor = {
  path: z.string().min(1),
  line: z.number().int().positive(),
  symbol: z.string().min(1),
}
export const extractionSchema = z
  .object({
    files: z.array(z.object({ ...anchor, parsed: z.boolean() }).strict()),
    mappings: z.array(
      z
        .object({
          ...anchor,
          paths: z.array(z.string()).min(1),
          methods: z
            .array(
              z.enum([
                'GET',
                'POST',
                'PUT',
                'PATCH',
                'DELETE',
                'HEAD',
                'OPTIONS',
                'TRACE',
              ]),
            )
            .min(1),
          declaredPaths: z.array(z.string()).min(1),
          conditions: z.array(z.string()),
          attributes: z.record(z.array(z.string())),
        })
        .strict(),
    ),
    issues: z.array(
      z
        .object({
          ...anchor,
          reason: z.string().min(1),
          nextStep: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict()
export type ServerExtraction = z.infer<typeof extractionSchema>

// Reuses the tracked JavaParser/Gson libraries. Build products stay in a disposable directory.
export async function createServerExtractor() {
  const build = await mkdtemp(path.join(tmpdir(), 'codestats-openapi-java-'))
  const classpath = [build, ...extractorLibraries].join(path.delimiter)
  try {
    execFileSync(
      'javac',
      [
        '--release',
        '17',
        '-cp',
        extractorLibraries.join(path.delimiter),
        '-d',
        build,
        extractorSource,
      ],
      { stdio: 'pipe' },
    )
  } catch (error) {
    await rm(build, { recursive: true, force: true })
    throw new Error(
      'OpenAPI extraction requires a JDK 17+ and the tracked report/server/lib JARs',
      { cause: error },
    )
  }
  return {
    async extract(root: string, serverRoot: string): Promise<ServerExtraction> {
      const output = path.join(build, 'mappings.json')
      execFileSync(
        'java',
        [
          '-cp',
          classpath,
          'de.tum.cit.aet.codestats.OpenApiMappingExtractor',
          root,
          serverRoot,
          output,
        ],
        { stdio: 'pipe', timeout: 300000 },
      )
      return extractionSchema.parse(JSON.parse(await readFile(output, 'utf8')))
    },
    async close() {
      await rm(build, { recursive: true, force: true })
    },
  }
}
