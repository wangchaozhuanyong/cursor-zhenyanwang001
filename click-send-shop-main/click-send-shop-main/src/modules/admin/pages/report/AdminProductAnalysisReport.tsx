import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchProductAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminProductAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.product_analysis} fetcher={fetchProductAnalysisReport as never} />;
}
