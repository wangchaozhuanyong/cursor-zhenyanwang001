import { REPORT_PAGES } from "@/config/reportPageConfig";
import { fetchProductAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminProductAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_PAGES.product_analysis} fetcher={fetchProductAnalysisReport as never} />;
}
