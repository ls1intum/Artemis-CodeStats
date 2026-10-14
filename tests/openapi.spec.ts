import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import type { Snapshot } from '../src/features/openapi/model'
import { openApiFixture } from './fixtures/openapi'

const fixture = openApiFixture()
const acceptance = JSON.parse(
  readFileSync(
    new URL('../report/openapi/fixtures/acceptance.json', import.meta.url),
    'utf8',
  ),
) as {
  artemisCommit: string
  cases: {
    id: string
    operation: { method: string; path: string }
    module: string
    server: { path: string; line: number }
    specification: { state: string }
    generatedTransport: string
    adoption: string
    callers: {
      location: { path: string; line: number; symbol: string }
      area: string
      transport: string
      kind: string
      via: { path: string; line: number }[]
    }[]
  }[]
}
const artifact = (snapshot = fixture) => {
  const bytes = JSON.stringify(snapshot)
  const entry = {
    artemisCommit: snapshot.provenance.artemisCommit,
    file: `${snapshot.provenance.artemisCommit}.json`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    analyzerVersion: snapshot.provenance.analyzerVersion,
    analyzedAt: snapshot.provenance.analyzedAt,
  }
  return {
    bytes,
    manifest: {
      schemaVersion: 1,
      generatedAt: entry.analyzedAt,
      snapshots: [entry],
    },
  }
}
async function mockReport(page: Page, snapshot = fixture) {
  const { bytes, manifest } = artifact(snapshot)
  await page.route('**/openapi/*.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: route.request().url().endsWith('/index.json')
        ? JSON.stringify(manifest)
        : bytes,
    }),
  )
}
const loaded = (page: Page) =>
  expect(
    page.getByRole('heading', { name: 'OpenAPI migration', exact: true }),
  ).toBeVisible()
const section = (page: Page, title: string) =>
  page
    .getByRole('heading', { name: title, exact: true, level: 2 })
    .locator('../..')
const pinned = new RegExp(`/blob/${'a'.repeat(40)}/.*#L\\d+$`)

test('overview separates operation counts and production calls with compact summaries and sortable modules', async ({
  page,
}) => {
  const snapshot = openApiFixture()
  snapshot.operations[2].specification = {
    state: 'missing',
    reason: 'Synthetic missing contract',
    evidence: snapshot.modules[0].roots,
  }
  await mockReport(page, snapshot)
  await page.goto('./#/openapi')
  await loaded(page)
  const operations = section(page, 'Operation coverage')
  const calls = section(page, 'Detected production calls')
  await expect(operations.locator('[data-chart]')).toBeVisible()
  await expect(calls.locator('[data-chart]')).toBeVisible()
  await expect(operations.getByRole('table')).toContainText('Unassessed')
  await expect(calls).toContainText('Generated')
  await expect(calls).toContainText('Handwritten')
  await expect(calls).toContainText('2 (partial)')
  await expect(calls).toContainText('1 (partial)')
  await calls.locator('.recharts-bar-rectangle').nth(1).hover()
  await expect(calls.locator('.recharts-tooltip-wrapper')).toContainText(
    'Handwritten',
  )
  await expect(
    section(page, 'Inventory and analysis coverage'),
  ).not.toContainText('Independent synthetic source observations')
  await expect(
    page.getByRole('heading', { name: 'Percentage eligibility', exact: true }),
  ).toHaveCount(0)
  const table = section(page, 'All module assessments').getByRole('table')
  await expect(table.locator('tbody tr')).toHaveCount(4)
  await expect(table).toContainText('1 mixed operation')
  const specificationSort = table.getByRole('button', {
    name: /sort by missing specification operations/,
  })
  await specificationSort.click()
  await expect(table.locator('tbody tr').first()).toContainText('alpha')
  await specificationSort.click()
  await expect(table.locator('tbody tr').first()).toContainText('beta')
  const manualSort = table.getByRole('button', {
    name: /sort by handwritten calls/,
  })
  await manualSort.click()
  await expect(table.locator('tbody tr').first()).toContainText('alpha')
  await manualSort.click()
  await expect(table.locator('tbody tr').first()).toContainText('beta')
  await page
    .getByRole('button', { name: 'Analysis details', exact: true })
    .click()
  await expect(page).toHaveURL(/view=evidence/)
  await expect(section(page, 'Measurement evidence')).toContainText(
    'Unique operations',
  )
  await expect(section(page, 'Revision and provenance')).toContainText(
    'unknown',
  )
})

