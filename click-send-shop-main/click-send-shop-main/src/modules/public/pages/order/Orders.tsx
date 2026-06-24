import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, SearchX, ShoppingBag } from "lucide-react";
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
import { canApplyAfterSale, canRepurchaseOrder, canUserCancelOrder, hasPendingReview, isPendingPayment, matchOrderTab, orderInAfterSaleTab } from "@/utils/orderBuyerStatus";
import { isGiftOrder } from "@/utils/orderPaymentLabels";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { usePayPendingOrder } from "@/hooks/usePayPendingOrder";
import { SUPPORT_PAGE_PATH } from "@/utils/supportDownloadConfig";
import { AppModal, BottomSheetConfirm } from "@/modules/micro-interactions";
import ReturnApplySheet from "./ReturnApplySheet";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StoreSearchField from "@/components/store/StoreSearchField";
import ProductCoverImage from "@/components/ProductCoverImage";
import { usePublicLocale } from "@/i18n/publicLocale";
import { formatDateTime } from "@/utils/formatDateTime";
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";
import {
  getBuyerOrderStatusTextLocalized,
  getOrderCopy,
  getOrderTabs,
  labelPendingPaymentActionLocalized,
} from "./orderPageLocale";

const ORDER_TAB_KEYS: OrderTab[] = ["all", "pending_payment", "paid", "shipped", "pending_review", "completed", "after_sale", "cancelled"];

