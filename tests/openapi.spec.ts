import { createHash } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { openApiFixture } from './fixtures/openapi'

const fixture = openApiFixture()
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
  await expect(section(page, 'Independent operation states')).toContainText(
    'mixed',
  )
  await expect(section(page, 'Percentage eligibility')).toContainText(
    'unassessed',
  )
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
  await expect(section(page, 'Percentage eligibility')).toContainText(
    '100% (1/1)',
  )
  await page.getByRole('tab', { name: 'Overview', exact: true }).click()
  const readiness = section(page, 'Migration and protection prerequisites')
  await expect(readiness).toContainText('candidate')
  await expect(readiness).not.toContainText('alpha')
  await readiness.getByText(/^Candidate prerequisites/).click()
  await expect(readiness).toContainText('wire-compatibility')
  await expect(readiness).toContainText('runtime-flow')
  await expect(readiness).toContainText('enforcement')
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
  await expect(section(page, 'Percentage eligibility')).toContainText(
    'not-applicable',
  )
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
  await expect(section(page, 'Percentage eligibility')).toContainText(
    'unassessed',
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
})

test('small-screen views reflow and keyboard entry preserves the deep link', async ({
  page,
}) => {
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
})
