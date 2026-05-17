import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import ReviewComposerSheet from "@/components/review/ReviewComposerSheet";
import { BottomSheetConfirm } from "@/modules/micro-interactions";
import { useOrderStore } from "@/stores/useOrderStore";

function reviewStatusText(reviewStatus?: string | null) {
  if (!reviewStatus) return "已评价";
  if (reviewStatus === "pending") return "评价待审核";
  if (reviewStatus === "rejected") return "评价未通过";
  if (reviewStatus === "normal" || reviewStatus === "hidden") return "已评价";
  return "已评价";
}

export default function OrderDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentOrder: order, loading, error, loadOrderDetail, confirmReceive } = useOrderStore();
  const [reviewItemId, setReviewItemId] = useState<string>("");
  const [confirmReviewOpen, setConfirmReviewOpen] = useState(false);
  const [firstReviewableId, setFirstReviewableId] = useState<string>("");

  useEffect(() => {
    if (id) void loadOrderDetail(id);
  }, [id, loadOrderDetail]);

  const reviewableItems = useMemo(() => (order?.items || []).filter((i) => i.can_review && i.order_item_id), [order]);

  useEffect(() => {
    if (!order) return;
    if (searchParams.get("review") !== "1") return;
    if (reviewableItems.length === 1) setReviewItemId(reviewableItems[0].order_item_id!);
  }, [order, searchParams, reviewableItems]);

  if (loading) return <div className="min-h-screen bg-background"><PageHeader title="订单详情" /><div className="p-4 text-sm">加载中...</div></div>;
  if (error || !order) return <div className="min-h-screen bg-background"><PageHeader title="订单详情" /><div className="p-4 text-sm">{error || "订单不存在"}</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="订单详情" />
      <main className="mx-auto max-w-lg space-y-3 p-4 text-sm">
        <div className="rounded-xl border p-3">订单号: {order.order_no}</div>
        <div className="rounded-xl border p-3">状态: {order.status}</div>
        <div className="rounded-xl border p-3">金额: RM {order.total_amount}</div>
        <div className="rounded-xl border p-3">收货人: {order.contact_name || "-"}</div>

        <div className="rounded-xl border p-3 space-y-3">
          {order.items.map((item) => {
            const reviewed = !!item.review_id;
            const statusText = reviewed ? reviewStatusText(item.review_status) : "";
            return (
              <div key={item.order_item_id || item.id || `${item.product.id}-${item.variant_id}`} className="flex items-center gap-3">
                <img src={item.product.cover_image} alt={item.product.name} className="h-14 w-14 rounded object-cover cursor-pointer" onClick={() => navigate(`/product/${item.product.id}`)} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm cursor-pointer" onClick={() => navigate(`/product/${item.product.id}`)}>{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{item.variant_name || item.sku_code || "默认规格"}</p>
                  <p className="text-xs text-muted-foreground">x{item.qty} / RM {item.subtotal ?? item.unit_price}</p>
                  {order.status !== "completed" && !reviewed ? <p className="text-[11px] text-muted-foreground">确认收货后可评价</p> : null}
                </div>
                {order.status === "completed" && item.can_review && item.order_item_id ? (
                  <button className="rounded-full border px-3 py-1 text-xs" onClick={(e) => { e.stopPropagation(); setReviewItemId(item.order_item_id!); }}>评价</button>
                ) : statusText ? <span className="text-xs text-muted-foreground">{statusText}</span> : null}
              </div>
            );
          })}
        </div>

        {order.status === "shipped" && (
          <button
            className="w-full rounded-full bg-[var(--theme-primary)] py-2 text-sm text-[var(--theme-primary-foreground)]"
            onClick={async () => {
              await confirmReceive(order.id);
              await loadOrderDetail(order.id);
              const nextReviewable = (useOrderStore.getState().currentOrder?.items || []).filter((i) => i.can_review && i.order_item_id);
              if (nextReviewable.length > 0) {
                toast.success("已确认收货，现在评价商品可分享体验");
                setFirstReviewableId(nextReviewable[0].order_item_id!);
                setConfirmReviewOpen(true);
              }
            }}
          >
            确认收货
          </button>
        )}

        <button onClick={() => navigate('/orders')} className="rounded-full border px-4 py-2">返回订单列表</button>
      </main>

      <ReviewComposerSheet open={!!reviewItemId} onClose={() => setReviewItemId("")} orderItemId={reviewItemId} onSuccess={() => { if (order?.id) void loadOrderDetail(order.id); }} />

      <BottomSheetConfirm
        open={confirmReviewOpen}
        onClose={() => setConfirmReviewOpen(false)}
        title="已确认收货"
        description="现在评价商品可分享体验"
        confirmText="去评价"
        cancelText="稍后再说"
        onConfirm={async () => {
          setConfirmReviewOpen(false);
          setReviewItemId(firstReviewableId);
        }}
      />
    </div>
  );
}