function parseTab(searchParams: URLSearchParams): OrderTab {
  const tab = (searchParams.get("tab") || "").trim() as OrderTab;
  if (ORDER_TAB_KEYS.includes(tab)) return tab;
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
    // 历史订单商品快照通常不携带实时库存，交给购物车接口做最终确认。
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

function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function OrdersLoadingSkeleton() {
  return (
    <div className="store-orders-v12-loading-stack" aria-busy="true" aria-label="订单加载中">
      {Array.from({ length: 2 }).map((_, index) => (
        <article key={index} className="store-orders-v12-card store-orders-v12-skeleton-card">
          <div className="store-orders-v12-card-head">
            <div className="min-w-0">
              <div className="sf-next-skeleton store-orders-v12-skeleton-line is-order" />
              <div className="sf-next-skeleton store-orders-v12-skeleton-line is-date" />
            </div>
            <div className="sf-next-skeleton store-orders-v12-skeleton-pill" />
          </div>
          <div className="store-orders-v12-product-row">
            <div className="sf-next-skeleton store-orders-v12-product-media" />
            <div className="store-orders-v12-product-content">
              <div className="sf-next-skeleton store-orders-v12-skeleton-line is-title" />
              <div className="sf-next-skeleton store-orders-v12-skeleton-line is-variant" />
              <div className="sf-next-skeleton store-orders-v12-skeleton-line is-price" />
            </div>
          </div>
          <div className="store-orders-v12-skeleton-actions">
            <div className="sf-next-skeleton store-orders-v12-skeleton-button" />
            <div className="sf-next-skeleton store-orders-v12-skeleton-button is-primary" />
          </div>
        </article>
      ))}
    </div>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const { localizedPath, locale } = usePublicLocale();
  const copy = getOrderCopy(locale);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams);
  const keyword = (searchParams.get("keyword") || "").trim();
  const capabilities = useSiteCapabilities();
  const { paying, payPendingOrder } = usePayPendingOrder();
  const tabs = useMemo(() => getOrderTabs(locale).filter((t) => t.key !== "pending_review" || capabilities.reviewEnabled), [capabilities.reviewEnabled, locale]);
  const { containerRef: tabsRef, setItemRef: setTabRef, scrollToKey: scrollTabToKey } =
    useHorizontalActiveScroll<HTMLDivElement, HTMLButtonElement>(tab, tabs.length);

  const { orders, pagination, loading, loadingMore, error, loadOrders, cancelOrder, confirmReceive, deleteOrder } = useOrderStore();
  const { addToCart, clearBuyNow, setSelectAll } = useCartStore();

  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [actingId, setActingId] = useState("");
  const [moreOrder, setMoreOrder] = useState<Order | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<Order | null>(null);
  const [cancelConfirmOrder, setCancelConfirmOrder] = useState<Order | null>(null);
  const [confirmReceiveOrder, setConfirmReceiveOrder] = useState<Order | null>(null);
  const [returnApplyOrderId, setReturnApplyOrderId] = useState<string | null>(null);
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
    navigate(localizedPath(`/orders/${order.id}/logistics`));
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

  const switchTab = (next: OrderTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("status");
    if (next === "all") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  };

  const openDetail = (order: Order) => {
    navigate(localizedPath(`/orders/${order.id}`), {
      state: { from: localizedPath(`/orders${location.search || ""}`) },
    });
  };

  const repurchaseOrder = async (order: Order) => {
    try {
      clearBuyNow();
      setSelectAll(false);
      for (const item of order.items) {
        await addToCart(buildRepurchaseProduct(item), item.qty, buildVariantFromOrderItem(item));
      }
      toast.success(copy.cartReadded);
      navigate(localizedPath("/checkout"), {
        state: { from: localizedPath(`/orders/${order.id}`), repurchaseOrderId: order.id },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.repurchaseFailed);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    setActingId(order.id);
    try {
      await deleteOrder(order.id);
      toast.success(copy.orderDeleted);
      setSummary(null);
      await loadCurrentOrders({ force: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.deleteFailed);
    } finally {
      setActingId("");
    }
  };

  const emptyOrderText = keyword ? copy.emptyKeyword(keyword) : copy.emptyByTab[tab];

  const actionBtn = "min-h-8 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs leading-none whitespace-nowrap";
  const primaryActionBtn = "min-h-8 rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-3 py-1.5 text-xs leading-none whitespace-nowrap text-[var(--theme-primary-foreground)]";
  const moreActionBtn = "flex w-full items-center justify-between rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-left text-sm font-semibold text-[var(--theme-text)]";
  const renderOrderSearchField = (className: string) => (
    <StoreSearchField
      mode="filter"
      placeholder={copy.searchPlaceholder}
      value={searchText}
      onValueChange={setSearchText}
      onSubmit={() => updateKeywordParam(searchText)}
      className={className}
    />
  );

  return (
    <StoreAccountLayout
      title={copy.accountTitle}
      className="store-v12-page store-orders-v12-page"
      mainClassName="sm:p-0 xl:py-6"
      rightSlot={renderOrderSearchField("store-order-header-search-field w-[9.5rem] max-w-[44vw] flex-none sm:w-44 xl:hidden")}
    >
        <div className="store-glass-surface sticky top-0 z-10 -mx-[var(--store-page-x)] mb-3 border-b py-2 backdrop-blur-xl sm:-mx-4 md:top-[var(--store-tablet-sticky-top)] md:mx-0 md:rounded-xl md:border md:px-3 xl:top-[var(--store-desktop-sticky-top)]">
          <div className="flex flex-col gap-2 md:gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 overflow-hidden md:flex-1 md:overflow-visible">
              <div
                ref={tabsRef}
                className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden scroll-smooth px-[var(--store-page-x)] pb-1 [-webkit-overflow-scrolling:touch] sm:px-4 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
                role="tablist"
                aria-label={copy.tabsAria}
              >
              {tabs.map((t) => {
                const active = t.key === tab;
                const count = tabCount(currentSummary, t.key);
                return (
                  <UnifiedButton
                    key={t.key}
                    ref={(el) => setTabRef(t.key, el)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`snap-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors md:snap-none ${active ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] shadow-sm" : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"}`}
                    onClick={() => {
                      scrollTabToKey(t.key);
                      switchTab(t.key);
                    }}
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

        {loading ? <OrdersLoadingSkeleton /> : null}
        {error ? (
          <section className="store-account-v12-empty-panel store-orders-v12-state" role="alert">
            <span className="store-account-v12-empty-panel__icon" aria-hidden>
              <RefreshCw size={28} />
            </span>
            <h2>{copy.loadFailed}</h2>
            <p>{error}</p>
            <UnifiedButton type="button" onClick={() => void loadCurrentOrders({ force: true })} className="store-account-v12-empty-panel__action">
              <RefreshCw size={17} aria-hidden />
              {copy.retry}
            </UnifiedButton>
          </section>
        ) : null}

        {!loading && !error && displayOrders.length === 0 ? (
          <section className="store-account-v12-empty-panel store-orders-v12-state">
            <span className="store-account-v12-empty-panel__icon" aria-hidden>
              {keyword ? <SearchX size={28} /> : <ShoppingBag size={28} />}
            </span>
            <h2>{emptyOrderText}</h2>
            <p>{keyword ? copy.emptyKeywordDescription : copy.emptyDescription}</p>
            {keyword ? (
                <UnifiedButton
                  type="button"
                  onClick={() => {
                    setSearchText("");
                    updateKeywordParam("");
                  }}
                  className="store-account-v12-empty-panel__action"
                >
                  <SearchX size={17} aria-hidden />
                  {copy.clearSearch}
                </UnifiedButton>
              ) : (
                <UnifiedButton type="button" onClick={() => navigate(localizedPath("/categories"))} className="store-account-v12-empty-panel__action">
                  <ShoppingBag size={17} aria-hidden />
                  {copy.browse}
                </UnifiedButton>
              )}
          </section>
        ) : null}

        <div className="space-y-3">
          {displayOrders.map((order, orderIndex) => {
            const shownItems = order.items.slice(0, 3);
            const totalItems = order.items.reduce((s, i) => s + i.qty, 0);
            return (
              <article key={order.id} className="store-orders-v12-card rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3" onClick={() => openDetail(order)}>
                <div className="store-orders-v12-card-head">
                  <div className="min-w-0">
                    <span className="store-orders-v12-order-no">{order.order_no}</span>
                    <span className="store-orders-v12-date">{formatDateTime(order.created_at)}</span>
                  </div>
                  <span className={`store-orders-v12-status ${getStatusTone(order)}`}>{getBuyerOrderStatusTextLocalized(order, locale)}</span>
                </div>
                <div className="store-orders-v12-products-label">
                  <span>
                    {isGiftOrder(order.order_type) ? copy.giftOrder : copy.orderProducts}
                  </span>
                </div>
                {isGiftOrder(order.order_type) && Number(order.points_used || 0) > 0 ? (
                  <p className="mb-2 text-xs text-muted-foreground">{copy.pointsUsed} {order.points_used}</p>
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

                <div className="store-orders-v12-products">
                  {shownItems.map((item, itemIndex) => (
                    <div key={item.order_item_id || item.id || item.product.id} className="store-orders-v12-product-row">
                      <ProductCoverImage
                        url={item.product.cover_image}
                        alt={item.product.name}
                        className="store-orders-v12-product-media"
                        imgClassName="object-cover"
                        sizes="88px"
                        loading={orderIndex === 0 && itemIndex === 0 ? "eager" : "lazy"}
                        fetchPriority={orderIndex === 0 && itemIndex === 0 ? "high" : "low"}
                      />
                      <div className="store-orders-v12-product-content">
                        <div className="store-orders-v12-product-copy">
                          <p className="store-orders-v12-product-title">{item.product.name}</p>
                          <p className="store-orders-v12-product-variant">{item.variant_name || item.sku_code || copy.defaultVariant}</p>
                        </div>
                        <div className="store-orders-v12-product-price">
                          <p>RM {money(item.unit_price ?? item.product.price ?? 0)}</p>
                          <span>x{item.qty}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {order.items.length > 3 ? <p className="mt-2 text-xs text-[var(--theme-text-muted)]">{copy.itemCount(totalItems)}</p> : null}

                <div className="mt-3 flex justify-end text-sm">
                  <span className="store-body-small">{copy.itemCount(totalItems)}，{copy.paidTotal} <span className="text-[15px] font-semibold text-[var(--theme-price)]">RM {money(order.total_amount || 0)}</span></span>
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
                    {copy.more}
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
                        {copy.cancelOrder}
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
                        {paying && actingId === order.id ? copy.applying : labelPendingPaymentActionLocalized(order.payment_method, order.order_type, locale)}
                      </UnifiedButton>
                    ) : null}

                    {order.status === "paid" ? (
                      <UnifiedButton className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate(localizedPath(SUPPORT_PAGE_PATH)); }}>{copy.support}</UnifiedButton>
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
                            {copy.applyAfterSale}
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
                          {copy.receive}
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
                            {copy.applyAfterSale}
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
                            {copy.repurchase}
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
                        {copy.repurchase}
                      </UnifiedButton>
                    ) : null}

                    {orderInAfterSaleTab(order) ? (
                      <UnifiedButton className={actionBtn} onClick={(e) => { e.stopPropagation(); navigate(localizedPath("/returns")); }}>{copy.viewAfterSale}</UnifiedButton>
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
                {loadingMore ? copy.loadingMore : copy.loadMore}
              </UnifiedButton>
            ) : (
              <p className="text-xs text-[var(--theme-text-muted)]">{copy.allLoaded}</p>
            )}
          </div>
        ) : null}
        <AppModal
          tier="standard"
          open={Boolean(moreOrder)}
          onClose={() => setMoreOrder(null)}
          title={copy.moreActions}
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
                  <span>{copy.review}</span>
                  <span className="text-xs font-normal text-[var(--theme-text-muted)]">{copy.reviewHint}</span>
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
                  <span>{copy.applyAfterSale}</span>
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
                  <span>{copy.viewLogistics}</span>
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
                  <span>{copy.repurchase}</span>
                  <span className="text-xs font-normal text-[var(--theme-text-muted)]">{copy.repurchaseHint}</span>
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
                  <span>{copy.deleteOrder}</span>
                  <span className="text-xs font-normal text-[var(--theme-text-muted)]">{copy.deleteHint}</span>
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
                  {copy.noMoreActions}
                </p>
              ) : null}
            </div>
          ) : null}
        </AppModal>
        <BottomSheetConfirm
          open={Boolean(deleteConfirmOrder)}
          onClose={() => setDeleteConfirmOrder(null)}
          title={copy.deleteConfirmTitle}
          description={copy.deleteConfirmDescription}
          confirmText={copy.deleteConfirmText}
          cancelText={copy.cancelText}
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
          title={copy.cancelConfirmTitle}
          description={copy.cancelConfirmDescription}
          confirmText={copy.cancelConfirmText}
          cancelText={copy.rethink}
          danger
          loading={Boolean(cancelConfirmOrder && actingId === cancelConfirmOrder.id)}
          onConfirm={async () => {
            if (!cancelConfirmOrder) return;
            setActingId(cancelConfirmOrder.id);
            try {
              await cancelOrder(cancelConfirmOrder.id);
              await loadCurrentOrders({ force: true });
              toast.success(copy.orderCancelled);
              setCancelConfirmOrder(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : copy.cancelFailed);
            } finally {
              setActingId("");
            }
          }}
        />

        <BottomSheetConfirm
          open={Boolean(confirmReceiveOrder)}
          onClose={() => setConfirmReceiveOrder(null)}
          title={copy.receiveConfirmTitle}
          description={copy.receiveConfirmDescription}
          confirmText={copy.receiveConfirmText}
          cancelText={copy.cancelText}
          loading={Boolean(confirmReceiveOrder && actingId === confirmReceiveOrder.id)}
          onConfirm={async () => {
            if (!confirmReceiveOrder) return;
            setActingId(confirmReceiveOrder.id);
            try {
              await confirmReceive(confirmReceiveOrder.id);
              await loadCurrentOrders({ force: true });
              toast.success(copy.received);
              setConfirmReceiveOrder(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : copy.receiveFailed);
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

        <BottomSheetConfirm
          open={Boolean(repurchaseConfirmOrder)}
          onClose={() => setRepurchaseConfirmOrder(null)}
          title={copy.repurchaseConfirmTitle}
          description={copy.repurchaseConfirmDescription}
          confirmText={copy.checkoutText}
          cancelText={copy.cancelText}
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
