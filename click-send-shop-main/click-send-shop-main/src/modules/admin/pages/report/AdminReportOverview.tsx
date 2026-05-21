import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReportFilterBar from "@/components/admin/report/ReportFilterBar";
import { fetchReportOverview } from "@/services/admin/reportService";
import { toast } from "sonner";
import { Tx } from "@/components/admin/AdminText";
import { toastErrorMessage } from "@/utils/errorMessage";
import { adminQueryKeys } from "@/lib/adminQueryKeys";

export default function AdminReportOverview() {
  const [searchParams] = useSearchParams();

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      params[k] = v;
    });
    return params;
  }, [searchParams]);

  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.reportOverview(queryParams),
    queryFn: () => fetchReportOverview(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const data = overviewQuery.data ?? {};
  const loading = overviewQuery.isLoading && !overviewQuery.data;

  const summary = useMemo(() => (data.summary || {}) as unknown as Record<string, unknown>, [data]);
  const topHot = useMemo(() => (Array.isArray(data.topHotProducts) ? data.topHotProducts : []), [data]);
  const topSlow = useMemo(() => (Array.isArray(data.topSlowProducts) ? data.topSlowProducts : []), [data]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground"><Tx>经营总览</Tx></h1>
      <ReportFilterBar />
      {loading ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 space-y-2">
                <div className="skeleton-base skeleton-shimmer h-3 w-20 rounded" />
                <div className="skeleton-base skeleton-shimmer h-6 w-16 rounded" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 space-y-3">
                <div className="skeleton-base skeleton-shimmer h-4 w-32 rounded" />
                {Array.from({ length: 5 }).map((__, j) => (
                  <div key={j} className="skeleton-base skeleton-shimmer h-3 w-full rounded" />
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {Object.entries(summary).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
                <p className="text-xs text-[var(--theme-text-muted)]">{k}</p>
                <p className="mt-1 text-lg font-bold text-[var(--theme-text)]">{String(v ?? "-")}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
              <p className="mb-2 text-sm font-semibold"><Tx>热销商品 TOP 10</Tx></p>
              <div className="space-y-1 text-xs">{topHot.map((r: Record<string, unknown>, i: number) => <div key={i}>{i + 1}. {String(r.product_name || "-")} / {String(r.sales_qty || 0)}</div>)}</div>
            </div>
            <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
              <p className="mb-2 text-sm font-semibold"><Tx>滞销商品 TOP 10</Tx></p>
              <div className="space-y-1 text-xs">{topSlow.map((r: Record<string, unknown>, i: number) => <div key={i}>{i + 1}. {String(r.product_name || "-")} / {String(r.sales_qty || 0)}</div>)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
