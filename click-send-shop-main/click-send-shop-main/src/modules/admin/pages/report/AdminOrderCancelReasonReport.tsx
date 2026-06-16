import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchOrderCancelReasonReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminOrderCancelReasonReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.order_cancel_reason} fetcher={fetchOrderCancelReasonReport as never} />;
}
