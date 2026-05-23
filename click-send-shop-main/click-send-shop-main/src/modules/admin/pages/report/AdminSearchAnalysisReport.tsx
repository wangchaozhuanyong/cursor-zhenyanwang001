import { REPORT_PAGES } from "@/config/reportPageConfig";
import { fetchSearchAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminSearchAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_PAGES.search_analysis} fetcher={fetchSearchAnalysisReport as never} />;
}
