import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchSearchAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminSearchAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.search_analysis} fetcher={fetchSearchAnalysisReport as never} />;
}
