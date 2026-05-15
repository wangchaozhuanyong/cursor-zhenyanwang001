import AdminReportGenericPage from "./pages/AdminReportGenericPage";
import { fetchCouponAnalysisReport } from "@/services/admin/reportService";
export default function AdminCouponAnalysisReport() { return <AdminReportGenericPage title="优惠券分析" fetcher={fetchCouponAnalysisReport as never} />; }
