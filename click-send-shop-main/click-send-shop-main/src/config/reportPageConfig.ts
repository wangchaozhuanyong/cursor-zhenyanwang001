import {
  REPORT_KPI_PRIORITIES,
  REPORT_REGISTRY,
  REPORT_REGISTRY_BY_KEY,
  PROFIT_REPORT_SUMMARY_PRIORITY_KEYS,
  type ReportExportMode,
  type ReportFilterProfile,
  type ReportKpiProfile,
} from "@/modules/admin/pages/report/reportRegistry";

export {
  REPORT_KPI_PRIORITIES,
  PROFIT_REPORT_SUMMARY_PRIORITY_KEYS,
  type ReportExportMode,
  type ReportFilterProfile,
  type ReportKpiProfile,
};

export type ReportPageConfig = {
  reportKey: string;
  title: string;
  description: string;
  exportType?: string;
  exportMode?: ReportExportMode;
  filterProfile: ReportFilterProfile;
  kpiProfile: ReportKpiProfile;
  maxKpis?: number;
  summaryPriorityKeys?: string[];
  summaryMaxCards?: number;
  supportsGranularity?: boolean;
  filters?: import("@/modules/admin/pages/report/reportRegistry").ReportFilterKey[];
  kpiPriorityKeys?: string[];
  columns?: string[];
  dataScopeNote?: string;
};

export const REPORT_PAGES: Record<string, ReportPageConfig> = Object.fromEntries(
  REPORT_REGISTRY.map((item) => [
    item.key,
    {
      reportKey: item.reportKey,
      title: item.title,
      description: item.description,
      exportType: item.exportType,
      exportMode: item.exportMode,
      filterProfile: item.filterProfile,
      kpiProfile: item.kpiProfile,
      maxKpis: item.maxKpis,
      summaryPriorityKeys: item.summaryPriorityKeys ?? item.kpiPriorityKeys,
      summaryMaxCards: item.summaryMaxCards,
      supportsGranularity: item.supportsGranularity,
      filters: item.filters,
      kpiPriorityKeys: item.kpiPriorityKeys,
      columns: item.columns,
      dataScopeNote: item.dataScopeNote,
    },
  ]),
) as Record<string, ReportPageConfig>;

export { REPORT_REGISTRY_BY_KEY };
