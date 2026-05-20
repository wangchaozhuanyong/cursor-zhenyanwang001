import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchProductAnalysisReport } from "@/services/admin/reportService";
export default function AdminProductAnalysisReport() { return <AdminReportGenericPage title="商品分析" fetcher={fetchProductAnalysisReport as never} />; }
