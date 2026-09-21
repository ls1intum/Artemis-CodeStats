import { expect, test } from '@playwright/test'

test('real report, source links, filters and URL persistence', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'A clearer path to an owned UI.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Source evidence', exact: true }),
  ).toBeVisible()
  await page.getByLabel('Module', { exact: true }).selectOption('assessment')
  await page.getByLabel('Dimension', { exact: true }).selectOption('primeng')
  await page.getByLabel('File or evidence').fill('assessment')
  await expect(page).toHaveURL(/assessment/)
  await page.reload()
  await expect(page.getByLabel('Module', { exact: true })).toHaveValue(
    'assessment',
  )
  await expect(page.getByLabel('Dimension', { exact: true })).toHaveValue(
    'primeng',
  )
  const evidence = page.getByRole('region', {
    name: 'Source evidence',
    exact: true,
  })
  await expect(evidence.locator('tbody tr').first()).toBeVisible()
  await expect(evidence.locator('tbody a').first()).toHaveAttribute(
    'href',
    /github\.com\/ls1intum\/Artemis\/blob\/[a-f0-9]{40}\/.*#L\d+/,
  )
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByLabel('Module', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('File or evidence')).toHaveValue('')
  expect(errors).toEqual([])
  expect(
    requests.some((url) => /decoratorless.*\.js|dto-usage.*\.js/.test(url)),
  ).toBe(false)
})

test('comparison baseline, empty state and accessible trend', async ({
  page,
}) => {
  await page.goto('./')
  await page
    .getByRole('button', { name: 'Use package-adoption baseline' })
    .click()
  await expect(page.getByLabel('Compare against')).toHaveValue(
    '45bcba707254de4ccee7bb4c83526fbdfa45c6fc',
  )
  await page.getByText('View accessible trend data', { exact: true }).click()
  await expect(
    page.getByRole('table', { name: 'Affected files per analyzed commit' }),
  ).toBeVisible()
  const trend = page.getByRole('table', {
    name: 'Affected files per analyzed commit',
  })
  for (const dimension of [
    'PrimeNG',
    'ng-bootstrap',
    'Bootstrap classes',
    'Legacy style tokens',
    'TUM UI',
    'Tailwind evidence',
  ]) {
    await expect(
      trend.getByRole('columnheader', { name: dimension, exact: true }),
    ).toBeVisible()
  }
  await page.getByLabel('File or evidence').fill('definitely-no-such-evidence')
  await expect(
    page.getByText('No matching evidence.', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Next', exact: true }),
  ).toBeDisabled()
})

test('missing and invalid reports fail visibly and can recover', async ({
  page,
}) => {
  await page.route('**/migrations/index.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  )
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'Migration data unavailable' }),
  ).toBeVisible()
  await page.unroute('**/migrations/index.json')
  await page.getByRole('button', { name: 'Retry report' }).click()
  await expect(
    page.getByRole('heading', { name: 'A clearer path to an owned UI.' }),
  ).toBeVisible()
  await page.route('**/migrations/index.json', (route) =>
    route.fulfill({ json: { schemaVersion: 99 } }),
  )
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Migration data unavailable' }),
  ).toBeVisible()
})

test('small-screen reflow and keyboard entry point', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'A clearer path to an owned UI.' }),
  ).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused()
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
})

test('archive links remain discoverable without claiming completion', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByText('Archived migrations', { exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Signals / decoratorless APIs' }),
  ).toHaveAttribute('href', /decoratorless/)
  await expect(
    page.getByRole('link', { name: 'DTO usage', exact: true }),
  ).toHaveAttribute('href', /dto-usage/)
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Archived migrations' }),
  ).toBeFocused()
  await expect(
    page.getByRole('link', { name: 'DTO usage', exact: true }),
  ).toBeHidden()
  await page.keyboard.press('Enter')
  await page.getByRole('link', { name: 'DTO usage', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'DTO Usage Migration', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('dialog', { name: 'Archived migrations' }),
  ).toBeHidden()
})

test('active dashboard has no automated WCAG A/AA violations', async ({
  page,
}) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'Source evidence', exact: true }),
  ).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('historical dashboards still render as archives', async ({ page }) => {
  await page.goto('./#/decoratorless')
  await expect(
    page.getByText('Archived migration.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Angular Decoratorless API Migration',
      exact: true,
    }),
  ).toBeVisible()
  await page.goto('./#/dto-usage')
  await expect(
    page.getByText('Archived migration.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'DTO Usage Migration', exact: true }),
  ).toBeVisible()
})

test('partial analysis and stale source cannot appear silently healthy', async ({
  page,
}) => {
  await page.route('**/migrations/index.json', async (route) => {
    const response = await route.fetch()
    const manifest = await response.json()
    await page.clock.setFixedTime(
      new Date(Date.parse(manifest.snapshots.at(-1).date) + 8 * 86_400_000),
    )
    manifest.snapshots.at(-1).diagnostics = [
      {
        path: 'src/main/webapp/app/example.html',
        message: 'Fixture parse error',
      },
    ]
    await route.fulfill({ json: manifest })
  })
  await page.goto('./')
  await expect(page.getByText('Stale source:', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Partial analysis:', { exact: true }),
  ).toBeVisible()
})

test('changing evidence filters does not download the snapshot again', async ({
  page,
}) => {
  let detailsRequests = 0
  page.on('request', (request) => {
    if (/migrations\/[a-f0-9]{40}\.json/.test(request.url())) detailsRequests++
  })
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'Source evidence', exact: true }),
  ).toBeVisible()
  await page.getByLabel('File or evidence').fill('account')
  await page.getByLabel('Dimension', { exact: true }).selectOption('tumUi')
  await expect(
    page
      .getByRole('region', { name: 'Source evidence', exact: true })
      .locator('tbody tr')
      .first(),
  ).toBeVisible()
  expect(detailsRequests).toBe(1)
})

