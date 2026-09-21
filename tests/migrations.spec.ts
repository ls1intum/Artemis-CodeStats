import { expect, test, type Page } from '@playwright/test'

const title = 'Bootstrap → Tailwind / TUM UI migration'
const loaded = (page: Page) =>
  expect(page.getByRole('heading', { name: title })).toBeVisible()

test('overview renders real totals, burndown and lock entries', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await loaded(page)
  const manifest = await (
    await page.request.get('./migrations/index.json')
  ).json()
  const latest = manifest.snapshots.at(-1)
  const hits = latest.totals.classHits + latest.totals.styleHits
  await expect(
    page
      .getByRole('heading', { name: 'Bootstrap hits', exact: true })
      .locator('..'),
  ).toContainText(hits.toLocaleString('en-US'))
  await expect(
    page.getByRole('img', { name: /^Locked \d+, Bootstrap-free/ }).first(),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Bootstrap hits per integrated commit' }),
  ).toBeVisible()
  await expect(page.locator('.recharts-area-area').first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Lockable now' }).first(),
  ).toBeVisible()
  await expect(
    page
      .getByRole('table')
      .filter({ hasText: 'Directory' })
      .first()
      .getByRole('link')
      .first(),
  ).toHaveAttribute(
    'href',
    new RegExp(`/blob/${latest.commit}/src/main/webapp/app/`),
  )
  expect(errors).toEqual([])
})

test('section drawer opens from the table, lives in the URL and closes with Escape', async ({
  page,
  context,
}) => {
  await context
    .grantPermissions(['clipboard-read', 'clipboard-write'])
    .catch(() => {})
  await page.goto('./')
  await loaded(page)
  await page.getByRole('button', { name: 'exercise', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'exercise' })
  await expect(dialog).toBeVisible()
  await expect(page).toHaveURL(/section=exercise/)
  await expect(
    dialog.getByRole('table').last().locator('tbody tr').first(),
  ).toBeVisible()
  await dialog.getByRole('radio', { name: 'Bootstrap', exact: true }).click()
  await expect(
    dialog.getByText('Bootstrap-free, unlocked', { exact: true }),
  ).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('dialog', { name: 'exercise' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).not.toHaveURL(/section=/)
})

test('snapshot and comparison selection change the deltas and mark the chart', async ({
  page,
}) => {
  await page.goto('./')
  await loaded(page)
  await page.getByLabel('Snapshot').click()
  await page.getByRole('option', { name: /package adoption/ }).click()
  await expect(page).toHaveURL(/snapshot=45bcba70/)
  await expect(page.getByText('snapshot', { exact: true })).toBeVisible()
  await page.getByLabel('Compare against').click()
  await page.getByRole('option', { name: /kit pilot/ }).click()
  await expect(page).toHaveURL(/compare=e6e7c9cc/)
  await expect(
    page.getByRole('heading', { name: 'Commits that moved the numbers' }),
  ).toBeVisible()
})

test('requests for unretained commits fall back visibly', async ({ page }) => {
  await page.goto('./?snapshot=0000000000000000000000000000000000000000')
  await loaded(page)
  await expect(page.getByRole('status')).toContainText(
    'not a retained checkpoint',
  )
})

test('missing and invalid reports fail visibly and can recover', async ({
  page,
}) => {
  await page.route('**/migrations/index.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  )
  await page.goto('./')
  await expect(page.getByText('Migration data unavailable')).toBeVisible()
  await page.unroute('**/migrations/index.json')
  await page.getByRole('button', { name: 'Retry' }).click()
  await loaded(page)
  await page.route('**/migrations/index.json', (route) =>
    route.fulfill({ json: { schemaVersion: 99 } }),
  )
  await page.reload()
  await expect(page.getByText('Migration data unavailable')).toBeVisible()
})

test('small-screen reflow and keyboard entry point', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await loaded(page)
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
})

test('active dashboard has no automated WCAG A/AA violations', async ({
  page,
}) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await page.goto('./')
  await loaded(page)
  await expect(page.locator('.recharts-area-area').first()).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('historical dashboards still render as archives', async ({ page }) => {
  await page.goto('./#/decoratorless')
  await expect(page.getByText('Archived.', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Angular Decoratorless API Migration',
      exact: true,
    }),
  ).toBeVisible()
  await page.goto('./#/dto-usage')
  await expect(page.getByText('Archived.', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'DTO Usage Migration', exact: true }),
  ).toBeVisible()
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
  const historicalResponse = page.waitForResponse(detailAsset)
  await page.getByLabel('Current:', { exact: true }).click()
  await page.getByRole('option').first().click()
  const historicalReport = await (await historicalResponse).json()
  expect(historicalReport.metadata.artemis.commitHash).not.toBe(
    initialReport.metadata.artemis.commitHash,
  )
  await expect(page).toHaveURL(/current=0/)
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
