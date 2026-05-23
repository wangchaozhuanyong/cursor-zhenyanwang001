import { REPORT_PAGES } from "@/config/reportPageConfig";
import { fetchCouponAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminCouponAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_PAGES.coupon_analysis} fetcher={fetchCouponAnalysisReport as never} />;
}