test('chart tooltips separate labels from counts on desktop and mobile', async ({
  page,
}, testInfo) => {
  const snapshot = (await (
    await page.request.get(`./openapi/${acceptance.artemisCommit}.json`)
  ).json()) as Snapshot
  const manual = snapshot.measurements.manualCallSites
  expect(manual.state).toBe('measured')
  if (manual.state !== 'measured')
    throw new Error('Pinned report must contain measured production calls')
  const expectSpacedValue = async (
    tooltip: Locator,
    label: string,
    value: number,
  ) => {
    const name = tooltip.getByText(label, { exact: true })
    const count = name
      .locator('../..')
      .getByText(value.toLocaleString('en-US'), { exact: true })
    await expect(count).toBeVisible()
    const gap = await name.evaluate((element) => {
      const label = element.getBoundingClientRect()
      const value =
        element.parentElement?.nextElementSibling?.getBoundingClientRect()
      if (!value) throw new Error('Tooltip count must follow its label')
      return value.left - label.right
    })
    expect(gap).toBeGreaterThanOrEqual(12)
  }
  await page.goto('./#/openapi?snapshot=' + acceptance.artemisCommit)
  await loaded(page)
  const coverage = section(page, 'Operation coverage')
  const calls = section(page, 'Detected production calls')
  for (const [size, width] of [
    ['desktop', 1440],
    ['mobile', 390],
  ] as const) {
    await page.setViewportSize({ width, height: 1100 })
    await coverage.locator('.recharts-bar-rectangle').first().hover()
    const tooltip = coverage.locator('.recharts-tooltip-wrapper')
    await expect(tooltip).toBeVisible()
    for (const [label, state] of [
      ['Present / available', 'present'],
      ['Missing', 'missing'],
      ['Ambiguous', 'ambiguous'],
      ['Unassessed', 'unresolved'],
    ] as const) {
      const measurement = snapshot.measurements.specificationCounts![state]
      if (measurement.state !== 'measured')
        throw new Error('Pinned specification counts must be measured')
      await expectSpacedValue(tooltip, label, measurement.value)
    }
    await coverage.screenshot({
      path: testInfo.outputPath(`coverage-tooltip-${size}.png`),
    })
    await calls.locator('.recharts-bar-rectangle').nth(1).hover()
    const callTooltip = calls.locator('.recharts-tooltip-wrapper')
    await expectSpacedValue(callTooltip, 'Handwritten', manual.value)
    await expect(
      callTooltip.getByText('Handwritten', { exact: true }),
    ).toHaveCount(1)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await calls.screenshot({
      path: testInfo.outputPath(`calls-tooltip-${size}.png`),
    })
  }
})

test('unavailable call evidence is not a zero bar and shared records remain separate and searchable', async ({
  page,
}) => {
  const snapshot = openApiFixture(true)
  snapshot.modules[1].measurements.generatedCallSites = {
    state: 'unknown',
    reason: 'Synthetic unavailable call assessment',
  }
  await mockReport(page, snapshot)
  await page.goto('./#/openapi?module=beta')
  await loaded(page)
  const calls = section(page, 'Detected production calls')
  await expect(calls).toContainText('unknown')
  await expect(calls.locator('[data-chart]')).toHaveCount(0)
  await expect(
    section(page, 'Next steps').locator('details[open]'),
  ).toHaveCount(0)
  const shared = section(page, 'Shared analysis limitations')
  await expect(shared).toContainText('1 record')
  await expect(shared).not.toContainText('Dynamic target cannot be attributed')
  await shared.locator('summary').click()
  await expect(shared).toContainText('Dynamic target cannot be attributed')
  await shared
    .getByLabel('Search analysis and relevance limitations', { exact: true })
    .fill('unmatched search')
  await expect(shared).not.toContainText('Dynamic target cannot be attributed')
  await shared
    .getByLabel('Search analysis and relevance limitations', { exact: true })
    .fill('Dynamic target')
  await expect(shared).toContainText('Dynamic target cannot be attributed')
  await expect(shared.getByRole('link').first()).toHaveAttribute('href', pinned)
  await expect(
    section(page, 'Migration and protection prerequisites'),
  ).toContainText('blocked')
})

