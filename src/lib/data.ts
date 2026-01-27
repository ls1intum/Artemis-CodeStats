import { BaseReport, ChangeDetectionReport, ComponentInventoryReport, DecoratorlessAPIReport, DtoViolationsReport } from "../../report/types";

// Import files from each report type directory
const changeDetectionFiles = import.meta.glob("/data/client/changeDetection/*.json", { eager: true });
const componentInventoryFiles = import.meta.glob("/data/client/componentInventory/*.json", { eager: true });
const decoratorlessAPIFiles = import.meta.glob("/data/client/decoratorlessAPI/*.json", { eager: true });
const dtoViolationFiles = import.meta.glob("/data/server/dtoViolations/*.json", { eager: true });

// Helper function to process and sort report data
function processReportData<T extends BaseReport>(files: Record<string, unknown>): T[] {
  const data = Object.values(files).map((file) => {
    const reportData = file as { default: BaseReport };
    return {
      ...reportData.default,
      metadata: {
        type: reportData.default.metadata.type,
        artemis: {
          ...reportData.default.metadata.artemis,
          commitDate: new Date(reportData.default.metadata.artemis.commitDate)
        },
      },
    } as T;
  });

  // Sort by commit date, oldest first
  data.sort((a, b) => {
    return a.metadata.artemis.commitDate.getTime() - b.metadata.artemis.commitDate.getTime();
  });

  return data;
}

// Process each report type
export const changeDetectionReports = processReportData<ChangeDetectionReport>(changeDetectionFiles);
export const componentInventoryReports = processReportData<ComponentInventoryReport>(componentInventoryFiles);
export const decoratorlessAPIReports = processReportData<DecoratorlessAPIReport>(decoratorlessAPIFiles);
export const dtoViolationReports = processReportData<DtoViolationsReport>(dtoViolationFiles);