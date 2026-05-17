import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderStore } from "@/stores/useOrderStore";

export default function Orders() {
  const navigate = useNavigate();
  const { orders, loading, error, loadOrders } = useOrderStore();

  useEffect(() => {
    void loadOrders({ page: 1 });
  }, [loadOrders]);

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="mb-4 text-lg font-semibold">我的订单</h1>
      {loading && <p>加载中...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="space-y-3">
        {orders.map((order) => {
          const pendingCount = order.status === "completed" ? order.items.filter((i) => i.can_review).length : 0;
          return (
            <div key={order.id} className="rounded-xl border p-3" onClick={() => navigate(`/orders/${order.id}`)}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{order.order_no}</p>
                <p className="text-xs">{order.status}</p>
              </div>
              <p className="mt-2 text-sm">RM {order.total_amount}</p>
              {pendingCount > 0 && (
                <div className="mt-2 text-xs text-[var(--theme-price)]">
                  有 {pendingCount} 件商品待评价
                  <button className="ml-2 underline" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}?review=1`); }}>去评价</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
