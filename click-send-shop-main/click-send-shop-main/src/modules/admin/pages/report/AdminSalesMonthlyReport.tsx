import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchSalesMonthlyReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminSalesMonthlyReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.sales_monthly} fetcher={fetchSalesMonthlyReport as never} />;
}
