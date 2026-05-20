import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchInventoryAnalysisReport } from "@/services/admin/reportService";
export default function AdminInventoryAnalysisReport() { return <AdminReportGenericPage title="库存分析" fetcher={fetchInventoryAnalysisReport as never} />; }
