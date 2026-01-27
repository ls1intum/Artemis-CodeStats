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

/**
 * Entity return violation detail (REST endpoint returning @Entity)
 */
export interface EntityReturnViolation {
  controller: string;
  method: string;
  endpoint: string;
  returnType: string;
  entityClass: string;
  file: string;
}

/**
 * Entity input violation detail (@RequestBody accepting @Entity)
 */
export interface EntityInputViolation {
  controller: string;
  method: string;
  endpoint: string;
  parameterName: string;
  parameterType: string;
  annotationType: string;
  entityClass: string;
  file: string;
}

/**
 * DTO entity field violation detail (DTO containing @Entity field)
 */
export interface DtoEntityFieldViolation {
  dtoClass: string;
  fieldName: string;
  fieldType: string;
  entityClass: string;
  file: string;
}

/**
 * DTO Violation statistics per module
 */
export interface DtoModuleViolations {
  entityReturnViolations: number;
  entityInputViolations: number;
  dtoEntityFieldViolations: number;
  entityReturnDetails?: EntityReturnViolation[];
  entityInputDetails?: EntityInputViolation[];
  dtoEntityFieldDetails?: DtoEntityFieldViolation[];
}

/**
 * DTO Violations data structure
 */
export interface DtoViolationsData {
  modules: Record<string, DtoModuleViolations>;
  totals: {
    entityReturnViolations: number;
    entityInputViolations: number;
    dtoEntityFieldViolations: number;
  };
}

/**
 * DTO Violations Report
 */
export interface DtoViolationsReport extends BaseReport {
  dtoViolations: DtoViolationsData;
}