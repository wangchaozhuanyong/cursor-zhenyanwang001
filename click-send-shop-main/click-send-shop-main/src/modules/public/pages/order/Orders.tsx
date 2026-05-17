import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Copy, Package, Truck } from "lucide-react";
import { toast } from "sonner";
import { ORDER_STATUS, getOrderStatusBadgeClass, getOrderStatusLabel } from "@/constants/statusDictionary";
import { useOrderStore } from "@/stores/useOrderStore";
import * as orderService from "@/services/orderService";
import type { Order, OrderStatus, OrderSummary } from "@/types/order";

const ORDER_FEATURE_FLAGS = {
  pendingPayment: true,
  pendingShip: true,
  pendingReceive: true,
  pendingReview: false,
  afterSale: false,
};

const STATUS_PARAM_TO_STATUS: Record<string, OrderStatus> = {
  pending: ORDER_STATUS.PENDING,
  paid: ORDER_STATUS.PAID,
  shipped: ORDER_STATUS.SHIPPED,
  completed: ORDER_STATUS.COMPLETED,
  cancelled: ORDER_STATUS.CANCELLED,
};

function toMoney(v?: number) {
  return Number(v || 0).toFixed(2);
}

function getOrderItemCount(order: Order) {
  return (order.items || []).reduce((acc, it) => acc + Number(it.qty || 0), 0);
}

function getOrderSummaryFallback(orders: Order[]): OrderSummary {
  const pending_payment = orders.filter((o) => o.status === "pending" && o.payment_status !== "paid").length;
  const pending_ship = orders.filter((o) => o.status === "paid" || (o.payment_status === "paid" && o.status !== "shipped" && o.status !== "completed" && o.status !== "cancelled" && o.status !== "refunding" && o.status !== "refunded")).length;
  const pending_receive = orders.filter((o) => o.status === "shipped").length;
  const pending_review = orders.reduce((acc, o) => acc + (o.status === "completed" ? o.items.filter((i) => i.can_review).length : 0), 0);
  const after_sale = orders.filter((o) => o.status === "refunding" || o.status === "refunded").length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  return { pending_payment, pending_ship, pending_receive, pending_review, after_sale, completed, cancelled };
}

