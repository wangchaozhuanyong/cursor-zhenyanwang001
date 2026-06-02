import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { SiteCapabilities } from "@/types/siteCapabilities";
import type { ReportRegistryItem } from "@/modules/admin/pages/report/reportRegistry";

export function AdminReportUnavailable() {
  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 text-sm text-[var(--theme-text-muted)]">
      该报表对应的功能开关已关闭，暂不可访问。
    </div>
  );
}

export function ReportCapabilityRoute({
  report,
  capabilities,
  children,
}: {
  report: ReportRegistryItem;
  capabilities: SiteCapabilities;
  children: ReactNode;
}) {
  if (report.capability && !capabilities[report.capability]) {
    return <AdminReportUnavailable />;
  }
  return <>{children}</>;
}

/**
 * @deprecated Compatibility redirect for old /admin/reports/profit links.
 * Keep until production access logs show no hits for at least 30 days.
 */
export function ProfitLegacyRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const target = params.get("profit_period") === "monthly"
    ? "/admin/reports/profit/monthly"
    : "/admin/reports/profit/daily";
  params.delete("profit_period");
  const query = params.toString();
  return <Navigate to={`${target}${query ? `?${query}` : ""}`} replace />;
}

/**
 * @deprecated Compatibility redirect for legacy report URLs declared in reportRegistry.
 * Keep until production access logs show no hits for at least 30 days.
 */
export function LegacyReportRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search || ""}`} replace />;
}
