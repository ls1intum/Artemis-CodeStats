import { expect, test, type Page } from '@playwright/test'

const title = 'Client UI modernization'
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
      .first()
      .locator('..'),
  ).toContainText(hits.toLocaleString('en-US'))
  await expect(
    page
      .getByRole('img', {
        name: /^Legacy-free \d+, PrimeNG or ng-bootstrap remain/,
      })
      .first(),
  ).toBeVisible()
  await expect(
    page
      .getByRole('heading', { name: 'Legacy-free units', exact: true })
      .locator('..'),
  ).toContainText(`${latest.totals.legacyFree.toLocaleString('en-US')} of`)
  await expect(
    page.getByRole('heading', {
      name: 'Legacy retired and kit adopted, per integrated commit',
    }),
  ).toBeVisible()
  await expect(page.locator('.recharts-area-area')).toHaveCount(4)
  await page.getByRole('tab', { name: 'Next steps' }).click()
  await expect(page).toHaveURL(/view=next/)
  for (const name of [
    'Quick wins',
    'Lockable directories',
    'Shared units with Bootstrap that block the most',
    'Kit gaps',
    'Closest to legacy-free',
  ])
    await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible()
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
  await page.goto('./#/?view=next')
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
  await page.goto('./#/?view=sections')
  await loaded(page)
  await expect(
    page.getByRole('heading', { name: 'What kind of work remains where' }),
  ).toBeVisible()
  await expect(
    page.getByRole('cell', { name: 'All sections' }).locator('..'),
  ).toContainText(/\d/)
  await expect(
    page.getByRole('columnheader', { name: 'Last progress' }).first(),
  ).toBeVisible()
  // Sorting: the default is most Bootstrap hits first; clicking Legacy-free sorts by share.
  const sections = page.getByRole('table').first()
  const hitsHeader = sections.getByRole('columnheader', {
    name: 'Bootstrap hits',
  })
  await expect(hitsHeader).toHaveAttribute('aria-sort', 'descending')
  await sections
    .getByRole('button', { name: 'Legacy-free', exact: true })
    .click()
  await expect(
    sections.getByRole('columnheader', { name: 'Legacy-free', exact: true }),
  ).toHaveAttribute('aria-sort', 'descending')
  await expect(sections.locator('tbody tr').first()).toContainText('100%')
  await sections
    .getByRole('button', { name: 'Legacy-free', exact: true })
    .click()
  await expect(
    sections.getByRole('columnheader', { name: 'Legacy-free', exact: true }),
  ).toHaveAttribute('aria-sort', 'ascending')
  const trigger = page.getByRole('button', { name: 'course', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'course' })
  await expect(dialog).toBeVisible()
  await expect(page).toHaveURL(/#\/\?view=sections&section=course/)
  await expect(page).not.toHaveURL(/\?section=course#/)
  const units = dialog
    .getByRole('table')
    .filter({ has: page.getByRole('columnheader', { name: 'Stage' }) })
  await expect(units.locator('tbody tr').first()).toBeVisible()
  await dialog
    .getByRole('radio', { name: 'PrimeNG / ngb', exact: true })
    .click()
  await expect(
    dialog.locator('tbody').getByText('PrimeNG / ngb', { exact: true }).first(),
  ).toBeVisible()
  await expect(
    dialog.locator('tbody').getByText('Bootstrap', { exact: true }),
  ).toHaveCount(0)
  await dialog.getByRole('radio', { name: 'Legacy-free', exact: true }).click()
  await dialog.getByRole('radio', { name: 'All', exact: true }).click()
  await dialog.getByLabel('Search units').fill('course-update')
  await expect(units.locator('tbody tr')).toHaveCount(1)
  await dialog.getByLabel('Search units').fill('')
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
  await page.goto('./#/?view=sections&section=course')
  await expect(page.getByRole('dialog', { name: 'course' })).toBeVisible()
})

test('every table fits a desktop viewport without sideways scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const view of [
    'overview',
    'sections',
    'pages',
    'next',
    'inventory',
    'contributors',
  ]) {
    await page.goto(`./#/?view=${view}`)
    await loaded(page)
    await expect(page.getByRole('table').first()).toBeVisible()
    const overflowing = await page.evaluate(() =>
      [...document.querySelectorAll('table')]
        .filter((t) => t.scrollWidth > t.parentElement!.clientWidth + 1)
        .map(
          (t) =>
            t.closest('[data-slot=card]')?.querySelector('h2')?.textContent,
        ),
    )
    expect(overflowing, view).toEqual([])
  }
})

