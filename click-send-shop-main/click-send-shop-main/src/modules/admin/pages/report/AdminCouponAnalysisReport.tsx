import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchCouponAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminCouponAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.coupon_analysis} fetcher={fetchCouponAnalysisReport as never} />;
}