test('calendar shows module work separately from shared analysis without a giant prerequisite list', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto(
    './#/openapi?module=calendar&snapshot=' + acceptance.artemisCommit,
  )
  await loaded(page)
  await expect(
    section(page, 'All module assessments').locator('tbody tr'),
  ).toHaveCount(1)
  await expect(
    section(page, 'Migration and protection prerequisites'),
  ).toContainText('blocked')
  await expect(page.getByText(/^Candidate prerequisites/)).toHaveCount(0)
  const work = section(page, 'Next steps')
  await expect(work).toContainText(
    'Analysis and relevance limitations (12 records)',
  )
  await expect(work).toContainText('Verification (2 records)')
  const shared = section(page, 'Shared analysis limitations')
  await expect(shared).toContainText(
    'Analysis and relevance limitations (778 records)',
  )
  await expect(shared.locator('details[open]')).toHaveCount(0)
  await expect(
    page.getByRole('heading', {
      name: 'Shared analysis limitations',
      exact: true,
    }),
  ).toHaveCount(1)
  await shared.locator('summary').click()
  await expect(
    shared.getByLabel('Search analysis and relevance limitations'),
  ).toBeVisible()
  await expect(shared.getByRole('link').first()).toHaveAttribute(
    'href',
    new RegExp('/blob/' + acceptance.artemisCommit + '/.*#L\\d+$'),
  )
  await page
    .getByRole('link', { name: 'Show all modules', exact: true })
    .click()
  await expect(
    section(page, 'All module assessments').locator('tbody tr'),
  ).toHaveCount(39)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('overview.png') })
})

for (const expected of acceptance.cases)
  test(`independent source acceptance: ${expected.id} renders contracts, callers and pinned chains`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000)
    const id = `${expected.operation.method} ${expected.operation.path}`
    const query = new URLSearchParams({
      snapshot: acceptance.artemisCommit,
      module: expected.module,
      view: 'endpoints',
      operation: id,
    })
    await page.goto(`./#/openapi?${query}`)
    await loaded(page)
    const detail = section(page, id)
    for (const [title, state] of [
      ['Specification', expected.specification.state],
      ['Generated transport', expected.generatedTransport],
      ['Production adoption', expected.adoption],
    ])
      await expect(
        detail.getByRole('heading', { name: title, exact: true }).locator('..'),
      ).toContainText(state)
    const href = (location: { path: string; line: number }) =>
      `https://github.com/ls1intum/Artemis/blob/${acceptance.artemisCommit}/${location.path}#L${location.line}`
    await expect(
      detail.locator(`a[href="${href(expected.server)}"]`).first(),
    ).toBeVisible()
    for (const caller of expected.callers) {
      await detail
        .getByLabel('Search callers', { exact: true })
        .fill(caller.location.symbol)
      const row = detail
        .getByRole('listitem')
        .filter({
          has: page.getByRole('heading', {
            name: caller.location.symbol,
            exact: true,
          }),
        })
        .filter({ has: page.locator(`a[href="${href(caller.location)}"]`) })
      await expect(row).toContainText(caller.area)
      await expect(row).toContainText(caller.kind)
      await expect(row).toContainText(caller.transport)
      for (const disclosure of await row.locator('summary').all())
        await disclosure.click()
      for (const via of caller.via)
        await expect(row.locator(`a[href="${href(via)}"]`)).toBeVisible()
    }
    await expect(
      section(page, 'Inventory and analysis coverage'),
    ).toContainText('Partial static observations')
    await page.getByRole('tab', { name: 'Evidence', exact: true }).click()
    await expect(section(page, 'Percentage eligibility')).toContainText(
      'incomplete-analysis',
    )
    await expect(section(page, 'Revision and provenance')).toContainText(
      'unknown',
    )
    await page.getByRole('tab', { name: 'Endpoints', exact: true }).click()
    if (expected.id === 'inherited-settings-get')
      await detail.screenshot({ path: testInfo.outputPath('endpoint.png') })
  })