test('evidence failures preserve the overview and retry recovers', async ({
  page,
}) => {
  const snapshots = /\/migrations\/[a-f0-9]{40}\.json$/
  await page.route(snapshots, (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  )
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'A clearer path to an owned UI.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Evidence could not be loaded' }),
  ).toBeVisible()
  await page.unroute(snapshots)
  await page.getByRole('button', { name: 'Retry evidence' }).click()
  await expect(
    page.getByRole('table', { name: 'Filtered migration observations' }),
  ).toBeVisible()
})

test('pagination changes rows and filtering resets to the first page', async ({
  page,
}) => {
  await page.goto('./')
  const evidence = page.getByRole('table', {
    name: 'Filtered migration observations',
  })
  await expect(evidence).toBeVisible()
  const firstLink = await evidence
    .getByRole('link')
    .first()
    .getAttribute('href')
  await expect(evidence.locator('tbody tr')).toHaveCount(50)
  await expect(
    page.getByRole('button', { name: 'Previous', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(evidence.getByRole('link').first()).not.toHaveAttribute(
    'href',
    firstLink!,
  )
  await expect(
    page.getByRole('button', { name: 'Previous', exact: true }),
  ).toBeEnabled()
  await page.getByLabel('Dimension', { exact: true }).selectOption('primeng')
  await expect(
    page.getByRole('button', { name: 'Previous', exact: true }),
  ).toBeDisabled()
  await expect(evidence.locator('tbody tr')).toHaveCount(50)
  await expect(evidence.locator('tbody tr td:nth-child(2)')).toHaveText(
    Array(50).fill('PrimeNG'),
  )
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  const selected = await page
    .getByLabel('Selected snapshot')
    .selectOption({ index: 0 })
  await expect(
    page.getByRole('button', { name: 'Previous', exact: true }),
  ).toBeDisabled()
  await expect(evidence.getByRole('link').first()).toHaveAttribute(
    'href',
    new RegExp(`/blob/${selected[0]}/`),
  )
})

test('DTO archive loads only selected details and pins historical source links', async ({
  page,
}) => {
  const detailAsset = /\/assets\/dtoViolations_.*\.json$/
  const detailRequests: string[] = []
  page.on('request', (request) => {
    if (detailAsset.test(request.url())) detailRequests.push(request.url())
  })
  const initialResponse = page.waitForResponse(detailAsset)
  await page.goto('./#/dto-usage')
  const initialReport = await (await initialResponse).json()
  await page.getByRole('tab', { name: 'Violations Explorer' }).click()
  const initialTotal = Object.values(
    initialReport.dtoViolations.totals as Record<string, number>,
  ).reduce((sum, count) => sum + count, 0)
  await expect(
    page.getByText(`Showing ${initialTotal} of ${initialTotal} violations`),
  ).toBeVisible()
  const historicalResponse = page.waitForResponse(detailAsset)
  await page.getByLabel('Current:', { exact: true }).click()
  await page.getByRole('option').first().click()
  const historicalReport = await (await historicalResponse).json()
  expect(historicalReport.metadata.artemis.commitHash).not.toBe(
    initialReport.metadata.artemis.commitHash,
  )
  await expect(page).toHaveURL(/current=0/)
  const historicalTotal = Object.values(
    historicalReport.dtoViolations.totals as Record<string, number>,
  ).reduce((sum, count) => sum + count, 0)
  await expect(
    page.getByText(
      `Showing ${historicalTotal} of ${historicalTotal} violations`,
    ),
  ).toBeVisible()
  await page
    .getByRole('button', { name: /violations.*ret.*in.*fld/ })
    .first()
    .click()
  await expect(
    page.getByRole('table').getByRole('link').first(),
  ).toHaveAttribute(
    'href',
    new RegExp(
      `/blob/${historicalReport.metadata.artemis.commitHash}/src/main/java/`,
    ),
  )
  expect(detailRequests).toHaveLength(2)
})

test('per-commit summaries do not request unretained evidence or show a loading/error state', async ({
  page,
}) => {
  const response = await page.request.get('migrations/index.json')
  const manifest = await response.json()
  const summary = manifest.snapshots.find(
    (snapshot: { commit: string }) =>
      !manifest.evidenceCommits.includes(snapshot.commit),
  )
  expect(summary).toBeTruthy()
  const details: string[] = []
  page.on('request', (request) => {
    if (/\/migrations\/[a-f0-9]{40}\.json$/.test(request.url()))
      details.push(request.url())
  })
  await page.goto(`./#/?current=${summary.commit}`)
  await expect(page.getByLabel('Selected snapshot')).toHaveValue(summary.commit)
  await expect(
    page.getByRole('heading', { name: 'Summary-only historical snapshot' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Inspect this commit on GitHub' }),
  ).toHaveAttribute(
    'href',
    `https://github.com/ls1intum/Artemis/commit/${summary.commit}`,
  )
  expect(details).toEqual([])
  await expect(
    page.getByRole('button', { name: 'Retry evidence' }),
  ).toHaveCount(0)
  await page
    .getByLabel('Selected snapshot')
    .selectOption(manifest.snapshots.at(-1).commit)
  await expect(
    page.getByRole('heading', { name: 'Source evidence', exact: true }),
  ).toBeVisible()
})
