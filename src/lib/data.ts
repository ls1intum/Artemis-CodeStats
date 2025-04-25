import { ReportData } from "../../report/types";

const reportFiles = import.meta.glob("/data/*.json", { eager: true });

const reportData = Object.values(reportFiles).map((file) => {
  const data = file as { default: ReportData };
  return {
    ...data.default,
    generatedAt: new Date(data.default.metadata.generatedAt),
  };
});

reportData.sort((a, b) => {
  return new Date(b.metadata.generatedAt).getTime() - new Date(a.metadata.generatedAt).getTime();
});

export default reportData;