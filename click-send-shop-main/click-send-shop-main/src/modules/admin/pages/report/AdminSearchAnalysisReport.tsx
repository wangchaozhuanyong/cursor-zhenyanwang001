import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchSearchAnalysisReport } from "@/services/admin/reportService";
export default function AdminSearchAnalysisReport() { return <AdminReportGenericPage title="搜索分析" fetcher={fetchSearchAnalysisReport as never} />; }
