import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { OrderPaymentCountdown } from "@/components/order/OrderPaymentCountdown";
import { OrderAutoConfirmCountdown } from "@/components/order/OrderAutoConfirmCountdown";
import type { Order, OrderSummary, OrderTab } from "@/types/order";
import type { ProductVariant } from "@/types/product";
import { useOrderStore } from "@/stores/useOrderStore";
import { useCartStore } from "@/stores/useCartStore";
import * as orderService from "@/services/orderService";
import { canApplyAfterSale, canRepurchaseOrder, canUserCancelOrder, getBuyerOrderStatusText, hasPendingReview, isPendingPayment, matchOrderTab, orderInAfterSaleTab } from "@/utils/orderBuyerStatus";
import { isGiftOrder, labelPendingPaymentAction } from "@/utils/orderPaymentLabels";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { usePayPendingOrder } from "@/hooks/usePayPendingOrder";
import { LogisticsInfoModal } from "@/components/order/LogisticsInfoModal";
import { SUPPORT_PAGE_PATH } from "@/utils/supportDownloadConfig";
import {
  getOrderLogisticsSnapshot,
  openOrderLogisticsExternal,
  resolveOrderLogisticsView,
  type OrderLogisticsSnapshot,
} from "@/utils/orderLogistics";
import { AppModal, BottomSheetConfirm } from "@/modules/micro-interactions";
import ReturnApplySheet from "./ReturnApplySheet";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StoreSearchField from "@/components/store/StoreSearchField";
import ProductCoverImage from "@/components/ProductCoverImage";
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";

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
  const fallbackStock = Number(item.product.stock);
  return {
    id: item.variant_id,
    sku_code: item.sku_code ?? null,
    title: item.variant_name || item.sku_code || "默认规格",
    price: Number(item.unit_price ?? item.product.price ?? 0),
    stock: Number.isFinite(fallbackStock) && fallbackStock > 0 ? fallbackStock : 999999,
    sort_order: 0,
    is_default: false,
  };
}

function buildRepurchaseProduct(item: Order["items"][number]) {
  const stock = Number(item.product.stock);
  return {
    ...item.product,
    // 历史订单商品快照通常不携带实时库存，交给购物车接口做最终校验。
    stock: Number.isFinite(stock) && stock > 0 ? stock : 999999,
  };
}

function getStatusTone(order: Order) {
  if (order.status === "pending") return "text-[var(--theme-danger)]";
  if (order.status === "completed" && !orderInAfterSaleTab(order)) return "text-[var(--theme-primary)]";
  if (orderInAfterSaleTab(order)) return "text-[var(--theme-danger)]";
  return "text-[var(--theme-text-muted)]";
}

function canBuyerDeleteOrder(order: Order) {
  if (Number(order.active_return_count || 0) > 0) return false;
  return order.status === "completed" || order.status === "cancelled" || order.status === "refunded";
}

function canViewLogistics(order: Order) {
  return order.status === "shipped" || order.status === "completed" || order.status === "refunded";
}

