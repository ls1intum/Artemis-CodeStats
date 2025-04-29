import { BaseReport, ChangeDetectionReport, ComponentInventoryReport, DecoratorlessAPIReport } from "../../report/types";

// Import files from each report type directory
const changeDetectionFiles = import.meta.glob("/data/client/changeDetection/*.json", { eager: true });
const componentInventoryFiles = import.meta.glob("/data/client/componentInventory/*.json", { eager: true });
const decoratorlessAPIFiles = import.meta.glob("/data/client/decoratorlessAPI/*.json", { eager: true });

// Helper function to process and sort report data
function processReportData<T>(files: Record<string, unknown>): T[] {
  const data = Object.values(files).map((file) => {
    const reportData = file as { default: T };
    return reportData.default;
  });

  // Sort by commit date, newest first
  data.sort((a, b) => {
    return new Date((b as BaseReport).metadata.artemis.commitDate).getTime() - 
           new Date((a as BaseReport).metadata.artemis.commitDate).getTime();
  });

  return data;
}

// Process each report type
export const changeDetectionReports = processReportData<ChangeDetectionReport>(changeDetectionFiles);
export const componentInventoryReports = processReportData<ComponentInventoryReport>(componentInventoryFiles);
export const decoratorlessAPIReports = processReportData<DecoratorlessAPIReport>(decoratorlessAPIFiles);