import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchPaymentFailureReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminPaymentFailureReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.payment_failure} fetcher={fetchPaymentFailureReport as never} />;
}
