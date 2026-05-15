import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchCustomerAnalysisReport } from "@/services/admin/reportService";
export default function AdminCustomerAnalysisReport() { return <AdminReportGenericPage title="客户分析" fetcher={fetchCustomerAnalysisReport as never} />; }
