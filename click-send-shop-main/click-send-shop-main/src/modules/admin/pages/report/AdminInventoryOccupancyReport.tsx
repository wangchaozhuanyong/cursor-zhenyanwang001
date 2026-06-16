import { REPORT_REGISTRY_BY_KEY } from "./reportRegistry";
import { fetchInventoryOccupancyReport } from "@/services/admin/reportService";
import AdminReportGenericPage from "./pages/AdminReportGenericPage";

export default function AdminInventoryOccupancyReport() {
  return <AdminReportGenericPage config={REPORT_REGISTRY_BY_KEY.inventory_occupancy} fetcher={fetchInventoryOccupancyReport as never} />;
}
