import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchDiscountCostReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminDiscountCostReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.discount_cost} fetcher={fetchDiscountCostReport as never} />;
}
