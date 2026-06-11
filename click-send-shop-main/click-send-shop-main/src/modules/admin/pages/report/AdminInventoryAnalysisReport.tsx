import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AnimatedTable } from "@/modules/micro-interactions";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { useAdminReportLabel } from "@/hooks/useAdminReportLabel";
import { useLocalizedOptions } from "@/hooks/useLocalizedOptions";
import { getReportColumnMaxWidthStyle } from "@/utils/adminTableColumnPolicy";
import {
  reportTableBodyCellClass,
  reportTableHeadCellClass,
} from "@/utils/reportTableColumns";
import ReportPageHeader from "@/components/admin/report/ReportPageHeader";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { exportReportCsv, fetchInventoryAnalysisReport } from "@/services/admin/reportService";
import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

const TABLE_COLUMNS = [
  "product_name",
  "current_stock",
  "warning_stock",
  "sales_7d",
  "sales_30d",
  "avg_daily_sales",
  "available_stock_days",
  "stock_status",
] as const;

const SORT_OPTIONS = [
  { value: "available_stock_days", label: "可售天数" },
  { value: "current_stock", label: "当前库存" },
  { value: "sales_30d", label: "近30天销量" },
  { value: "sales_7d", label: "近7天销量" },
  { value: "product_name", label: "商品名称" },
] as const;

const STATUS_BADGE_CLASS: Record<string, string> = {
  out_of_stock: "bg-red-100 text-red-800",
  low_stock: "bg-amber-100 text-amber-800",
  slow_moving: "bg-slate-200 text-slate-700",
  normal: "bg-emerald-100 text-emerald-800",
};

