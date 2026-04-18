import { useEffect } from "react";
import { Search, Bell, Ticket, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import ProductCard from "@/components/ProductCard";
import BannerCarousel from "@/components/BannerCarousel";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import BannerSkeleton from "@/components/BannerSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import logoWebp from "@/assets/logo.webp";
import { isLoggedIn } from "@/utils/token";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { renderBrandTitle } from "@/utils/brand";

export default function Index() {
  useDocumentTitle("首页");
  const navigate = useNavigate();
  const { banners, loading: bannerLoading } = useHomeBanners();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const siteInfo = useSiteInfo();
  const logoSrc = siteInfo.logoUrl || logoWebp;
  const siteName = siteInfo.siteName || "真烟网";

  useEffect(() => {
    if (isLoggedIn()) {
      useNotificationStore.getState().fetchUnreadCount();
    }
  }, []);

  const {
    hotProducts,
    newProducts,
    recommendedProducts,
    categories,
    loading,
    error,
    loadHomeData,
  } = useProductStore();

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt={siteName} width={32} height={32} className="rounded-md object-contain" />
            <h1 className="font-display text-lg font-bold tracking-tight text-foreground">
              {renderBrandTitle(siteName)}
            </h1>
          </div>
          <div
            onClick={() => navigate("/search")}
            className="flex flex-1 items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm text-muted-foreground active:bg-muted"
          >
            <Search size={16} />
            <span>搜索商品...</span>
          </div>
          <button onClick={() => navigate("/notifications")} className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <Bell size={20} className="text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Banner（数据由页面经 useHomeBanners → Service 拉取） */}
        {bannerLoading ? <BannerSkeleton /> : <BannerCarousel banners={banners} />}

        {/* Categories */}
        <div className="no-scrollbar mt-6 flex gap-5 overflow-x-auto px-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-shrink-0 flex-col items-center gap-1.5">
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))
            : categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/categories?cat=${cat.id}`)}
                  className="flex flex-shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-xl transition-all active:scale-95 hover:bg-gold-light touch-target">
                    {cat.icon}
                  </div>
                  <span className="text-[11px] font-medium text-foreground">{cat.name}</span>
                </button>
              ))}
        </div>

        {/* Coupon Banner */}
        {loading ? (
          <div className="mx-4 mt-5">
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : (
          <button
            onClick={() => navigate("/coupons")}
            className="mx-4 mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-gold to-[hsl(43,72%,62%)] px-4 py-3.5 shadow-md active:scale-[0.98] transition-transform"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Ticket size={20} className="text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-primary-foreground">领券中心</p>
              <p className="text-[11px] text-primary-foreground/80">多张优惠券等你来领，最高立减 RM80</p>
            </div>
            <ChevronRight size={18} className="text-primary-foreground/70" />
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
            <button onClick={loadHomeData} className="ml-2 underline">
              重试
            </button>
          </div>
        )}

        <Section title="🔥 热门推荐" onMore={() => navigate("/categories")} loading={loading}>
          <div className="grid grid-cols-2 gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : hotProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </Section>

        <Section title="✨ 新品上市" onMore={() => navigate("/categories")} loading={loading}>
          <div className="grid grid-cols-2 gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : newProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </Section>

        <Section title="💎 为你精选" loading={loading}>
          <div className="grid grid-cols-2 gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : recommendedProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  onMore,
  loading,
  children,
}: {
  title: string;
  onMore?: () => void;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 px-4">
      <div className="mb-4 flex items-center justify-between">
        {loading ? (
          <Skeleton className="h-6 w-28" />
        ) : (
          <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        )}
        {onMore && !loading && (
          <button onClick={onMore} className="text-xs text-muted-foreground active:text-foreground">
            查看更多 →
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
