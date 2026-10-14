import { readFile } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

// Load each domain only inside its own failure boundary. Different last-good revisions are valid.
export async function verifyDashboardDeployments(
  site: string,
  request: typeof fetch = fetch,
) {
  return Promise.all(
    (['ui', 'openapi'] as const).map(async (dashboard) => {
      try {
        const directory = dashboard === 'ui' ? 'migrations' : 'openapi'
        const expected = JSON.parse(
          await readFile(`public/${directory}/index.json`, 'utf8'),
        )
        if (dashboard === 'ui') {
          const { verifyDeployment } = await import('./ui/verify-deployment')
          await verifyDeployment(site, expected, request)
        } else {
          const { verifyOpenApiDeployment } =
            await import('./openapi/verify-deployment')
          await verifyOpenApiDeployment(site, undefined, request, expected)
        }
        return { dashboard, success: true as const }
      } catch (error) {
        return { dashboard, success: false as const, error: String(error) }
      }
    }),
  )
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const site = process.env.DASHBOARD_URL
  if (!site) throw new Error('DASHBOARD_URL is required')
  for (let attempt = 1; ; attempt++) {
    const results = await verifyDashboardDeployments(site)
    if (results.every((result) => result.success)) {
      console.log(
        'Verified both deployed dashboards against their own last-good evidence',
      )
      break
    }
    console.warn(JSON.stringify(results))
    if (attempt >= 12)
      throw new Error(
        'Deployment verification failed; see domain results above',
      )
    await setTimeout(10_000)
  }
}
