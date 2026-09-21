import { resolve } from 'node:path'
import { generateReports } from './generate'

generateReports({
  repo: resolve('artemis'),
  output: resolve('public/migrations'),
  baseline: 'e6e7c9cca1e961ce05463177bc316dc42c8d1c38',
  packageAdoption: '45bcba707254de4ccee7bb4c83526fbdfa45c6fc',
  rebuild: process.argv.includes('--rebuild'),
})
