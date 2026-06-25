import { useEffect, useState } from "react";
import { Heart, LogIn, Plus, ShoppingCart, Store, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useCartStore } from "@/stores/useCartStore";
import { isLoggedIn } from "@/utils/token";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { toast } from "sonner";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { usePublicLocale } from "@/i18n/publicLocale";
import type { Product } from "@/types/product";
import ProductCoverImage from "@/components/ProductCoverImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import StorefrontBadge from "@/modules/storefront-v2/components/StorefrontBadge";
import StorefrontPrice from "@/modules/storefront-v2/components/StorefrontPrice";
import { buildProductCardV2Model } from "@/modules/storefront-v2/product/productCardV2Model";
import { cn } from "@/lib/utils";

export default function Favorites() {
  const navigate = useNavigate();
  const { localizedPath } = usePublicLocale();
  const { favoriteProducts, loadFavorites, loading, toggleFavorite } = useFavoritesStore();
  const addItem = useCartStore((s) => s.addItem);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const favoriteCount = favoriteProducts.length;

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return (
    <StoreAccountLayout
      title="我的收藏"
      backFallback="/profile"
      desktopBackLabel="返回我的"
      className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-favorites-page"
      mainClassName="sf-next-account-main sm:px-4 xl:py-6"
    >
      <div className="mx-auto w-full max-w-lg space-y-3 md:max-w-5xl">
        {!isLoggedIn() && (
          <div className="sf-next-notice sf-next-sync-notice">
            <span className="sf-next-card-icon"><Heart size={16} aria-hidden /></span>
            <div>
              <strong>本机收藏夹</strong>
              <p>未登录时收藏只保存在当前设备，登录后可同步到账号。</p>
            </div>
            <UnifiedButton
              type="button"
              onClick={() => navigate(localizedPath("/login"), { state: { from: localizedPath("/favorites") } })}
              className="sf-next-notice-action"
            >
              <LogIn size={15} aria-hidden />
              <span>登录同步</span>
            </UnifiedButton>
          </div>
        )}

        {loading && favoriteProducts.length === 0 ? (
          <>
            <FavoriteListHeader count={0} />
            <div className="sf-next-favorite-grid">
              <FavoriteProductTileSkeleton />
              <FavoriteProductTileSkeleton />
              <FavoriteProductTileSkeleton />
              <FavoriteProductTileSkeleton />
            </div>
          </>
        ) : favoriteProducts.length === 0 ? (
          <>
            <FavoriteListHeader count={0} />
            <section className="sf-next-state-panel sf-next-favorites-empty">
              <div className="sf-next-favorites-empty-preview" aria-hidden>
                {Array.from({ length: 4 }).map((_, index) => (
                  <span key={index}>
                    <i />
                    <b><Plus size={14} /></b>
                  </span>
                ))}
              </div>
              <span className="sf-next-state-panel__icon" aria-hidden>
                <Heart size={24} />
              </span>
              <h2>收藏夹还是空的</h2>
              <p>看到喜欢的商品可以先收藏，之后从这里快速回到商品详情。</p>
              <UnifiedButton
                type="button"
                onClick={() => navigate(localizedPath("/categories"))}
                className="sf-next-state-panel__primary"
              >
                <Store size={16} aria-hidden />
                <span>浏览商品</span>
              </UnifiedButton>
            </section>
          </>
        ) : (
          <>
            <FavoriteListHeader count={favoriteCount} />
            <div className="sf-next-favorite-grid">
              {favoriteProducts.map((p, index) => (
                <FavoriteProductTile
                  key={p.id}
                  product={p as unknown as Product}
                  index={index}
                  removing={removingId === p.id}
                  onRemove={async () => {
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
                  onAddToCart={async () => {
                    try {
                      await addItem(p as unknown as Product, 1, null);
                      toast.success("已加入购物车");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "加入购物车失败");
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </StoreAccountLayout>
  );
}

function FavoriteListHeader({ count }: { count: number }) {
  return (
    <div className="sf-next-favorites-toolbar" aria-label="收藏列表状态">
      <p>共 {count} 件</p>
      <span>最近收藏</span>
    </div>
  );
}

function FavoriteProductTile({
  product,
  index,
  removing,
  onRemove,
  onAddToCart,
}: {
  product: Product;
  index: number;
  removing: boolean;
  onRemove: () => void;
  onAddToCart: () => void;
}) {
  const { localizedPath } = usePublicLocale();
  const vm = buildProductCardV2Model(product);
  const href = localizedPath(vm.href);
  const loading = index < 4 ? "eager" : "lazy";

  return (
    <article className={cn("group sf-next-favorite-tile", removing && "opacity-50")}>
      <div className="sf-next-favorite-tile__media-wrap">
        <Link
          to={href}
          className="sf-next-favorite-tile__media"
          style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
          aria-label={`查看 ${vm.name}`}
        >
          <ProductCoverImage
            url={vm.imageUrl}
            alt={vm.imageAlt}
            className="h-full w-full"
            imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading={loading}
            fetchPriority={index === 0 ? "high" : "low"}
            sizes="(max-width: 640px) 46vw, 220px"
          />
        </Link>
        {vm.badges.length ? (
          <div className="sf-next-favorite-tile__badges">
            {vm.badges.slice(0, 2).map((badge) => (
              <StorefrontBadge key={badge.key} tone={badge.tone}>
                {badge.label}
              </StorefrontBadge>
            ))}
          </div>
        ) : null}
        <UnifiedButton
          type="button"
          aria-label={`取消收藏 ${vm.name}`}
          onClick={onRemove}
          className="sf-next-favorite-tile__remove"
        >
          <Trash2 size={15} aria-hidden />
        </UnifiedButton>
      </div>
      <Link to={href} className="sf-next-favorite-tile__title" aria-label={`查看 ${vm.name}`}>
        {vm.name}
      </Link>
      <div className="sf-next-favorite-tile__meta">
        {vm.decisionTexts.slice(0, 2).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="sf-next-favorite-tile__foot">
        <StorefrontPrice className="sf-next-favorite-tile__price" amount={vm.priceText} originalAmount={vm.originalPriceText} />
        <UnifiedButton
          type="button"
          aria-label={`加入购物车 ${vm.name}`}
          onClick={onAddToCart}
          className="sf-next-favorite-tile__cart"
        >
          <ShoppingCart size={17} aria-hidden />
        </UnifiedButton>
      </div>
    </article>
  );
}

function FavoriteProductTileSkeleton() {
  return (
    <div className="sf-next-favorite-tile" aria-hidden="true">
      <div className="sf-next-favorite-tile__media sf-next-skeleton aspect-square" />
      <div className="sf-next-skeleton mt-3 h-4 w-5/6" />
      <div className="sf-next-skeleton mt-2 h-3 w-2/3" />
      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="sf-next-skeleton h-5 w-16" />
        <div className="sf-next-skeleton h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}
