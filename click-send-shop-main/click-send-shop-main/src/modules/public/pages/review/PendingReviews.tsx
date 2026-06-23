import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquareText, PackageCheck, RefreshCw, Star } from "lucide-react";
import * as reviewService from "@/services/reviewService";
import type { PendingReviewItem } from "@/types/review";
import ReviewComposerSheet from "@/components/review/ReviewComposerSheet";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import ProductCoverImage from "@/components/ProductCoverImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { usePublicLocale } from "@/i18n/publicLocale";

export default function PendingReviews() {
  const navigate = useNavigate();
  const { localizedPath } = usePublicLocale();
  const [items, setItems] = useState<PendingReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    setError("");
    try {
      const data = await reviewService.fetchPendingReviewItems();
      setItems(data);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "待评价商品加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <StoreAccountLayout
      title="待评价"
      backFallback="/profile"
      className="sf-next-page store-v12-page store-pending-reviews-v12-page store-account-subpage-v12-page"
      mainClassName="sf-next-account-main sm:px-4 xl:py-6"
      rightSlot={
        <UnifiedButton
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="store-pending-reviews-v12-refresh"
          aria-label="刷新待评价商品"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden />
        </UnifiedButton>
      }
    >
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <section className="store-pending-reviews-v12-hero">
          <span className="store-pending-reviews-v12-hero__icon" aria-hidden>
            <Star size={22} />
          </span>
          <div className="min-w-0">
            <p>评价中心</p>
            <h2>{items.length} 件商品待评价</h2>
          </div>
        </section>

        {loading ? (
          <div className="store-pending-reviews-v12-stack">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="store-pending-reviews-v12-skeleton">
                <span />
                <div>
                  <i />
                  <i />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <section className="store-account-v12-empty-panel store-pending-reviews-v12-state" role="alert">
            <span className="store-account-v12-empty-panel__icon" aria-hidden>
              <MessageSquareText size={28} />
            </span>
            <h2>待评价商品加载失败</h2>
            <p>{error}</p>
            <UnifiedButton type="button" onClick={() => void load()} className="store-account-v12-empty-panel__action">
              <RefreshCw size={17} aria-hidden />
              重试
            </UnifiedButton>
          </section>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <section className="store-account-v12-empty-panel store-pending-reviews-v12-state">
            <span className="store-account-v12-empty-panel__icon" aria-hidden>
              <PackageCheck size={28} />
            </span>
            <h2>暂无待评价商品</h2>
            <p>确认收货后，可评价的商品会显示在这里。</p>
            <UnifiedButton
              type="button"
              onClick={() => navigate(localizedPath("/orders?tab=pending_review"))}
              className="store-account-v12-empty-panel__action"
            >
              <PackageCheck size={17} aria-hidden />
              查看订单
            </UnifiedButton>
          </section>
        ) : null}

        {!loading && !error && grouped.length ? (
          <div className="store-pending-reviews-v12-stack">
            {grouped.map(([orderId, list]) => (
              <section key={orderId} className="store-pending-reviews-v12-card">
                <div className="store-pending-reviews-v12-card__head">
                  <span aria-hidden><PackageCheck size={16} /></span>
                  <p>订单号：{list[0].order_no}</p>
                </div>
                <div className="store-pending-reviews-v12-items">
                  {list.map((it) => (
                    <article key={it.order_item_id} className="store-pending-reviews-v12-item">
                      <UnifiedButton
                        type="button"
                        className="store-pending-reviews-v12-cover"
                        style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
                        onClick={() => navigate(localizedPath(`/product/${it.product_id}`))}
                        aria-label={`查看 ${it.product_name}`}
                      >
                        <ProductCoverImage
                          url={it.product_image}
                          className="h-full w-full object-cover"
                          imgClassName="object-cover"
                          alt={it.product_name}
                        />
                      </UnifiedButton>
                      <div className="store-pending-reviews-v12-copy">
                        <p>{it.product_name}</p>
                        <span>{it.variant_name || it.sku_code || "默认规格"}</span>
                      </div>
                      <UnifiedButton
                        type="button"
                        className="store-pending-reviews-v12-action"
                        onClick={() => setOrderItemId(it.order_item_id)}
                      >
                        写评价
                      </UnifiedButton>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
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
    </StoreAccountLayout>
  );
}
