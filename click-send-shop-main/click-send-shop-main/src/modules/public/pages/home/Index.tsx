import { useEffect, type ReactNode } from "react";
import { Search, Bell, Ticket, ChevronRight, ArrowRight, ShieldCheck, Truck, Sparkles } from "lucide-react";
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
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "@/components/Reveal";
import { useScrollBarsHidden } from "@/contexts/ScrollBarsContext";

export default function Index() {
  useDocumentTitle("首页");
  const navigate = useNavigate();
  const { banners, loading: bannerLoading } = useHomeBanners();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const siteInfo = useSiteInfo();
  const logoSrc = siteInfo.logoUrl || logoWebp;
  const siteName = siteInfo.siteName || "华人真货网";
  const barsHidden = useScrollBarsHidden();

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
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-24 md:pb-0">
      <section className="relative overflow-hidden border-b border-[var(--theme-border)] bg-[radial-gradient(circle_at_top_left,rgba(214,170,76,0.20),transparent_34%),linear-gradient(135deg,var(--theme-surface),var(--theme-bg)_52%,rgba(17,24,39,0.08))]">
        <div className="pointer-events-none absolute -right-24 top-12 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        <header
          className={`sticky top-0 z-40 transform-gpu will-change-transform transition-transform duration-500 ${barsHidden ? "-translate-y-full" : "translate-y-0"}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <div className="mx-auto flex w-full max-w-screen-xl items-center gap-3 px-4 py-3 md:px-6">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-[var(--theme-surface)]/75 px-2.5 py-2 shadow-sm backdrop-blur-xl"
              aria-label={siteName}
            >
              <img
                src={logoSrc}
                alt={siteName}
                width={34}
                height={34}
                className="theme-rounded object-contain"
              />
              <h1 className="hidden font-display text-base font-bold tracking-tight text-foreground sm:block">
                {renderBrandTitle(siteName)}
              </h1>
            </button>

            <nav className="ml-2 hidden items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/75 p-1 text-sm shadow-sm backdrop-blur-xl md:flex">
              {[
                ["首页", "/"],
                ["全部分类", "/categories"],
                ["领券中心", "/coupons"],
                ["关于我们", "/about"],
              ].map(([label, path]) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="rounded-full px-4 py-2 text-foreground/70 transition hover:bg-gold/10 hover:text-foreground"
                >
                  {label}
                </button>
              ))}
            </nav>

            <div
              onClick={() => navigate("/search")}
              className="flex flex-1 items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/75 px-4 py-2.5 text-sm text-[var(--theme-text-muted)] shadow-sm backdrop-blur-xl md:max-w-sm md:cursor-pointer"
            >
              <Search size={16} />
              <span>搜索商品、品牌、分类...</span>
            </div>

            <button
              onClick={() => navigate("/notifications")}
              className="touch-target relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/75 shadow-sm backdrop-blur-xl transition hover:bg-gold/10"
            >
              <Bell size={20} className="text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-[var(--theme-price-foreground)] ring-2 ring-[var(--theme-surface)]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate(isLoggedIn() ? "/profile" : "/login")}
              className="hidden rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:opacity-90 md:inline-block"
            >
              {isLoggedIn() ? "我的账户" : "登录 / 注册"}
            </button>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-screen-xl gap-6 px-4 pb-7 pt-3 md:grid-cols-[0.9fr_1.35fr] md:px-6 md:pb-10 md:pt-8">
          <Reveal index={0} className="flex flex-col justify-center">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold">
              <Sparkles size={14} />
              精选品质 · 快速配送 · 安心购物
            </div>
            <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-foreground md:text-5xl">
              为懂品质的人，
              <span className="block bg-gradient-to-r from-gold via-amber-400 to-gold bg-clip-text text-transparent">
                打造更高级的购物体验
              </span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
              {siteInfo.siteSlogan || "严选热销好物、优惠券福利与会员权益，一站式完成浏览、下单、配送与售后。"}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/categories")}
                className="group flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-[var(--theme-price-foreground)] shadow-lg shadow-gold/20 transition active:scale-[0.98]"
              >
                开始选购
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => navigate("/coupons")}
                className="flex items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/80 px-5 py-3 text-sm font-semibold text-foreground shadow-sm backdrop-blur-xl transition hover:bg-secondary"
              >
                <Ticket size={16} className="text-gold" />
                领取优惠
              </button>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-2 text-xs md:max-w-md">
              {[
                { icon: ShieldCheck, label: "正品保障" },
                { icon: Truck, label: "快速配送" },
                { icon: Ticket, label: "会员优惠" },
              ].map((it) => (
                <div key={it.label} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/70 p-3 shadow-sm backdrop-blur-xl">
                  <it.icon size={18} className="mb-2 text-gold" />
                  <p className="font-semibold text-foreground">{it.label}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal index={1} className="relative md:pl-2">
            <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-gold/20 via-transparent to-foreground/10 blur-xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--theme-surface)]/70 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl">
              {bannerLoading ? <BannerSkeleton /> : <BannerCarousel banners={banners} />}
            </div>
          </Reveal>
        </div>
      </section>

      <main className="mx-auto w-full max-w-screen-xl px-0 md:px-6">
        <Reveal index={0} className="block">
          <div className="mt-4 hidden md:block">
            <TrustBar />
          </div>
          <TrustBar compact className="md:hidden" />
        </Reveal>

        {/* Categories */}
        <Reveal index={0} className="no-scrollbar mt-6 flex gap-5 overflow-x-auto px-4 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-8 md:gap-3 md:overflow-visible md:px-0 md:snap-none">
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
                  className="flex snap-start flex-shrink-0 flex-col items-center gap-1.5 md:flex-shrink"
                >
                  <div className="flex h-14 w-14 items-center justify-center theme-rounded bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xl transition-all active:scale-95 touch-target md:h-16 md:w-16 md:text-2xl">
                    {cat.icon}
                  </div>
                  <span className="text-[11px] font-medium text-foreground md:text-xs">
                    {cat.name}
                  </span>
                </button>
              ))}
        </Reveal>

        {/* Coupon Banner */}
        <Reveal index={0} className="block">
          {loading ? (
            <div className="mx-4 mt-5 md:mx-0">
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/coupons")}
              className="mx-4 mt-5 flex items-center gap-3 theme-rounded px-4 py-3.5 theme-shadow transition-transform active:scale-[0.98] md:mx-0 md:px-6 md:py-4"
              style={{ background: "var(--theme-gradient)" }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Ticket size={20} className="text-[var(--theme-gradient-foreground)]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-[var(--theme-gradient-foreground)] md:text-base">
                  领券中心
                </p>
                <p className="text-[11px] opacity-80 md:text-xs" style={{ color: "var(--theme-gradient-foreground)" }}>
                  多张优惠券等你来领，最高立减 RM80
                </p>
              </div>
              <ChevronRight size={18} className="opacity-70" style={{ color: "var(--theme-gradient-foreground)" }} />
            </button>
          )}
        </Reveal>

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
    <AnimatePresence mode="wait" initial={false}>
      {loading ? (
        <motion.div
          key="skeleton-grid"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5"
        >
          {Array.from({ length: Math.max(skeletonCount, 5) }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </motion.div>
      ) : (
        <motion.div
          key="product-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.26, ease: "easeInOut" }}
          className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5"
        >
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </motion.div>
      )}
    </AnimatePresence>
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
  children: ReactNode;
}) {
  return (
    <section className="mt-8 px-4 md:px-0">
      <Reveal index={0} className="mb-4 block">
        <div className="flex items-center justify-between">
          {loading ? (
            <Skeleton className="h-6 w-28" />
          ) : (
            <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">
              {title}
            </h2>
          )}
          {onMore && !loading && (
            <button
              type="button"
              onClick={onMore}
              className="text-xs text-muted-foreground hover:text-foreground active:text-foreground md:text-sm"
            >
              查看更多 →
            </button>
          )}
        </div>
      </Reveal>
      {children}
    </section>
  );
}
