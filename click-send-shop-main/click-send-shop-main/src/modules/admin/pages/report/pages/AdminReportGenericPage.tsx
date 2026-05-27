import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { ReportPageConfig } from "@/config/reportPageConfig";
import { fetchCategories } from "@/services/admin/categoryService";
import ReportFilterBar from "@/components/admin/report/ReportFilterBar";
import AdminPageShell from "@/components/admin/AdminPageShell";
import ReportPageHeader from "@/components/admin/report/ReportPageHeader";
import ReportKpiGrid from "@/components/admin/report/ReportKpiGrid";
import ReportAlertBanners from "@/components/admin/report/ReportAlertBanners";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { AnimatedTable } from "@/modules/micro-interactions";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
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
import { useAdminReportLabel } from "@/hooks/useAdminReportLabel";
import { useAdminT } from "@/hooks/useAdminT";
import { Tx } from "@/components/admin/AdminText";
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

type Props = {
  config: ReportPageConfig;
  fetcher: (params: Record<string, string>) => Promise<Record<string, unknown>>;
  /** 覆盖 config.summaryPriorityKeys */
  summaryPriorityKeys?: string[];
  /** 覆盖 config.summaryMaxCards；0 表示不截断 */
  summaryMaxCards?: number;
  /** 插在筛选条之前的附加控件（如利润报表日/月切换） */
  filterPrefix?: ReactNode;
};

