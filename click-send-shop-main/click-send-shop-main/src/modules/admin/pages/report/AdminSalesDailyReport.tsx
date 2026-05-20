import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchSalesDailyReport } from "@/services/admin/reportService";
export default function AdminSalesDailyReport() { return <AdminReportGenericPage title="销售日报" fetcher={fetchSalesDailyReport as never} />; }
