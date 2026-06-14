import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as reviewService from "@/services/reviewService";
import type { PendingReviewItem } from "@/types/review";
import ReviewComposerSheet from "@/components/review/ReviewComposerSheet";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import ProductCoverImage from "@/components/ProductCoverImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";

export default function PendingReviews() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PendingReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderItemId, setOrderItemId] = useState("");
  const selectedItem = items.find((it) => it.order_item_id === orderItemId);

  const grouped = useMemo(() => {
    const map = new Map<string, PendingReviewItem[]>();
    items.forEach((it) => {
      const list = map.get(it.order_id) || [];
      list.push(it);
      map.set(it.order_id, list);
    });
    return Array.from(map.entries());
  }, [items]);

  const load = async () => {
    setLoading(true);
    const data = await reviewService.fetchPendingReviewItems();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="mb-4 text-lg font-semibold">待评价</h1>
      {loading ? <p className="rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">加载中...</p> : null}
      {!loading && items.length === 0 ? (
        <ClientEmptyState
          title="暂无待评价商品"
          description="确认收货后，可评价的商品会显示在这里。"
          action={
            <ClientButton type="button" variant="secondary" onClick={() => navigate("/orders?tab=pending_review")}>
              查看订单
            </ClientButton>
          }
        />
      ) : null}
      <div className="space-y-4">
        {grouped.map(([orderId, list]) => (
          <div key={orderId} className="rounded-xl border p-3">
            <p className="mb-2 text-xs text-muted-foreground">订单号：{list[0].order_no}</p>
            {list.map((it) => (
              <div key={it.order_item_id} className="mb-2 flex items-center gap-3">
                <UnifiedButton
                  type="button"
                  className="w-10 overflow-hidden rounded p-0"
                  style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
                  onClick={() => navigate(`/product/${it.product_id}`)}
                  aria-label={`查看 ${it.product_name}`}
                >
                  <ProductCoverImage
                    url={it.product_image}
                    className="h-full w-full object-cover"
                    imgClassName="object-cover"
                    alt={it.product_name}
                  />
                </UnifiedButton>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{it.product_name}</p>
                  <p className="text-xs text-muted-foreground">{it.variant_name || it.sku_code || "默认规格"}</p>
                </div>
                <UnifiedButton
                  type="button"
                  className="rounded-full border px-3 py-1 text-xs"
                  onClick={() => setOrderItemId(it.order_item_id)}
                >
                  写评价
                </UnifiedButton>
              </div>
            ))}
          </div>
        ))}
      </div>
      <ReviewComposerSheet
        open={!!orderItemId}
        onClose={() => setOrderItemId("")}
        orderItemId={orderItemId}
        product={selectedItem ? { name: selectedItem.product_name, cover_image: selectedItem.product_image } : undefined}
        variantName={selectedItem?.variant_name || selectedItem?.sku_code || undefined}
        onSuccess={() => {
          void load();
        }}
      />
    </div>
  );
}
