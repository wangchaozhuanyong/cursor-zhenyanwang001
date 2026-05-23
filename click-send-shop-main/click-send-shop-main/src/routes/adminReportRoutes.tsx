import { Navigate, Route, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { SiteCapabilities } from "@/types/siteCapabilities";
import { REPORT_REGISTRY, type ReportRegistryItem } from "@/modules/admin/pages/report/reportRegistry";
import {
  AdminActivityAnalysisReport,
  AdminCategoryAnalysisReport,
  AdminCouponAnalysisReport,
  AdminCustomerAnalysisReport,
  AdminExportCenter,
  AdminInventoryAnalysisReport,
  AdminOperatingExpenses,
  AdminOrderAnalysisReport,
  AdminProductAnalysisReport,
  AdminProfitDailyReport,
  AdminReportOverview,
  AdminReports,
  AdminSalesDailyReport,
  AdminSalesMonthlyReport,
  AdminSearchAnalysisReport,
  AdminTrafficAnalysisReport,
} from "@/routes/adminLazyPages";

function AdminReportUnavailable() {
  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 text-sm text-[var(--theme-text-muted)]">
      该报表对应的功能开关已关闭，暂不可访问。
    </div>
  );
}

function ReportCapabilityRoute({ report, capabilities, children }: { report: ReportRegistryItem; capabilities: SiteCapabilities; children: ReactNode }) {
  if (report.capability && !capabilities[report.capability]) {
    return <AdminReportUnavailable />;
  }
  return <>{children}</>;
}

function relativeAdminPath(path: string) {
  return path.replace(/^\/admin\/?/, "");
}

function ProfitLegacyRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const target = params.get("profit_period") === "monthly"
    ? "/admin/reports/profit/monthly"
    : "/admin/reports/profit/daily";
  params.delete("profit_period");
  const query = params.toString();
  return <Navigate to={`${target}${query ? `?${query}` : ""}`} replace />;
}

function LegacyReportRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search || ""}`} replace />;
}

const REPORT_ELEMENTS: Record<string, ReactNode> = {
  overview: <AdminReportOverview />,
  sales_daily: <AdminSalesDailyReport />,
  sales_monthly: <AdminSalesMonthlyReport />,
  profit_daily: <AdminProfitDailyReport />,
  profit_monthly: <AdminProfitDailyReport />,
  operating_expenses: <AdminOperatingExpenses />,
  product_analysis: <AdminProductAnalysisReport />,
  category_analysis: <AdminCategoryAnalysisReport />,
  inventory_analysis: <AdminInventoryAnalysisReport />,
  order_analysis: <AdminOrderAnalysisReport />,
  customer_analysis: <AdminCustomerAnalysisReport />,
  activity_analysis: <AdminActivityAnalysisReport />,
  coupon_analysis: <AdminCouponAnalysisReport />,
  search_analysis: <AdminSearchAnalysisReport />,
  traffic_analysis: <AdminTrafficAnalysisReport />,
};

export function renderAdminReportRoutes(capabilities: SiteCapabilities) {
  return (
    <>
      <Route path="reports" element={<AdminReports />} />
      {REPORT_REGISTRY.map((report) => {
        const element = REPORT_ELEMENTS[report.key];
        if (!element) return null;
        return (
          <Route
            key={report.key}
            path={relativeAdminPath(report.routePath)}
            element={<ReportCapabilityRoute report={report} capabilities={capabilities}>{element}</ReportCapabilityRoute>}
          />
        );
      })}
      {REPORT_REGISTRY.flatMap((report) =>
        report.legacyPaths
          .filter((path) => path !== "/admin/reports/profit")
          .map((path) => (
            <Route
              key={`${report.key}-${path}`}
              path={relativeAdminPath(path)}
              element={<LegacyReportRedirect to={report.routePath} />}
            />
          )),
      )}
      <Route path="reports/profit" element={<ProfitLegacyRedirect />} />
      <Route path="exports" element={<AdminExportCenter />} />
    </>
  );
}
