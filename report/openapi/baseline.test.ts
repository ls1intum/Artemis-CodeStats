import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { z } from 'zod'
import {
  inputSchema,
  operationIdentitySchema,
  sourceLocationSchema,
} from '../../src/features/openapi/model'

// Expectations have their own shape. They are not a manifest or a collected snapshot.
const baseline = z
  .object({
    kind: z.literal('source-expectations'),
    schemaVersion: z.literal(1),
    artemisCommit: z.literal('890f92bd9e1d9dd17b254a2fd4759c95d8629c83'),
    inputs: z.array(inputSchema),
    generation: z.object({ state: z.literal('unknown') }),
    pruning: z.object({ state: z.literal('unknown') }),
    absenceChecks: z.array(
      z.object({
        caseId: z.string(),
        inputId: z.string(),
        scope: z.string().min(1),
        expectedMatches: z.literal(0),
      }),
    ),
    cases: z.array(
      z.object({
        id: z.string(),
        group: z.string(),
        operation: operationIdentitySchema,
        serverModule: z.string(),
        server: sourceLocationSchema,
        classMapping: sourceLocationSchema,
        specification: z.object({
          state: z.enum(['present', 'missing']),
          inputId: z.string(),
          location: sourceLocationSchema.nullable(),
        }),
        generatedMethods: z.array(
          z.object({
            symbol: z.string(),
            location: sourceLocationSchema,
            transport: z.literal('observable'),
          }),
        ),
        callers: z.array(
          z.object({
            symbol: z.string(),
            area: z.string(),
            transport: z.enum(['generated', 'manual']),
            location: sourceLocationSchema,
            via: z.array(sourceLocationSchema),
          }),
        ),
        expected: z.object({
          specification: z.enum(['present', 'missing']),
          generatedTransport: z.enum(['available', 'missing']),
          adoption: z.enum(['generated-detected', 'manual']),
          webRelevance: z.literal('relevant'),
          uniqueOperations: z.literal(1),
          productionCallSites: z.number().int().positive(),
          analysis: z.literal('incomplete-analysis'),
        }),
        uncertainty: z.array(z.string().min(1)).min(1),
      }),
    ),
    excerpts: z.array(
      z.object({
        inputId: z.string(),
        line: z.number().int().positive(),
        text: z.string().min(1),
      }),
    ),
  })
  .parse(
    JSON.parse(
      readFileSync(
        new URL('./fixtures/baseline.json', import.meta.url),
        'utf8',
      ),
    ),
  )

const byId = (id: string) => {
  const entry = baseline.cases.find((entry) => entry.id === id)
  assert.ok(entry, `Missing baseline case ${id}`)
  return entry
}
const lineAt = (location: z.infer<typeof sourceLocationSchema>) => {
  const excerpt = baseline.excerpts.find(
    (excerpt) =>
      excerpt.inputId === location.inputId &&
      excerpt.line <= location.line &&
      excerpt.line + excerpt.text.split('\n').length > location.line,
  )
  assert.ok(
    excerpt,
    `No captured evidence at ${location.path}:${location.line}`,
  )
  assert.equal(
    baseline.inputs.find((input) => input.id === location.inputId)?.path,
    location.path,
  )
  return excerpt.text.split('\n')[location.line - excerpt.line]
}
const sourceText = (pathSuffix: string) =>
  baseline.excerpts
    .filter((excerpt) => excerpt.inputId.endsWith(pathSuffix))
    .map((excerpt) => excerpt.text)
    .join('\n')

test('baseline contains six reconciliation groups at one explicit storage revision', () => {
  assert.equal(new Set(baseline.cases.map((entry) => entry.group)).size, 6)
  assert.equal(baseline.cases.length, 8)
  for (const input of baseline.inputs) {
    assert.deepEqual(input.revision, {
      state: 'known',
      commit: baseline.artemisCommit,
    })
    assert.equal(input.content.state, 'available')
  }
  for (const entry of baseline.cases) {
    assert.match(
      lineAt(entry.server),
      new RegExp(entry.server.symbol!.split('.').at(-1)!),
    )
    assert.match(lineAt(entry.classMapping), /@RequestMapping/)
    if (entry.specification.location)
      assert.equal(
        lineAt(entry.specification.location).trim(),
        `operationId: ${entry.specification.location.symbol}`,
      )
    for (const method of entry.generatedMethods)
      assert.ok(
        lineAt(method.location).includes(method.symbol.split('.').at(-1)!),
      )
    for (const caller of entry.callers) {
      assert.ok(
        lineAt(caller.location).includes(
          caller.transport === 'generated'
            ? entry.generatedMethods[0].symbol.split('.').at(-1)!
            : entry.id.startsWith('inherited-')
              ? 'this.'
              : '.get<',
        ) || lineAt(caller.location).includes('.post<'),
      )
      for (const location of caller.via) lineAt(location)
    }
    assert.equal(entry.expected.productionCallSites, entry.callers.length)
  }
})

