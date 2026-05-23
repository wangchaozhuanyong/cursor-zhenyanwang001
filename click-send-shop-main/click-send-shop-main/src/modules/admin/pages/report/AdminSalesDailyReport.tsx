import { REPORT_PAGES } from "@/config/reportPageConfig";
import { fetchSalesDailyReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminSalesDailyReport() {
  return <AdminReportGenericPage config={REPORT_PAGES.sales_daily} fetcher={fetchSalesDailyReport as never} />;
}
