import { useParams } from "react-router-dom";
import AdminOrderDetailPanel from "@/modules/admin/pages/order/AdminOrderDetailPanel";
import { useAdminGoBack } from "@/hooks/useAdminGoBack";

export default function AdminOrderDetail() {
  const { id = "" } = useParams();
  const goBack = useAdminGoBack("/admin/orders");

  return (
    <AdminOrderDetailPanel
      orderId={id}
      onBack={goBack}
    />
  );
}