export default function Orders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = (searchParams.get("status") || "").trim();
  const currentStatus = STATUS_PARAM_TO_STATUS[statusParam] || "all";

  const { orders, loading, error, loadOrders, setFilterStatus, cancelOrder, confirmReceive } = useOrderStore();
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [actingOrderId, setActingOrderId] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);

  useEffect(() => {
    setFilterStatus(currentStatus === "all" ? "all" : currentStatus);
    void loadOrders({ page: 1 });
  }, [currentStatus, loadOrders, setFilterStatus]);

  useEffect(() => {
    let cancelled = false;
    orderService.fetchOrderSummary().then((res) => {
      if (!cancelled) setSummary(res);
    }).catch(() => {
      if (!cancelled) setSummary(null);
    });
    return () => {
      cancelled = true;
    };
  }, [orders.length]);

  const summaryData = summary || getOrderSummaryFallback(orders);

  const tabs = useMemo(() => {
    const base = [{ key: "all", label: "全部", count: 0 }];
    const dynamic = [
      ORDER_FEATURE_FLAGS.pendingPayment ? { key: ORDER_STATUS.PENDING, label: "待付款", count: summaryData.pending_payment } : null,
      ORDER_FEATURE_FLAGS.pendingShip ? { key: ORDER_STATUS.PAID, label: "待发货", count: summaryData.pending_ship } : null,
      ORDER_FEATURE_FLAGS.pendingReceive ? { key: ORDER_STATUS.SHIPPED, label: "待收货", count: summaryData.pending_receive } : null,
      { key: ORDER_STATUS.COMPLETED, label: "已完成", count: summaryData.completed },
      { key: ORDER_STATUS.CANCELLED, label: "已取消", count: summaryData.cancelled },
    ].filter(Boolean) as Array<{ key: OrderStatus; label: string; count: number }>;

    return base.concat(dynamic.filter((tab) => tab.count > 0 || tab.key === currentStatus));
  }, [currentStatus, summaryData]);

  const onTabChange = (key: "all" | OrderStatus) => {
    if (key === "all") {
      setSearchParams({});
      return;
    }
    setSearchParams({ status: key });
  };

  const emptyTextMap: Record<string, string> = {
    all: "暂无订单，去逛逛",
    pending: "暂无待付款订单",
    paid: "暂无待发货订单",
    shipped: "暂无待收货订单",
    completed: "暂无已完成订单",
    cancelled: "暂无已取消订单",
  };

  const handleCopyOrderNo = async (orderNo: string) => {
    try {
      await navigator.clipboard.writeText(orderNo);
      toast.success("订单号已复制");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
      setActingOrderId(id);
      await cancelOrder(id);
      await loadOrders({ page: 1 });
      toast.success("订单已取消");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取消订单失败");
    } finally {
      setActingOrderId("");
    }
  };

  const handleConfirmReceive = async (id: string) => {
    try {
      setActingOrderId(id);
      await confirmReceive(id);
      await loadOrders({ page: 1 });
      toast.success("已确认收货");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "确认收货失败");
    } finally {
      setActingOrderId("");
    }
  };

  const toggleExpanded = (orderId: string) => {
    setExpandedOrderIds((prev) => (
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    ));
  };

  const renderActions = (order: Order) => {
    const disabled = actingOrderId === order.id;
    const btnBase = "rounded-full px-3 py-1.5 text-xs";
    const secondary = `${btnBase} border border-[var(--theme-border)] text-[var(--theme-text-muted)]`;
    const primary = `${btnBase} bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]`;

    if (order.status === "pending") {
      return (
        <>
          <button type="button" className={secondary} disabled={disabled} onClick={(e) => { e.stopPropagation(); void handleCancelOrder(order.id); }}>取消订单</button>
          <button type="button" className={primary} onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>去付款</button>
        </>
      );
    }
    if (order.status === "paid") {
      return (
        <>
          <button type="button" className={secondary} onClick={(e) => { e.stopPropagation(); navigate("/help"); }}>联系客服</button>
          <button type="button" className={primary} onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>查看详情</button>
        </>
      );
    }
    if (order.status === "shipped") {
      return (
        <>
          <button type="button" className={secondary} onClick={(e) => { e.stopPropagation(); order.logistics_provider?.tracking_url ? window.open(order.logistics_provider.tracking_url, "_blank") : toast.info("暂无物流信息"); }}>查看物流</button>
          <button type="button" className={primary} disabled={disabled} onClick={(e) => { e.stopPropagation(); void handleConfirmReceive(order.id); }}>确认收货</button>
        </>
      );
    }
    if (order.status === "completed") {
      const canReview = ORDER_FEATURE_FLAGS.pendingReview && order.items.some((i) => i.can_review);
      return (
        <>
          <button type="button" className={secondary} onClick={(e) => { e.stopPropagation(); const pid = order.items[0]?.product?.id; if (pid) navigate(`/product/${pid}`); }}>再次购买</button>
          {canReview ? <button type="button" className={primary} onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}?review=1`); }}>评价</button> : null}
        </>
      );
    }
    if (order.status === "cancelled") {
      return (
        <button type="button" className={secondary} onClick={(e) => { e.stopPropagation(); const pid = order.items[0]?.product?.id; if (pid) navigate(`/product/${pid}`); }}>再次购买</button>
      );
    }
    if (order.status === "refunding" || order.status === "refunded") {
      return (
        <button type="button" className={secondary} onClick={(e) => { e.stopPropagation(); navigate("/returns"); }}>查看售后</button>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="mb-3 text-lg font-semibold">我的订单</h1>

      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-[var(--theme-border)] bg-background px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const active = tab.key === currentStatus || (tab.key === "all" && currentStatus === "all");
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key as "all" | OrderStatus)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${active ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"}`}
              >
                {tab.label}{tab.key !== "all" ? ` ${tab.count}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">加载中...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !orders.length ? (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-center">
          <p className="text-sm text-[var(--theme-text-muted)]">{emptyTextMap[currentStatus] || emptyTextMap.all}</p>
          {currentStatus === "all" ? (
            <button type="button" className="mt-3 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs text-[var(--theme-primary-foreground)]" onClick={() => navigate("/")}>去逛逛</button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {orders.map((order) => {
          const itemCount = getOrderItemCount(order);
          const multi = order.items.length > 1;
          const expanded = expandedOrderIds.includes(order.id);
          const displayItems = multi && expanded ? order.items : order.items.slice(0, 3);
          return (
            <article
              key={order.id}
              className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex min-w-0 items-center gap-1 text-xs text-[var(--theme-text-muted)]"
                  onClick={(e) => { e.stopPropagation(); void handleCopyOrderNo(order.order_no); }}
                >
                  <span className="truncate">订单号：{order.order_no}</span>
                  <Copy size={12} />
                </button>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${getOrderStatusBadgeClass(order.status)}`}>{getOrderStatusLabel(order.status)}</span>
              </div>

              {!multi && order.items[0] ? (
                <div className="mt-3 flex gap-3">
                  <img src={order.items[0].product.cover_image} alt={order.items[0].product.name} className="h-16 w-16 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--theme-text)]">{order.items[0].product.name}</p>
                    <p className="mt-1 text-xs text-[var(--theme-text-muted)]">{order.items[0].variant_name || order.items[0].sku_code || "默认规格"}</p>
                    <p className="mt-1 text-xs text-[var(--theme-text-muted)]">x{order.items[0].qty} · RM {toMoney(order.items[0].unit_price || order.items[0].subtotal)}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {displayItems.map((it) => (
                      <div key={it.order_item_id || it.id || `${order.id}-${it.product.id}`} className="w-20 shrink-0">
                        <img src={it.product.cover_image} alt={it.product.name} className="h-20 w-20 rounded-xl object-cover" />
                        <p className="mt-1 truncate text-[11px] text-[var(--theme-text-muted)]">{it.product.name}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-[var(--theme-text-muted)] inline-flex items-center gap-1"><Package size={12} />共 {itemCount} 件商品</p>
                    {order.items.length > 3 ? (
                      <button
                        type="button"
                        className="text-xs text-[var(--theme-primary)]"
                        onClick={(e) => { e.stopPropagation(); toggleExpanded(order.id); }}
                      >
                        {expanded ? "收起商品" : "查看更多商品"}
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--theme-text)]">共 {itemCount} 件商品，实付 RM {toMoney(order.total_amount)}</p>
                  <p className="mt-1 text-xs text-[var(--theme-text-muted)] inline-flex items-center gap-1"><Truck size={12} />下单时间：{order.created_at?.slice(0, 16).replace("T", " ") || "-"}</p>
                </div>
                <div className="flex items-center gap-2">{renderActions(order)}</div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
