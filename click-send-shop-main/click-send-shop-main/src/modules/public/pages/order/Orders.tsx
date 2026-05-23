import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { OrderPaymentCountdown } from "@/components/order/OrderPaymentCountdown";
import { OrderAutoConfirmCountdown } from "@/components/order/OrderAutoConfirmCountdown";
import type { Order, OrderSummary, OrderTab } from "@/types/order";
import type { ProductVariant } from "@/types/product";
import { useOrderStore } from "@/stores/useOrderStore";
import { useCartStore } from "@/stores/useCartStore";
import * as orderService from "@/services/orderService";
import { canApplyAfterSale, canUserCancelOrder, getBuyerOrderStatusText, hasPendingReview, isPendingPayment, matchOrderTab, orderInAfterSaleTab } from "@/utils/orderBuyerStatus";
import { isGiftOrder } from "@/utils/orderPaymentLabels";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { usePayPendingOrder } from "@/hooks/usePayPendingOrder";
import { safeOpenExternal } from "@/utils/safeOpen";

const TABS: Array<{ key: OrderTab; label: string }> = [
  { key: "all", label: "全部" },
  { key: "pending_payment", label: "待付款" },
  { key: "paid", label: "待发货" },
  { key: "shipped", label: "待收货" },
  { key: "pending_review", label: "待评价" },
  { key: "completed", label: "已完成" },
  { key: "after_sale", label: "退款/售后" },
  { key: "cancelled", label: "已取消" },
];

function parseTab(searchParams: URLSearchParams): OrderTab {
  const tab = (searchParams.get("tab") || "").trim() as OrderTab;
  if (TABS.some((t) => t.key === tab)) return tab;
  const status = (searchParams.get("status") || "").trim();
  if (status === "pending") return "pending_payment";
  if (status === "paid") return "paid";
  if (status === "shipped") return "shipped";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "all";
}

function summaryFromOrders(orders: Order[]): OrderSummary {
  return {
    total: orders.length,
    pending_payment: orders.filter((o) => o.status === "pending" && o.payment_status !== "paid").length,
    paid: orders.filter((o) => o.status === "paid").length,
    pending_ship: orders.filter((o) => o.status === "paid").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    pending_receive: orders.filter((o) => o.status === "shipped").length,
    pending_review: orders.filter((o) => hasPendingReview(o)).length,
    completed: orders.filter((o) => o.status === "completed" && !hasPendingReview(o)).length,
    after_sale: orders.filter((o) => orderInAfterSaleTab(o)).length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };
}

function tabCount(summary: OrderSummary, tab: OrderTab): number | undefined {
  if (tab === "all") return summary.total;
  if (tab === "pending_payment") return summary.pending_payment;
  if (tab === "paid") return summary.paid ?? summary.pending_ship;
  if (tab === "shipped") return summary.shipped ?? summary.pending_receive;
  if (tab === "pending_review") return summary.pending_review;
  if (tab === "completed") return summary.completed;
  if (tab === "after_sale") return summary.after_sale;
  if (tab === "cancelled") return summary.cancelled;
  return undefined;
}

function buildVariantFromOrderItem(item: Order["items"][number]): ProductVariant | null {
  if (!item.variant_id) return null;
  const matched = item.product.variants?.find((v) => v.id === item.variant_id || v.sku_code === item.sku_code);
  if (matched) return matched;
  return {
    id: item.variant_id,
    sku_code: item.sku_code ?? null,
    title: item.variant_name || item.sku_code || "默认规格",
    price: Number(item.unit_price ?? item.product.price ?? 0),
    stock: Number(item.product.stock ?? 999999),
    sort_order: 0,
    is_default: false,
  };
}

function getStatusTone(order: Order) {
  if (order.status === "pending") return "text-[var(--theme-danger)]";
  if (order.status === "completed" && !orderInAfterSaleTab(order)) return "text-[var(--theme-primary)]";
  if (orderInAfterSaleTab(order)) return "text-[var(--theme-danger)]";
  return "text-[var(--theme-text-muted)]";
}

