import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipboardList, Copy, CreditCard, PackageCheck, Truck, WalletCards } from "lucide-react";
import { toast } from "sonner";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { OrderAutoConfirmCountdown } from "@/components/order/OrderAutoConfirmCountdown";
import ReviewComposerSheet from "@/components/review/ReviewComposerSheet";
import { AppModal, BottomSheetConfirm, usePreferBottomSheet } from "@/modules/micro-interactions";
import { useOrderStore } from "@/stores/useOrderStore";
import { useCartStore } from "@/stores/useCartStore";
import type { Order } from "@/types/order";
import type { ProductVariant } from "@/types/product";
import {
  canApplyAfterSale,
  canRepurchaseOrder,
  canUserCancelOrder,
  getOrderProgressStep,
  hasPendingReview,
  isPendingPayment,
} from "@/utils/orderBuyerStatus";
import { formatDateTime } from "@/utils/formatDateTime";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { usePayPendingOrder } from "@/hooks/usePayPendingOrder";
import { OrderDiscountLines } from "./components/OrderDiscountLines";
import ReturnApplySheet from "./ReturnApplySheet";
import { SUPPORT_PAGE_PATH } from "@/utils/supportDownloadConfig";
import { useGoBack } from "@/hooks/useGoBack";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import ProductCoverImage from "@/components/ProductCoverImage";
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";
import { usePublicLocale } from "@/i18n/publicLocale";
import {
  getBuyerOrderStatusTextLocalized,
  getOrderCopy,
  getOrderStepLabels,
  labelOrderPaymentMethodLocalized,
  labelPendingPaymentActionLocalized,
} from "./orderPageLocale";

const moreActionBtn =
  "flex w-full items-center justify-between rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-left text-sm font-semibold text-[var(--theme-text)]";

function money(value?: number | string | null) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

function finiteAmount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getOrderGoodsDisplayAmount(order: Order) {
  const snapshot = order.amount_snapshot || {};
  const rawAmount = finiteAmount(order.raw_amount);
  const originalAmount = finiteAmount(order.goods_original_amount ?? snapshot.goods_original_amount);
  const activityDiscount = finiteAmount(order.activity_discount_amount ?? snapshot.activity_discount_amount);
  if (originalAmount > rawAmount) return originalAmount;
  if (activityDiscount > 0) return rawAmount + activityDiscount;
  return rawAmount;
}

