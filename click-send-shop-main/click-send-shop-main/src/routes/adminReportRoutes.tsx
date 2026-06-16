import { Route } from "react-router-dom";
import type { ReactNode } from "react";
import type { SiteCapabilities } from "@/types/siteCapabilities";
import { REPORT_REGISTRY } from "@/modules/admin/pages/report/reportRegistry";
import {
  AdminActivityAnalysisReport,
  AdminCategoryAnalysisReport,
  AdminCouponAnalysisReport,
  AdminCustomerAnalysisReport,
  AdminDiscountCostReport,
  AdminExportCenter,
  AdminInventoryAnalysisReport,
  AdminInventoryOccupancyReport,
  AdminOperatingExpenses,
  AdminOrderAnalysisReport,
  AdminOrderCancelReasonReport,
  AdminPaymentFailureReport,
  AdminProductAnalysisReport,
  AdminPromotionConversionReport,
  AdminProfitDailyReport,
  AdminReportOverview,
  AdminReports,
  AdminSalesDailyReport,
  AdminSalesMonthlyReport,
  AdminSearchAnalysisReport,
  AdminTrafficAnalysisReport,
} from "@/routes/adminLazyPages";
import {
  LegacyReportRedirect,
  ProfitLegacyRedirect,
  ReportCapabilityRoute,
} from "@/routes/adminReportRouteComponents";
import { relativeAdminPath } from "@/routes/adminReportRouteUtils";

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
  promotion_conversion: <AdminPromotionConversionReport />,
  coupon_analysis: <AdminCouponAnalysisReport />,
  discount_cost: <AdminDiscountCostReport />,
  payment_failure: <AdminPaymentFailureReport />,
  inventory_occupancy: <AdminInventoryOccupancyReport />,
  order_cancel_reason: <AdminOrderCancelReasonReport />,
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
