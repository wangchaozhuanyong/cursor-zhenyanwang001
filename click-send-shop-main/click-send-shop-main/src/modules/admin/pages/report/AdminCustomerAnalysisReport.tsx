import { REPORT_PAGES } from "@/config/reportPageConfig";
import { fetchCustomerAnalysisReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminCustomerAnalysisReport() {
  return <AdminReportGenericPage config={REPORT_PAGES.customer_analysis} fetcher={fetchCustomerAnalysisReport as never} />;
}
