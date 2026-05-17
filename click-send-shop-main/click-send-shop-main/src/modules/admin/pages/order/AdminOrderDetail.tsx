import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchOrderById } from "@/services/admin/orderService";
import { useState } from "react";
import type { Order } from "@/types/order";

export default function AdminOrderDetail() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    void fetchOrderById(id).then((o) => { if (mounted) setOrder(o); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-6 text-sm">加载中...</div>;
  if (!order) return <div className="p-6 text-sm">订单不存在</div>;

  return (
    <div className="space-y-3 p-6 text-sm">
      <h2 className="text-lg font-semibold">订单详情</h2>
      <div>订单号: {order.order_no}</div>
      <div>状态: {order.status}</div>
      <div>实付: RM {order.total_amount}</div>
      <button className="rounded border px-3 py-1" onClick={() => navigate('/admin/orders')}>返回列表</button>
    </div>
  );
}
