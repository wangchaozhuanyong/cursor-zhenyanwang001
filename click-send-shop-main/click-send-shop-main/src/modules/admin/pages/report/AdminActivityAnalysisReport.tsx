import { REPORT_PAGES } from "@/config/reportPageConfig";
import { fetchActivityAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminActivityAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_PAGES.activity_analysis} fetcher={fetchActivityAnalysisReport as never} />;
}
