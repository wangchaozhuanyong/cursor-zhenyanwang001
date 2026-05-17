import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { Order, OrderSummary, OrderTab } from "@/types/order";
import { useOrderStore } from "@/stores/useOrderStore";
import * as orderService from "@/services/orderService";
import { getBuyerOrderStatusText, hasPendingReview, matchOrderTab } from "@/utils/orderBuyerStatus";

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
    pending_review: orders.reduce((acc, o) => acc + (hasPendingReview(o) ? o.items.filter((i) => i.can_review).length : 0), 0),
    completed: orders.filter((o) => o.status === "completed" && !hasPendingReview(o)).length,
    after_sale: orders.filter((o) => o.status === "refunding" || o.status === "refunded").length,
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

export default function Orders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams);
  const { orders, loading, error, loadOrders, cancelOrder, confirmReceive } = useOrderStore();
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [actingId, setActingId] = useState("");

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

  const displayOrders = useMemo(() => orders.filter((o) => matchOrderTab(o, tab)), [orders, tab]);
  const currentSummary = summary || summaryFromOrders(orders);

  const switchTab = (next: OrderTab) => setSearchParams(next === "all" ? {} : { tab: next });

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

  const actionBtn = "rounded-full border border-[var(--theme-border)] px-3 py-1 text-xs";

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="mb-3 text-lg font-semibold">我的订单</h1>

      <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-[var(--theme-border)] bg-background px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const active = t.key === tab;
            const count = tabCount(currentSummary, t.key);
            return (
              <button
                key={t.key}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${active ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"}`}
                onClick={() => switchTab(t.key)}
              >
                {t.label}{count && count > 0 ? ` ${count}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">加载中...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {!loading && displayOrders.length === 0 ? (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-center text-sm text-[var(--theme-text-muted)]">
          {emptyText[tab]}
        </div>
      ) : null}

      <div className="space-y-3">
        {displayOrders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3" onClick={() => navigate(`/orders/${order.id}`)}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--theme-text-muted)]">{order.order_no}</span>
              <span className="text-xs text-[var(--theme-text)]">{getBuyerOrderStatusText(order)}</span>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {order.items.slice(0, 4).map((item) => (
                <img key={item.order_item_id || item.id || item.product.id} src={item.product.cover_image} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-[var(--theme-text-muted)]">共 {order.items.reduce((s, i) => s + i.qty, 0)} 件商品</span>
              <span className="text-sm font-semibold text-[var(--theme-price)]">RM {order.total_amount}</span>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              {order.status === "pending" ? (
                <>
                  <button className={actionBtn} disabled={actingId === order.id} onClick={(e) => { e.stopPropagation(); setActingId(order.id); cancelOrder(order.id).then(() => loadOrders({ page: 1, tab })).finally(() => setActingId("")); }}>取消订单</button>
                  <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>去付款</button>
                </>
              ) : null}
              {order.status === "paid" ? (
                <>
                  <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate("/help"); }}>联系客服</button>
                  <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>查看详情</button>
                </>
              ) : null}
              {order.status === "shipped" ? (
                <>
                  <button className={actionBtn} onClick={(e) => { e.stopPropagation(); if (order.logistics_provider?.tracking_url) window.open(order.logistics_provider.tracking_url, "_blank"); else toast.info("暂无物流信息"); }}>查看物流</button>
                  <button className={actionBtn} disabled={actingId === order.id} onClick={(e) => { e.stopPropagation(); setActingId(order.id); confirmReceive(order.id).then(() => loadOrders({ page: 1, tab })).finally(() => setActingId("")); }}>确认收货</button>
                </>
              ) : null}
              {order.status === "completed" && hasPendingReview(order) ? (
                <>
                  <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}?review=1`); }}>评价</button>
                  <button className={actionBtn} onClick={(e) => { e.stopPropagation(); const pid = order.items[0]?.product.id; if (pid) navigate(`/product/${pid}`); }}>再次购买</button>
                </>
              ) : null}
              {order.status === "completed" && !hasPendingReview(order) ? (
                <>
                  <button className={actionBtn} onClick={(e) => { e.stopPropagation(); const pid = order.items[0]?.product.id; if (pid) navigate(`/product/${pid}`); }}>再次购买</button>
                  <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>查看详情</button>
                </>
              ) : null}
              {(order.status === "refunding" || order.status === "refunded") ? (
                <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate("/returns"); }}>查看售后</button>
              ) : null}
              {order.status === "cancelled" ? (
                <>
                  <button className={actionBtn} onClick={(e) => { e.stopPropagation(); const pid = order.items[0]?.product.id; if (pid) navigate(`/product/${pid}`); }}>再次购买</button>
                  <button className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}>查看详情</button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
