import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchCategoryAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminCategoryAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.category_analysis} fetcher={fetchCategoryAnalysisReport as never} />;
}
