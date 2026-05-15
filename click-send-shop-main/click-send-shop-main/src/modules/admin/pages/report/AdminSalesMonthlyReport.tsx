import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchSalesMonthlyReport } from "@/services/admin/reportService";
export default function AdminSalesMonthlyReport() { return <AdminReportGenericPage title="销售月报" fetcher={fetchSalesMonthlyReport as never} />; }
