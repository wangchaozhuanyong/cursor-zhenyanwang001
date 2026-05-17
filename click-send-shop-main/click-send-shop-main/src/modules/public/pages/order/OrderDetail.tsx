import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { useOrderStore } from "@/stores/useOrderStore";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrder: order, loading, error, loadOrderDetail } = useOrderStore();

  useEffect(() => {
    if (id) void loadOrderDetail(id);
  }, [id, loadOrderDetail]);

  if (loading) return <div className="min-h-screen bg-background"><PageHeader title="订单详情" /><div className="p-4 text-sm">加载中...</div></div>;
  if (error || !order) return <div className="min-h-screen bg-background"><PageHeader title="订单详情" /><div className="p-4 text-sm">{error || "订单不存在"}</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="订单详情" />
      <main className="mx-auto max-w-lg space-y-3 p-4 text-sm">
        <div className="rounded-xl border p-3">订单号: {order.order_no}</div>
        <div className="rounded-xl border p-3">状态: {order.status}</div>
        <div className="rounded-xl border p-3">金额: RM {order.total_amount}</div>
        <div className="rounded-xl border p-3">收货人: {order.contact_name || "-"}</div>
        <button onClick={() => navigate('/orders')} className="rounded-full border px-4 py-2">返回订单列表</button>
      </main>
    </div>
  );
}
