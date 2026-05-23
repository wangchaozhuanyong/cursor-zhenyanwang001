import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { REPORT_PAGES } from "@/config/reportPageConfig";
import { fetchProfitDailyReport, fetchProfitMonthlyReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

type ProfitPeriod = "daily" | "monthly";

export default function AdminProfitDailyReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const period: ProfitPeriod = searchParams.get("profit_period") === "monthly" ? "monthly" : "daily";

  const setPeriod = useCallback(
    (next: ProfitPeriod) => {
      const params = new URLSearchParams(searchParams);
      if (next === "daily") params.delete("profit_period");
      else params.set("profit_period", "monthly");
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const config = useMemo(
    () => ({
      ...(period === "monthly" ? REPORT_PAGES.profit_monthly : REPORT_PAGES.profit_daily),
      title: period === "monthly" ? "利润报表 · 按月" : "利润报表 · 按日",
    }),
    [period],
  );

  const fetcher = useMemo(
    () =>
      (period === "monthly" ? fetchProfitMonthlyReport : fetchProfitDailyReport) as (
        params: Record<string, string>,
      ) => Promise<Record<string, unknown>>,
    [period],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--theme-text-muted)]">统计粒度</span>
        <div className="inline-flex rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-0.5">
          {(
            [
              { id: "daily" as const, label: "按日" },
              { id: "monthly" as const, label: "按月" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                period === item.id
                  ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <AdminReportGenericPage config={config} fetcher={fetcher} />
    </div>
  );
}
