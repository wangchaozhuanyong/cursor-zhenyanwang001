import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchOrderAnalysisReport } from "@/services/admin/reportService";
export default function AdminOrderAnalysisReport() { return <AdminReportGenericPage title="订单分析" fetcher={fetchOrderAnalysisReport as never} />; }
