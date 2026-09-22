import type { DecoratorlessAPIReport } from '../../report/types'
import { processReportData } from './data'
const files = import.meta.glob('/data/client/decoratorlessAPI/*.json', {
  eager: true,
})
export const decoratorlessAPIReports =
  processReportData<DecoratorlessAPIReport>(files)
