import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { ReportPageConfig } from "@/config/reportPageConfig";
import { fetchCategories } from "@/services/admin/categoryService";
import ReportFilterBar from "@/components/admin/report/ReportFilterBar";
import ReportPageHeader from "@/components/admin/report/ReportPageHeader";
import ReportKpiGrid from "@/components/admin/report/ReportKpiGrid";
import ReportAlertBanners from "@/components/admin/report/ReportAlertBanners";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildReportFilterChips,
  clearReportFilters,
  hasActiveReportFilters,
  removeReportFilterChip,
} from "@/utils/adminReportFilters";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { labelReportCellValue, labelReportColumn } from "@/utils/adminDisplayLabels";
import { getReportColumnMaxWidthStyle } from "@/utils/adminTableColumnPolicy";
import {
  buildReportTableColumns,
  getReportStickyCellStyle,
  reportTableBodyCellClass,
  reportTableHeadCellClass,
} from "@/utils/reportTableColumns";
import { buildReportAlerts, pickSummaryKpiEntries } from "@/utils/reportSummaryKpi";
import {
  getEnabledFilters,
  pickReportQueryParams,
  sanitizeReportSearchParams,
} from "@/utils/reportFilters";
import { exportProfitDailyCsv, exportReportCsv } from "@/services/admin/reportService";
import { formatAdminDate, formatAdminDateTimeAuto } from "@/utils/formatDateTime";

function formatCellValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (key === "month" && typeof value === "string") return value;
  if (key === "date") return formatAdminDate(String(value));
  if (
    key.endsWith("_at")
    || key.endsWith("_date")
    || key === "start_date"
    || key === "end_date"
    || key === "start_at"
    || key === "end_at"
  ) {
    return formatAdminDateTimeAuto(value);
  }
  return labelReportCellValue(key, value);
}

type Props = {
  config: ReportPageConfig;
  fetcher: (params: Record<string, string>) => Promise<Record<string, unknown>>;
  /** 覆盖 config.summaryPriorityKeys */
  summaryPriorityKeys?: string[];
  /** 覆盖 config.summaryMaxCards；0 表示不截断 */
  summaryMaxCards?: number;
};