test('active navigation and retained report cover every discovered module under the production base path', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page
    .getByRole('link', { name: 'OpenAPI migration', exact: true })
    .click()
  await loaded(page)
  await expect(page).toHaveURL(/Artemis-CodeStats\/#\/openapi/)
  await expect(
    page.getByRole('link', { name: 'OpenAPI migration', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Archived.', { exact: true })).toHaveCount(0)
  await expect(
    page.getByRole('link', {
      name: 'Measurement definitions and collection methodology',
    }),
  ).toHaveAttribute(
    'href',
    'https://github.com/ls1intum/Artemis-CodeStats/blob/main/docs/openapi-dashboard.md',
  )
  const manifest = await (await page.request.get('./openapi/index.json')).json()
  const snapshot = await (
    await page.request.get(`./openapi/${manifest.snapshots[0].file}`)
  ).json()
  await expect(section(page, 'Inventory and analysis coverage')).toContainText(
    snapshot.operations.length.toLocaleString('en-US'),
  )
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click()
  await expect(section(page, 'Revision and provenance')).toContainText(
    'unknown',
  )
  await page.getByRole('tab', { name: 'Modules', exact: true }).click()
  await expect(
    section(page, 'All module assessments').locator('tbody tr'),
  ).toHaveCount(snapshot.modules.length)
  await page.getByRole('button', { name: 'globalsearch', exact: true }).click()
  await page.getByRole('tab', { name: 'Endpoints', exact: true }).click()
  await page
    .getByRole('button', { name: 'GET /api/search', exact: true })
    .click()
  await expect(section(page, 'GET /api/search')).toContainText('core')
  await expect(section(page, 'GET /api/search')).toContainText('Weaviate')
  await expect(
    section(page, 'GET /api/search').getByRole('link').first(),
  ).toHaveAttribute(
    'href',
    new RegExp(`/blob/${snapshot.provenance.artemisCommit}/.*#L\\d+$`),
  )
  await expect(
    page.getByLabel('OpenAPI snapshot').locator('option'),
  ).toHaveCount(manifest.snapshots.length)
  const historical = manifest.snapshots.at(-1)
  if (historical.artemisCommit !== snapshot.provenance.artemisCommit) {
    await page
      .getByLabel('OpenAPI snapshot')
      .selectOption(historical.artemisCommit)
    await page.getByRole('tab', { name: 'Evidence', exact: true }).click()
    await expect(section(page, 'Revision and provenance')).toContainText(
      historical.artemisCommit,
    )
    await expect(page).toHaveURL(
      new RegExp(`snapshot=${historical.artemisCommit}`),
    )
  }
  expect(errors).toEqual([])
})

test('module filters scope every summary and view while preserving cross-area callers and source lines', async ({
  page,
}) => {
  await mockReport(page)
  await page.goto('./#/openapi?view=modules')
  await loaded(page)
  const table = section(page, 'All module assessments').getByRole('table')
  await expect(table.locator('tbody tr')).toHaveCount(4)
  await table
    .getByRole('button', { name: 'Unique operations', exact: true })
    .click()
  await expect(
    table.getByRole('columnheader', { name: 'Unique operations', exact: true }),
  ).toHaveAttribute('aria-sort', 'descending')
  await expect(table.locator('tbody tr').first()).toContainText('alpha')
  await page.getByRole('button', { name: 'alpha', exact: true }).click()
  await expect(page).toHaveURL(/module=alpha/)
  await expect(table.locator('tbody tr')).toHaveCount(1)
  await expect(section(page, 'Inventory and analysis coverage')).toContainText(
    '1 generated methods',
  )
  for (const [title, count] of [
    ['Unique operations', '2'],
    ['Generated production call sites', '1'],
    ['Manual production call sites', '1'],
    ['Unresolved production call sites', '0'],
  ])
    await expect(
      section(page, 'Inventory and analysis coverage')
        .getByRole('heading', { name: title, exact: true })
        .locator('..')
        .getByText(count, { exact: true }),
    ).toBeVisible()
  await expect(table).toContainText('1 mixed operation')
  await expect(section(page, 'Operation coverage')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Callers', exact: true }).click()
  await expect(section(page, 'Caller evidence')).toContainText(
    'Core.alpha-manual',
  )
  await expect(section(page, 'Caller evidence')).toContainText('core')
  await expect(section(page, 'Caller evidence')).not.toContainText(
    'Core.beta-generated',
  )
  await expect(
    section(page, 'Caller evidence').getByRole('link').first(),
  ).toHaveAttribute('href', pinned)
  await page
    .getByRole('combobox', { name: 'Caller records', exact: true })
    .selectOption('wrapper-implementation')
  await expect(section(page, 'Caller evidence')).toContainText('BaseHttp.get')
  await page.getByRole('tab', { name: 'Next steps', exact: true }).click()
  await section(page, 'Next steps')
    .locator('summary')
    .filter({ hasText: 'Handwritten calls' })
    .click()
  await expect(section(page, 'Next steps')).toContainText(
    'Replace this endpoint-specific handwritten transport',
  )
  await expect(section(page, 'Next steps')).not.toContainText(
    'Record beta deployment profile evidence',
  )
  await expect(
    section(page, 'Next steps').getByRole('link').first(),
  ).toHaveAttribute('href', pinned)
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click()
  await expect(section(page, 'Analysis diagnostics')).toContainText(
    'alpha deployment profile',
  )
  await expect(section(page, 'Analysis diagnostics')).not.toContainText(
    'beta deployment profile',
  )
  await expect(section(page, 'Generated transport inventory')).toContainText(
    'Api.alpha',
  )
  await expect(
    section(page, 'Generated transport inventory'),
  ).not.toContainText('Api.beta')
  await expect(section(page, 'Exceptions')).toContainText(
    'Alpha flow has matching verification',
  )
  await expect(section(page, 'Verification evidence')).toContainText(
    'client-compilation',
  )
  await expect(section(page, 'Enforcement evidence')).toContainText('disabled')
  await page
    .getByRole('combobox', { name: 'OpenAPI module' })
    .selectOption('beta')
  await expect(section(page, 'Analysis diagnostics')).toContainText(
    'beta deployment profile',
  )
  await expect(section(page, 'Analysis diagnostics')).not.toContainText(
    'alpha deployment profile',
  )
  await expect(section(page, 'Exceptions')).not.toContainText('alpha-exception')
  await expect(section(page, 'Verification evidence')).toContainText(
    'Verification unknown',
  )
  await expect(section(page, 'Enforcement evidence')).toContainText(
    'Enforcement unknown',
  )
  await expect(
    section(page, 'Percentage eligibility')
      .getByText('Production adoption', { exact: true })
      .locator('..'),
  ).toContainText('100% (1/1)')
  await page.getByRole('tab', { name: 'Overview', exact: true }).click()
  const readiness = section(page, 'Migration and protection prerequisites')
  await expect(readiness).toContainText('candidate')
  await expect(readiness).not.toContainText('alpha')
  const next = section(page, 'Next steps')
  await next.locator('summary').filter({ hasText: 'Verification' }).click()
  await next.locator('summary').filter({ hasText: 'Enforcement' }).click()
  await expect(next).toContainText('wire-compatibility')
  await expect(next).toContainText('runtime-flow')
  await expect(next).toContainText('enforcement')
  await page.reload()
  await loaded(page)
  await expect(
    page.getByRole('combobox', { name: 'OpenAPI module' }),
  ).toHaveValue('beta')
})

test('endpoint deep links preserve independent states, conditional variants, transport chains and actions', async ({
  page,
}) => {
  await mockReport(page)
  await page.goto(
    './#/openapi?module=alpha&view=endpoints&operation=GET%20%2Fapi%2Falpha',
  )
  await loaded(page)
  const detail = section(page, 'GET /api/alpha')
  await expect(detail).toContainText('mixed')
  await expect(detail).toContainText('@Profile(core)')
  await expect(detail).toContainText('application/json')
  await expect(detail).toContainText('Api.alpha')
  await expect(detail).toContainText('Core.alpha-manual')
  await expect(
    detail.getByRole('link').filter({ hasText: 'base-http.ts:63' }).first(),
  ).toHaveAttribute('href', /\/blob\/a{40}\/client\/shared\/base-http.ts#L63$/)
  await expect(detail).toContainText(
    'Replace this endpoint-specific handwritten transport',
  )
  await page
    .getByRole('button', { name: 'GET /api/alpha/unknown', exact: true })
    .click()
  await expect(section(page, 'GET /api/alpha/unknown')).toContainText(
    'No detected caller is insufficient to declare server-only',
  )
  await expect(section(page, 'GET /api/alpha/unknown')).toContainText('unknown')
  await expect(section(page, 'GET /api/alpha/unknown')).not.toContainText(
    'Core.alpha-manual',
  )
})

test('missing transport retains the complete shared source scan in endpoint details and Evidence', async ({
  page,
}) => {
  const snapshot = openApiFixture()
  const scan = {
    id: 'generated-source-scan' as const,
    complete: true,
    evidence: Array.from({ length: 6 }, (_, index) => ({
      inputId: 'generated',
      path: `generated/model-${index}.ts`,
      line: 1,
    })),
  }
  snapshot.generatedSourceScan = scan
  const operation = snapshot.operations.find(
    (operation) => operation.id === 'GET /api/alpha/unknown',
  )!
  operation.generatedTransport = {
    state: 'missing',
    methodIds: [],
    evidence: [scan.evidence[0]],
    scanEvidenceId: scan.id,
    reason: 'No implementation in the complete generated-source scan',
  }
  await mockReport(page, snapshot)
  await page.goto(
    './#/openapi?module=alpha&operation=GET%20%2Fapi%2Falpha%2Funknown',
  )
  await loaded(page)
  const transport = section(page, operation.id)
    .getByRole('heading', { name: 'Generated transport', exact: true })
    .locator('..')
  await expect(transport).toContainText('missing')
  await transport
    .getByText('Generated-source scan evidence', { exact: true })
    .click()
  await transport.getByText('Source evidence (6)', { exact: true }).click()
  await expect(
    transport.getByLabel('Source locations').getByRole('link'),
  ).toHaveCount(6)
  await expect(transport.getByRole('link').last()).toHaveAttribute(
    'href',
    pinned,
  )
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click()
  const inventory = section(page, 'Generated transport inventory')
  await inventory
    .getByText('Generated-source scan: 6 files · complete', { exact: true })
    .click()
  await inventory.getByText('Source evidence (6)', { exact: true }).click()
  await expect(
    inventory.getByLabel('Source locations').getByRole('link'),
  ).toHaveCount(6)
})

test('no-REST and limited modules have evidence, and invalid filters offer recovery', async ({
  page,
}) => {
  await mockReport(page)
  await page.goto('./#/openapi?view=endpoints&module=shared-ui')
  await loaded(page)
  await expect(section(page, 'shared-ui module')).toContainText(
    'No owned REST mappings',
  )
  await expect(section(page, 'Endpoints')).toContainText(
    'No inventoried operations',
  )
  await page.getByRole('tab', { name: 'Overview', exact: true }).click()
  await expect(section(page, 'Operation coverage')).toContainText(
    'No owned REST operations',
  )
  await expect(section(page, 'Detected production calls')).toContainText(
    'not-applicable',
  )
  await expect(
    section(page, 'Operation coverage').locator('[data-chart]'),
  ).toHaveCount(0)
  await page
    .getByRole('combobox', { name: 'OpenAPI module' })
    .selectOption('limited')
  await expect(section(page, 'limited module')).toContainText(
    'Reconcile the custom mapping annotation',
  )
  await expect(section(page, 'Inventory and analysis coverage')).toContainText(
    'unassessed',
  )
  for (const search of [
    'module=missing',
    'view=missing',
    'module=123',
    'view=false',
    'view=endpoints&module=beta&operation=GET%20%2Fapi%2Falpha',
  ]) {
    await page.goto(`./#/openapi?${search}`)
    await expect(
      page.getByText('Invalid OpenAPI filter', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Inventory and analysis coverage' }),
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Clear invalid filters' }).click()
    await expect(
      page.getByRole('heading', { name: 'Inventory and analysis coverage' }),
    ).toBeVisible()
  }
})

test('shared unassigned calls stay visible without becoming module counts or exclusive adoption', async ({
  page,
}) => {
  await mockReport(page, openApiFixture(true))
  await page.goto('./#/openapi?view=callers&module=beta')
  await loaded(page)
  await expect(section(page, 'Caller evidence')).toContainText(
    'Core.beta-generated',
  )
  await expect(section(page, 'Caller evidence')).not.toContainText(
    'Core.dynamic',
  )
  await expect(
    section(page, 'Shared unresolved production calls'),
  ).toContainText('Core.dynamic')
  await expect(section(page, 'Inventory and analysis coverage')).toContainText(
    'Shared uncertainty',
  )
  await page.getByRole('tab', { name: 'Overview', exact: true }).click()
  await expect(
    section(page, 'Migration and protection prerequisites'),
  ).toContainText('blocked')
})

test('loading, missing data and retry, schema and integrity errors have clear recovery', async ({
  page,
}) => {
  const { bytes, manifest } = artifact()
  let release: () => void = () => {}
  const delayed = new Promise<void>((resolve) => {
    release = resolve
  })
  let mode = 'missing'
  await page.route('**/openapi/*.json', async (route) => {
    if (mode === 'missing') {
      await delayed
      await route.fulfill({ status: 404 })
      return
    }
    const index = route.request().url().endsWith('/index.json')
    await route.fulfill({
      contentType: 'application/json',
      body: index
        ? JSON.stringify(
            mode === 'unsupported'
              ? { ...manifest, schemaVersion: 99 }
              : manifest,
          )
        : mode === 'integrity'
          ? `${bytes}\n`
          : bytes,
    })
  })
  await page.goto('./#/openapi')
  await expect(
    page.getByRole('status', { name: 'Loading OpenAPI report' }),
  ).toBeVisible()
  release()
  await expect(
    page.getByText('OpenAPI data unavailable', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/HTTP 404/)).toBeVisible()
  mode = 'valid'
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await loaded(page)
  for (const [errorMode, message] of [
    ['unsupported', 'Unsupported OpenAPI schema'],
    ['integrity', 'OpenAPI report integrity mismatch'],
  ]) {
    mode = errorMode
    await page.reload()
    await expect(page.getByText(new RegExp(message))).toBeVisible()
  }
  mode = 'valid'
  await page.goto('./#/openapi?snapshot=missing')
  await expect(
    page.getByText(/requested OpenAPI revision is not in/),
  ).toBeVisible()
  await page
    .getByRole('link', { name: 'Clear filters and load latest' })
    .click()
  await loaded(page)
})

test('OpenAPI controls and scoped evidence pass accessibility checks', async ({
  page,
}) => {
  await mockReport(page)
  await page.goto('./#/openapi?view=modules')
  await loaded(page)
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('tab', { name: 'Overview', exact: true }).click()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('small-screen views reflow and keyboard entry preserves the deep link', async ({
  page,
}, testInfo) => {
  await mockReport(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/openapi?module=alpha&operation=GET%20%2Fapi%2Falpha')
  await loaded(page)
  await expect(section(page, 'GET /api/alpha')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await expect(page).toHaveURL(/operation=/)
  for (const [tab, heading] of [
    ['Modules', 'All module assessments'],
    ['Endpoints', 'GET /api/alpha'],
    ['Callers', 'Caller evidence'],
    ['Next steps', 'Next steps'],
    ['Evidence', 'Percentage eligibility'],
  ]) {
    await page.getByRole('tab', { name: tab, exact: true }).click()
    await expect(section(page, heading)).toBeVisible()
  }
  await page.getByRole('tab', { name: 'Overview', exact: true }).click()
  await expect(section(page, 'Operation coverage')).toBeVisible()
  await expect(section(page, 'Detected production calls')).toBeVisible()
  expect(
    await section(page, 'All module assessments')
      .getByRole('table')
      .evaluate((table) => table.getBoundingClientRect().height),
  ).toBeLessThan(320)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: testInfo.outputPath('overview-mobile.png'),
    fullPage: true,
  })
})

test('refreshed pinned report clears Java parsing gaps and keeps unresolved adoption explicit', async ({
  page,
}, testInfo) => {
  const snapshot = await (
    await page.request.get(`./openapi/${acceptance.artemisCommit}.json`)
  ).json()
  expect(
    snapshot.diagnostics.filter(
      (record: { stage: string; reason: string }) =>
        record.stage === 'server' && record.reason.startsWith('JavaParser'),
    ),
  ).toEqual([])
  for (const id of [
    'assessment',
    'exercise',
    'hyperion',
    'iris',
    'localci',
    'localvc',
    'quiz',
  ]) {
    expect(
      snapshot.modules.find((module: { id: string }) => module.id === id)
        .inventory.completeness,
    ).toBe('complete')
  }
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto(
    './#/openapi?view=evidence&snapshot=' + acceptance.artemisCommit,
  )
  await loaded(page)
  const eligibility = section(page, 'Percentage eligibility')
  await expect(
    eligibility.getByText('Production adoption', { exact: true }).locator('..'),
  ).toContainText('incomplete-analysis')
  await expect(eligibility).toContainText(
    'Applicable unresolved source analysis',
  )
  await expect(section(page, 'Revision and provenance')).toContainText(
    'unknown',
  )
  await page.screenshot({ path: testInfo.outputPath('evidence-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await eligibility.scrollIntoViewIfNeeded()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('evidence-mobile.png') })
})
