import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import ReviewComposerSheet from "@/components/review/ReviewComposerSheet";
import { BottomSheetConfirm } from "@/modules/micro-interactions";
import { useOrderStore } from "@/stores/useOrderStore";
import { useCartStore } from "@/stores/useCartStore";
import type { Order } from "@/types/order";
import type { ProductVariant } from "@/types/product";
import { getBuyerOrderStatusText, getOrderProgressStep, hasPendingReview } from "@/utils/orderBuyerStatus";
import { OrderDiscountLines } from "./components/OrderDiscountLines";

const steps = ["待付款", "已付款", "已发货", "已完成"];

function buildVariantFromOrderItem(item: Order["items"][number]): ProductVariant | null {
  if (!item.variant_id) return null;
  const matched = item.product.variants?.find((v: ProductVariant) => v.id === item.variant_id || v.sku_code === item.sku_code);
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

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentOrder: order, loading, error, loadOrderDetail, cancelOrder, confirmReceive } = useOrderStore();
  const { addToCart, clearBuyNow, setSelectAll } = useCartStore();

  const fromOrders = (location.state as { from?: string } | null)?.from || "/orders";
  const [reviewItemId, setReviewItemId] = useState("");
  const [confirmReviewOpen, setConfirmReviewOpen] = useState(false);
  const [firstReviewableId, setFirstReviewableId] = useState("");

  useEffect(() => {
    if (id) void loadOrderDetail(id);
  }, [id, loadOrderDetail]);

  const reviewableItems = useMemo(() => (order?.items || []).filter((i) => i.can_review && i.order_item_id), [order]);
  const step = order ? getOrderProgressStep(order) : 0;

  const reload = async () => {
    if (order?.id) await loadOrderDetail(order.id);
  };

  const addOrderToCart = async () => {
    if (!order) return;
    try {
      for (const item of order.items) {
        await addToCart(item.product, item.qty, buildVariantFromOrderItem(item));
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
        await addToCart(item.product, item.qty, buildVariantFromOrderItem(item));
      }
      toast.success("已为你重新加入购物车");
      navigate("/checkout", { state: { from: `/orders/${order.id}`, repurchaseOrderId: order.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "再买一单失败");
    }
  };

  if (loading) return <div className="min-h-screen bg-background"><PageHeader title="订单详情" onBack={() => navigate(fromOrders, { replace: true })} /><div className="px-[var(--store-page-x)] py-[var(--store-page-y)] text-sm">加载中...</div></div>;
  if (error || !order) return <div className="min-h-screen bg-background"><PageHeader title="订单详情" onBack={() => navigate(fromOrders, { replace: true })} /><div className="px-[var(--store-page-x)] py-[var(--store-page-y)] text-sm">{error || "订单不存在"}</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={getBuyerOrderStatusText(order)} onBack={() => navigate(fromOrders, { replace: true })} />

      <main className="mx-auto w-full space-y-3 px-[var(--store-page-x)] py-[var(--store-page-y)] pb-[calc(88px+env(safe-area-inset-bottom,0px))] text-sm sm:max-w-lg sm:p-4">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-medium">当前状态：{getBuyerOrderStatusText(order)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.logistics_provider?.carrier || order.tracking_no ? `物流：${order.logistics_provider?.carrier || order.carrier || ""} ${order.logistics_provider?.tracking_no || order.tracking_no || ""}` : "暂无物流信息"}
          </p>
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
                  <p className="line-clamp-2 text-sm">{item.product.name}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{item.variant_name || item.sku_code || "默认规格"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">RM {Number(item.unit_price ?? item.product.price ?? 0).toFixed(2)} x {item.qty}</p>
                </div>
                <div className="shrink-0 text-right text-sm">RM {lineTotal.toFixed(2)}</div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-medium">价格明细</p>
          <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">商品金额</span><span>RM {Number(order.raw_amount || 0).toFixed(2)}</span></div>
          {Number(order.discount_amount || 0) > 0 ? <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">优惠金额</span><span className="text-[var(--theme-danger)]">-RM {Number(order.discount_amount || 0).toFixed(2)}</span></div> : null}
          {Number(order.points_discount_amount || 0) > 0 ? <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">积分抵扣</span><span className="text-[var(--theme-danger)]">-RM {Number(order.points_discount_amount || 0).toFixed(2)}</span></div> : null}
          {Number(order.reward_cash_discount_amount || 0) > 0 ? <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">返现抵扣</span><span className="text-[var(--theme-danger)]">-RM {Number(order.reward_cash_discount_amount || 0).toFixed(2)}</span></div> : null}
          <OrderDiscountLines order={order} />
          <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">运费</span><span>RM {Number(order.shipping_fee || 0).toFixed(2)}</span></div>
          <div className="mt-3 flex justify-between text-sm font-semibold"><span>实付款</span><span className="text-[var(--theme-price)]">RM {Number(order.total_amount || 0).toFixed(2)}</span></div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-medium">订单信息</p>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">订单号</span>
            <button className="inline-flex items-center gap-1 truncate rounded-full border border-[var(--theme-border)] px-2 py-1 text-xs" onClick={async () => { await navigator.clipboard.writeText(order.order_no); toast.success("订单号已复制"); }}>
              {order.order_no}<Copy size={12} />
            </button>
          </div>
          <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">下单时间</span><span>{order.created_at?.replace("T", " ").slice(0, 16)}</span></div>
          <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">支付方式</span><span>{order.payment_method || "-"}</span></div>
          {order.payment_time ? <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">支付时间</span><span>{order.payment_time?.replace("T", " ").slice(0, 16)}</span></div> : null}
          <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">收货人</span><span>{order.contact_name || "-"}</span></div>
          <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">手机号</span><span>{order.contact_phone || "-"}</span></div>
          <div className="mt-2 text-sm"><span className="text-muted-foreground">收货地址</span><p className="mt-1">{order.address || "-"}</p></div>
          {order.note ? <div className="mt-2 text-sm"><span className="text-muted-foreground">买家备注</span><p className="mt-1">{order.note}</p></div> : null}
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 flex flex-wrap justify-end gap-2">
          {order.status === "pending" ? (
            <>
              <button className="rounded-full border px-3 py-1 text-xs" onClick={async () => { await cancelOrder(order.id); await reload(); toast.success("订单已取消"); }}>取消订单</button>
              <button className="rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-3 py-1 text-xs text-[var(--theme-primary-foreground)]" onClick={() => toast.info("支付功能待接入")}>去付款</button>
            </>
          ) : null}
          {order.status === "paid" ? <><button className="rounded-full border px-3 py-1 text-xs" onClick={() => navigate("/help")}>联系客服</button></> : null}
          {order.status === "shipped" ? <><button className="rounded-full border px-3 py-1 text-xs" onClick={() => order.logistics_provider?.tracking_url ? window.open(order.logistics_provider.tracking_url, "_blank") : toast.info("暂无物流信息")}>查看物流</button><button className="rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-3 py-1 text-xs text-[var(--theme-primary-foreground)]" onClick={async () => { await confirmReceive(order.id); await reload(); const next = (useOrderStore.getState().currentOrder?.items || []).filter((i) => i.can_review && i.order_item_id); if (next.length) { setFirstReviewableId(next[0].order_item_id!); setConfirmReviewOpen(true); } }}>确认收货</button></> : null}
          {(order.status === "refunding" || order.status === "refunded") ? <button className="rounded-full border px-3 py-1 text-xs" onClick={() => navigate("/returns")}>查看售后进度</button> : null}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-checkout-bar border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <button className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs" onClick={() => navigate("/help")}>客服</button>
          {hasPendingReview(order) ? <button className="rounded-full border border-[var(--theme-border)] px-3 py-2 text-xs" onClick={() => setReviewItemId(reviewableItems[0]?.order_item_id || "")}>评价</button> : null}
          <button className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs" onClick={() => { void addOrderToCart(); }}>加入购物车</button>
          <button className="flex-1 rounded-full bg-[var(--theme-primary)] px-3 py-2 text-xs font-medium text-[var(--theme-primary-foreground)]" onClick={() => { void repurchaseOrder(); }}>再买一单</button>
        </div>
      </div>

      <ReviewComposerSheet open={!!reviewItemId} onClose={() => setReviewItemId("")} orderItemId={reviewItemId} onSuccess={() => { void reload(); }} />
      <BottomSheetConfirm open={confirmReviewOpen} onClose={() => setConfirmReviewOpen(false)} title="已确认收货" description="现在去评价商品吗？" confirmText="去评价" cancelText="稍后再说" onConfirm={async () => { setConfirmReviewOpen(false); setReviewItemId(firstReviewableId); }} />
    </div>
  );
}
