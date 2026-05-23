import { useCallback, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { REPORT_PAGES } from "@/config/reportPageConfig";
import ReportFilterBar from "@/components/admin/report/ReportFilterBar";
import ReportPageHeader from "@/components/admin/report/ReportPageHeader";
import ReportKpiGrid from "@/components/admin/report/ReportKpiGrid";
import ReportAlertBanners from "@/components/admin/report/ReportAlertBanners";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { fetchReportOverview } from "@/services/admin/reportService";
import { toast } from "sonner";
import { Tx } from "@/components/admin/AdminText";
import { toastErrorMessage } from "@/utils/errorMessage";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminReportLabel } from "@/hooks/useAdminReportLabel";
import {
  buildReportFilterChips,
  clearReportFilters,
  removeReportFilterChip,
} from "@/utils/adminReportFilters";
import { getEnabledFilters, pickReportQueryParams, sanitizeReportSearchParams } from "@/utils/reportFilters";
import { buildReportAlerts, pickSummaryKpiEntries } from "@/utils/reportSummaryKpi";
import { useAdminT } from "@/hooks/useAdminT";

const OVERVIEW_CONFIG = REPORT_PAGES.overview;
const EMPTY_REPORT_OVERVIEW = {};

export default function AdminReportOverview() {
  const { cell: labelReportCell } = useAdminReportLabel();
  const formatOverviewValue = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return "-";
    return labelReportCell(key, value);
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const enabledFilters = useMemo(
    () => OVERVIEW_CONFIG.filters ?? getEnabledFilters(OVERVIEW_CONFIG.filterProfile),
    [],
  );

  const sanitizedOnce = useRef(false);
  useEffect(() => {
    if (sanitizedOnce.current) return;
    sanitizedOnce.current = true;
    const sanitized = sanitizeReportSearchParams(searchParams, enabledFilters);
    if (searchParams.toString() !== sanitized.toString()) {
      setSearchParams(sanitized, { replace: true });
    }
  }, [enabledFilters, searchParams, setSearchParams]);

  const queryParams = useMemo(() => {
    const raw: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      raw[k] = v;
    });
    return pickReportQueryParams(raw, enabledFilters);
  }, [searchParams, enabledFilters]);

  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.reportOverview(queryParams),
    queryFn: () => fetchReportOverview(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const data = overviewQuery.data ?? EMPTY_REPORT_OVERVIEW;
  const loading = overviewQuery.isLoading && !overviewQuery.data;

  const summary = useMemo(() => (data.summary || {}) as Record<string, unknown>, [data]);
  const topHot = useMemo(() => (Array.isArray(data.topHotProducts) ? data.topHotProducts : []), [data]);
  const topSlow = useMemo(() => (Array.isArray(data.topSlowProducts) ? data.topSlowProducts : []), [data]);

  const kpiEntries = useMemo(
    () => pickSummaryKpiEntries(summary, OVERVIEW_CONFIG.kpiProfile, OVERVIEW_CONFIG.maxKpis, OVERVIEW_CONFIG.kpiPriorityKeys),
    [summary],
  );

  const filterChips = useMemo(
    () => buildReportFilterChips(searchParams, enabledFilters),
    [searchParams, enabledFilters],
  );
  const alerts = useMemo(
    () => buildReportAlerts(OVERVIEW_CONFIG.reportKey, data as Record<string, unknown>, summary, []),
    [data, summary],
  );

  const handleClearFilters = useCallback(() => {
    setSearchParams(clearReportFilters(enabledFilters), { replace: true });
  }, [enabledFilters, setSearchParams]);

  const handleRemoveFilterChip = useCallback((key: string) => {
    setSearchParams(removeReportFilterChip(searchParams, key, enabledFilters), { replace: true });
  }, [searchParams, enabledFilters, setSearchParams]);

  useEffect(() => {
    if (overviewQuery.isError) {
      toast.error(toastErrorMessage(overviewQuery.error, "加载经营总览失败"));
    }
  }, [overviewQuery.isError, overviewQuery.error]);

  return (
    <div className="space-y-5">
      <ReportPageHeader
        title={OVERVIEW_CONFIG.title}
        description={OVERVIEW_CONFIG.description}
      />

      <div className="space-y-2">
        <ReportFilterBar
          filterProfile={OVERVIEW_CONFIG.filterProfile}
          enabledFilters={enabledFilters}
        />
        <AdminFilterSummaryBar
          chips={filterChips}
          onClearAll={handleClearFilters}
          onRemove={handleRemoveFilterChip}
        />
      </div>

      <ReportAlertBanners alerts={alerts} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--theme-text)]"><Tx>核心指标</Tx></h2>
        <ReportKpiGrid
          loading={loading}
          entries={kpiEntries}
          formatValue={formatOverviewValue}
          skeletonCount={6}
        />
        <Link
          to={`/admin/reports/profit/daily?${new URLSearchParams(queryParams).toString()}`}
          className="inline-flex text-sm font-medium text-[var(--theme-primary)] hover:underline"
        >
          查看利润日报
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--theme-text)]"><Tx>商品排行</Tx></h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--theme-text)]"><Tx>热销商品 TOP 10</Tx></p>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton-base skeleton-shimmer h-4 w-full rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-[13px] text-[var(--theme-text)]">
                {topHot.map((r: Record<string, unknown>, i: number) => (
                  <div key={i} className="flex justify-between gap-2 border-b border-[var(--theme-border)]/60 pb-1.5 last:border-0">
                    <span className="truncate">{i + 1}. {String(r.product_name || "-")}</span>
                    <span className="shrink-0 text-[var(--theme-text-muted)]">{String(r.sales_qty || 0)} 件</span>
                  </div>
                ))}
                {topHot.length === 0 ? <p className="text-sm text-[var(--theme-text-muted)]"><Tx>暂无数据</Tx></p> : null}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--theme-text)]"><Tx>滞销商品 TOP 10</Tx></p>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton-base skeleton-shimmer h-4 w-full rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-[13px] text-[var(--theme-text)]">
                {topSlow.map((r: Record<string, unknown>, i: number) => (
                  <div key={i} className="flex justify-between gap-2 border-b border-[var(--theme-border)]/60 pb-1.5 last:border-0">
                    <span className="truncate">{i + 1}. {String(r.product_name || "-")}</span>
                    <span className="shrink-0 text-[var(--theme-text-muted)]">{String(r.sales_qty || 0)} 件</span>
                  </div>
                ))}
                {topSlow.length === 0 ? <p className="text-sm text-[var(--theme-text-muted)]"><Tx>暂无数据</Tx></p> : null}
              </div>
            )}
          </div>
        </div>
      </section>

      {OVERVIEW_CONFIG.dataScopeNote ? (
        <section className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm text-[var(--theme-text-muted)]">
          <span className="font-medium text-[var(--theme-text)]"><Tx>数据口径：</Tx></span>{OVERVIEW_CONFIG.dataScopeNote}
        </section>
      ) : null}
    </div>
  );
}
