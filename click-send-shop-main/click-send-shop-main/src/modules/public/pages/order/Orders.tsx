import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, SearchX, ShoppingBag, X } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import { showStoreToast } from "@/utils/storeToast";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import StorefrontQuietLoading from "@/components/storefront-motion/StorefrontQuietLoading";
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
import "@/styles/orders-route.css";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

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
  if (order.status === "pending") return "is-danger";
  if (order.status === "completed" && !orderInAfterSaleTab(order)) return "is-primary";
  if (orderInAfterSaleTab(order)) return "is-danger";
  return "is-muted";
}

function canBuyerDeleteOrder(order: Order) {
  if (Number(order.active_return_count || 0) > 0) return false;
  return order.status === "completed" || order.status === "cancelled" || order.status === "refunded";
}

function canViewLogistics(order: Order) {
  return order.status === "shipped" || order.status === "completed" || order.status === "refunded";
}

function hasOrderMoreActions(order: Order, reviewEnabled: boolean) {
  return (
    (reviewEnabled && hasPendingReview(order))
    || (canApplyAfterSale(order) && (order.status === "shipped" || order.status === "completed"))
    || canViewLogistics(order)
    || canRepurchaseOrder(order)
    || canBuyerDeleteOrder(order)
  );
}

function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function OrdersQuietLoading() {
  return <StorefrontQuietLoading label="订单加载中" className="sf-motion-inline-loading--account" />;
}

