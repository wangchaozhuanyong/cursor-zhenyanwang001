import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { LogisticsInfoModal } from "@/components/order/LogisticsInfoModal";
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
  getBuyerOrderStatusText,
  getOrderProgressStep,
  hasPendingReview,
  isPendingPayment,
} from "@/utils/orderBuyerStatus";
import { labelOrderPaymentMethod, labelPendingPaymentAction } from "@/utils/orderPaymentLabels";
import { formatDateTime } from "@/utils/formatDateTime";
import {
  getOrderLogisticsSnapshot,
  openOrderLogisticsExternal,
  resolveOrderLogisticsView,
  type OrderLogisticsSnapshot,
} from "@/utils/orderLogistics";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { usePayPendingOrder } from "@/hooks/usePayPendingOrder";
import { OrderDiscountLines } from "./components/OrderDiscountLines";
import ReturnApplySheet from "./ReturnApplySheet";
import { SUPPORT_PAGE_PATH } from "@/utils/supportDownloadConfig";
import { useGoBack } from "@/hooks/useGoBack";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const steps = ["待付款", "已付款", "已发货", "已完成"];

const moreActionBtn =
  "flex w-full items-center justify-between rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-left text-sm font-semibold text-[var(--theme-text)]";

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
    // 历史订单商品快照通常不携带实时库存，交给购物车接口做最终校验。
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
  return (
    <div className={className}>
      <UnifiedButton
        type="button"
        className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs"
        onClick={() => navigate(SUPPORT_PAGE_PATH)}
      >
        客服
      </UnifiedButton>
      {reviewEnabled && hasReview ? (
        <UnifiedButton
          type="button"
          className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs"
          onClick={() => onReview(firstReviewableId)}
        >
          评价
        </UnifiedButton>
      ) : null}
      <UnifiedButton
        type="button"
        className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs"
        onClick={onAddToCart}
      >
        加入购物车
      </UnifiedButton>
      <UnifiedButton
        type="button"
        className="min-w-[7rem] flex-1 rounded-full bg-[var(--theme-primary)] px-3 py-2 text-xs font-medium text-[var(--theme-primary-foreground)] md:flex-none"
        onClick={onRepurchase}
      >
        再买一单
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
  const goBack = useGoBack("/orders");
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
  const [logisticsInfo, setLogisticsInfo] = useState<OrderLogisticsSnapshot | null>(null);
  const [repurchaseConfirmOpen, setRepurchaseConfirmOpen] = useState(false);
  const [repurchasing, setRepurchasing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingReceive, setConfirmingReceive] = useState(false);
  const capabilities = useSiteCapabilities();
  const { paying, payPendingOrder } = usePayPendingOrder();

  const viewLogistics = (target: Order) => {
    const mode = resolveOrderLogisticsView(target);
    if (mode === "external") {
      openOrderLogisticsExternal(target);
      return;
    }
    if (mode === "modal") {
      setLogisticsInfo(getOrderLogisticsSnapshot(target));
      return;
    }
    toast.info("暂无物流信息");
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
      toast.success("已加入购物车");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加入购物车失败");
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
      toast.success("已为你重新加入购物车");
      navigate("/checkout", { state: { from: `/orders/${order.id}`, repurchaseOrderId: order.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "再买一单失败");
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
        toast.success("已确认收货");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "确认收货失败");
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
        label: "取消订单",
        hint: "待付款订单可取消",
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
        label: "联系客服",
        onClick: () => {
          closeMore();
          navigate(SUPPORT_PAGE_PATH);
        },
      });
    }
    if (canViewLogistics(target)) {
      items.push({
        key: "logistics",
        label: "查看物流",
        onClick: () => {
          closeMore();
          viewLogistics(target);
        },
      });
    }
    if (canApplyAfterSale(target) && (target.status === "shipped" || target.status === "completed")) {
      items.push({
        key: "after-sale",
        label: "申请售后",
        onClick: () => {
          closeMore();
          setReturnApplyOpen(true);
        },
      });
    }
    if ((target.return_request_count || 0) > 0 || target.status === "refunding" || target.status === "refunded") {
      items.push({
        key: "returns",
        label: "查看售后进度",
        onClick: () => {
          closeMore();
          navigate("/returns");
        },
      });
    }
    if (capabilities.reviewEnabled && hasPendingReview(target)) {
      items.push({
        key: "review",
        label: "评价商品",
        hint: "为订单内商品写评价",
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
        label: "加入购物车",
        onClick: () => {
          closeMore();
          void addOrderToCart();
        },
      });
    }
    if (canRepurchaseOrder(target)) {
      items.push({
        key: "repurchase",
        label: "再买一单",
        hint: "重新加入购物车并结算",
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
            当前订单暂无更多操作
          </p>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <StoreAccountLayout title="订单详情" onBack={handleBack}>
        <div className="text-sm text-muted-foreground">加载中...</div>
      </StoreAccountLayout>
    );
  }

  if (error || !order) {
    return (
      <StoreAccountLayout title="订单详情" onBack={handleBack}>
        <div className="text-sm text-muted-foreground">{error || "订单不存在"}</div>
      </StoreAccountLayout>
    );
  }

  const pageTitle = getBuyerOrderStatusText(order);
  const showMobileBar = isMobileSheet;
  const payActionLabel = labelPendingPaymentAction(order.payment_method, order.order_type);

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
        {paying ? "处理中..." : payActionLabel}
      </UnifiedButton>
    ) : order.status === "shipped" ? (
      <UnifiedButton
        type="button"
        className="min-h-10 flex-1 rounded-full bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)]"
        onClick={() => setConfirmReceiveOpen(true)}
      >
        确认收货
      </UnifiedButton>
    ) : quickActionProps ? (
      <UnifiedButton
        type="button"
        className="min-h-10 flex-1 rounded-full bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)]"
        onClick={() => setRepurchaseConfirmOpen(true)}
      >
        再买一单
      </UnifiedButton>
    ) : null;

  return (
    <StoreAccountLayout
      title={pageTitle}
      onBack={handleBack}
      mainClassName="pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:pb-0 lg:pb-12"
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-medium">当前状态：{pageTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.logistics_provider?.carrier || order.tracking_no
              ? `物流：${order.logistics_provider?.carrier || order.carrier || ""} ${order.logistics_provider?.tracking_no || order.tracking_no || ""}`
              : "暂无物流信息"}
          </p>
          {order.status === "shipped" ? (
            <div className="mt-2">
              <OrderAutoConfirmCountdown order={order} />
            </div>
          ) : null}
          {order.has_shortage_adjustment || order.shortage_notice ? (
            <p className="mt-2 rounded-xl bg-[color-mix(in_srgb,var(--theme-warning)_14%,var(--theme-surface))] px-3 py-2 text-xs text-[color-mix(in_srgb,var(--theme-warning)_76%,var(--theme-text-on-surface))]">
              {order.shortage_notice || "部分商品因缺货已移除"}
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
            {steps.map((s, i) => (
              <div key={s}>
                <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${i <= step ? "bg-[var(--theme-primary)]" : "bg-[var(--theme-border)]"}`} />
                <span className={i <= step ? "text-[var(--theme-text)]" : "text-muted-foreground"}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
          <p className="text-sm font-medium">商品信息</p>
          {order.items.map((item) => {
            const lineTotal = Number(item.subtotal ?? Number(item.unit_price || 0) * Number(item.qty || 0));
            return (
              <div key={item.order_item_id || item.id || `${item.product.id}-${item.variant_id}`} className="flex gap-2">
                <img src={item.product.cover_image} alt={item.product.name} className="h-[72px] w-[72px] rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="store-card-title line-clamp-2">{item.product.name}</p>
                  <p className="store-caption mt-1 truncate text-muted-foreground">{item.variant_name || item.sku_code || "默认规格"}</p>
                  <p className="store-caption mt-1 text-muted-foreground">
                    RM {Number(item.unit_price ?? item.product.price ?? 0).toFixed(2)} x {item.qty}
                  </p>
                </div>
                <div className="store-body-small shrink-0 text-right font-semibold">RM {lineTotal.toFixed(2)}</div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-medium">价格明细</p>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">商品金额</span>
            <span>RM {Number(order.raw_amount || 0).toFixed(2)}</span>
          </div>
          {Number(order.discount_amount || 0) > 0 && !(order.discount_lines || []).length ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">优惠金额</span>
              <span className="text-[var(--theme-danger)]">-RM {Number(order.discount_amount || 0).toFixed(2)}</span>
            </div>
          ) : null}
          {capabilities.pointsEnabled && Number(order.points_discount_amount || 0) > 0 ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">积分抵扣</span>
              <span className="text-[var(--theme-danger)]">-RM {Number(order.points_discount_amount || 0).toFixed(2)}</span>
            </div>
          ) : null}
          {Number(order.reward_cash_discount_amount || 0) > 0 ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">返现抵扣</span>
              <span className="text-[var(--theme-danger)]">-RM {Number(order.reward_cash_discount_amount || 0).toFixed(2)}</span>
            </div>
          ) : null}
          <OrderDiscountLines order={order} />
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">运费</span>
            <span className={Number(order.shipping_fee || 0) === 0 ? "text-[var(--theme-success)]" : undefined}>
              {Number(order.shipping_fee || 0) === 0 ? "包邮" : `RM ${Number(order.shipping_fee || 0).toFixed(2)}`}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between font-semibold">
            <span className="store-body-small">实付款</span>
            <span className="text-[18px] font-extrabold text-[var(--theme-price)] sm:text-xl">
              RM {Number(order.total_amount || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-medium">订单信息</p>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">订单号</span>
            <UnifiedButton
              type="button"
              className="inline-flex items-center gap-1 truncate rounded-full border border-[var(--theme-border)] px-2 py-1 text-xs"
              onClick={async () => {
                await navigator.clipboard.writeText(order.order_no);
                toast.success("订单号已复制");
              }}
            >
              {order.order_no}
              <Copy size={12} />
            </UnifiedButton>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">下单时间</span>
            <span>{formatDateTime(order.created_at)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">支付方式</span>
            <span>{labelOrderPaymentMethod(order.payment_method, order.order_type)}</span>
          </div>
          {order.order_type === "points_gift" ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">订单类型</span>
              <span>积分礼品兑换</span>
            </div>
          ) : null}
          {Number(order.points_used || 0) > 0 && order.order_type === "points_gift" ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">消耗积分</span>
              <span>{order.points_used}</span>
            </div>
          ) : null}
          {order.payment_time ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">支付时间</span>
              <span>{order.payment_time?.replace("T", " ").slice(0, 16)}</span>
            </div>
          ) : null}
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">收货人</span>
            <span>{order.contact_name || "-"}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">手机号</span>
            <span>{order.contact_phone || "-"}</span>
          </div>
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">收货地址</span>
            <p className="mt-1">{order.address || "-"}</p>
          </div>
          {order.note ? (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">买家备注</span>
              <p className="mt-1">{order.note}</p>
            </div>
          ) : null}
        </div>

        <div className="hidden rounded-2xl border border-border bg-card p-3 md:flex md:flex-wrap md:justify-end md:gap-2">
          {canUserCancelOrder(order) ? (
            <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setCancelConfirmOpen(true)}>
              取消订单
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
              {paying ? "处理中..." : payActionLabel}
            </UnifiedButton>
          ) : null}
          {order.status === "paid" ? (
            <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => navigate(SUPPORT_PAGE_PATH)}>
              联系客服
            </UnifiedButton>
          ) : null}
          {order.status === "shipped" ? (
            <>
              <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => viewLogistics(order)}>
                查看物流
              </UnifiedButton>
              <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setReturnApplyOpen(true)}>
                申请售后
              </UnifiedButton>
              <UnifiedButton
                type="button"
                className="rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-3 py-1 text-xs text-[var(--theme-primary-foreground)]"
                onClick={() => setConfirmReceiveOpen(true)}
              >
                确认收货
              </UnifiedButton>
            </>
          ) : null}
          {canApplyAfterSale(order) && order.status === "completed" ? (
            <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setReturnApplyOpen(true)}>
              申请售后
            </UnifiedButton>
          ) : null}
          {(order.return_request_count || 0) > 0 || order.status === "refunding" || order.status === "refunded" ? (
            <UnifiedButton type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => navigate("/returns")}>
              查看售后进度
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
              更多
            </UnifiedButton>
            {mobilePrimary}
          </div>
        </div>
      ) : null}

      <AppModal tier="standard" open={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} title="更多操作" height="auto">
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

      <LogisticsInfoModal
        open={logisticsInfo !== null}
        onClose={() => setLogisticsInfo(null)}
        carrier={logisticsInfo?.carrier}
        trackingNo={logisticsInfo?.trackingNo}
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
        title="取消订单"
        description="取消后订单将关闭，如需购买请重新下单。"
        confirmText="确认取消"
        cancelText="再想想"
        danger
        loading={cancelling}
        onConfirm={async () => {
          setCancelling(true);
          try {
            await cancelOrder(order.id);
            await reload();
            toast.success("订单已取消");
            setCancelConfirmOpen(false);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "取消失败");
          } finally {
            setCancelling(false);
          }
        }}
      />

      <BottomSheetConfirm
        open={confirmReceiveOpen}
        onClose={() => setConfirmReceiveOpen(false)}
        title="确认收货"
        description="请确认已收到商品且无误。确认后将无法撤销。"
        confirmText="确认收货"
        cancelText="取消"
        loading={confirmingReceive}
        onConfirm={async () => {
          setConfirmReceiveOpen(false);
          await runConfirmReceive();
        }}
      />

      <BottomSheetConfirm
        open={confirmReviewOpen}
        onClose={() => setConfirmReviewOpen(false)}
        title="已确认收货"
        description="现在去评价商品吗？"
        confirmText="去评价"
        cancelText="稍后再说"
        onConfirm={async () => {
          setConfirmReviewOpen(false);
          openReviewComposer(firstReviewableId);
        }}
      />

      <BottomSheetConfirm
        open={repurchaseConfirmOpen}
        onClose={() => setRepurchaseConfirmOpen(false)}
        title="再买一单"
        description="将把该订单商品加入购物车并前往结算页，是否继续？"
        confirmText="前往结算"
        cancelText="取消"
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
