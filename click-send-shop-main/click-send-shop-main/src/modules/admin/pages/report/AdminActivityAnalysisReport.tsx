import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchActivityAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminActivityAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.activity_analysis} fetcher={fetchActivityAnalysisReport as never} />;
}
