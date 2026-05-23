import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchSalesDailyReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminSalesDailyReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.sales_daily} fetcher={fetchSalesDailyReport as never} />;
}
