import { REPORT_PAGES } from "@/config/reportPageConfig";
import { fetchOrderAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminOrderAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_PAGES.order_analysis} fetcher={fetchOrderAnalysisReport as never} />;
}