function buildVariantFromOrderItem(item: Order["items"][number]): ProductVariant | null {
  if (!item.variant_id) return null;
  const matched = item.product.variants?.find((v: ProductVariant) => v.id === item.variant_id || v.sku_code === item.sku_code);
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

type OrderDetailQuickActionsProps = {
  reviewEnabled: boolean;
  hasReview: boolean;
  firstReviewableId: string;
  onReview: (orderItemId: string) => void;
  onAddToCart: () => void;
  onRepurchase: () => void;
  className?: string;
};

function OrderDetailQuickActions({
  reviewEnabled,
  hasReview,
  firstReviewableId,
  onReview,
  onAddToCart,
  onRepurchase,
  className,
}: OrderDetailQuickActionsProps) {
  const navigate = useNavigate();
  const { localizedPath, locale } = usePublicLocale();
  const copy = getOrderCopy(locale);
  return (
    <div className={className}>
      <UnifiedButton
        type="button"
        className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs"
        onClick={() => navigate(localizedPath(SUPPORT_PAGE_PATH))}
      >
        {copy.support}
      </UnifiedButton>
      {reviewEnabled && hasReview ? (
        <UnifiedButton
          type="button"
          className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs"
          onClick={() => onReview(firstReviewableId)}
        >
          {copy.review}
        </UnifiedButton>
      ) : null}
      <UnifiedButton
        type="button"
        className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs"
        onClick={onAddToCart}
      >
        {copy.addToCart}
      </UnifiedButton>
      <UnifiedButton
        type="button"
        className="min-w-[7rem] flex-1 rounded-full bg-[var(--theme-primary)] px-3 py-2 text-xs font-medium text-[var(--theme-primary-foreground)] md:flex-none"
        onClick={onRepurchase}
      >
        {copy.repurchase}
      </UnifiedButton>
    </div>
  );
}

function canViewLogistics(order: Order) {
  return order.status === "shipped" || order.status === "completed" || order.status === "refunded";
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { localizedPath, locale } = usePublicLocale();
  const copy = getOrderCopy(locale);
  const goBack = useGoBack(localizedPath("/orders"));
  const isMobileSheet = usePreferBottomSheet("standard");
  const { currentOrder: order, loading, error, loadOrderDetail, cancelOrder, confirmReceive } = useOrderStore();
  const { addToCart, clearBuyNow, setSelectAll } = useCartStore();

  const handleBack = goBack;
  const [reviewItemId, setReviewItemId] = useState("");
  const [reviewProductMeta, setReviewProductMeta] = useState<{ name?: string; variantName?: string }>({});
  const [confirmReviewOpen, setConfirmReviewOpen] = useState(false);
  const [firstReviewableId, setFirstReviewableId] = useState("");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [confirmReceiveOpen, setConfirmReceiveOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [returnApplyOpen, setReturnApplyOpen] = useState(false);
  const [repurchaseConfirmOpen, setRepurchaseConfirmOpen] = useState(false);
  const [repurchasing, setRepurchasing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingReceive, setConfirmingReceive] = useState(false);
  const capabilities = useSiteCapabilities();
  const { paying, payPendingOrder } = usePayPendingOrder();

  const viewLogistics = (target: Order) => {
    navigate(localizedPath(`/orders/${target.id}/logistics`));
  };

  useEffect(() => {
    if (id) void loadOrderDetail(id);
  }, [id, loadOrderDetail]);

  const reviewableItems = useMemo(
    () => (capabilities.reviewEnabled ? (order?.items || []).filter((i) => i.can_review && i.order_item_id) : []),
    [capabilities.reviewEnabled, order],
  );
  const step = order ? getOrderProgressStep(order) : 0;

  const reload = async () => {
    if (order?.id) await loadOrderDetail(order.id);
  };

  const addOrderToCart = async () => {
    if (!order) return;
    try {
      for (const item of order.items) {
        await addToCart(buildRepurchaseProduct(item), item.qty, buildVariantFromOrderItem(item));
      }
      toast.success(copy.cartAdded);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.addCartFailed);
    }
  };

  const repurchaseOrder = async () => {
    if (!order) return;
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

  const openReviewComposer = (orderItemId: string) => {
    const item = order?.items.find((i) => i.order_item_id === orderItemId);
    setReviewProductMeta({
      name: item?.product.name,
      variantName: item?.variant_name || item?.sku_code || undefined,
    });
    setReviewItemId(orderItemId);
  };

  const runConfirmReceive = async () => {
    if (!order) return;
    setConfirmingReceive(true);
    try {
      await confirmReceive(order.id);
      await reload();
      const next = capabilities.reviewEnabled
        ? (useOrderStore.getState().currentOrder?.items || []).filter((i) => i.can_review && i.order_item_id)
        : [];
      if (next.length) {
        setFirstReviewableId(next[0].order_item_id!);
        setConfirmReviewOpen(true);
      } else {
        toast.success(copy.received);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.receiveFailed);
    } finally {
      setConfirmingReceive(false);
    }
  };

  const quickActionProps = order
    ? {
        reviewEnabled: capabilities.reviewEnabled,
        hasReview: hasPendingReview(order),
        firstReviewableId: reviewableItems[0]?.order_item_id || "",
        onReview: openReviewComposer,
        onAddToCart: () => {
          void addOrderToCart();
        },
        onRepurchase: () => {
          setRepurchaseConfirmOpen(true);
        },
      }
    : null;

  const closeMore = () => setMoreMenuOpen(false);

  const renderMoreMenu = (target: Order) => {
    const items: Array<{ key: string; label: string; hint?: string; danger?: boolean; onClick: () => void }> = [];

    if (canUserCancelOrder(target)) {
      items.push({
        key: "cancel",
        label: copy.cancelOrder,
        hint: copy.cancelHint,
        danger: true,
        onClick: () => {
          closeMore();
          setCancelConfirmOpen(true);
        },
      });
    }
    if (target.status === "paid") {
      items.push({
        key: "support",
        label: copy.support,
        onClick: () => {
          closeMore();
          navigate(localizedPath(SUPPORT_PAGE_PATH));
        },
      });
    }
    if (canViewLogistics(target)) {
      items.push({
        key: "logistics",
        label: copy.viewLogistics,
        onClick: () => {
          closeMore();
          viewLogistics(target);
        },
      });
    }
    if (canApplyAfterSale(target) && (target.status === "shipped" || target.status === "completed")) {
      items.push({
        key: "after-sale",
        label: copy.applyAfterSale,
        onClick: () => {
          closeMore();
          setReturnApplyOpen(true);
        },
      });
    }
    if ((target.return_request_count || 0) > 0 || target.status === "refunding" || target.status === "refunded") {
      items.push({
        key: "returns",
        label: copy.viewAfterSale,
        onClick: () => {
          closeMore();
          navigate(localizedPath("/returns"));
        },
      });
    }
    if (capabilities.reviewEnabled && hasPendingReview(target)) {
      items.push({
        key: "review",
        label: copy.reviewProduct,
        hint: copy.reviewHint,
        onClick: () => {
          closeMore();
          const id = reviewableItems[0]?.order_item_id;
          if (id) openReviewComposer(id);
        },
      });
    }
    if (quickActionProps) {
      items.push({
        key: "cart",
        label: copy.addToCart,
        onClick: () => {
          closeMore();
          void addOrderToCart();
        },
      });
    }
    if (canRepurchaseOrder(target)) {
      items.push({
        key: "repurchase",
        label: copy.repurchase,
        hint: copy.repurchaseHint,
        onClick: () => {
          closeMore();
          setRepurchaseConfirmOpen(true);
        },
      });
    }

    return (
      <div className="space-y-2">
        {items.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
            className={item.danger ? `${moreActionBtn} text-[var(--theme-danger)]` : moreActionBtn}
            onClick={item.onClick}
          >
            <span>{item.label}</span>
            {item.hint ? <span className="text-xs font-normal text-[var(--theme-text-muted)]">{item.hint}</span> : null}
          </UnifiedButton>
        ))}
        {items.length === 0 ? (
          <p className="rounded-2xl bg-[var(--theme-bg)] px-4 py-5 text-center text-sm text-[var(--theme-text-muted)]">
            {copy.noMoreActions}
          </p>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <StoreAccountLayout title={copy.detailTitle} onBack={handleBack} className="store-v12-page store-order-detail-v12-page">
        <div className="rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">{copy.loading}</div>
      </StoreAccountLayout>
    );
  }

  if (error || !order) {
    return (
      <StoreAccountLayout title={copy.detailTitle} onBack={handleBack} className="store-v12-page store-order-detail-v12-page">
        <ClientEmptyState
          title={error ? copy.loadFailed : copy.notFound}
          description={error || copy.unavailable}
          action={
            <ClientButton type="button" onClick={() => id && loadOrderDetail(id)}>
              {copy.retry}
            </ClientButton>
          }
        />
      </StoreAccountLayout>
    );
  }

  const pageTitle = getBuyerOrderStatusTextLocalized(order, locale);
  const showMobileBar = isMobileSheet;
  const payActionLabel = labelPendingPaymentActionLocalized(order.payment_method, order.order_type, locale);
  const itemQuantity = order.items.reduce((total, item) => total + Number(item.qty || 0), 0);
  const logisticsText = order.logistics_provider?.carrier || order.carrier || order.tracking_no
    ? `${order.logistics_provider?.carrier || order.carrier || copy.logistics} ${order.logistics_provider?.tracking_no || order.tracking_no || ""}`.trim()
    : copy.noLogistics;
  const logisticsStatus = order.logistics_snapshot?.status_label || order.logistics_status_label || pageTitle;
  const paymentMethodLabel = labelOrderPaymentMethodLocalized(order.payment_method, order.order_type, locale);
  const paidAtLabel = order.payment_time ? order.payment_time.replace("T", " ").slice(0, 16) : pageTitle;

  const mobilePrimary =
    isPendingPayment(order) ? (
      <UnifiedButton
        type="button"
        disabled={paying}
        className="min-h-10 flex-1 rounded-full bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60"
        onClick={() => {
          void payPendingOrder(order, reload);
        }}
      >
        {paying ? copy.applying : payActionLabel}
      </UnifiedButton>
    ) : order.status === "shipped" ? (
      <UnifiedButton
        type="button"
        className="min-h-10 flex-1 rounded-full bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)]"
        onClick={() => setConfirmReceiveOpen(true)}
      >
        {copy.receive}
      </UnifiedButton>
    ) : quickActionProps ? (
      <UnifiedButton
        type="button"
        className="min-h-10 flex-1 rounded-full bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)]"
        onClick={() => setRepurchaseConfirmOpen(true)}
      >
        {copy.repurchase}
      </UnifiedButton>
    ) : null;

  return (
    <StoreAccountLayout
      title={pageTitle}
      onBack={handleBack}
      className="store-v12-page store-order-detail-v12-page"
      mainClassName="pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:pb-0 xl:pb-12"
    >
      <div className="space-y-3 text-sm">
        <section className="store-order-detail-v12-hero">
          <div className="store-order-detail-v12-hero__icon">
            <PackageCheck size={24} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="store-order-detail-v12-eyebrow">{copy.currentStatus}</p>
            <h1 className="store-order-detail-v12-title">{pageTitle}</h1>
            <p className="store-order-detail-v12-subtitle">{logisticsText}</p>
          </div>
          <div className="store-order-detail-v12-hero__actions">
            {canViewLogistics(order) ? (
              <UnifiedButton
                type="button"
                className="store-order-detail-v12-ghost-action"
                onClick={() => viewLogistics(order)}
              >
                <Truck size={15} aria-hidden />
                {copy.viewLogistics}
              </UnifiedButton>
            ) : null}
            {isPendingPayment(order) ? (
              <UnifiedButton
                type="button"
                disabled={paying}
                className="store-order-detail-v12-primary-action disabled:opacity-60"
                onClick={() => {
                  void payPendingOrder(order, reload);
                }}
              >
                {paying ? copy.applying : payActionLabel}
              </UnifiedButton>
            ) : null}
          </div>
        </section>

        <section className="store-order-detail-v12-summary store-orders-v12-stat-grid">
          <div className="store-orders-v12-stat">
            <span className="store-orders-v12-stat__icon"><WalletCards size={17} aria-hidden /></span>
            <strong>{money(order.total_amount)}</strong>
            <span>{copy.paidAmount}</span>
            <small>{Number(order.shipping_fee || 0) === 0 ? copy.freeShipping : `${copy.shippingFee} ${money(order.shipping_fee)}`}</small>
          </div>
          <div className="store-orders-v12-stat">
            <span className="store-orders-v12-stat__icon"><CreditCard size={17} aria-hidden /></span>
            <strong>{paymentMethodLabel}</strong>
            <span>{copy.paymentMethod}</span>
            <small>{paidAtLabel}</small>
          </div>
          <div className="store-orders-v12-stat">
            <span className="store-orders-v12-stat__icon"><Truck size={17} aria-hidden /></span>
            <strong>{logisticsStatus}</strong>
            <span>{copy.logistics}</span>
            <small>{logisticsText}</small>
          </div>
          <div className="store-orders-v12-stat">
            <span className="store-orders-v12-stat__icon"><ClipboardList size={17} aria-hidden /></span>
            <strong>{order.items.length} SKU</strong>
            <span>{copy.productInfo}</span>
            <small>{itemQuantity} 件商品</small>
          </div>
        </section>

        <section className="store-order-detail-v12-progress rounded-2xl border border-border bg-card p-3">
          <div className="store-order-detail-v12-section-head">
            <div>
              <p className="store-order-detail-v12-section-kicker">{copy.currentStatus}</p>
              <h2>{pageTitle}</h2>
            </div>
            <span>{formatDateTime(order.created_at)}</span>
          </div>
          {order.logistics_snapshot?.status_label || order.logistics_status_label ? (
            <p className="mt-2 rounded-xl bg-[var(--theme-surface)] px-3 py-2 text-xs text-[var(--theme-text-muted)]">
              {copy.logisticsStatus}: {order.logistics_snapshot?.status_label || order.logistics_status_label}
            </p>
          ) : null}
          {order.logistics_snapshot?.has_exception || order.logistics_exception_type ? (
            <p className="mt-2 rounded-xl bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))] px-3 py-2 text-xs text-[var(--theme-danger)]">
              {order.logistics_snapshot?.exception_message || order.logistics_exception_message || copy.logisticsException}
            </p>
          ) : null}
          {order.status === "shipped" ? (
            <div className="mt-2">
              <OrderAutoConfirmCountdown order={order} />
            </div>
          ) : null}
          {order.has_shortage_adjustment || order.shortage_notice ? (
            <p className="mt-2 rounded-xl bg-[color-mix(in_srgb,var(--theme-warning)_14%,var(--theme-surface))] px-3 py-2 text-xs text-[color-mix(in_srgb,var(--theme-warning)_76%,var(--theme-text-on-surface))]">
              {order.shortage_notice || copy.shortageFallback}
            </p>
          ) : null}
          <div className="store-order-detail-v12-step-grid mt-3">
            {getOrderStepLabels(locale).map((s, i) => (
              <div key={s}>
                <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${i <= step ? "bg-[var(--theme-primary)]" : "bg-[var(--theme-border)]"}`} />
                <span className={i <= step ? "text-[var(--theme-text)]" : "text-muted-foreground"}>{s}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="store-order-detail-v12-products rounded-2xl border border-border bg-card p-3 space-y-3">
          <div className="store-order-detail-v12-section-head">
            <div>
              <p className="store-order-detail-v12-section-kicker">{copy.productInfo}</p>
              <h2>{order.items.length} SKU · {itemQuantity} 件</h2>
            </div>
          </div>
          {order.items.map((item) => {
            const lineTotal = Number(item.subtotal ?? Number(item.unit_price || 0) * Number(item.qty || 0));
            return (
              <div key={item.order_item_id || item.id || `${item.product.id}-${item.variant_id}`} className="store-order-detail-v12-product-row">
                <ProductCoverImage
                  url={item.product.cover_image}
                  alt={item.product.name}
                  className="store-order-detail-v12-product-media self-start object-cover"
                  imgClassName="object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="store-card-title line-clamp-2">{item.product.name}</p>
                  <p className="store-caption mt-1 truncate text-muted-foreground">{item.variant_name || item.sku_code || copy.defaultVariant}</p>
                  <p className="store-caption mt-1 text-muted-foreground">
                    {money(item.unit_price ?? item.product.price ?? 0)} x {item.qty}
                  </p>
                </div>
                <div className="store-body-small shrink-0 text-right font-semibold">{money(lineTotal)}</div>
              </div>
            );
          })}
        </section>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-medium">{copy.priceDetail}</p>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">{copy.productAmount}</span>
            <span>{money(getOrderGoodsDisplayAmount(order))}</span>
          </div>
          {Number(order.discount_amount || 0) > 0 && !(order.discount_lines || []).length ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">{copy.discountAmount}</span>
              <span className="text-[var(--theme-danger)]">-RM {Number(order.discount_amount || 0).toFixed(2)}</span>
            </div>
          ) : null}
          {capabilities.pointsEnabled && Number(order.points_discount_amount || 0) > 0 ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">{copy.pointsDeduction}</span>
              <span className="text-[var(--theme-danger)]">-RM {Number(order.points_discount_amount || 0).toFixed(2)}</span>
            </div>
          ) : null}
          {Number(order.reward_cash_discount_amount || 0) > 0 ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">{copy.rewardDeduction}</span>
              <span className="text-[var(--theme-danger)]">-RM {Number(order.reward_cash_discount_amount || 0).toFixed(2)}</span>
            </div>
          ) : null}
          <OrderDiscountLines order={order} />
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">{copy.shippingFee}</span>
            <span className={Number(order.shipping_fee || 0) === 0 ? "text-[var(--theme-success)]" : undefined}>
              {Number(order.shipping_fee || 0) === 0 ? copy.freeShipping : `RM ${Number(order.shipping_fee || 0).toFixed(2)}`}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between font-semibold">
            <span className="store-body-small">{copy.paidAmount}</span>
            <span className="text-[18px] font-extrabold text-[var(--theme-price)] sm:text-xl">
              RM {Number(order.total_amount || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-medium">{copy.orderInfo}</p>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{copy.orderNo}</span>
            <UnifiedButton
              type="button"
              className="inline-flex items-center gap-1 truncate rounded-full border border-[var(--theme-border)] px-2 py-1 text-xs"
              onClick={async () => {
                await navigator.clipboard.writeText(order.order_no);
                toast.success(copy.copiedOrderNo);
              }}
            >
              {order.order_no}
              <Copy size={12} />
            </UnifiedButton>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">{copy.createdAt}</span>
            <span>{formatDateTime(order.created_at)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">{copy.paymentMethod}</span>
            <span>{labelOrderPaymentMethodLocalized(order.payment_method, order.order_type, locale)}</span>
          </div>
          {order.order_type === "points_gift" ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">{copy.orderType}</span>
              <span>{copy.pointsGiftRedeem}</span>
            </div>
          ) : null}
          {Number(order.points_used || 0) > 0 && order.order_type === "points_gift" ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">{copy.pointsUsed}</span>
              <span>{order.points_used}</span>
            </div>
          ) : null}
          {order.payment_time ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">{copy.paymentTime}</span>
              <span>{order.payment_time?.replace("T", " ").slice(0, 16)}</span>
            </div>
          ) : null}
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">{copy.recipient}</span>
            <span>{order.contact_name || "-"}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">{copy.phone}</span>
            <span>{order.contact_phone || "-"}</span>
          </div>
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">{copy.address}</span>
            <p className="mt-1">{order.address || "-"}</p>
          </div>
          {order.note ? (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">{copy.buyerNote}</span>
              <p className="mt-1">{order.note}</p>
            </div>
          ) : null}
        </div>

        <div className="hidden rounded-2xl border border-border bg-card p-3 md:flex md:flex-wrap md:justify-end md:gap-2">
          {canUserCancelOrder(order) ? (
            <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setCancelConfirmOpen(true)}>
              {copy.cancelOrder}
            </UnifiedButton>
          ) : null}
          {isPendingPayment(order) ? (
            <UnifiedButton
              type="button"
              disabled={paying}
              className="rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-3 py-1 text-xs text-[var(--theme-primary-foreground)] disabled:opacity-60"
              onClick={() => {
                void payPendingOrder(order, reload);
              }}
            >
              {paying ? copy.applying : payActionLabel}
            </UnifiedButton>
          ) : null}
          {order.status === "paid" ? (
            <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => navigate(localizedPath(SUPPORT_PAGE_PATH))}>
              {copy.support}
            </UnifiedButton>
          ) : null}
          {order.status === "shipped" ? (
            <>
              <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => viewLogistics(order)}>
                {copy.viewLogistics}
              </UnifiedButton>
              <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setReturnApplyOpen(true)}>
                {copy.applyAfterSale}
              </UnifiedButton>
              <UnifiedButton
                type="button"
                className="rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-3 py-1 text-xs text-[var(--theme-primary-foreground)]"
                onClick={() => setConfirmReceiveOpen(true)}
              >
                {copy.receive}
              </UnifiedButton>
            </>
          ) : null}
          {canApplyAfterSale(order) && order.status === "completed" ? (
            <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setReturnApplyOpen(true)}>
              {copy.applyAfterSale}
            </UnifiedButton>
          ) : null}
          {(order.return_request_count || 0) > 0 || order.status === "refunding" || order.status === "refunded" ? (
            <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => navigate(localizedPath("/returns"))}>
              {copy.viewAfterSale}
            </UnifiedButton>
          ) : null}
        </div>

        {quickActionProps ? (
          <OrderDetailQuickActions
            {...quickActionProps}
            className="hidden flex-wrap items-center justify-end gap-2 border-t border-[var(--theme-border)] pt-4 md:flex"
          />
        ) : null}
      </div>

      {showMobileBar ? (
        <div className="fixed bottom-0 left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
            <UnifiedButton
              type="button"
              className="min-h-10 shrink-0 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-sm font-semibold text-[var(--theme-text)]"
              onClick={() => setMoreMenuOpen(true)}
            >
              {copy.more}
            </UnifiedButton>
            {mobilePrimary}
          </div>
        </div>
      ) : null}

      <AppModal tier="standard" open={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} title={copy.moreActions} height="auto">
        {renderMoreMenu(order)}
      </AppModal>

      <ReturnApplySheet
        orderId={order.id}
        open={returnApplyOpen}
        onClose={() => setReturnApplyOpen(false)}
        onSuccess={() => {
          void reload();
        }}
      />

      <ReviewComposerSheet
        open={!!reviewItemId}
        onClose={() => setReviewItemId("")}
        orderItemId={reviewItemId}
        product={reviewProductMeta.name ? { name: reviewProductMeta.name } : undefined}
        variantName={reviewProductMeta.variantName}
        onSuccess={() => {
          void reload();
        }}
      />

      <BottomSheetConfirm
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        title={copy.cancelConfirmTitle}
        description={copy.cancelConfirmDescription}
        confirmText={copy.cancelConfirmText}
        cancelText={copy.rethink}
        danger
        loading={cancelling}
        onConfirm={async () => {
          setCancelling(true);
          try {
            await cancelOrder(order.id);
            await reload();
            toast.success(copy.orderCancelled);
            setCancelConfirmOpen(false);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : copy.cancelFailed);
          } finally {
            setCancelling(false);
          }
        }}
      />

      <BottomSheetConfirm
        open={confirmReceiveOpen}
        onClose={() => setConfirmReceiveOpen(false)}
        title={copy.receiveConfirmTitle}
        description={copy.receiveConfirmDescription}
        confirmText={copy.receiveConfirmText}
        cancelText={copy.cancelText}
        loading={confirmingReceive}
        onConfirm={async () => {
          setConfirmReceiveOpen(false);
          await runConfirmReceive();
        }}
      />

      <BottomSheetConfirm
        open={confirmReviewOpen}
        onClose={() => setConfirmReviewOpen(false)}
        title={copy.reviewConfirmTitle}
        description={copy.reviewConfirmDescription}
        confirmText={copy.reviewConfirmText}
        cancelText={copy.reviewLaterText}
        onConfirm={async () => {
          setConfirmReviewOpen(false);
          openReviewComposer(firstReviewableId);
        }}
      />

      <BottomSheetConfirm
        open={repurchaseConfirmOpen}
        onClose={() => setRepurchaseConfirmOpen(false)}
        title={copy.repurchaseConfirmTitle}
        description={copy.repurchaseConfirmDescription}
        confirmText={copy.checkoutText}
        cancelText={copy.cancelText}
        loading={repurchasing}
        onConfirm={async () => {
          setRepurchasing(true);
          try {
            await repurchaseOrder();
            setRepurchaseConfirmOpen(false);
          } finally {
            setRepurchasing(false);
          }
        }}
      />
    </StoreAccountLayout>
  );
}