export default function AdminReportGenericPage({
  config,
  fetcher,
  summaryPriorityKeys: summaryPriorityKeysProp,
  summaryMaxCards: summaryMaxCardsProp,
  filterPrefix,
}: Props) {
  const { tText } = useAdminT();
  const { column: labelReportColumn, cell: labelReportCell } = useAdminReportLabel();
  const {
    title,
    description,
    exportType,
    exportMode,
    filterProfile,
    filters,
    supportsGranularity,
    kpiProfile,
    maxKpis,
    reportKey,
    columns: configuredColumns,
    dataScopeNote,
    kpiPriorityKeys,
    summaryPriorityKeys: summaryPriorityKeysConfig,
    summaryMaxCards: summaryMaxCardsConfig,
  } = config;
  const summaryPriorityKeys = summaryPriorityKeysProp ?? summaryPriorityKeysConfig ?? kpiPriorityKeys;
  const summaryMaxCards =
    summaryMaxCardsProp ?? summaryMaxCardsConfig ?? (summaryPriorityKeys?.length ? 0 : (maxKpis ?? 8));

  const formatCellValueLocalized = useCallback(
    (key: string, value: unknown) => {
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
      return labelReportCell(key, value);
    },
    [labelReportCell],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const enabledFilters = useMemo(
    () => filters ?? getEnabledFilters(filterProfile, { supportsGranularity }),
    [filterProfile, filters, supportsGranularity],
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
  const payload = useMemo(
    () => (reportQuery.data ?? {}) as Record<string, unknown>,
    [reportQuery.data],
  );

  useEffect(() => {
    if (reportQuery.isError) {
      toast.error(toastErrorMessage(reportQuery.error, "加载报表失败"));
    }
  }, [reportQuery.isError, reportQuery.error]);

  const list = useMemo(
    () => (Array.isArray(payload.list) ? (payload.list as Record<string, unknown>[]) : []),
    [payload.list],
  );
  const summary = useMemo(
    () => (payload.summary || {}) as Record<string, unknown>,
    [payload.summary],
  );

  const hideActivitySalesMetrics = reportKey === "activity_analysis" && payload.sales_tracking_available === false;

  const { columns, stickyKeys } = useMemo(() => {
    if (configuredColumns?.length && list.length > 0) {
      const available = new Set(Object.keys(list[0]));
      const visibleColumns = configuredColumns.filter((key) => available.has(key));
      if (visibleColumns.length > 0) {
        const fallback = buildReportTableColumns(list, { hideActivitySalesMetrics });
        const columns = hideActivitySalesMetrics
          ? visibleColumns.filter((key) => fallback.columns.includes(key))
          : visibleColumns;
        return { columns, stickyKeys: fallback.stickyKeys };
      }
    }
    return buildReportTableColumns(list, { hideActivitySalesMetrics });
  }, [configuredColumns, hideActivitySalesMetrics, list]);

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
  const emptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.reportDataFiltered : ADMIN_EMPTY_GUIDES.reportData,
  );
  const summaryOnly = list.length === 0 && Object.keys(summary).length > 0;

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
      toast.success(tText("报表导出已开始下载"));
    } catch (e) {
      toast.error(toastErrorMessage(e, tText("导出失败")));
    } finally {
      setExporting(false);
    }
  }, [exportType, exportMode, filterParams, tText]);

  const renderMobileCard = (row: Record<string, unknown>) => {
    const titleKey = columns.find((k) => stickyKeys.has(k)) ?? columns[0];
    const title = titleKey ? formatCellValueLocalized(titleKey, row[titleKey]) : "-";
    const fieldKeys = columns.filter((k) => k !== titleKey && k !== "cover_image").slice(0, 6);
    return (
      <AdminTableMobileCard>
        <p className="mb-2 text-sm font-semibold">{title}</p>
        <div className="space-y-2">
          {fieldKeys.map((k) => (
            <AdminTableMobileCardField key={k} label={labelReportColumn(k)}>
              <span className="text-xs text-muted-foreground">{formatCellValueLocalized(k, row[k])}</span>
            </AdminTableMobileCardField>
          ))}
        </div>
        {columns.includes("cover_image") ? (
          <div className="mt-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => openCoverPreview(row.cover_image)}
              className="touch-manipulation w-full rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary"
            >
              <Tx>查看图片</Tx>
            </button>
          </div>
        ) : null}
      </AdminTableMobileCard>
    );
  };

  const openCoverPreview = (url: unknown) => {
    const source = String(url ?? "").trim();
    if (!source) {
      toast.error(tText("封面图地址为空"));
      return;
    }
    setPreviewImageUrl(source);
    setPreviewOpen(true);
  };

  return (
    <AdminPageShell
      hint={tText(description)}
      toolbar={(
        <ReportPageHeader
          compact
          title={title}
          description={description}
          exporting={exporting}
          onExport={exportType ? handleExport : undefined}
        />
      )}
      filters={filterProfile !== "none" || filterPrefix ? (
        <div className="space-y-2">
          {filterPrefix}
          {filterProfile !== "none" ? (
            <>
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
            </>
          ) : null}
        </div>
      ) : null}
    >
      <ReportAlertBanners alerts={alerts} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--theme-text)]"><Tx>核心指标</Tx></h2>
        <ReportKpiGrid
          loading={loading}
          entries={kpiEntries}
          formatValue={formatCellValueLocalized}
          skeletonCount={kpiProfile === "profit" ? (summaryPriorityKeys?.length ?? 9) : 6}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--theme-text)]"><Tx>明细数据</Tx></h2>
        {summaryOnly ? (
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-5 text-sm text-[var(--theme-text-muted)]">
            <Tx>该报表当前仅展示汇总指标。</Tx>
          </div>
        ) : (
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
                      className={reportTableHeadCellClass(sticky, k)}
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
            renderMobileCard={renderMobileCard}
            renderRow={(row) => (
              <>
                {columns.map((k) => {
                  const display = formatCellValueLocalized(k, row[k]);
                  const sticky = stickyKeys.has(k);
                  return (
                    <td
                      key={k}
                      className={reportTableBodyCellClass(sticky, k)}
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
        )}
      </section>

      {dataScopeNote ? (
        <section className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm text-[var(--theme-text-muted)]">
          <span className="font-medium text-[var(--theme-text)]"><Tx>数据口径：</Tx></span>{dataScopeNote}
        </section>
      ) : null}

      <AdminResponsiveSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={tText("封面图预览")}
        size="xl"
      >
        <div className="overflow-auto rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-2">
          {previewImageUrl ? (
            <img src={previewImageUrl} alt="封面图预览" className="mx-auto max-h-[65vh] w-auto max-w-full object-contain" />
          ) : (
            <p className="text-sm text-[var(--theme-text-muted)]"><Tx>暂无可预览图片</Tx></p>
          )}
        </div>
      </AdminResponsiveSheet>
    </AdminPageShell>
  );
}
