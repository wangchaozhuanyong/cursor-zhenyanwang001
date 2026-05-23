import { REPORT_PAGES } from "@/config/reportPageConfig";
import { fetchSalesMonthlyReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminSalesMonthlyReport() {
  return <AdminReportGenericPage config={REPORT_PAGES.sales_monthly} fetcher={fetchSalesMonthlyReport as never} />;
}
