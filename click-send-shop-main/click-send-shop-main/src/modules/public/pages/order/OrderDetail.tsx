import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import ReviewComposerSheet from "@/components/review/ReviewComposerSheet";
import { BottomSheetConfirm } from "@/modules/micro-interactions";
import { useOrderStore } from "@/stores/useOrderStore";
import { getBuyerOrderStatusText, getOrderProgressStep, hasPendingReview } from "@/utils/orderBuyerStatus";

const steps = ["待付款", "已付款", "已发货", "已完成"];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrder: order, loading, error, loadOrderDetail, cancelOrder, confirmReceive } = useOrderStore();
  const [reviewItemId, setReviewItemId] = useState("");
  const [confirmReviewOpen, setConfirmReviewOpen] = useState(false);
  const [firstReviewableId, setFirstReviewableId] = useState("");

  useEffect(() => {
    if (id) void loadOrderDetail(id);
  }, [id, loadOrderDetail]);

  const reviewableItems = useMemo(() => (order?.items || []).filter((i) => i.can_review && i.order_item_id), [order]);
  const step = order ? getOrderProgressStep(order) : 0;

  if (loading) return <div className="min-h-screen bg-background"><PageHeader title="订单详情" /><div className="p-4 text-sm">加载中...</div></div>;
  if (error || !order) return <div className="min-h-screen bg-background"><PageHeader title="订单详情" /><div className="p-4 text-sm">{error || "订单不存在"}</div></div>;

  const reload = async () => { await loadOrderDetail(order.id); };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="订单详情" />
      <main className="mx-auto max-w-lg space-y-3 p-4 text-sm">
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">订单号：{order.order_no}</p>
            <p className="text-xs">{getBuyerOrderStatusText(order)}</p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
            {steps.map((s, i) => (
              <div key={s}>
                <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${i <= step ? "bg-[var(--theme-primary)]" : "bg-[var(--theme-border)]"}`} />
                <span className={i <= step ? "text-[var(--theme-text)]" : "text-muted-foreground"}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p>金额：RM {order.total_amount}</p>
          <p className="mt-1">收货人：{order.contact_name || "-"}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
          {order.items.map((item) => (
            <div key={item.order_item_id || item.id || `${item.product.id}-${item.variant_id}`} className="flex items-center gap-3">
              <img src={item.product.cover_image} alt={item.product.name} className="h-14 w-14 rounded object-cover cursor-pointer" onClick={() => navigate(`/product/${item.product.id}`)} />
              <div className="flex-1 min-w-0">
                <p className="truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">{item.variant_name || item.sku_code || "默认规格"} x{item.qty}</p>
              </div>
              {order.status === "completed" && item.can_review && item.order_item_id ? (
                <button className="rounded-full border px-3 py-1 text-xs" onClick={() => setReviewItemId(item.order_item_id!)}>评价</button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {order.status === "pending" ? (
            <>
              <button className="rounded-full border px-3 py-1 text-xs" onClick={async () => { await cancelOrder(order.id); await reload(); toast.success("订单已取消"); }}>取消订单</button>
              <button className="rounded-full border px-3 py-1 text-xs" onClick={() => navigate(`/orders/${order.id}`)}>去付款</button>
            </>
          ) : null}
          {order.status === "paid" ? (
            <>
              <button className="rounded-full border px-3 py-1 text-xs" onClick={() => navigate("/help")}>联系客服</button>
              <button className="rounded-full border px-3 py-1 text-xs" onClick={() => navigate(`/orders/${order.id}`)}>查看详情</button>
            </>
          ) : null}
          {order.status === "shipped" ? (
            <>
              <button className="rounded-full border px-3 py-1 text-xs" onClick={() => order.logistics_provider?.tracking_url ? window.open(order.logistics_provider.tracking_url, "_blank") : toast.info("暂无物流信息")}>查看物流</button>
              <button className="rounded-full border px-3 py-1 text-xs" onClick={async () => { await confirmReceive(order.id); await reload(); const next = (useOrderStore.getState().currentOrder?.items || []).filter((i) => i.can_review && i.order_item_id); if (next.length) { setFirstReviewableId(next[0].order_item_id!); setConfirmReviewOpen(true); } }}>确认收货</button>
            </>
          ) : null}
          {order.status === "completed" && hasPendingReview(order) ? (
            <button className="rounded-full border px-3 py-1 text-xs" onClick={() => setReviewItemId(reviewableItems[0]?.order_item_id || "")}>评价商品</button>
          ) : null}
          {order.status === "completed" && !hasPendingReview(order) ? (
            <button className="rounded-full border px-3 py-1 text-xs" onClick={() => { const pid = order.items[0]?.product.id; if (pid) navigate(`/product/${pid}`); }}>再次购买</button>
          ) : null}
          {(order.status === "refunding" || order.status === "refunded") ? (
            <button className="rounded-full border px-3 py-1 text-xs" onClick={() => navigate("/returns")}>查看售后进度</button>
          ) : null}
        </div>
      </main>

      <ReviewComposerSheet open={!!reviewItemId} onClose={() => setReviewItemId("")} orderItemId={reviewItemId} onSuccess={() => { void reload(); }} />
      <BottomSheetConfirm open={confirmReviewOpen} onClose={() => setConfirmReviewOpen(false)} title="已确认收货" description="现在去评价商品吗？" confirmText="去评价" cancelText="稍后再说" onConfirm={async () => { setConfirmReviewOpen(false); setReviewItemId(firstReviewableId); }} />
    </div>
  );
}
