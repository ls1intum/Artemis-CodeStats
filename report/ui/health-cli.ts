import { checkHealth } from './health'

const { GITHUB_REPOSITORY, GITHUB_TOKEN, DASHBOARD_URL } = process.env
if (!GITHUB_REPOSITORY || !GITHUB_TOKEN || !DASHBOARD_URL)
  throw new Error(
    'GITHUB_REPOSITORY, GITHUB_TOKEN and DASHBOARD_URL are required',
  )
const problems = await checkHealth(
  GITHUB_REPOSITORY,
  GITHUB_TOKEN,
  DASHBOARD_URL,
)
console.log(
  problems.length
    ? problems.join('\n')
    : 'Collector and deployed report are healthy',
)
