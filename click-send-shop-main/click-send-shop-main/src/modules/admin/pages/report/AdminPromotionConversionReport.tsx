import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchPromotionConversionReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminPromotionConversionReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.promotion_conversion} fetcher={fetchPromotionConversionReport as never} />;
}
