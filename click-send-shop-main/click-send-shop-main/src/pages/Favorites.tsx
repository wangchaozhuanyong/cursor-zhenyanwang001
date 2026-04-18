import { useEffect } from "react";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { isLoggedIn } from "@/utils/token";
import ProductCard from "@/components/ProductCard";
import PageHeader from "@/components/PageHeader";

export default function Favorites() {
  const navigate = useNavigate();
  const { favoriteProducts, loadFavorites, loading } = useFavoritesStore();

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="收藏夹" />

      <main className="mx-auto max-w-lg px-4">
        {!isLoggedIn() && (
          <div className="mb-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-xs text-foreground">
            <span className="text-muted-foreground">未登录时收藏仅保存在本机；</span>
            <button
              type="button"
              onClick={() => navigate("/login", { state: { from: "/favorites" } })}
              className="font-semibold text-gold ml-1"
            >
              登录
            </button>
            <span className="text-muted-foreground">后云端同步</span>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-20 text-muted-foreground text-sm">加载中...</div>
        ) : favoriteProducts.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Heart size={48} className="mb-3 opacity-20" />
            <p className="text-sm">收藏夹空空如也</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-primary-foreground active:scale-95 transition-transform"
            >
              去逛逛
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favoriteProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
