import { useEffect, useState } from "react";
import { BadgePercent, Heart, PackageCheck, ShoppingCart, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useCartStore } from "@/stores/useCartStore";
import { isLoggedIn } from "@/utils/token";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { STORE_COPY } from "@/constants/storeCopy";
import { toast } from "sonner";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";
import { usePublicLocale } from "@/i18n/publicLocale";
import type { Product } from "@/types/product";
import AccountProductCard, { AccountProductCardSkeleton } from "./components/AccountProductCard";

export default function Favorites() {
  const navigate = useNavigate();
  const { localizedPath } = usePublicLocale();
  const { favoriteProducts, loadFavorites, loading, toggleFavorite } = useFavoritesStore();
  const addItem = useCartStore((s) => s.addItem);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const saleableCount = favoriteProducts.filter((item) => Number(item.stock) > 0).length;
  const hotCount = favoriteProducts.filter((item) => item.is_hot).length;
  const activityCount = favoriteProducts.filter((item) => item.active_activity || item.activity_promo_label).length;

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return (
    <StoreAccountLayout
      title="我的收藏"
      backFallback="/profile"
      desktopBackLabel="返回我的"
      className="store-v12-page store-account-subpage-v12-page store-favorites-v12-page"
      mainClassName="sm:px-4 xl:py-6"
    >
      <div className="mx-auto w-full max-w-lg space-y-3 md:max-w-none">
        {!isLoggedIn() && (
          <div className="store-account-v12-notice">
            <span className="store-v12-card-icon"><Heart size={16} aria-hidden /></span>
            <p>未登录时收藏仅保存在本机，登录后可云端同步。</p>
            <UnifiedButton type="button" onClick={() => navigate(localizedPath("/login"), { state: { from: localizedPath("/favorites") } })} className="ml-1 font-semibold text-[var(--theme-primary)]">立即登录</UnifiedButton>
          </div>
        )}

        {favoriteProducts.length > 0 ? (
          <section className="store-account-v12-summary store-orders-v12-stat-grid store-favorites-v12-summary">
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><Heart size={17} aria-hidden /></span>
              <strong>{favoriteProducts.length}</strong>
              <span>收藏商品</span>
              <small>已保存的商品入口</small>
            </div>
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><PackageCheck size={17} aria-hidden /></span>
              <strong>{saleableCount}</strong>
              <span>可售商品</span>
              <small>库存大于 0</small>
            </div>
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><Sparkles size={17} aria-hidden /></span>
              <strong>{hotCount}</strong>
              <span>热销收藏</span>
              <small>后台热销标签</small>
            </div>
            <div className="store-orders-v12-stat">
              <span className="store-orders-v12-stat__icon"><BadgePercent size={17} aria-hidden /></span>
              <strong>{activityCount}</strong>
              <span>活动商品</span>
              <small>活动信息</small>
            </div>
          </section>
        ) : null}

        {loading && favoriteProducts.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <AccountProductCardSkeleton />
            <AccountProductCardSkeleton />
            <AccountProductCardSkeleton />
            <AccountProductCardSkeleton />
          </div>
        ) : favoriteProducts.length === 0 ? (
          <ClientEmptyState
            title="收藏夹还是空的"
            description="看到喜欢的商品可以先收藏，之后从这里快速回到商品详情。"
            icon={<Heart size={30} />}
            action={
              <ClientButton type="button" onClick={() => navigate(localizedPath("/categories"))}>
                {STORE_COPY.browseAllCategories}
              </ClientButton>
            }
          />
        ) : (
          <div className="store-account-v12-product-grid">
            {favoriteProducts.map((p, index) => (
              <AccountProductCard
                key={p.id}
                product={p as unknown as Product}
                index={index}
                className={removingId === p.id ? "opacity-50" : undefined}
                actions={
                  <>
                    <UnifiedButton
                      type="button"
                      onClick={async () => {
                        try {
                          setRemovingId(p.id);
                          await toggleFavorite(p);
                          toast.success("已取消收藏");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "取消收藏失败");
                        } finally {
                          window.setTimeout(() => setRemovingId((old) => (old === p.id ? null : old)), 180);
                        }
                      }}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] px-3 text-xs font-semibold text-[var(--theme-danger)] sm:flex-none"
                    >
                      <Trash2 size={13} aria-hidden />
                      取消收藏
                    </UnifiedButton>
                    <UnifiedButton
                      type="button"
                      onClick={async () => {
                        try {
                          await addItem(p as unknown as Product, 1, null);
                          toast.success("已加入购物车");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "加入购物车失败");
                        }
                      }}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-3 text-xs font-semibold text-[var(--theme-primary-foreground)] sm:flex-none"
                    >
                      <ShoppingCart size={13} aria-hidden />
                      加入购物车
                    </UnifiedButton>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>
    </StoreAccountLayout>
  );
}