function searchParamsRecord(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

function formatNumber(value: unknown, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return digits > 0 ? n.toFixed(digits) : String(Math.round(n));
}

export default function AdminInventoryAnalysisReport() {
  const { tText } = useAdminT();
  const { column: labelReportColumn, cell: labelReportCell } = useAdminReportLabel();
  const sortOptions = useLocalizedOptions([...SORT_OPTIONS]);

  const formatCell = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return "-";
    if (key === "stock_status") return labelReportCell(key, value);
    if (key === "product_name") return String(value);
    if (key === "avg_daily_sales") return formatNumber(value, 2);
    if (key === "available_stock_days") return formatNumber(value, 1);
    if (key.endsWith("_stock") || key.endsWith("_7d") || key.endsWith("_30d")) return formatNumber(value);
    return String(value);
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const filterParams = useMemo(() => searchParamsRecord(searchParams), [searchParams]);
  const config = REPORT_REGISTRY_BY_KEY.inventory_analysis;

  const sortBy = filterParams.sort_by || "available_stock_days";
  const sortOrder = filterParams.sort_order || "asc";

  const reportQuery = useQuery({
    queryKey: adminQueryKeys.report("库存分析", filterParams),
    queryFn: () => fetchInventoryAnalysisReport(filterParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const loading = reportQuery.isLoading && !reportQuery.data;
  const payload = reportQuery.data ?? {};

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

  const summaryEntries = useMemo(() => {
    const keys = ["商品数", "缺货商品", "低库存商品", "滞销商品", "当前库存总量", "近7天销量", "近30天销量"];
    return keys.filter((key) => summary[key] !== undefined).map((key) => [key, summary[key]] as const);
  }, [summary]);

  const emptyGuide = useLocalizedAdminEmptyGuide(ADMIN_EMPTY_GUIDES.reportData);

  const updateSort = (nextSortBy: string, nextSortOrder: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("sort_by", nextSortBy);
    next.set("sort_order", nextSortOrder);
    setSearchParams(next, { replace: true });
  };

  const handleExport = async () => {
    if (!config.exportType) return;
    setExporting(true);
    try {
      await exportReportCsv(config.exportType, filterParams);
      toast.success(tText("报表导出已开始下载"));
    } catch (e) {
      toast.error(toastErrorMessage(e, "导出失败"));
    } finally {
      setExporting(false);
    }
  };

  const renderMobileCard = (row: Record<string, unknown>) => {
    const status = String(row.stock_status || "normal");
    const statusLabel = formatCell("stock_status", status);
    return (
      <AdminTableMobileCard>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{formatCell("product_name", row.product_name)}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.normal}`}>
            {statusLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {(["current_stock", "warning_stock", "sales_7d", "sales_30d", "avg_daily_sales", "available_stock_days"] as const).map((key) => (
            <AdminTableMobileCardField key={key} label={labelReportColumn(key)}>
              <span className="text-xs text-foreground">{formatCell(key, row[key])}</span>
            </AdminTableMobileCardField>
          ))}
        </div>
      </AdminTableMobileCard>
    );
  };

  return (
    <AdminPageShell
      hint={<Tx>{config.description}</Tx>}
      toolbar={config.exportType ? (
        <ReportPageHeader
          compact
          title={config.title}
          description={config.description}
          exporting={exporting}
          onExport={handleExport}
        />
      ) : undefined}
      filters={(
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          排序字段
          <select
            className="min-h-[40px] rounded-lg border border-[var(--theme-border)] bg-background px-3 py-2 text-sm text-foreground"
            value={sortBy}
            onChange={(e) => updateSort(e.target.value, sortOrder)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          排序方向
          <select
            className="min-h-[40px] rounded-lg border border-[var(--theme-border)] bg-background px-3 py-2 text-sm text-foreground"
            value={sortOrder}
            onChange={(e) => updateSort(sortBy, e.target.value)}
          >
            <option value="asc"><Tx>升序</Tx></option>
            <option value="desc"><Tx>降序</Tx></option>
          </select>
        </label>
        </div>
      )}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 space-y-2">
                <div className="skeleton-base skeleton-shimmer h-3 w-16 rounded" />
                <div className="skeleton-base skeleton-shimmer h-6 w-24 rounded" />
              </div>
            ))
          : summaryEntries.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
                <p className="text-xs text-[var(--theme-text-muted)]">{key}</p>
                <div className="mt-1 text-lg font-bold text-[var(--theme-text)]">{formatCell(key, value)}</div>
              </div>
            ))}
      </div>

      <AnimatedTable
        loading={loading}
        rows={list}
        rowKey={(row) => `${String(row.product_name || "product")}-${String(row.current_stock ?? 0)}`}
        skeletonRows={8}
        skeletonCols={TABLE_COLUMNS.length}
        className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-0 overflow-auto"
        tableClassName="w-full min-w-[960px] table-fixed text-xs"
        theadClassName="border-b border-[var(--theme-border)]"
        thead={(
          <tr>
            {TABLE_COLUMNS.map((key) => (
              <th key={key} className={reportTableHeadCellClass(false, key)} style={getReportColumnMaxWidthStyle(key)}>
                {labelReportColumn(key)}
              </th>
            ))}
          </tr>
        )}
        emptyIcon={emptyGuide.icon}
        emptyTitle={emptyGuide.title}
        emptyDescription={emptyGuide.description}
        renderMobileCard={renderMobileCard}
        renderRow={(row) => (
          <>
            {TABLE_COLUMNS.map((key) => {
              if (key === "stock_status") {
                const status = String(row.stock_status || "normal");
                const label = formatCell(key, status);
                return (
                  <td key={key} className={reportTableBodyCellClass(false, key)}>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.normal}`}>
                      {label}
                    </span>
                  </td>
                );
              }
              const display = formatCell(key, row[key]);
              return (
                <td key={key} className={reportTableBodyCellClass(false, key)}>
                  <AdminTableCell value={display} columnKey={key} fullText={display === "-" ? "" : display} />
                </td>
              );
            })}
          </>
        )}
      />

      <section className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm text-[var(--theme-text-muted)]">
        <span className="font-medium text-[var(--theme-text)]"><Tx>数据口径：</Tx></span>{config.dataScopeNote}
      </section>
    </AdminPageShell>
  );
}
