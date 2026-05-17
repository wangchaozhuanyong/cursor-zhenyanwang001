import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
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

  if (loading) return <div className="min-h-screen bg-background"><PageHeader title="订单详情" /><div className="p-4 text-sm text-muted-foreground">加载中...</div></div>;
  if (error || !order) return <div className="min-h-screen bg-background"><PageHeader title="订单详情" /><div className="p-4 text-sm">{error || "订单不存在"}</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="订单详情" />
      <main className="mx-auto max-w-lg space-y-3 p-4 text-sm">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">订单号</p>
          <p className="mt-1 font-medium">{order.order_no}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">状态</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{order.status}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">金额</span>
            <span className="font-semibold text-[var(--theme-price)]">RM {order.total_amount}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">收货人</span>
            <span>{order.contact_name || "-"}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-3 text-sm font-medium">商品清单</p>
          <div className="space-y-3">
            {order.items.map((item) => {
              const reviewed = !!item.review_id;
              const statusText = reviewed ? reviewStatusText(item.review_status) : "";
              return (
                <div key={item.order_item_id || item.id || `${item.product.id}-${item.variant_id}`} className="flex items-center gap-3">
                  <img src={item.product.cover_image} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover cursor-pointer" onClick={() => navigate(`/product/${item.product.id}`)} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm cursor-pointer" onClick={() => navigate(`/product/${item.product.id}`)}>{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.variant_name || item.sku_code || "默认规格"}</p>
                    <p className="text-xs text-muted-foreground">x{item.qty} / RM {item.subtotal ?? item.unit_price}</p>
                    {order.status !== "completed" && !reviewed ? <p className="text-[11px] text-muted-foreground">确认收货后可评价</p> : null}
                  </div>
                  <div className="shrink-0">
                    {order.status === "completed" && item.can_review && item.order_item_id ? (
                      <button className="rounded-full border px-3 py-1 text-xs" onClick={(e) => { e.stopPropagation(); setReviewItemId(item.order_item_id!); }}>评价</button>
                    ) : statusText ? <span className="text-xs text-muted-foreground">{statusText}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
          {order.status === "completed" && reviewableItems.length > 1 ? (
            <button
              className="mt-3 inline-flex items-center text-xs text-[var(--theme-price)]"
              onClick={() => setReviewItemId(reviewableItems[0].order_item_id!)}
            >
              去评价第一件待评价商品 <ChevronRight size={14} />
            </button>
          ) : null}
        </div>

        {order.status === "shipped" && (
          <button
            className="w-full rounded-full bg-[var(--theme-primary)] py-2.5 text-sm font-medium text-[var(--theme-primary-foreground)]"
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

        <button onClick={() => navigate('/orders')} className="w-full rounded-full border border-border py-2">返回订单列表</button>
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
