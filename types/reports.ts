export interface DecoratorlessAPIStats {
  inputFunction: number // input(...)
  inputRequired: number // input.required(...)
  inputDecorator: number // @Input()
  outputFunction: number // output(...)
  outputDecorator: number // @Output()
  modelFunction: number // model(...)
  viewChildFunction: number // viewChild(...)
  viewChildRequired: number // viewChild.required(...)
  viewChildrenFunction: number // viewChildren(...)
  viewChildDecorator: number // @ViewChild()
  viewChildrenDecorator: number // @ViewChildren()
  contentChildFunction: number // contentChild(...)
  contentChildRequired: number // contentChild.required(...)
  contentChildrenFunction: number // contentChildren(...)
  contentChildDecorator: number // @ContentChild()
  total: number
}

/**
 * Commit information interface
 */
export interface CommitInfo {
  commitHash: string
  commitTimestamp: string
  commitDate: Date
  commitAuthor: string
  commitMessage: string
}

/**
 * Metadata for all reports
 */
export interface ReportMetadata {
  type: string
  artemis: CommitInfo
}

/**
 * Base report interface
 */
export interface BaseReport {
  metadata: ReportMetadata
}

/**
 * Decoratorless API Report
 */
export interface DecoratorlessAPIReport extends BaseReport {
  decoratorlessAPI: Record<string, DecoratorlessAPIStats>
}
