import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ReportFilterBar from "@/components/admin/report/ReportFilterBar";
import { fetchReportOverview } from "@/services/admin/reportService";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";

export default function AdminReportOverview() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        searchParams.forEach((v, k) => (params[k] = v));
        const res = await fetchReportOverview(params);
        setData(res || {});
      } catch (e) {
        toast.error(toastErrorMessage(e, "加载经营总览失败"));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [searchParams]);

  const summary = useMemo(() => (data.summary || {}) as Record<string, unknown>, [data]);
  const topHot = useMemo(() => (Array.isArray(data.topHotProducts) ? data.topHotProducts : []), [data]);
  const topSlow = useMemo(() => (Array.isArray(data.topSlowProducts) ? data.topSlowProducts : []), [data]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">经营总览</h1>
      <ReportFilterBar />
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
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
              <p className="mb-2 text-sm font-semibold">热销商品 TOP 10</p>
              <div className="space-y-1 text-xs">{topHot.map((r: Record<string, unknown>, i: number) => <div key={i}>{i + 1}. {String(r.product_name || "-")} / {String(r.sales_qty || 0)}</div>)}</div>
            </div>
            <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
              <p className="mb-2 text-sm font-semibold">滞销商品 TOP 10</p>
              <div className="space-y-1 text-xs">{topSlow.map((r: Record<string, unknown>, i: number) => <div key={i}>{i + 1}. {String(r.product_name || "-")} / {String(r.sales_qty || 0)}</div>)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