test('contributors are ranked, linked to GitHub and windowed', async ({
  page,
}) => {
  await page.goto('./#/?view=contributors')
  await loaded(page)
  const manifest = await (
    await page.request.get('./migrations/index.json')
  ).json()
  const authors = new Set(
    manifest.snapshots.map(
      (s: { author: { login?: string } }) => s.author.login,
    ),
  )
  expect(authors.size).toBeGreaterThan(3)
  const podium = page.getByRole('list', { name: 'Top three' })
  await expect(podium.getByRole('listitem')).toHaveCount(3)
  const first = podium.getByRole('listitem').first()
  await expect(first).toContainText('#1')
  await expect(first.getByRole('link').first()).toHaveAttribute(
    'href',
    /^https:\/\/github\.com\/[\w-]+$/,
  )
  await expect(first.locator('img')).toHaveAttribute(
    'src',
    /github\.com\/[\w-]+\.png/,
  )
  const table = page.getByRole('table').first()
  await expect(table.getByRole('columnheader', { name: '#' })).toHaveAttribute(
    'aria-sort',
    'ascending',
  )
  const leader = await first.getByRole('link').first().textContent()
  await expect(table.locator('tbody tr').first()).toContainText(leader!)
  // Sorting by legacy-free units keeps the rank numbers, which follow the leaderboard's own order.
  await table.getByRole('button', { name: 'Legacy-free', exact: true }).click()
  await expect(
    table.getByRole('columnheader', { name: 'Legacy-free', exact: true }),
  ).toHaveAttribute('aria-sort', 'descending')
  await page.getByRole('radio', { name: /^Since [A-Z][a-z]{2} \d+$/ }).click()
  await expect(
    page.getByRole('table').first().locator('tbody tr'),
  ).not.toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Latest progress' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('table')
      .last()
      .locator('tbody tr')
      .first()
      .getByRole('link')
      .first(),
  ).toHaveAttribute('href', /github\.com/)
})

test('pages view and per-commit snapshots resolve through patches', async ({
  page,
}) => {
  await page.goto('./#/?view=pages')
  await loaded(page)
  const manifest = await (
    await page.request.get('./migrations/index.json')
  ).json()
  const t = manifest.snapshots.at(-1).totals
  await expect(page.getByText(/The global shell/)).toBeVisible()
  const label = await page
    .getByRole('img', { name: /^Legacy-free \d+, Bootstrap-free/ })
    .first()
    .getAttribute('aria-label')
  const legacyFree = Number(/Legacy-free (\d+)/.exec(label!)![1])
  const components = Number(/remain (\d+)/.exec(label!)![1])
  expect(legacyFree + components).toBe(t.pagesClean)
  await page.getByRole('radio', { name: 'Legacy-free', exact: true }).click()
  await expect(page.getByRole('table').last().locator('tbody tr')).toHaveCount(
    legacyFree,
  )
  // A commit that is not a base is stored as a patch and must render with full detail.
  const patched = manifest.snapshots.find(
    (s: { commit: string }) => !manifest.bases.includes(s.commit),
  )
  const stored = await (
    await page.request.get(`./migrations/${patched.commit}.json`)
  ).json()
  expect(manifest.bases).toContain(stored.base)
  await page.goto(`./#/?view=sections&snapshot=${patched.commit}`)
  await loaded(page)
  await expect(page.getByLabel('Snapshot')).toContainText(
    patched.commit.slice(0, 8),
  )
  await expect(
    page
      .getByRole('heading', { name: 'Bootstrap hits', exact: true })
      .first()
      .locator('..'),
  ).toContainText(
    (patched.totals.classHits + patched.totals.styleHits).toLocaleString(
      'en-US',
    ),
  )
})

test('requests for unknown commits fall back visibly', async ({ page }) => {
  await page.goto('./#/?snapshot=0000000000000000000000000000000000000000')
  await loaded(page)
  await expect(page.getByRole('status')).toContainText('not in the history')
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
  await page.goto('./#/?view=sections&section=course')
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
  await expect
    .poll(() =>
      page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')),
    )
    .toBe(true)
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
