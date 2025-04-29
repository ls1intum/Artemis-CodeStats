import { ChangeDetectionStats } from './client/changeDetection';
import { ModuleStats } from './client/componentInventory';
import { DecoratorlessAPIStats } from './client/decoratorlessApi';

/**
 * Commit information interface
 */
export interface CommitInfo {
  commitHash: string;
  commitDate: Date;
  commitAuthor: string;
  commitMessage: string;
}

/**
 * Metadata for all reports
 */
export interface ReportMetadata {
  type: string;
  artemis: CommitInfo;
}

/**
 * Base report interface
 */
export interface BaseReport {
  metadata: ReportMetadata;
}

/**
 * Change Detection Report
 */
export interface ChangeDetectionReport extends BaseReport {
  changeDetection: Record<string, ChangeDetectionStats>;
}

/**
 * Component Inventory Report
 */
export interface ComponentInventoryReport extends BaseReport {
  componentInventory: Record<string, ModuleStats>;
}

/**
 * Decoratorless API Report
 */
export interface DecoratorlessAPIReport extends BaseReport {
  decoratorlessAPI: Record<string, DecoratorlessAPIStats>;
}