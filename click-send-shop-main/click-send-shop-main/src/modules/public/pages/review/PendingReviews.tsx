import { useEffect, useMemo, useState } from "react";

import { CheckCircle2, MessageSquareText, PackageCheck, RefreshCw, Star } from "lucide-react";
import * as reviewService from "@/services/reviewService";
import type { PendingReviewItem } from "@/types/review";
import ReviewComposerSheet from "@/components/review/ReviewComposerSheet";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import ProductCoverImage from "@/components/ProductCoverImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { usePublicLocale } from "@/i18n/publicLocale";
import "@/styles/pending-reviews.css";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

export default function PendingReviews() {
  const navigate = useStorefrontNavigate();
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
      className="sf-next-page sf-next-route-page sf-next-pending-reviews-page sf-next-account-route-page"
      mainClassName="sf-next-account-main sm:px-4 xl:py-6"
      rightSlot={
        <UnifiedButton
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="sf-next-pending-reviews-refresh"
          aria-label="刷新待评价商品"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden />
        </UnifiedButton>
      }
    >
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <section className="sf-next-pending-reviews-hero">
          <span className="sf-next-pending-reviews-hero__icon" aria-hidden>
            <Star size={22} />
          </span>
          <div className="min-w-0">
            <p>评价中心</p>
            <h2>{items.length} 件商品待评价</h2>
          </div>
        </section>

        {loading ? (
          <section className="sf-next-pending-reviews-loading" aria-busy="true" aria-live="polite">
            <div className="sf-next-pending-reviews-loading__head">
              <span aria-hidden>
                <MessageSquareText size={18} />
              </span>
              <div>
                <h2>同步评价资格</h2>
                <p>确认收货后的商品会自动出现在这里。</p>
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="sf-next-pending-reviews-skeleton">
                <span />
                <div>
                  <i />
                  <i />
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {!loading && error ? (
          <section className="sf-next-state-panel sf-next-pending-reviews-state" role="alert">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <MessageSquareText size={28} />
            </span>
            <h2>待评价商品加载失败</h2>
            <p>{error}</p>
            <UnifiedButton type="button" onClick={() => void load()} className="sf-next-state-panel__primary">
              <RefreshCw size={17} aria-hidden />
              重试
            </UnifiedButton>
          </section>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <section className="sf-next-state-panel sf-next-pending-reviews-state">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <PackageCheck size={28} />
            </span>
            <h2>暂无待评价商品</h2>
            <p>确认收货后，可评价的商品会显示在这里。</p>
            <UnifiedButton
              type="button"
              onClick={() => navigate(localizedPath("/orders?tab=pending_review"))}
              className="sf-next-state-panel__primary"
            >
              <PackageCheck size={17} aria-hidden />
              查看订单
            </UnifiedButton>
          </section>
        ) : null}

        {!loading && !error && grouped.length ? (
          <div className="sf-next-pending-reviews-stack">
            {grouped.map(([orderId, list]) => (
              <section key={orderId} className="sf-next-pending-reviews-card">
                <div className="sf-next-pending-reviews-card__head">
                  <span aria-hidden><PackageCheck size={16} /></span>
                  <p>订单号：{list[0].order_no}</p>
                </div>
                <div className="sf-next-pending-reviews-items">
                  {list.map((it) => (
                    <article key={it.order_item_id} className="sf-next-pending-reviews-item">
                      <UnifiedButton
                        type="button"
                        className="sf-next-pending-reviews-cover"
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
                      <div className="sf-next-pending-reviews-copy">
                        <p>{it.product_name}</p>
                        <span>{it.variant_name || it.sku_code || "默认规格"}</span>
                      </div>
                      <UnifiedButton
                        type="button"
                        className="sf-next-pending-reviews-action"
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

        {!loading && !error ? (
          <section className="sf-next-pending-reviews-guide" aria-label="评价说明">
            <h2>评价规范</h2>
            <ul>
              <li>
                <CheckCircle2 size={16} aria-hidden />
                <span>确认收货后，符合评价条件的商品会自动进入待评价列表。</span>
              </li>
              <li>
                <CheckCircle2 size={16} aria-hidden />
                <span>提交后评价会进入审核流程，通过后展示在商品页。</span>
              </li>
              <li>
                <CheckCircle2 size={16} aria-hidden />
                <span>已评价商品会从待评价列表移除，不会重复提醒。</span>
              </li>
            </ul>
          </section>
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
