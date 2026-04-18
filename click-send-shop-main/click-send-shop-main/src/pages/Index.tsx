import { useEffect } from "react";
import { Search, Bell, Ticket, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";
import BannerCarousel from "@/components/BannerCarousel";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import BannerSkeleton from "@/components/BannerSkeleton";
import TrustBar from "@/components/TrustBar";
import SiteFooter from "@/components/SiteFooter";
import FeaturedReviewsSection from "@/components/FeaturedReviewsSection";
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
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-screen-xl items-center gap-3 px-4 py-3 md:px-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
            aria-label={siteName}
          >
            <img
              src={logoSrc}
              alt={siteName}
              width={32}
              height={32}
              className="rounded-md object-contain"
            />
            <h1 className="font-display text-lg font-bold tracking-tight text-foreground">
              {renderBrandTitle(siteName)}
            </h1>
          </button>

          {/* 桌面：导航菜单 */}
          <nav className="ml-6 hidden items-center gap-6 text-sm md:flex">
            <button
              onClick={() => navigate("/")}
              className="text-foreground/80 hover:text-foreground"
            >
              首页
            </button>
            <button
              onClick={() => navigate("/categories")}
              className="text-foreground/80 hover:text-foreground"
            >
              全部分类
            </button>
            <button
              onClick={() => navigate("/coupons")}
              className="text-foreground/80 hover:text-foreground"
            >
              领券中心
            </button>
            <button
              onClick={() => navigate("/about")}
              className="text-foreground/80 hover:text-foreground"
            >
              关于我们
            </button>
          </nav>

          <div
            onClick={() => navigate("/search")}
            className="flex flex-1 items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm text-muted-foreground active:bg-muted md:max-w-sm md:cursor-pointer md:hover:bg-muted"
          >
            <Search size={16} />
            <span>搜索商品...</span>
          </div>

          <button
            onClick={() => navigate("/notifications")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target"
          >
            <Bell size={20} className="text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* 桌面：登录/我的入口 */}
          <button
            onClick={() => navigate(isLoggedIn() ? "/profile" : "/login")}
            className="hidden rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-secondary md:inline-block"
          >
            {isLoggedIn() ? "我的" : "登录"}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-xl px-0 md:px-6">
        {/* Banner */}
        <div className="md:mt-4 md:overflow-hidden md:rounded-2xl">
          {bannerLoading ? <BannerSkeleton /> : <BannerCarousel banners={banners} />}
        </div>

        {/* TrustBar - 桌面端展示 4 列横排，移动端紧凑横滚 */}
        <div className="mt-4 hidden md:block">
          <TrustBar />
        </div>
        <TrustBar compact className="md:hidden" />

        {/* Categories */}
        <div className="no-scrollbar mt-6 flex gap-5 overflow-x-auto px-4 md:grid md:grid-cols-8 md:gap-3 md:overflow-visible md:px-0">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-shrink-0 flex-col items-center gap-1.5"
                >
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))
            : categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/categories?cat=${cat.id}`)}
                  className="flex flex-shrink-0 flex-col items-center gap-1.5 md:flex-shrink"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-xl transition-all active:scale-95 hover:bg-gold-light touch-target md:h-16 md:w-16 md:text-2xl">
                    {cat.icon}
                  </div>
                  <span className="text-[11px] font-medium text-foreground md:text-xs">
                    {cat.name}
                  </span>
                </button>
              ))}
        </div>

        {/* Coupon Banner */}
        {loading ? (
          <div className="mx-4 mt-5 md:mx-0">
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : (
          <button
            onClick={() => navigate("/coupons")}
            className="mx-4 mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-gold to-[hsl(43,72%,62%)] px-4 py-3.5 shadow-md active:scale-[0.98] transition-transform md:mx-0 md:px-6 md:py-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Ticket size={20} className="text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-primary-foreground md:text-base">
                领券中心
              </p>
              <p className="text-[11px] text-primary-foreground/80 md:text-xs">
                多张优惠券等你来领，最高立减 RM80
              </p>
            </div>
            <ChevronRight size={18} className="text-primary-foreground/70" />
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive md:mx-0">
            {error}
            <button onClick={loadHomeData} className="ml-2 underline">
              重试
            </button>
          </div>
        )}

        <Section
          title="🔥 热门推荐"
          onMore={() => navigate("/categories")}
          loading={loading}
        >
          <ProductGrid
            loading={loading}
            products={hotProducts}
            skeletonCount={4}
          />
        </Section>

        <Section
          title="✨ 新品上市"
          onMore={() => navigate("/categories")}
          loading={loading}
        >
          <ProductGrid
            loading={loading}
            products={newProducts}
            skeletonCount={4}
          />
        </Section>

        <Section title="💎 为你精选" loading={loading}>
          <ProductGrid
            loading={loading}
            products={recommendedProducts}
            skeletonCount={4}
          />
        </Section>

        <div className="mt-6 md:mt-10">
          <FeaturedReviewsSection limit={6} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** 商品网格：移动 2 列 / 平板 3 列 / 桌面 4 列 / 大屏 5 列 */
function ProductGrid({
  loading,
  products,
  skeletonCount = 4,
}: {
  loading: boolean;
  products: Product[];
  skeletonCount?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {loading
        ? Array.from({ length: Math.max(skeletonCount, 5) }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))
        : products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
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
    <section className="mt-8 px-4 md:px-0">
      <div className="mb-4 flex items-center justify-between">
        {loading ? (
          <Skeleton className="h-6 w-28" />
        ) : (
          <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">
            {title}
          </h2>
        )}
        {onMore && !loading && (
          <button
            onClick={onMore}
            className="text-xs text-muted-foreground hover:text-foreground active:text-foreground md:text-sm"
          >
            查看更多 →
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