export default function Orders() {
  const navigate = useStorefrontNavigate();
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(Boolean(keyword));

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
      showStoreToast.success(copy.cartReadded);
      navigate(localizedPath("/checkout"), {
        state: { from: localizedPath(`/orders/${order.id}`), repurchaseOrderId: order.id },
      });
    } catch (e) {
      showStoreToast.error(e instanceof Error ? e.message : copy.repurchaseFailed);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    setActingId(order.id);
    try {
      await deleteOrder(order.id);
      showStoreToast.success(copy.orderDeleted);
      setSummary(null);
      await loadCurrentOrders({ force: true });
    } catch (e) {
      showStoreToast.error(e instanceof Error ? e.message : copy.deleteFailed);
    } finally {
      setActingId("");
    }
  };

  const emptyOrderText = keyword ? copy.emptyKeyword(keyword) : copy.emptyByTab[tab];

  const actionBtn = "sf-next-order-action";
  const primaryActionBtn = "sf-next-order-action sf-next-order-action--primary";
  const moreActionBtn = "sf-next-order-more-action";
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
      className="sf-next-page sf-next-orders-page"
      mainClassName="sm:p-0 xl:py-6"
      rightSlot={(
        <UnifiedButton
          type="button"
          className={`sf-next-order-header-search-trigger ${mobileSearchOpen ? "is-active" : ""}`}
          aria-label={mobileSearchOpen ? copy.clearSearch : copy.searchPlaceholder}
          aria-expanded={mobileSearchOpen}
          onClick={() => {
            if (mobileSearchOpen) {
              if (searchText) {
                setSearchText("");
                updateKeywordParam("");
              }
              setMobileSearchOpen(false);
              return;
            }
            setMobileSearchOpen(true);
          }}
        >
          {mobileSearchOpen ? <X size={19} aria-hidden /> : <Search size={19} aria-hidden />}
        </UnifiedButton>
      )}
    >
        {mobileSearchOpen ? (
          <div className="sf-next-orders-mobile-search">
            {renderOrderSearchField("sf-next-order-mobile-search-field")}
          </div>
        ) : null}
        <div className="sf-next-orders-toolbar">
          <div className="sf-next-orders-toolbar__inner">
            <div className="sf-next-orders-tabs-shell">
              <div
                ref={tabsRef}
                className="sf-next-orders-tabs no-scrollbar"
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
                    className={`sf-next-orders-tab ${active ? "is-active" : ""}`}
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
            </div>
            {renderOrderSearchField("hidden md:flex md:w-60 md:flex-none xl:w-72")}
          </div>
        </div>

        {loading ? <OrdersQuietLoading /> : null}
        {error ? (
          <section className="sf-next-state-panel sf-next-orders-state" role="alert">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <RefreshCw size={28} />
            </span>
            <h2>{copy.loadFailed}</h2>
            <p>{error}</p>
            <UnifiedButton type="button" onClick={() => void loadCurrentOrders({ force: true })} className="sf-next-state-panel__primary">
              <RefreshCw size={17} aria-hidden />
              {copy.retry}
            </UnifiedButton>
          </section>
        ) : null}

        {!loading && !error && displayOrders.length === 0 ? (
          <section className="sf-next-state-panel sf-next-orders-state">
            <span className="sf-next-state-panel__icon" aria-hidden>
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
                  className="sf-next-state-panel__secondary"
                >
                  <SearchX size={17} aria-hidden />
                  {copy.clearSearch}
                </UnifiedButton>
              ) : (
                <UnifiedButton type="button" onClick={() => navigate(localizedPath("/categories"))} className="sf-next-state-panel__primary">
                  <ShoppingBag size={17} aria-hidden />
                  {copy.browse}
                </UnifiedButton>
              )}
          </section>
        ) : null}

        <div className="sf-next-orders-list">
          {displayOrders.map((order, orderIndex) => {
            const shownItems = order.items.slice(0, 3);
            const totalItems = order.items.reduce((s, i) => s + i.qty, 0);
            return (
              <article key={order.id} className="sf-next-order-card" onClick={() => openDetail(order)}>
                <div className="sf-next-order-card__head">
                  <div className="min-w-0">
                    <span className="sf-next-order-card__number">{order.order_no}</span>
                    <span className="sf-next-order-card__date">{formatDateTime(order.created_at)}</span>
                  </div>
                  <span className={`sf-next-order-card__status ${getStatusTone(order)}`}>{getBuyerOrderStatusTextLocalized(order, locale)}</span>
                </div>
                {isGiftOrder(order.order_type) && Number(order.points_used || 0) > 0 ? (
                  <p className="sf-next-order-card__points">{copy.giftOrder} · {copy.pointsUsed} {order.points_used}</p>
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

                <div className="sf-next-order-products">
                  {shownItems.map((item, itemIndex) => (
                    <div key={item.order_item_id || item.id || item.product.id} className="sf-next-order-product-row">
                      <ProductCoverImage
                        url={item.product.cover_image}
                        alt={item.product.name}
                        className="sf-next-order-product-media"
                        imgClassName="object-cover"
                        sizes="88px"
                        loading={orderIndex === 0 && itemIndex === 0 ? "eager" : "lazy"}
                        fetchPriority={orderIndex === 0 && itemIndex === 0 ? "high" : "low"}
                      />
                      <div className="sf-next-order-product-content">
                        <div className="sf-next-order-product-copy">
                          <p className="sf-next-order-product-title">{item.product.name}</p>
                          <p className="sf-next-order-product-variant">{item.variant_name || item.sku_code || copy.defaultVariant}</p>
                        </div>
                        <div className="sf-next-order-product-price">
                          <p>RM {money(item.unit_price ?? item.product.price ?? 0)}</p>
                          <span>x{item.qty}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {order.items.length > 3 ? <p className="mt-2 text-xs text-[var(--theme-text-muted)]">{copy.itemCount(totalItems)}</p> : null}

                <div className="sf-next-order-card__action-row">
                  <div className="sf-next-order-card__total">
                    <span>{copy.itemCount(totalItems)}</span>
                    <span>{copy.paidTotal}</span>
                    <strong>RM {money(order.total_amount || 0)}</strong>
                  </div>
                  <div className="sf-next-order-card__action-group">
                    {hasOrderMoreActions(order, capabilities.reviewEnabled) ? (
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
                    ) : null}
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
                    ) : null}

                    {order.status === "completed" ? (
                      canRepurchaseOrder(order) ? (
                        <UnifiedButton
                          className={primaryActionBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRepurchaseConfirmOrder(order);
                          }}
                        >
                          {copy.repurchase}
                        </UnifiedButton>
                      ) : null
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
          <div className="sf-next-orders-paging">
            {hasMoreOrders ? (
              <UnifiedButton
                type="button"
                className="sf-next-orders-load-more"
                disabled={loading || loadingMore}
                onClick={loadMoreOrders}
              >
                {loadingMore ? copy.loadingMore : copy.loadMore}
              </UnifiedButton>
            ) : (
              <p className="sf-next-orders-paging__done">{copy.allLoaded}</p>
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
            <div className="sf-next-order-more-list">
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
              {!hasOrderMoreActions(moreOrder, capabilities.reviewEnabled) ? (
                <p className="sf-next-order-more-empty">
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
              showStoreToast.success(copy.orderCancelled);
              setCancelConfirmOrder(null);
            } catch (e) {
              showStoreToast.error(e instanceof Error ? e.message : copy.cancelFailed);
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
              showStoreToast.success(copy.received);
              setConfirmReceiveOrder(null);
            } catch (e) {
              showStoreToast.error(e instanceof Error ? e.message : copy.receiveFailed);
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
