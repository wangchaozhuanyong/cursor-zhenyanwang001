import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchProfitDailyReport, fetchProfitMonthlyReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type ProfitPeriod = "daily" | "monthly";

export default function AdminProfitDailyReport() {
  const { tText } = useAdminT();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const period: ProfitPeriod = location.pathname.endsWith("/monthly") || searchParams.get("profit_period") === "monthly" ? "monthly" : "daily";

  const setPeriod = useCallback(
    (next: ProfitPeriod) => {
      const params = new URLSearchParams(searchParams);
      params.delete("profit_period");
      const query = params.toString();
      navigate(`/admin/reports/profit/${next}${query ? `?${query}` : ""}`, { replace: true });
    },
    [navigate, searchParams],
  );

  const config = useMemo(
    () => ({
      ...(period === "monthly" ? REPORT_REGISTRY_BY_KEY.profit_monthly : REPORT_REGISTRY_BY_KEY.profit_daily),
      title: period === "monthly" ? "利润月报" : "利润日报",
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

  const periodToggle = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[var(--theme-text-muted)]"><Tx>统计粒度</Tx></span>
      <div className="inline-flex rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-0.5">
        {(
          [
            { id: "daily" as const, label: tText("按日") },
            { id: "monthly" as const, label: tText("按月") },
          ] as const
        ).map((item) => (
          <UnifiedButton
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
          </UnifiedButton>
        ))}
      </div>
    </div>
  );

  return <AdminReportGenericPage config={config} fetcher={fetcher} filterPrefix={periodToggle} />;
}