export default function Orders() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams);
  const keyword = (searchParams.get("keyword") || "").trim();
  const tabButtonRefs = useRef<Map<OrderTab, HTMLButtonElement>>(new Map());
  const capabilities = useSiteCapabilities();
  const { paying, payPendingOrder } = usePayPendingOrder();
  const tabs = useMemo(() => TABS.filter((t) => t.key !== "pending_review" || capabilities.reviewEnabled), [capabilities.reviewEnabled]);

  const { orders, pagination, loading, loadingMore, error, loadOrders, cancelOrder, confirmReceive, deleteOrder } = useOrderStore();
  const { addToCart, clearBuyNow, setSelectAll } = useCartStore();

  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [actingId, setActingId] = useState("");
  const [moreOrder, setMoreOrder] = useState<Order | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<Order | null>(null);
  const [cancelConfirmOrder, setCancelConfirmOrder] = useState<Order | null>(null);
  const [confirmReceiveOrder, setConfirmReceiveOrder] = useState<Order | null>(null);
  const [returnApplyOrderId, setReturnApplyOrderId] = useState<string | null>(null);
  const [logisticsInfo, setLogisticsInfo] = useState<OrderLogisticsSnapshot | null>(null);
  const [repurchaseConfirmOrder, setRepurchaseConfirmOrder] = useState<Order | null>(null);
  const [searchText, setSearchText] = useState(keyword);

  useEffect(() => {
    setSearchText(keyword);
  }, [keyword]);

  const updateKeywordParam = useCallback((value: string) => {
    const nextKeyword = value.trim();
    const next = new URLSearchParams(searchParams);
    if (nextKeyword) next.set("keyword", nextKeyword);
    else next.delete("keyword");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      updateKeywordParam(searchText);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText, updateKeywordParam]);

  const loadCurrentOrders = useCallback(
    (options?: { force?: boolean }) => loadOrders({ page: 1, tab, status: undefined, keyword: keyword || undefined, force: options?.force }),
    [keyword, loadOrders, tab],
  );

  const viewLogistics = (order: Order) => {
    const mode = resolveOrderLogisticsView(order);
    if (mode === "external") {
      openOrderLogisticsExternal(order);
      return;
    }
    if (mode === "modal") {
      setLogisticsInfo(getOrderLogisticsSnapshot(order));
      return;
    }
    toast.info("暂无物流信息");
  };

  useEffect(() => {
    void loadCurrentOrders();
  }, [loadCurrentOrders]);

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
  const hasMoreOrders = pagination.page < pagination.totalPages;
  const showOrderPagingFooter = displayOrders.length > 0 && pagination.total > pagination.pageSize;

  const loadMoreOrders = useCallback(() => {
    if (loading || loadingMore || !hasMoreOrders) return;
    void loadOrders({
      page: pagination.page + 1,
      pageSize: pagination.pageSize,
      tab,
      status: undefined,
      keyword: keyword || undefined,
    });
  }, [hasMoreOrders, keyword, loadOrders, loading, loadingMore, pagination.page, pagination.pageSize, tab]);

  useEffect(() => {
    const activeButton = tabButtonRefs.current.get(tab);
    activeButton?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [tab, tabs.length]);

  const switchTab = (next: OrderTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("status");
    if (next === "all") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  };

  const openDetail = (order: Order) => {
    navigate(`/orders/${order.id}`, {
      state: { from: `/orders${location.search || ""}` },
    });
  };

  const repurchaseOrder = async (order: Order) => {
    try {
      clearBuyNow();
      setSelectAll(false);
      for (const item of order.items) {
        await addToCart(buildRepurchaseProduct(item), item.qty, buildVariantFromOrderItem(item));
      }
      toast.success("已为你重新加入购物车");
      navigate("/checkout", {
        state: { from: `/orders/${order.id}`, repurchaseOrderId: order.id },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "再买一单失败");
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    setActingId(order.id);
    try {
      await deleteOrder(order.id);
      toast.success("订单已删除");
      setSummary(null);
      await loadCurrentOrders({ force: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除订单失败");
    } finally {
      setActingId("");
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
  const emptyOrderText = keyword ? `没有找到“${keyword}”相关订单` : emptyText[tab];

  const actionBtn = "min-h-8 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs leading-none whitespace-nowrap";
  const primaryActionBtn = "min-h-8 rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-3 py-1.5 text-xs leading-none whitespace-nowrap text-[var(--theme-primary-foreground)]";
  const moreActionBtn = "flex w-full items-center justify-between rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-left text-sm font-semibold text-[var(--theme-text)]";
  const renderOrderSearchField = (className: string) => (
    <StoreSearchField
      mode="filter"
      placeholder="搜索订单"
      value={searchText}
      onValueChange={setSearchText}
      onSubmit={() => updateKeywordParam(searchText)}
      className={className}
    />
  );

  return (
    <StoreAccountLayout
      title="我的订单"
      mainClassName="sm:p-0 xl:py-6"
      rightSlot={renderOrderSearchField("store-order-header-search-field w-[9.5rem] max-w-[44vw] flex-none sm:w-44 xl:hidden")}
    >
        <div className="store-glass-surface sticky top-0 z-10 -mx-[var(--store-page-x)] mb-3 border-b py-2 backdrop-blur-xl sm:-mx-4 md:top-[var(--store-tablet-sticky-top)] md:mx-0 md:rounded-xl md:border md:px-3 xl:top-[var(--store-desktop-sticky-top)]">
          <div className="flex flex-col gap-2 md:gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 overflow-hidden md:flex-1 md:overflow-visible">
              <div
                className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden scroll-smooth px-[var(--store-page-x)] pb-1 [-webkit-overflow-scrolling:touch] sm:px-4 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
                role="tablist"
                aria-label="订单状态"
              >
              {tabs.map((t) => {
                const active = t.key === tab;
                const count = tabCount(currentSummary, t.key);
                return (
                  <UnifiedButton
                    key={t.key}
                    ref={(el) => {
                      if (el) tabButtonRefs.current.set(t.key, el);
                      else tabButtonRefs.current.delete(t.key);
                    }}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`snap-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors md:snap-none ${active ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] shadow-sm" : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"}`}
                    onClick={() => switchTab(t.key)}
                  >
                    {t.label}{count && count > 0 ? ` ${count}` : ""}
                  </UnifiedButton>
                );
              })}
              </div>
              <span className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[var(--theme-surface)] to-transparent md:hidden" aria-hidden />
              <span className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-[var(--theme-surface)] to-transparent md:hidden" aria-hidden />
            </div>
            {renderOrderSearchField("hidden xl:flex xl:w-72 xl:flex-none")}
          </div>
        </div>

        {loading ? <p className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-center text-sm text-muted-foreground">加载中...</p> : null}
        {error ? (
          <ClientEmptyState
            title="订单加载失败"
            description={error}
            action={
              <ClientButton type="button" onClick={() => void loadCurrentOrders({ force: true })}>
                重试
              </ClientButton>
            }
          />
        ) : null}

        {!loading && displayOrders.length === 0 ? (
          <ClientEmptyState
            title={emptyOrderText}
            description={keyword ? "可以清空关键词后重新查看订单。" : "下单后，订单状态会显示在这里。"}
            action={
              keyword ? (
                <ClientButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearchText("");
                    updateKeywordParam("");
                  }}
                >
                  清空搜索
                </ClientButton>
              ) : (
                <ClientButton type="button" variant="secondary" onClick={() => navigate("/categories")}>
                  去逛逛
                </ClientButton>
              )
            }
          />
        ) : null}

        <div className="space-y-3">
          {displayOrders.map((order, orderIndex) => {
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
                        void loadCurrentOrders({ force: true });
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
                  {shownItems.map((item, itemIndex) => (
                    <div key={item.order_item_id || item.id || item.product.id} className="flex gap-2">
                      <ProductCoverImage
                        url={item.product.cover_image}
                        alt={item.product.name}
                        className="aspect-[1/2] w-12 rounded-lg object-cover"
                        imgClassName="object-cover"
                        loading={orderIndex === 0 && itemIndex === 0 ? "eager" : "lazy"}
                        fetchPriority={orderIndex === 0 && itemIndex === 0 ? "high" : "low"}
                      />
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

                <div className="mt-3 flex items-center justify-between gap-2">
                  <UnifiedButton
                    type="button"
                    className={actionBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreOrder(order);
                    }}
                  >
                    更多
                  </UnifiedButton>
                  <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-2">
                    {canUserCancelOrder(order) ? (
                      <UnifiedButton
                        className={actionBtn}
                        disabled={actingId === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancelConfirmOrder(order);
                        }}
                      >
                        取消订单
                      </UnifiedButton>
                    ) : null}
                    {isPendingPayment(order) ? (
                      <UnifiedButton
                        className={primaryActionBtn}
                        disabled={actingId === order.id || paying}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActingId(order.id);
                          void payPendingOrder(order, () => loadCurrentOrders({ force: true })).finally(() => setActingId(""));
                        }}
                      >
                        {paying && actingId === order.id ? "处理中..." : labelPendingPaymentAction(order.payment_method, order.order_type)}
                      </UnifiedButton>
                    ) : null}

                    {order.status === "paid" ? (
                      <UnifiedButton className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate(SUPPORT_PAGE_PATH); }}>联系客服</UnifiedButton>
                    ) : null}

                    {order.status === "shipped" ? (
                      <>
                        {canApplyAfterSale(order) ? (
                          <UnifiedButton
                            className={actionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReturnApplyOrderId(order.id);
                            }}
                          >
                            申请售后
                          </UnifiedButton>
                        ) : null}
                        <UnifiedButton
                          className={primaryActionBtn}
                          disabled={actingId === order.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmReceiveOrder(order);
                          }}
                        >
                          确认收货
                        </UnifiedButton>
                      </>
                    ) : null}

                    {order.status === "completed" ? (
                      <>
                        {canApplyAfterSale(order) ? (
                          <UnifiedButton
                            className={actionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReturnApplyOrderId(order.id);
                            }}
                          >
                            申请售后
                          </UnifiedButton>
                        ) : null}
                        {canRepurchaseOrder(order) ? (
                          <UnifiedButton
                            className={primaryActionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRepurchaseConfirmOrder(order);
                            }}
                          >
                            再买一单
                          </UnifiedButton>
                        ) : null}
                      </>
                    ) : null}

                    {canRepurchaseOrder(order) && order.status === "cancelled" ? (
                      <UnifiedButton
                        className={primaryActionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRepurchaseConfirmOrder(order);
                        }}
                      >
                        再买一单
                      </UnifiedButton>
                    ) : null}

                    {orderInAfterSaleTab(order) ? (
                      <UnifiedButton className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate("/returns"); }}>查看售后</UnifiedButton>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {showOrderPagingFooter ? (
          <div className="flex justify-center pt-2">
            {hasMoreOrders ? (
              <UnifiedButton
                type="button"
                className="min-h-10 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 py-2 text-sm font-medium text-[var(--theme-text)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || loadingMore}
                onClick={loadMoreOrders}
              >
                {loadingMore ? "加载中..." : "加载更多"}
              </UnifiedButton>
            ) : (
              <p className="text-xs text-[var(--theme-text-muted)]">已全部加载</p>
            )}
          </div>
        ) : null}
        <AppModal
          tier="standard"
          open={Boolean(moreOrder)}
          onClose={() => setMoreOrder(null)}
          title="更多操作"
          height="auto"
        >
          {moreOrder ? (
            <div className="space-y-2">
              {capabilities.reviewEnabled && hasPendingReview(moreOrder) ? (
                <UnifiedButton
                  type="button"
                  className={moreActionBtn}
                  onClick={() => {
                    const order = moreOrder;
                    setMoreOrder(null);
                    openDetail(order);
                  }}
                >
                  <span>评价</span>
                  <span className="text-xs font-normal text-[var(--theme-text-muted)]">去订单详情评价</span>
                </UnifiedButton>
              ) : null}
              {canApplyAfterSale(moreOrder) && (moreOrder.status === "shipped" || moreOrder.status === "completed") ? (
                <UnifiedButton
                  type="button"
                  className={moreActionBtn}
                  onClick={() => {
                    const target = moreOrder;
                    setMoreOrder(null);
                    setReturnApplyOrderId(target.id);
                  }}
                >
                  <span>申请售后</span>
                </UnifiedButton>
              ) : null}
              {canViewLogistics(moreOrder) ? (
                <UnifiedButton
                  type="button"
                  className={moreActionBtn}
                  onClick={() => {
                    const target = moreOrder;
                    setMoreOrder(null);
                    viewLogistics(target);
                  }}
                >
                  <span>查看物流</span>
                </UnifiedButton>
              ) : null}
              {canRepurchaseOrder(moreOrder) ? (
                <UnifiedButton
                  type="button"
                  className={moreActionBtn}
                  onClick={() => {
                    const target = moreOrder;
                    setMoreOrder(null);
                    setRepurchaseConfirmOrder(target);
                  }}
                >
                  <span>再买一单</span>
                  <span className="text-xs font-normal text-[var(--theme-text-muted)]">重新加入购物车并结算</span>
                </UnifiedButton>
              ) : null}
              {canBuyerDeleteOrder(moreOrder) ? (
                <UnifiedButton
                  type="button"
                  className={`${moreActionBtn} text-[var(--theme-danger)]`}
                  onClick={() => {
                    setDeleteConfirmOrder(moreOrder);
                    setMoreOrder(null);
                  }}
                >
                  <span>删除订单</span>
                  <span className="text-xs font-normal text-[var(--theme-text-muted)]">仅从我的订单隐藏</span>
                </UnifiedButton>
              ) : null}
              {!(
                (capabilities.reviewEnabled && hasPendingReview(moreOrder))
                || (canApplyAfterSale(moreOrder) && (moreOrder.status === "shipped" || moreOrder.status === "completed"))
                || canViewLogistics(moreOrder)
                || canRepurchaseOrder(moreOrder)
                || canBuyerDeleteOrder(moreOrder)
              ) ? (
                <p className="rounded-2xl bg-[var(--theme-bg)] px-4 py-5 text-center text-sm text-[var(--theme-text-muted)]">
                  当前订单暂无更多操作
                </p>
              ) : null}
            </div>
          ) : null}
        </AppModal>
        <BottomSheetConfirm
          open={Boolean(deleteConfirmOrder)}
          onClose={() => setDeleteConfirmOrder(null)}
          title="删除订单"
          description="删除后该订单将不再显示在你的订单列表中，后台仍会保留必要记录用于售后、财务和审计。"
          confirmText="删除"
          cancelText="取消"
          danger
          loading={Boolean(deleteConfirmOrder && actingId === deleteConfirmOrder.id)}
          onConfirm={async () => {
            if (!deleteConfirmOrder) return;
            await handleDeleteOrder(deleteConfirmOrder);
          }}
        />

        <BottomSheetConfirm
          open={Boolean(cancelConfirmOrder)}
          onClose={() => setCancelConfirmOrder(null)}
          title="取消订单"
          description="取消后订单将关闭，如需购买请重新下单。"
          confirmText="确认取消"
          cancelText="再想想"
          danger
          loading={Boolean(cancelConfirmOrder && actingId === cancelConfirmOrder.id)}
          onConfirm={async () => {
            if (!cancelConfirmOrder) return;
            setActingId(cancelConfirmOrder.id);
            try {
              await cancelOrder(cancelConfirmOrder.id);
              await loadCurrentOrders({ force: true });
              toast.success("订单已取消");
              setCancelConfirmOrder(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "取消失败");
            } finally {
              setActingId("");
            }
          }}
        />

        <BottomSheetConfirm
          open={Boolean(confirmReceiveOrder)}
          onClose={() => setConfirmReceiveOrder(null)}
          title="确认收货"
          description="请确认已收到商品且无误。确认后将无法撤销。"
          confirmText="确认收货"
          cancelText="取消"
          loading={Boolean(confirmReceiveOrder && actingId === confirmReceiveOrder.id)}
          onConfirm={async () => {
            if (!confirmReceiveOrder) return;
            setActingId(confirmReceiveOrder.id);
            try {
              await confirmReceive(confirmReceiveOrder.id);
              await loadCurrentOrders({ force: true });
              toast.success("已确认收货");
              setConfirmReceiveOrder(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "确认收货失败");
            } finally {
              setActingId("");
            }
          }}
        />

        <ReturnApplySheet
          orderId={returnApplyOrderId}
          open={Boolean(returnApplyOrderId)}
          onClose={() => setReturnApplyOrderId(null)}
          onSuccess={() => {
            void loadCurrentOrders({ force: true });
          }}
        />

        <LogisticsInfoModal
          open={logisticsInfo !== null}
          onClose={() => setLogisticsInfo(null)}
          carrier={logisticsInfo?.carrier}
          trackingNo={logisticsInfo?.trackingNo}
        />

        <BottomSheetConfirm
          open={Boolean(repurchaseConfirmOrder)}
          onClose={() => setRepurchaseConfirmOrder(null)}
          title="再买一单"
          description="将把该订单商品加入购物车并前往结算页，是否继续？"
          confirmText="前往结算"
          cancelText="取消"
          loading={Boolean(repurchaseConfirmOrder && actingId === repurchaseConfirmOrder.id)}
          onConfirm={async () => {
            if (!repurchaseConfirmOrder) return;
            setActingId(repurchaseConfirmOrder.id);
            try {
              await repurchaseOrder(repurchaseConfirmOrder);
              setRepurchaseConfirmOrder(null);
            } finally {
              setActingId("");
            }
          }}
        />
    </StoreAccountLayout>
  );
}
