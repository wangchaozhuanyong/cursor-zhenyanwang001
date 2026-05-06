import { useEffect, type ReactNode } from "react";
import {
  Search,
  Bell,
  Ticket,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  ShoppingCart,
  ClipboardList,
  Headphones,
  Gift,
  Flame,
  PackageCheck,
} from "lucide-react";
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
  const loggedIn = isLoggedIn();

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

  const quickActions = [
    { icon: ClipboardList, label: "我的订单", desc: "查物流/售后", path: loggedIn ? "/orders" : "/login" },
    { icon: Ticket, label: "领优惠券", desc: "先领券再买", path: "/coupons" },
    { icon: Gift, label: "积分返现", desc: "权益明细", path: loggedIn ? "/points" : "/login" },
    { icon: Headphones, label: "联系客服", desc: "购买咨询", path: "/profile" },
  ];

  const categoryShortcuts = categories.slice(0, 6);
  const heroHotProducts = hotProducts.slice(0, 3);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-24 md:pb-0">
      <section className="relative overflow-hidden border-b border-[var(--theme-border)] bg-[linear-gradient(180deg,var(--theme-surface),var(--theme-bg))]">
        <div className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--theme-price)_16%,transparent)] blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_10%,transparent)] blur-3xl" />

        <header
          className={`sticky top-0 z-40 transform-gpu will-change-transform transition-transform duration-500 ${barsHidden ? "-translate-y-full" : "translate-y-0"}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <div className="mx-auto flex w-full max-w-screen-xl items-center gap-3 px-4 py-3 md:px-6">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--theme-text-on-surface)_14%,transparent)] bg-[var(--theme-surface)]/75 px-2.5 py-2 shadow-sm backdrop-blur-xl"
              aria-label={siteName}
            >
              <img
                src={logoSrc}
                alt={siteName}
                width={34}
                height={34}
                className="theme-rounded object-contain"
              />
              <h1 className="hidden font-display text-base font-bold tracking-tight text-[var(--theme-text-on-surface)] sm:block">
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
                  className="rounded-full px-4 py-2 text-[var(--theme-text-muted-on-surface)] transition hover:bg-[color-mix(in_srgb,var(--theme-price)_10%,transparent)] hover:text-[var(--theme-text-on-surface)]"
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
              className="touch-target relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/75 shadow-sm backdrop-blur-xl transition hover:bg-[color-mix(in_srgb,var(--theme-price)_10%,transparent)]"
            >
              <Bell size={20} className="text-[var(--theme-text-on-surface)]" />
              {unreadCount > 0 && (
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--theme-price)] px-1 text-[10px] font-bold text-[var(--theme-price-foreground)] ring-2 ring-[var(--theme-surface)]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate(loggedIn ? "/profile" : "/login")}
              className="hidden rounded-full bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)] shadow-sm transition hover:opacity-90 md:inline-block"
            >
              {loggedIn ? "我的账户" : "登录 / 注册"}
            </button>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-screen-xl gap-6 px-4 pb-8 pt-4 md:grid-cols-[1.08fr_0.92fr] md:gap-8 md:px-6 md:pb-12 md:pt-8">
          <Reveal index={0} className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)]/90 p-5 shadow-[var(--theme-shadow)] backdrop-blur-xl md:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-price)_9%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-price)]">
              <Sparkles size={14} />
              今日推荐 · 领券下单更划算
            </div>
            <h2 className="mt-4 font-display text-2xl font-black leading-tight tracking-tight text-[var(--theme-text-on-surface)] md:text-4xl">
              想买什么，直接搜索
              <span className="mt-1 block text-[var(--theme-price)]">
                热销好物和优惠都在这里
              </span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-theme-muted md:text-base">
              {siteInfo.siteSlogan || "先找商品，再领优惠；订单、积分、返现和售后入口都放在首页，购物更直接。"}
            </p>

            <button
              type="button"
              onClick={() => navigate("/search")}
              className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-4 text-left shadow-inner transition active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]">
                <Search size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--theme-text)]">搜索商品、品牌、关键词</p>
                <p className="mt-0.5 text-xs text-[var(--theme-text-muted)]">快速找到想买的商品</p>
              </div>
              <ArrowRight size={18} className="text-[var(--theme-text-muted)]" />
            </button>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {quickActions.map((actionItem) => (
                <button
                  key={actionItem.label}
                  type="button"
                  onClick={() => navigate(actionItem.path)}
                  className="group rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--theme-shadow-hover)] active:scale-[0.98]"
                >
                  <actionItem.icon size={19} className="text-[var(--theme-price)]" />
                  <p className="mt-2 text-sm font-semibold text-[var(--theme-text-on-surface)]">{actionItem.label}</p>
                  <p className="mt-0.5 text-[11px] text-theme-muted">{actionItem.desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {(loading ? [] : categoryShortcuts).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(`/categories?cat=${cat.id}`)}
                  className="rounded-full border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))] px-3 py-1.5 text-xs font-medium text-[var(--theme-text-on-surface)]"
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => navigate("/categories")}
                className="rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]"
              >
                全部分类
              </button>
            </div>
          </Reveal>

          <Reveal index={1} className="space-y-5 md:space-y-6">
            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2 shadow-[var(--theme-shadow)]">
              {bannerLoading ? <BannerSkeleton /> : <BannerCarousel banners={banners} />}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/coupons")}
                className="rounded-2xl p-4 text-left shadow-[var(--theme-shadow)] transition active:scale-[0.98]"
                style={{ background: "var(--theme-gradient)", color: "var(--theme-gradient-foreground)" }}
              >
                <PercentBadge />
                <p className="mt-3 text-sm font-bold">先领券再下单</p>
                <p className="mt-1 text-xs opacity-80">查看可用优惠</p>
              </button>
              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-left shadow-[var(--theme-shadow)] transition active:scale-[0.98]"
              >
                <ShoppingCart size={22} className="text-[var(--theme-price)]" />
                <p className="mt-3 text-sm font-bold text-[var(--theme-text-on-surface)]">继续购物车</p>
                <p className="mt-1 text-xs text-theme-muted">结账前再核对</p>
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-[var(--theme-price)]" />
                  <p className="text-sm font-bold text-[var(--theme-text-on-surface)]">今日热销</p>
                </div>
                <button type="button" onClick={() => navigate("/categories")} className="text-xs text-theme-muted">
                  更多
                </button>
              </div>
              <div className="space-y-2">
                {(loading ? [] : heroHotProducts).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))] p-2 text-left"
                  >
                    <img src={product.cover_image} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[var(--theme-text-on-surface)]">{product.name}</p>
                      <p className="mt-0.5 text-sm font-bold text-[var(--theme-price)]">RM {product.price}</p>
                    </div>
                    <ChevronRight size={16} className="text-theme-muted" />
                  </button>
                ))}
                {!loading && heroHotProducts.length === 0 && (
                  <p className="rounded-xl bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))] p-4 text-center text-xs text-theme-muted">
                    暂无热销商品
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <main className="mx-auto w-full max-w-screen-xl px-0 md:px-6">
        <Reveal index={0} className="block">
          <div className="mt-8 hidden md:block md:mt-10">
            <TrustBar />
          </div>
          <TrustBar compact className="md:hidden" />
        </Reveal>

        <Section
          title="今日热销"
          subtitle="消费者正在买，适合快速下单"
          onMore={() => navigate("/categories")}
          loading={loading}
        >
          <ProductGrid
            loading={loading}
            products={hotProducts}
            skeletonCount={5}
          />
        </Section>

        {/* Categories */}
        <Reveal index={0} className="no-scrollbar mt-section flex gap-4 overflow-x-auto px-4 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mt-section-lg md:grid md:grid-cols-8 md:gap-4 md:overflow-visible md:px-0 md:snap-none">
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
            <div className="mx-4 mt-section md:mx-0 md:mt-section-lg">
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/coupons")}
              className="mx-4 mt-section flex items-center gap-3 theme-rounded px-4 py-3.5 theme-shadow transition-transform active:scale-[0.98] md:mx-0 md:mt-section-lg md:px-6 md:py-4"
              style={{ background: "var(--theme-gradient)" }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--theme-gradient-foreground)_22%,transparent)] backdrop-blur-sm">
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
          <div className="mx-4 mt-6 rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive md:mx-0">
            {error}
            <button onClick={loadHomeData} className="ml-2 underline">
              重试
            </button>
          </div>
        )}

        <Section
          title="新品上架"
          subtitle="新到商品，适合看看有没有新选择"
          onMore={() => navigate("/categories")}
          loading={loading}
        >
          <ProductGrid
            loading={loading}
            products={newProducts}
            skeletonCount={4}
          />
        </Section>

        <Section title="为你精选" subtitle="按热度和推荐度整理的商品" loading={loading}>
          <ProductGrid
            loading={loading}
            products={recommendedProducts}
            skeletonCount={4}
          />
        </Section>

        <div className="mt-section md:mt-section-lg">
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
          className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5"
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
          className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5"
        >
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  title,
  subtitle,
  onMore,
  loading,
  children,
}: {
  title: string;
  subtitle?: string;
  onMore?: () => void;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="mt-section px-4 md:mt-section-lg md:px-0">
      <Reveal index={0} className="mb-5 block md:mb-6">
        <div className="flex items-center justify-between">
          {loading ? (
            <Skeleton className="h-6 w-28" />
          ) : (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                  {subtitle}
                </p>
              )}
            </div>
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

function PercentBadge() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--theme-gradient-foreground)_22%,transparent)] text-sm font-black text-[var(--theme-gradient-foreground)] backdrop-blur">
      %
    </div>
  );
}
