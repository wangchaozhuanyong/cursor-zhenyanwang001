import { useEffect, useRef } from "react";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { useOrderStore } from "@/stores/useOrderStore";
import StatusBadge from "@/components/StatusBadge";
import { motion, AnimatePresence } from "framer-motion";
import type { OrderStatus } from "@/types/order";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ORDER_STATUS_TAB_LABELS } from "@/constants/statusDictionary";

const tabs: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: ORDER_STATUS_TAB_LABELS.pending },
  { key: "paid", label: ORDER_STATUS_TAB_LABELS.paid },
  { key: "shipped", label: ORDER_STATUS_TAB_LABELS.shipped },
  { key: "completed", label: ORDER_STATUS_TAB_LABELS.completed },
  { key: "cancelled", label: ORDER_STATUS_TAB_LABELS.cancelled },
];

export default function Orders() {
  useDocumentTitle("我的订单");
  const navigate = useNavigate();
  const goBack = useGoBack();
  const {
    orders,
    loading,
    error,
    pagination,
    filterStatus,
    setFilterStatus,
    loadOrders,
  } = useOrderStore();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOrders({ page: 1 });
  }, [loadOrders, filterStatus]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && pagination.page < pagination.totalPages) {
          loadOrders({ page: pagination.page + 1 });
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loading, pagination, loadOrders]);

  const switchTab = (key: OrderStatus | "all") => {
    setFilterStatus(key);
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button
            onClick={goBack}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">我的订单</h1>
        </div>

        <div className="mx-auto max-w-lg overflow-x-auto px-4 pb-2">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                  filterStatus === tab.key
                    ? "bg-gold text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4">
        {error && !loading && (
          <div className="flex flex-col items-center py-20">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <button
              onClick={() => loadOrders({ page: 1 })}
              className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              重试
            </button>
          </div>
        )}

        {!error && !loading && orders.length === 0 && (
          <div className="flex flex-col items-center py-20">
            <Package size={48} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {filterStatus === "all" ? "暂无订单" : "该状态下暂无订单"}
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              去逛逛
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {orders.length > 0 && (
            <motion.div
              key={filterStatus}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {orders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors active:bg-secondary"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground font-mono">
                      {order.order_no}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {order.items.map((item) => (
                      <img
                        key={item.product.id}
                        src={item.product.cover_image}
                        alt={item.product.name}
                        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("zh-CN")} · 共{" "}
                      {order.items.reduce((s, i) => s + i.qty, 0)} 件
                    </span>
                    <span className="text-base font-bold text-gold">
                      RM {order.total_amount}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-gold" />
          </div>
        )}

        <div ref={sentinelRef} className="h-1" />

        {!loading && orders.length > 0 && pagination.page >= pagination.totalPages && (
          <p className="py-6 text-center text-xs text-muted-foreground">— 没有更多订单了 —</p>
        )}
      </main>
    </div>
  );
}
