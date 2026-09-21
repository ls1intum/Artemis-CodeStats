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
    page.getByRole('heading', { name: 'Lockable directories', level: 2 }),
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

test('lock entries are copied for pasting into the three Artemis lists', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'clipboard permissions are Chromium-only',
  )
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('./')
  await loaded(page)
  await page
    .getByRole('button', { name: /^Copy lock entries for / })
    .first()
    .click()
  await expect(page.getByText(/Copied lock entries/)).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toMatch(/^\/\/ eslint\.config\.mjs/)
  expect(text).toMatch(/'src\/main\/webapp\/app\/.*\/\*\*\/\*\.html',/)
  expect(text).toMatch(/"src\/main\/webapp\/app\/.*\/\*\*\/\*\.scss",/)
  expect(text).toMatch(/@source '\.\/app\/.*';/)
})

test('section drawer opens from the table, lives in the URL, lists blockers and returns focus', async ({
  page,
}) => {
  await page.goto('./')
  await loaded(page)
  const trigger = page.getByRole('button', { name: 'course', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'course' })
  await expect(dialog).toBeVisible()
  await expect(page).toHaveURL(/#\/\?section=course/)
  await expect(page).not.toHaveURL(/\?section=course#/)
  await expect(
    dialog.getByRole('table').last().locator('tbody tr').first(),
  ).toBeVisible()
  await dialog.getByRole('radio', { name: 'Clean', exact: true }).click()
  await expect(
    dialog.locator('tbody').getByText('Bootstrap-free, unlocked').first(),
  ).toBeVisible()
  await expect(
    dialog.locator('tbody').getByText('Bootstrap', { exact: true }),
  ).toHaveCount(0)
  const blocked = dialog.getByRole('button', { name: /^\d[\d,]* in \d+$/ })
  await blocked.first().focus()
  await page.keyboard.press('Enter')
  const popover = page.getByRole('dialog').filter({
    hasText: 'Imported units that still carry Bootstrap',
  })
  await expect(popover.getByRole('link').first()).toHaveAttribute(
    'href',
    /github\.com\/ls1intum\/Artemis\/blob\/[a-f0-9]{40}\//,
  )
  await page.keyboard.press('Escape')
  await expect(popover).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).not.toHaveURL(/section=/)
  await expect(trigger).toBeFocused()
  await page.goto('./#/?section=course')
  await expect(page.getByRole('dialog', { name: 'course' })).toBeVisible()
})

test('snapshot and comparison selection change the deltas and mark the chart', async ({
  page,
}) => {
  await page.goto('./')
  await loaded(page)
  const before = await page
    .getByRole('heading', { name: 'Bootstrap hits', exact: true })
    .locator('..')
    .textContent()
  await page.getByLabel('Snapshot').click()
  await page.getByRole('option', { name: /package adoption/ }).click()
  await expect(page).toHaveURL(/snapshot=45bcba70/)
  await expect(page.getByText('snapshot', { exact: true })).toBeVisible()
  await page.getByLabel('Compare against').click()
  await expect(
    page.getByRole('option', { name: /package adoption/ }),
  ).toHaveCount(0)
  await page.getByRole('option', { name: /kit pilot/ }).click()
  await expect(page).toHaveURL(/compare=e6e7c9cc/)
  await expect(
    page
      .getByRole('heading', { name: 'Bootstrap hits', exact: true })
      .locator('..'),
  ).not.toHaveText(before!)
  await expect(
    page.getByRole('heading', { name: 'Commits that moved the numbers' }),
  ).toBeVisible()
  await page.goto('./#/?snapshot=e6e7c9cca1e961ce05463177bc316dc42c8d1c38')
  await loaded(page)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('requests for unretained commits fall back visibly', async ({ page }) => {
  await page.goto('./#/?snapshot=0000000000000000000000000000000000000000')
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

test('small-screen reflow, drawer columns and keyboard entry point', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/?section=course')
  const heads = await page
    .getByRole('dialog', { name: 'course' })
    .getByRole('table')
    .last()
    .getByRole('columnheader')
    .evaluateAll((cells) =>
      cells.map((c) => {
        const r = c.getBoundingClientRect()
        return [r.left, r.right]
      }),
    )
  for (let i = 1; i < heads.length; i++)
    expect(heads[i][0]).toBeGreaterThanOrEqual(heads[i - 1][1] - 1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
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
