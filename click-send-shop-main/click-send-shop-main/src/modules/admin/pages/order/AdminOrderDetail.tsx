import { useNavigate, useParams } from "react-router-dom";
import AdminOrderDetailPanel from "@/modules/admin/pages/order/AdminOrderDetailPanel";

export default function AdminOrderDetail() {
  const navigate = useNavigate();
  const { id = "" } = useParams();

  return (
    <AdminOrderDetailPanel
      orderId={id}
      onBack={() => navigate("/admin/orders")}
    />
  );
}
