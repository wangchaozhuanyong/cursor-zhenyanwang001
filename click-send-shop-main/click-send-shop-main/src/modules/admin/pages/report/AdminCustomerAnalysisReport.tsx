import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchCustomerAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminCustomerAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.customer_analysis} fetcher={fetchCustomerAnalysisReport as never} />;
}
