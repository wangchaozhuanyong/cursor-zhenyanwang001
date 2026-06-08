import { useEffect, useState } from "react";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useCartStore } from "@/stores/useCartStore";
import { isLoggedIn } from "@/utils/token";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { STORE_COPY } from "@/constants/storeCopy";
import { toast } from "sonner";
import ProductCoverImage from "@/components/ProductCoverImage";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export default function Favorites() {
  const navigate = useNavigate();
  const { favoriteProducts, loadFavorites, loading, toggleFavorite } = useFavoritesStore();
  const addItem = useCartStore((s) => s.addItem);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return (
    <StoreAccountLayout title="我的收藏" backFallback="/profile" desktopBackLabel="返回我的">
      <div className="mx-auto w-full max-w-lg md:max-w-none">
        {!isLoggedIn() && (
          <div className="mb-3 rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-warning)_10%,var(--theme-surface))] px-4 py-3 text-xs text-[var(--theme-text)]">
            未登录时收藏仅保存在本机，登录后可云端同步。
            <UnifiedButton type="button" onClick={() => navigate("/login", { state: { from: "/favorites" } })} className="ml-1 font-semibold text-[var(--theme-primary)]">立即登录</UnifiedButton>
          </div>
        )}

        {loading && favoriteProducts.length === 0 ? (
          <div className="flex justify-center py-20 text-sm text-muted-foreground">加载中...</div>
        ) : favoriteProducts.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-16 text-center text-muted-foreground md:min-h-[420px]">
            <Heart size={56} className="mb-4 opacity-20" />
            <p className="text-base font-semibold text-[var(--theme-text)]">收藏夹还是空的</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--theme-text-muted)]">看到喜欢的商品可以先收藏，之后从这里快速回到商品详情。</p>
            <UnifiedButton onClick={() => navigate("/categories")} className="mt-4 rounded-full bg-[var(--theme-primary)] px-6 py-2.5 text-sm font-bold text-[var(--theme-primary-foreground)]">{STORE_COPY.browseAllCategories}</UnifiedButton>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {favoriteProducts.map((p) => (
              <div key={p.id} className={`rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 transition-opacity ${removingId === p.id ? "opacity-50" : "opacity-100"}`}>
                <div className="flex gap-3">
                  <ProductCoverImage
                    url={p.cover_image}
                    alt={p.cover_image_alt || p.name}
                    className="h-24 w-24 rounded-xl"
                    imgClassName="h-full w-full rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-[var(--theme-text)]">{p.name}</p>
                    <p className="mt-1 text-lg font-bold text-[var(--theme-price)]">RM {p.price}</p>
                    <p className="mt-1 text-xs text-[var(--theme-text-muted)]">库存 {p.stock} · {p.is_hot ? "热销" : p.is_new ? "新品" : "在售"}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <UnifiedButton type="button" onClick={() => navigate(`/product/${p.id}`)} className="rounded-xl border border-[var(--theme-border)] px-2 py-2 text-xs">查看商品</UnifiedButton>
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
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--theme-border)] px-2 py-2 text-xs text-[var(--theme-danger)]"
                  >
                    <Trash2 size={12} /> 取消收藏
                  </UnifiedButton>
                  <UnifiedButton
                    type="button"
                    onClick={async () => {
                      try {
                        await addItem(p as never, 1, null);
                        toast.success("已加入购物车");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "加入购物车失败");
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-[var(--theme-primary)] px-2 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]"
                  >
                    <ShoppingCart size={12} /> 加入购物车
                  </UnifiedButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StoreAccountLayout>
  );
}