test('calendar expectation includes transport and injected production call, not just an import', () => {
  const calendar = byId('calendar')
  assert.deepEqual(calendar.operation, {
    method: 'GET',
    path: '/api/calendar/courses/{courseId}/calendar-events',
  })
  assert.equal(calendar.expected.adoption, 'generated-detected')
  assert.match(
    sourceText('calendar.service.ts'),
    /apiService = inject\(CalendarApi\)/,
  )
  assert.match(
    lineAt(calendar.callers[0].location),
    /this\.apiService\.getCalendarEventsOverlappingMonths\(/,
  )
  assert.match(sourceText('calendar-api.ts'), /return this\.http\.get/)
})

test('globalsearch ownership and core caller stay separate with controller conditions', () => {
  const search = byId('cross-module-search')
  assert.deepEqual(search.operation, { method: 'GET', path: '/api/search' })
  assert.equal(search.serverModule, 'globalsearch')
  assert.equal(search.callers[0].area, 'core')
  assert.equal(
    search.generatedMethods[0].symbol,
    'GlobalSearchApi.globalSearch',
  )
  assert.match(
    lineAt(search.callers[0].location),
    /this\.searchService\.globalSearch\(/,
  )
  assert.match(
    sourceText('GlobalSearchResource.java'),
    /@Conditional\(WeaviateEnabled.class\)/,
  )
  assert.match(
    sourceText('ArtemisConfigHelper.java'),
    /getProperty\(WEAVIATE_ENABLED_PROPERTY_NAME, Boolean.class, false\)/,
  )
})

test('tutorial import is one operation with two calls including shared UI', () => {
  const tutorial = byId('tutorial-import')
  assert.equal(tutorial.expected.uniqueOperations, 1)
  assert.equal(tutorial.expected.productionCallSites, 2)
  assert.deepEqual(
    tutorial.callers.map((caller) => caller.area),
    ['shared-ui', 'tutorialgroup'],
  )
  assert.match(
    sourceText('users-import-dialog.component.ts'),
    /courseManagementService\.addUsersToCourseRole/,
  )
  assert.match(
    sourceText('users-import-dialog.component.ts'),
    /examManagementService\.addStudentsToExam/,
  )
  assert.match(
    sourceText('users-import-dialog.component.ts'),
    /adminUserService\.importAll/,
  )
  assert.match(
    sourceText('TutorialGroupResource.java'),
    /@Conditional\(TutorialGroupEnabled.class\)/,
  )
})

test('course specification gap and quiz transport gap have independent negative checks', () => {
  const course = byId('course-management-detail')
  assert.equal(course.expected.specification, 'missing')
  assert.equal(
    course.specification.location,
    null,
    'absence must not invent a specification source line',
  )
  assert.equal(course.expected.adoption, 'manual')
  const quiz = byId('quiz-live-submission')
  assert.equal(quiz.expected.specification, 'present')
  assert.equal(quiz.expected.generatedTransport, 'missing')
  assert.equal(quiz.generatedMethods.length, 0)
  assert.equal(quiz.expected.adoption, 'manual')
  for (const check of baseline.absenceChecks) {
    assert.ok(baseline.inputs.some((input) => input.id === check.inputId))
    assert.ok(
      ['course-management-detail', 'quiz-live-submission'].includes(
        check.caseId,
      ),
    )
  }
  assert.equal(baseline.absenceChecks.length, 3)
})

test('inherited handwritten wrapper preserves three endpoint calls and shared transport chain', () => {
  const wrappers = baseline.cases.filter(
    (entry) => entry.group === 'inherited-wrapper',
  )
  assert.deepEqual(
    wrappers.map((entry) => entry.operation.method),
    ['GET', 'PUT', 'GET'],
  )
  assert.equal(
    new Set(
      wrappers.map(
        (entry) => `${entry.operation.method} ${entry.operation.path}`,
      ),
    ).size,
    3,
  )
  assert.equal(
    wrappers.reduce((n, entry) => n + entry.callers.length, 0),
    3,
  )
  for (const entry of wrappers) {
    assert.equal(entry.expected.generatedTransport, 'available')
    assert.equal(
      entry.expected.adoption,
      'manual',
      'method availability cannot create mixed usage',
    )
    assert.equal(entry.callers[0].via.length, 2)
    assert.match(
      lineAt(entry.callers[0].via[1]),
      /httpClient\.request\(method, `\$\{this.baseUrl\}\/\$\{url\}`/,
    )
  }
  assert.match(
    sourceText('base-api-http.service.ts'),
    /return await this\.request<T>\(HttpMethod.Get/,
  )
  assert.match(
    sourceText('base-api-http.service.ts'),
    /return await this\.request<T>\(HttpMethod.Put/,
  )
})

test('generation and pruning remain unknown despite artifact declarations', () => {
  assert.equal(baseline.generation.state, 'unknown')
  assert.equal(baseline.pruning.state, 'unknown')
  assert.match(
    sourceText('gradle/openapi.gradle'),
    /springdoc.packages-to-scan=/,
  )
  assert.match(
    sourceText('gradle/openapi.gradle'),
    /inputFile = file\("\$\{projectRoot\}\/openapi\/openapi.yaml"\)/,
  )
  assert.match(
    sourceText('gradle/openapi.gradle'),
    /outputFile = file\("\$\{projectRoot\}\/openapi\/openapi.yaml"\)/,
  )
  for (const entry of baseline.cases)
    assert.equal(entry.expected.analysis, 'incomplete-analysis')
})
