import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ReportFilterBar from "@/components/admin/report/ReportFilterBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { getReportColumnMaxWidthStyle, reportTableThClassName } from "@/utils/adminTableColumnPolicy";
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

function hasValue(rows: Record<string, unknown>[], key: string) {
  return rows.some((row) => {
    const value = row[key];
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
}

type Props = {
  title: string;
  fetcher: (params: Record<string, string>) => Promise<Record<string, unknown>>;
};

function searchParamsRecord(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export default function AdminReportGenericPage({ title, fetcher }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const filterParams = useMemo(() => searchParamsRecord(searchParams), [searchParams]);

  const reportQuery = useQuery({
    queryKey: adminQueryKeys.report(title, filterParams),
    queryFn: () => fetcher(filterParams),
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
  const summary = (payload.summary || {}) as Record<string, unknown>;
  const columns = useMemo(() => {
    if (list.length === 0) return ["col1", "col2", "col3", "col4", "col5"];
    const keys = Object.keys(list[0]);
    const hidden = new Set<string>([
      "parent_category_id",
      "parent_category_name",
      "category_name",
      "category_id",
      "product_id",
      "order_id",
      "user_id",
      "activity_id",
      "coupon_id",
    ]);

    const preferMap: Array<[string, string]> = [
      ["category_path", "category_id"],
      ["category_name", "category_id"],
      ["product_name", "product_id"],
      ["order_no", "order_id"],
      ["nickname", "user_id"],
      ["phone", "user_id"],
      ["activity_title", "activity_id"],
      ["coupon_title", "coupon_id"],
    ];
    for (const [preferField, idField] of preferMap) {
      if (hasValue(list, preferField)) hidden.add(idField);
    }

    const result = keys.filter((k) => !hidden.has(k));
    if (hasValue(list, "category_path")) {
      const idx = result.indexOf("category_path");
      if (idx > 0) {
        result.splice(idx, 1);
        result.unshift("category_path");
      }
    }
    return result;
  }, [list]);

  const summaryEntries = Object.entries(summary).slice(0, 8);
  const filterChips = useMemo(() => buildReportFilterChips(searchParams), [searchParams]);
  const filtersActive = hasActiveReportFilters(searchParams);
  const emptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.reportDataFiltered : ADMIN_EMPTY_GUIDES.reportData;

  const handleClearFilters = () => {
    setSearchParams(clearReportFilters(), { replace: true });
  };

  const handleRemoveFilterChip = (key: string) => {
    setSearchParams(removeReportFilterChip(searchParams, key), { replace: true });
  };

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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>
      <div className="space-y-2">
        <ReportFilterBar />
        <AdminFilterSummaryBar
          chips={filterChips}
          onClearAll={handleClearFilters}
          onRemove={handleRemoveFilterChip}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 space-y-2">
                <div className="skeleton-base skeleton-shimmer h-3 w-16 rounded" />
                <div className="skeleton-base skeleton-shimmer h-6 w-24 rounded" />
              </div>
            ))
          : summaryEntries.map(([k, v]) => {
              const summaryDisplay = formatCellValue(k, v);
              return (
                <div key={k} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
                  <p className="text-xs text-[var(--theme-text-muted)]">{labelReportColumn(k)}</p>
                  <div className="mt-1 text-lg font-bold text-[var(--theme-text)]">
                    <AdminTableCell
                      value={summaryDisplay}
                      columnKey={k}
                      fullText={summaryDisplay === "-" ? "" : String(summaryDisplay)}
                    />
                  </div>
                </div>
              );
            })}
      </div>
      <AnimatedTable
        loading={loading}
        rows={list}
        rowKey={(row) => String(list.indexOf(row))}
        skeletonRows={8}
        skeletonCols={columns.length}
        className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-0 overflow-auto"
        tableClassName="w-full min-w-[720px] table-fixed text-xs"
        theadClassName="border-b border-[var(--theme-border)]"
        thead={(
          <tr>
            {columns.map((k) => (
              <th key={k} className={reportTableThClassName(k)} style={getReportColumnMaxWidthStyle(k)}>
                {labelReportColumn(k)}
              </th>
            ))}
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
              return (
                <td
                  key={k}
                  className="max-w-0 px-2 py-2 align-middle"
                  style={getReportColumnMaxWidthStyle(k)}
                >
                  {k === "cover_image" ? (
                    <button
                      type="button"
                      className="inline-flex h-7 items-center rounded-md border border-[var(--theme-border)] bg-transparent px-2 text-xs text-foreground hover:bg-secondary"
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
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>封面图预览</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2">
            {previewImageUrl ? (
              <img src={previewImageUrl} alt="封面图预览" className="mx-auto max-h-[65vh] w-auto max-w-full object-contain" />
            ) : (
              <p className="text-sm text-[var(--theme-text-muted)]">暂无可预览图片</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