export default function AdminReportGenericPage({
  config,
  fetcher,
  summaryPriorityKeys: summaryPriorityKeysProp,
  summaryMaxCards: summaryMaxCardsProp,
}: Props) {
  const {
    title,
    description,
    exportType,
    exportMode,
    filterProfile,
    supportsGranularity,
    kpiProfile,
    maxKpis,
    reportKey,
    summaryPriorityKeys: summaryPriorityKeysConfig,
    summaryMaxCards: summaryMaxCardsConfig,
  } = config;
  const summaryPriorityKeys = summaryPriorityKeysProp ?? summaryPriorityKeysConfig;
  const summaryMaxCards =
    summaryMaxCardsProp ?? summaryMaxCardsConfig ?? (summaryPriorityKeys?.length ? 0 : (maxKpis ?? 8));
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const enabledFilters = useMemo(
    () => getEnabledFilters(filterProfile, { supportsGranularity }),
    [filterProfile, supportsGranularity],
  );

  const needsCategories =
    enabledFilters.includes("categoryId") || enabledFilters.includes("productId");

  const categoriesQuery = useQuery({
    queryKey: adminQueryKeys.categories(),
    queryFn: fetchCategories,
    enabled: needsCategories,
    staleTime: 300_000,
  });

  const categoryOptions = useMemo(
    () => (categoriesQuery.data ?? []).map((c) => ({
      value: String(c.id),
      label: c.name || String(c.id),
    })),
    [categoriesQuery.data],
  );

  const sanitizedOnce = useRef(false);
  useEffect(() => {
    if (sanitizedOnce.current) return;
    sanitizedOnce.current = true;
    const sanitized = sanitizeReportSearchParams(searchParams, enabledFilters);
    const current = searchParams.toString();
    const next = sanitized.toString();
    if (current !== next) {
      setSearchParams(sanitized, { replace: true });
    }
  }, [enabledFilters, searchParams, setSearchParams]);

  const filterParams = useMemo(() => {
    const raw: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      raw[key] = value;
    });
    return pickReportQueryParams(raw, enabledFilters);
  }, [searchParams, enabledFilters]);

  const reportQuery = useQuery({
    queryKey: adminQueryKeys.report(reportKey, filterParams),
    queryFn: () => fetcher(filterParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const loading = reportQuery.isLoading && !reportQuery.data;
  const payload = (reportQuery.data ?? {}) as Record<string, unknown>;

  useEffect(() => {
    if (reportQuery.isError) {
      toast.error(toastErrorMessage(reportQuery.error, "加载报表失败"));
    }
  }, [reportQuery.isError, reportQuery.error]);

  const list = useMemo(
    () => (Array.isArray(payload.list) ? (payload.list as Record<string, unknown>[]) : []),
    [payload.list],
  );
  const summary = (payload.summary || {}) as Record<string, unknown>;

  const { columns, stickyKeys } = useMemo(() => buildReportTableColumns(list), [list]);

  const kpiEntries = useMemo(
    () => pickSummaryKpiEntries(summary, kpiProfile, summaryMaxCards, summaryPriorityKeys),
    [summary, kpiProfile, summaryMaxCards, summaryPriorityKeys],
  );

  const alerts = useMemo(
    () => buildReportAlerts(reportKey, payload, summary, list),
    [reportKey, payload, summary, list],
  );

  const filterChips = useMemo(
    () => buildReportFilterChips(searchParams, enabledFilters),
    [searchParams, enabledFilters],
  );
  const filtersActive = hasActiveReportFilters(searchParams, enabledFilters);
  const emptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.reportDataFiltered : ADMIN_EMPTY_GUIDES.reportData;

  const handleClearFilters = () => {
    setSearchParams(clearReportFilters(enabledFilters), { replace: true });
  };

  const handleRemoveFilterChip = (key: string) => {
    setSearchParams(removeReportFilterChip(searchParams, key, enabledFilters), { replace: true });
  };

  const handleExport = useCallback(async () => {
    if (!exportType) return;
    setExporting(true);
    try {
      if (exportMode === "profit") {
        await exportProfitDailyCsv(filterParams);
      } else {
        await exportReportCsv(exportType, filterParams);
      }
      toast.success("报表导出已开始下载");
    } catch (e) {
      toast.error(toastErrorMessage(e, "导出失败"));
    } finally {
      setExporting(false);
    }
  }, [exportType, exportMode, filterParams]);

  const openCoverPreview = (url: unknown) => {
    const source = String(url ?? "").trim();
    if (!source) {
      toast.error("封面图地址为空");
      return;
    }
    setPreviewImageUrl(source);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-5">
      <ReportPageHeader
        title={title}
        description={description}
        exporting={exporting}
        onExport={exportType ? handleExport : undefined}
      />

      {filterProfile !== "none" ? (
        <div className="space-y-2">
          <ReportFilterBar
            filterProfile={filterProfile}
            enabledFilters={enabledFilters}
            supportsGranularity={supportsGranularity}
            categoryOptions={categoryOptions}
          />
          <AdminFilterSummaryBar
            chips={filterChips}
            onClearAll={handleClearFilters}
            onRemove={handleRemoveFilterChip}
          />
        </div>
      ) : null}

      <ReportAlertBanners alerts={alerts} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--theme-text)]">核心指标</h2>
        <ReportKpiGrid
          loading={loading}
          entries={kpiEntries}
          formatValue={formatCellValue}
          skeletonCount={kpiProfile === "profit" ? (summaryPriorityKeys?.length ?? 9) : 6}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--theme-text)]">明细数据</h2>
        <AnimatedTable
          loading={loading}
          rows={list}
          rowKey={(row) => String(list.indexOf(row))}
          skeletonRows={8}
          skeletonCols={Math.max(columns.length, 5)}
          className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-0 overflow-auto"
          tableClassName="w-full min-w-[720px] table-fixed text-[13px] leading-snug"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-surface)]"
          thead={(
            <tr>
              {columns.map((k) => {
                const sticky = stickyKeys.has(k);
                return (
                  <th
                    key={k}
                    className={reportTableHeadCellClass(sticky)}
                    style={{
                      ...getReportColumnMaxWidthStyle(k),
                      ...getReportStickyCellStyle(k, columns, stickyKeys),
                    }}
                  >
                    {labelReportColumn(k)}
                  </th>
                );
              })}
            </tr>
          )}
          emptyIcon={emptyGuide.icon}
          emptyTitle={emptyGuide.title}
          emptyDescription={emptyGuide.description}
          emptyAction={(
            <AdminEmptyGuideActions
              guide={emptyGuide}
              showClearFilters={filtersActive}
              onClearFilters={handleClearFilters}
            />
          )}
          renderRow={(row) => (
            <>
              {columns.map((k) => {
                const display = formatCellValue(k, row[k]);
                const sticky = stickyKeys.has(k);
                return (
                  <td
                    key={k}
                    className={reportTableBodyCellClass(sticky)}
                    style={{
                      ...getReportColumnMaxWidthStyle(k),
                      ...getReportStickyCellStyle(k, columns, stickyKeys),
                    }}
                  >
                    {k === "cover_image" ? (
                      <button
                        type="button"
                        className="inline-flex h-8 items-center rounded-md border border-[var(--theme-border)] bg-transparent px-2.5 text-[13px] text-foreground hover:bg-secondary"
                        onClick={() => openCoverPreview(row[k])}
                      >
                        查看图片
                      </button>
                    ) : (
                      <AdminTableCell
                        value={display}
                        columnKey={k}
                        fullText={display === "-" ? "" : display}
                      />
                    )}
                  </td>
                );
              })}
            </>
          )}
        />
      </section>

      <AdminResponsiveSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="封面图预览"
        size="xl"
      >
        <div className="overflow-auto rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-2">
          {previewImageUrl ? (
            <img src={previewImageUrl} alt="封面图预览" className="mx-auto max-h-[65vh] w-auto max-w-full object-contain" />
          ) : (
            <p className="text-sm text-[var(--theme-text-muted)]">暂无可预览图片</p>
          )}
        </div>
      </AdminResponsiveSheet>
    </div>
  );
}
