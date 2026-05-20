import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchActivityAnalysisReport } from "@/services/admin/reportService";
export default function AdminActivityAnalysisReport() { return <AdminReportGenericPage title="活动分析" fetcher={fetchActivityAnalysisReport as never} />; }
