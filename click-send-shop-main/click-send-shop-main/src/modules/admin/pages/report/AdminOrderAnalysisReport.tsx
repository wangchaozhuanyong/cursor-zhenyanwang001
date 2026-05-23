import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchOrderAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminOrderAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.order_analysis} fetcher={fetchOrderAnalysisReport as never} />;
}