export default function Orders() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams);
  const capabilities = useSiteCapabilities();
  const { paying, payPendingOrder } = usePayPendingOrder();
  const tabs = useMemo(() => TABS.filter((t) => t.key !== "pending_review" || capabilities.reviewEnabled), [capabilities.reviewEnabled]);

  const { orders, loading, error, loadOrders, cancelOrder, confirmReceive } = useOrderStore();
  const { addToCart, clearBuyNow, setSelectAll } = useCartStore();

  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [actingId, setActingId] = useState("");

  const handleViewLogistics = async (order: Order) => {
    if (order.logistics_provider?.tracking_url) {
      safeOpenExternal(order.logistics_provider.tracking_url);
      return;
    }
    const carrier = order.logistics_provider?.carrier || order.carrier || "";
    const trackingNo = order.logistics_provider?.tracking_no || order.tracking_no || "";
    if (carrier || trackingNo) {
      const text = [carrier ? `物流公司：${carrier}` : "", trackingNo ? `单号：${trackingNo}` : ""]
        .filter(Boolean)
        .join("，");
      if (trackingNo) {
        try {
          await navigator.clipboard.writeText(trackingNo);
          toast.success(`${text}（单号已复制）`);
          return;
        } catch {
          // ignore clipboard error and fallback to normal hint
        }
      }
      toast.info(text);
      return;
    }
    toast.info("暂无物流信息");
  };

  useEffect(() => {
    void loadOrders({ page: 1, tab, status: undefined });
  }, [loadOrders, tab]);

  useEffect(() => {
    let cancelled = false;
    orderService.fetchOrderSummary().then((res) => {
      if (!cancelled) setSummary(res);
    }).catch(() => {
      if (!cancelled) setSummary(summaryFromOrders(orders));
    });
    return () => { cancelled = true; };
  }, [orders]);

  const displayOrders = useMemo(
    () => (tab === "all" ? orders : orders.filter((o) => matchOrderTab(o, tab))),
    [orders, tab],
  );
  const currentSummary = summary || summaryFromOrders(orders);

  const switchTab = (next: OrderTab) => {
    setSearchParams(next === "all" ? {} : { tab: next }, { replace: true });
  };

  const openDetail = (order: Order) => {
    navigate(`/orders/${order.id}`, {
      state: { from: `/orders${location.search || ""}` },
    });
  };

  const addOrderToCart = async (order: Order) => {
    try {
      for (const item of order.items) {
        await addToCart(item.product, item.qty, buildVariantFromOrderItem(item));
      }
      toast.success("已加入购物车");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加入购物车失败");
    }
  };

  const repurchaseOrder = async (order: Order) => {
    try {
      clearBuyNow();
      setSelectAll(false);
      for (const item of order.items) {
        await addToCart(item.product, item.qty, buildVariantFromOrderItem(item));
      }
      toast.success("已为你重新加入购物车");
      navigate("/checkout", {
        state: { from: `/orders/${order.id}`, repurchaseOrderId: order.id },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "再买一单失败");
    }
  };

  const emptyText: Record<OrderTab, string> = {
    all: "暂无订单",
    pending_payment: "暂无待付款订单",
    paid: "暂无待发货订单",
    shipped: "暂无待收货订单",
    pending_review: "暂无待评价订单",
    completed: "暂无已完成订单",
    after_sale: "暂无退款/售后订单",
    cancelled: "暂无已取消订单",
  };

  const actionBtn = "min-h-8 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs leading-none whitespace-nowrap";
  const primaryActionBtn = "min-h-8 rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-3 py-1.5 text-xs leading-none whitespace-nowrap text-[var(--theme-primary-foreground)]";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="我的订单" onBack={() => navigate("/profile", { replace: true })} />
      <main className="mx-auto w-full px-[var(--store-page-x)] py-[var(--store-page-y)] sm:max-w-lg sm:p-4">
        <div className="sticky top-0 z-10 -mx-[var(--store-page-x)] mb-3 border-b border-[var(--theme-border)] bg-background px-[var(--store-page-x)] py-2 sm:-mx-4 sm:px-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((t) => {
              const active = t.key === tab;
              const count = tabCount(currentSummary, t.key);
              return (
                <button key={t.key} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${active ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"}`} onClick={() => switchTab(t.key)}>
                  {t.label}{count && count > 0 ? ` ${count}` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">加载中...</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        {!loading && displayOrders.length === 0 ? (
          <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-center text-sm text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]">
            {emptyText[tab]}
          </div>
        ) : null}

        <div className="space-y-3">
          {displayOrders.map((order) => {
            const shownItems = order.items.slice(0, 3);
            const totalItems = order.items.reduce((s, i) => s + i.qty, 0);
            return (
              <article key={order.id} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3" onClick={() => openDetail(order)}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {isGiftOrder(order.order_type) ? "积分礼品" : "订单商品"}
                  </span>
                  <span className={`text-xs font-medium ${getStatusTone(order)}`}>{getBuyerOrderStatusText(order)}</span>
                </div>
                {isGiftOrder(order.order_type) && Number(order.points_used || 0) > 0 ? (
                  <p className="mb-2 text-xs text-muted-foreground">消耗积分 {order.points_used}</p>
                ) : null}

                {order.status === "pending" ? (
                  <div className="mb-2.5" onClick={(e) => e.stopPropagation()}>
                    <OrderPaymentCountdown
                      order={order}
                      compact
                      onExpired={() => {
                        void loadOrders({ page: 1, tab, status: undefined });
                      }}
                    />
                  </div>
                ) : null}
                {order.status === "shipped" ? (
                  <div className="mb-2.5" onClick={(e) => e.stopPropagation()}>
                    <OrderAutoConfirmCountdown order={order} compact />
                  </div>
                ) : null}

                <div className="space-y-2">
                  {shownItems.map((item) => (
                    <div key={item.order_item_id || item.id || item.product.id} className="flex gap-2">
                      <img src={item.product.cover_image} alt={item.product.name} className="h-[72px] w-[72px] rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="store-card-title line-clamp-2">{item.product.name}</p>
                        <p className="store-caption mt-1 truncate text-[var(--theme-text-muted)]">{item.variant_name || item.sku_code || "默认规格"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[15px] font-semibold text-[var(--theme-price)]">RM {Number(item.unit_price ?? item.product.price ?? 0).toFixed(2)}</p>
                        <p className="mt-1 text-xs text-[var(--theme-text-muted)]">x{item.qty}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {order.items.length > 3 ? <p className="mt-2 text-xs text-[var(--theme-text-muted)]">共 {totalItems} 件商品</p> : null}

                <div className="mt-3 flex justify-end text-sm">
                  <span className="store-body-small">共 {totalItems} 件商品，实付款 <span className="text-[15px] font-semibold text-[var(--theme-price)]">RM {Number(order.total_amount || 0).toFixed(2)}</span></span>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {canUserCancelOrder(order) ? (
                    <button
                      className={actionBtn}
                      disabled={actingId === order.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActingId(order.id);
                        cancelOrder(order.id).then(() => loadOrders({ page: 1, tab })).finally(() => setActingId(""));
                      }}
                    >
                      取消订单
                    </button>
                  ) : null}
                  {isPendingPayment(order) ? (
                    <button
                      className={primaryActionBtn}
                      disabled={actingId === order.id || paying}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActingId(order.id);
                        void payPendingOrder(order, () => loadOrders({ page: 1, tab })).finally(() => setActingId(""));
                      }}
                    >
                      {paying && actingId === order.id ? "处理中..." : "去付款"}
                    </button>
                  ) : null}

                  {order.status === "paid" ? (
                    <>
                      <button className={actionBtn} onClick={(e) => { e.stopPropagation(); void addOrderToCart(order); }}>加入购物车</button>
                      <button className={actionBtn} onClick={(e) => { e.stopPropagation(); void repurchaseOrder(order); }}>再买一单</button>
                      <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate("/help"); }}>联系客服</button>
                    </>
                  ) : null}

                  {order.status === "shipped" ? (
                    <>
                      <div className="flex w-full justify-end gap-2">
                        <button className={actionBtn} onClick={(e) => { e.stopPropagation(); void addOrderToCart(order); }}>加入购物车</button>
                        <button className={primaryActionBtn} onClick={(e) => { e.stopPropagation(); void repurchaseOrder(order); }}>再买一单</button>
                      </div>
                      <div className="flex w-full flex-wrap justify-end gap-2">
                        <button className={actionBtn} onClick={(e) => { e.stopPropagation(); void handleViewLogistics(order); }}>查看物流</button>
                        {canApplyAfterSale(order) ? (
                          <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate(`/returns?apply=${order.id}`); }}>申请售后</button>
                        ) : null}
                        <button className={primaryActionBtn} disabled={actingId === order.id} onClick={(e) => { e.stopPropagation(); setActingId(order.id); confirmReceive(order.id).then(() => loadOrders({ page: 1, tab })).finally(() => setActingId("")); }}>确认收货</button>
                      </div>
                    </>
                  ) : null}

                  {order.status === "completed" ? (
                    <>
                      {hasPendingReview(order) ? <button className={actionBtn} onClick={(e) => { e.stopPropagation(); openDetail(order); }}>评价</button> : null}
                      <button className={actionBtn} onClick={(e) => { e.stopPropagation(); void addOrderToCart(order); }}>加入购物车</button>
                      <button className={primaryActionBtn} onClick={(e) => { e.stopPropagation(); void repurchaseOrder(order); }}>再买一单</button>
                      {canApplyAfterSale(order) ? (
                        <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate(`/returns?apply=${order.id}`); }}>申请售后</button>
                      ) : null}
                    </>
                  ) : null}

                  {order.status === "cancelled" ? (
                    <>
                      <button className={actionBtn} onClick={(e) => { e.stopPropagation(); void addOrderToCart(order); }}>加入购物车</button>
                      <button className={primaryActionBtn} onClick={(e) => { e.stopPropagation(); void repurchaseOrder(order); }}>再买一单</button>
                    </>
                  ) : null}

                  {orderInAfterSaleTab(order) ? (
                    <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate("/returns"); }}>查看售后</button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
