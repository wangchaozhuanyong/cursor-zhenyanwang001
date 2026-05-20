import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchProfitDailyReport } from "@/services/admin/reportService";

export default function AdminProfitDailyReport() {
  return <AdminReportGenericPage title="利润日报" fetcher={fetchProfitDailyReport as never} />;
}
