import { REPORT_PAGES } from "@/config/reportPageConfig";
import { fetchCategoryAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminCategoryAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_PAGES.category_analysis} fetcher={fetchCategoryAnalysisReport as never} />;
}
