import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchCategoryAnalysisReport } from "@/services/admin/reportService";
export default function AdminCategoryAnalysisReport() { return <AdminReportGenericPage title="分类分析" fetcher={fetchCategoryAnalysisReport as never} />; }
