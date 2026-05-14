import { useEffect, useMemo, useState, useRef } from "react";
import { Flame, Gift, Heart, LayoutGrid, RefreshCw, Search, ShoppingCart, Sparkles, Star, Ticket, Truck, Zap, ShieldCheck, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import logoWebp from "@/assets/logo.webp";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import BannerCarousel from "@/components/BannerCarousel";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import HomeOpsBlocks from "./HomeOpsBlocks";
import * as productService from "@/services/productService";
import type { UserCoupon } from "@/types/coupon";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import NotificationIconButton from "@/components/NotificationIconButton";
import { userCouponToPremiumDisplay } from "@/utils/couponDisplay";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import type { Product } from "@/types/product";
import { buildPersonalizedRecommendations } from "@/utils/personalizedRecommendations";
import { supportsColorMix } from "@/utils/cssSupport";
import { isLoggedIn } from "@/utils/token";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

function Header({ title, icon: Icon, subtitle }: { title: string; icon?: React.ElementType; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-base font-bold tracking-widest text-[var(--theme-text-on-surface)]">
        {Icon && <Icon className="h-5 w-5 text-[var(--theme-price)]" />}
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs tracking-wider text-[var(--theme-text-muted)]">{subtitle}</p>}
    </div>
  );
}

export default function MemberHome() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { hotProducts, newProducts, recommendedProducts, loading: homeLoading, loadHomeData } = useProductStore();
  const siteInfo = useSiteInfo();
  const inactiveDotColor = supportsColorMix() ? "color-mix(in srgb, #ffffff 45%, transparent)" : "rgba(255,255,255,0.45)";
  const couponLoading = useCouponStore((s) => s.loading);
  const coupons = useCouponStore((s) => s.coupons);
  const claimCoupon = useCouponStore((s) => s.claimCoupon);
  const selectedCartCount = useCartStore((s) => s.getSelectedItems().length);
  const cartItems = useCartStore((s) => s.items);
  const loadCart = useCartStore((s) => s.loadCart);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const favoriteProducts = useFavoritesStore((s) => s.favoriteProducts);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  const historyProducts = useHistoryStore((s) => s.history);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const orders = useOrderStore((s) => s.orders);
  const loadOrders = useOrderStore((s) => s.loadOrders);
  const [claimingCouponId, setClaimingCouponId] = useState<string | null>(null);
  const siteName = siteInfo.siteName || "大马通";
  const logoSrc = (siteInfo.logoUrl || "").trim() || logoWebp;
  const { banners } = useHomeBanners();
  const { themeConfig } = useThemeRuntime();
  const homeLayout = themeConfig.homeLayout ?? "classic";
  const isPremiumLayout = homeLayout === "premium";
  const isDealLayout = homeLayout === "deal";
  const isMagazineLayout = homeLayout === "magazine";
  const headerClass =
    themeConfig.headerStyle === "dark"
      ? "bg-[color-mix(in_srgb,var(--theme-primary)_88%,black)] text-[var(--theme-primary-foreground)] border-transparent"
      : themeConfig.headerStyle === "transparent"
        ? "bg-transparent border-transparent"
        : themeConfig.headerStyle === "premium"
          ? "bg-[color-mix(in_srgb,var(--theme-secondary)_16%,var(--theme-surface))] border-[var(--theme-border)]"
          : "bg-[var(--theme-bg)]/90 border-[var(--theme-border)]";
  const categoryIconClass =
    themeConfig.categoryIconStyle === "solid"
      ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
      : themeConfig.categoryIconStyle === "outline"
        ? "bg-transparent text-[var(--theme-primary)] ring-1 ring-[var(--theme-border)]"
        : themeConfig.categoryIconStyle === "circle"
          ? "bg-[var(--theme-surface)] text-[var(--theme-primary)] ring-1 ring-[var(--theme-border)]"
          : "bg-[color-mix(in_srgb,var(--theme-secondary)_14%,white)] text-[var(--theme-secondary)]";

  useEffect(() => {
    loadHomeData();
    useNotificationStore.getState().fetchUnreadCount();
    useCouponStore.getState().loadCoupons();
    if (isLoggedIn()) {
      loadHistory().catch(() => {});
      loadFavorites().catch(() => {});
      loadCart().catch(() => {});
      loadOrders({ page: 1, pageSize: 20 }).catch(() => {});
    }
  }, [loadHomeData, loadHistory, loadFavorites, loadCart, loadOrders]);

  const newest = useMemo(() => newProducts.slice(0, 6), [newProducts]);
  const couponTop = useMemo(
    () =>
      coupons
        .filter((uc) => uc.status === "available")
        .slice()
        .sort((a, b) => Number(b.coupon?.value || 0) - Number(a.coupon?.value || 0))
        .slice(0, 4),
    [coupons],
  );
  const [newArrivalIndex, setNewArrivalIndex] = useState(0);
  const [hotBatchIndex, setHotBatchIndex] = useState(0);
  const [recBatchIndex, setRecBatchIndex] = useState(0);
  const touchStartXRef = useRef(0);
  const exposedProductIdsRef = useRef<Set<string>>(new Set());
  const HOT_BATCH_SIZE = 4;
  const REC_BATCH_SIZE = 4;

  const trackingSessionId = useMemo(() => {
    const key = "home_tracking_session_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = `s_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, created);
    return created;
  }, []);

  useEffect(() => {
    if (newest.length <= 1) return;
    const timer = window.setInterval(() => {
      setNewArrivalIndex((prev) => (prev + 1) % newest.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [newest.length]);

  useEffect(() => {
    if (newArrivalIndex >= newest.length) {
      setNewArrivalIndex(0);
    }
  }, [newArrivalIndex, newest.length]);

  const hotList = useMemo(() => hotProducts.slice(0, 16), [hotProducts]);
  const recList = useMemo(() => {
    const hotIds = new Set(hotList.map((p) => p.id));
    return buildPersonalizedRecommendations({
      candidates: [...recommendedProducts, ...newProducts],
      fallbackProducts: [...recommendedProducts, ...newProducts, ...hotProducts],
      historyProducts,
      favoriteIds,
      favoriteProducts,
      cartItems,
      orders,
      limit: 24,
    }).filter((p) => !hotIds.has(p.id)).slice(0, 16);
  }, [recommendedProducts, newProducts, hotProducts, hotList, historyProducts, favoriteIds, favoriteProducts, cartItems, orders]);
  const hotBatches = useMemo(() => toBatches(hotList, HOT_BATCH_SIZE), [hotList]);
  const recBatches = useMemo(() => toBatches(recList, REC_BATCH_SIZE), [recList]);
  const hot = hotBatches.length > 0 ? hotBatches[hotBatchIndex % hotBatches.length] : [];
  const rec = recBatches.length > 0 ? recBatches[recBatchIndex % recBatches.length] : [];
  const activeNew = newest.length > 0 ? newest[newArrivalIndex] : null;
  const heroImage = (siteInfo.newArrivalHeroImage || "").trim();
  const heroTitle = (siteInfo.newArrivalHeroTitle || "").trim() || "新品上市";
  const heroSubtitle =
    (siteInfo.newArrivalHeroSubtitle || "").trim() ||
    "每周精选新品上架，立即查看";
  const heroCtaText = (siteInfo.newArrivalHeroCtaText || "").trim() || "前往新品上市";
  const activeNewImage = resolveNewArrivalImage(activeNew, newArrivalIndex);
  const memberAssets = useMemo(
    () => [
      { label: "积分", value: "—", icon: Gift },
      { label: "优惠券", value: `${couponTop.length}`, icon: Ticket },
      { label: "收藏", value: `${favoriteIds.length}`, icon: Heart },
      { label: "购物车", value: `${cartItems.length}`, icon: ShoppingCart },
    ],
    [couponTop.length, favoriteIds.length, cartItems.length],
  );
  const quickEntries = useMemo(
    () => [
      { label: "新品上线", icon: Sparkles, path: "/new-arrivals" },
      { label: "时尚配饰", icon: Gift, path: "/categories" },
      { label: "户外生活", icon: Truck, path: "/categories" },
      { label: "数码配件", icon: Zap, path: "/categories" },
      { label: "进口优选", icon: Star, path: "/categories?sort=sales_desc" },
      { label: "全部分类", icon: LayoutGrid, path: "/categories" },
    ],
    [],
  );

  const trackNewArrivalClick = (target: "product" | "new_arrivals_page") => {
    void productService.trackHomeEngagement({
      module: "new_arrivals",
      event: "click",
      product_id: activeNew?.id,
      session_id: trackingSessionId,
      meta: { index: newArrivalIndex, target },
    });
  };

  const goNewArrivalsPage = () => {
    trackNewArrivalClick("new_arrivals_page");
    navigate("/new-arrivals");
  };

  const goActiveNewProduct = () => {
    if (!activeNew) {
      goNewArrivalsPage();
      return;
    }
    trackNewArrivalClick("product");
    navigate(`/product/${activeNew.id}`);
  };

  useEffect(() => {
    if (!activeNew?.id) return;
    if (exposedProductIdsRef.current.has(activeNew.id)) return;
    exposedProductIdsRef.current.add(activeNew.id);
    void productService.trackHomeEngagement({
      module: "new_arrivals",
      event: "impression",
      product_id: activeNew.id,
      session_id: trackingSessionId,
      meta: { index: newArrivalIndex },
    });
  }, [activeNew?.id, newArrivalIndex, trackingSessionId]);

  return (
    <div className={`min-h-screen pb-24 text-[var(--theme-text)] ${isMagazineLayout ? "bg-[color-mix(in_srgb,var(--theme-bg)_90%,black)]" : "bg-[var(--theme-bg)]"}`} data-theme-home-layout={themeConfig.homeLayout}>
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${headerClass}`}>
        <div className="mx-auto flex h-14 w-full max-w-screen-xl items-center gap-3 px-4">
          <div className="flex shrink-0 cursor-pointer items-center gap-2" onClick={() => navigate("/")}>
            <img
              src={logoSrc}
              alt={siteName}
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-md object-contain"
              loading="eager"
              decoding="async"
            />
            <span className="hidden text-lg font-bold tracking-widest text-[var(--theme-text-on-surface)] sm:block">{siteName}</span>
          </div>
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center"><Search className="h-4 w-4 text-[var(--theme-text-muted)]" /></div>
            <input type="text" placeholder="搜索商品或品牌..." onFocus={() => navigate("/search")} className="w-full rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] py-1.5 pl-9 pr-4 text-sm text-[var(--theme-text)] focus:border-[var(--theme-price)] focus:outline-none" />
          </div>
          <NotificationIconButton unreadCount={unreadCount} onClick={() => navigate("/notifications")} />
        </div>
      </header>
      <main className="mx-auto max-w-screen-xl px-4 pt-4">
        <section>
          <div className={isPremiumLayout || isMagazineLayout ? "overflow-hidden rounded-2xl border border-[var(--theme-border)] theme-shadow" : ""}>
            <BannerCarousel banners={banners} themeConfigOverride={themeConfig} />
          </div>
        </section>
        <section className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
          {quickEntries.map((entry) => (
            <button
              key={entry.label}
              type="button"
              onClick={() => navigate(entry.path)}
              className="flex flex-col items-center gap-2 rounded-xl p-1 text-center"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${categoryIconClass}`}>
                <entry.icon size={18} />
              </span>
              <span className="text-xs text-[var(--theme-text)]">{entry.label}</span>
            </button>
          ))}
        </section>
        <section className="-mx-4 mt-3">
          <HomeOpsBlocks />
        </section>
        <section
          className={`mt-3 rounded-2xl border border-[var(--theme-border)] p-4 ${isDealLayout ? "ring-1 ring-[var(--theme-warning)]/35" : ""}`}
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--theme-price) 22%, white), color-mix(in srgb, var(--theme-price) 16%, white) 55%, color-mix(in srgb, var(--theme-price) 25%, white))",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/70 p-2 text-[var(--theme-price)]">
              <Ticket size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-extrabold text-[var(--theme-text-on-surface)]">会员专属礼包</p>
              <p className="line-clamp-1 text-sm text-[var(--theme-text-muted-on-surface)]">今日会员权益已更新，专属优惠券可立即领取</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/coupons")}
              className="rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-bold text-[var(--theme-primary-foreground)]"
            >
              立即领取
            </button>
          </div>
        </section>
        <section className="mt-3 grid grid-cols-4 gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text)]">
            <ShieldCheck size={14} className="text-[var(--theme-price)]" />
            正品保障
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text)]">
            <Truck size={14} className="text-[var(--theme-price)]" />
            本地配送
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text)]">
            <Wallet size={14} className="text-[var(--theme-price)]" />
            安全支付
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text)]">
            <Heart size={14} className="text-[var(--theme-price)]" />
            售后无忧
          </div>
        </section>
        <section className="mt-section">
          <Header title="权益券包" icon={Ticket} />
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {(couponLoading ? Array.from({ length: 4 }) : couponTop).map((c: UserCoupon | number, i) => {
              if (couponLoading || typeof c === "number") {
                return (
                  <div
                    key={i}
                    className="snap-center h-[136px] w-[min(88vw,560px)] shrink-0 animate-pulse rounded-xl bg-[var(--theme-surface)]/70 ring-1 ring-[var(--theme-border)]"
                  />
                );
              }

              const display = userCouponToPremiumDisplay(c);
              const isClaimed = Boolean(c.claimed_at);
              return (
                <div
                  key={c.id}
                  className="snap-center h-[136px] w-[min(88vw,560px)] shrink-0"
                >
                  <PremiumCouponCard
                    compact
                    className="h-full min-h-0 shadow-lg"
                    title={display.title}
                    amountPrefix={display.amountPrefix}
                    amount={display.amount}
                    conditionText={display.conditionText}
                    expireText={display.expireText}
                    scopeText={display.scopeText}
                    badge={display.badge}
                    eyebrow={isClaimed ? "可用优惠券" : "活动优惠券"}
                    actionLabel={isClaimed ? "去使用" : "立即领取"}
                    actionLoading={!isClaimed && claimingCouponId === c.id}
                    actionDisabled={!isClaimed && claimingCouponId === c.id}
                    onAction={() => {
                      if (isClaimed) {
                        if (selectedCartCount > 0) navigate(`/checkout?coupon_id=${c.id}`);
                        else navigate("/cart", { state: { coupon_id: c.id } });
                        return;
                      }
                      void (async () => {
                        try {
                          setClaimingCouponId(c.id);
                          await claimCoupon(display.code);
                          toast.success("领取成功！已添加到我的优惠券", toastPresetQuickSuccess);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "领取失败");
                        } finally {
                          setClaimingCouponId(null);
                        }
                      })();
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
        <section className="mt-section">
          <Header title="新品上市" icon={Zap} subtitle="每周精选上新，发现最新好物" />
          <div
            className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 theme-shadow"
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0]?.clientX ?? 0;
            }}
            onTouchEnd={(e) => {
              if (newest.length <= 1) return;
              const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
              const diff = touchStartXRef.current - endX;
              if (Math.abs(diff) < 40) return;
              if (diff > 0) setNewArrivalIndex((prev) => (prev + 1) % newest.length);
              else setNewArrivalIndex((prev) => (prev - 1 + newest.length) % newest.length);
            }}
          >
            {heroImage ? (
              <img
                src={heroImage}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15 blur-xl scale-110"
                alt=""
                aria-hidden
              />
            ) : null}
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[color-mix(in_srgb,var(--theme-price)_18%,transparent)] blur-2xl" />
            <div className="relative grid gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-center">
              <button
                type="button"
                onClick={goActiveNewProduct}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] shadow-none"
              >
                {activeNewImage ? (
                  <img
                    src={activeNewImage}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    alt={activeNew?.name || heroTitle}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--theme-text-muted)]">
                    暂无新品图片
                  </div>
                )}
                <div className="absolute left-3 top-3 rounded-full bg-[var(--theme-price)] px-2.5 py-1 text-[10px] font-bold text-[var(--theme-price-foreground)] shadow">
                  NEW
                </div>
              </button>

              <div className="min-w-0 pb-8 md:pb-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--theme-price)]">New Arrival</p>
                <h3 className="mt-2 line-clamp-2 text-xl font-black text-[var(--theme-text-on-surface)] md:text-3xl">
                  {heroTitle}
                </h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--theme-text-muted)]">{heroSubtitle}</p>

                {activeNew ? (
                  <button type="button" onClick={goActiveNewProduct} className="mt-4 block max-w-full text-left">
                    <p className="line-clamp-2 text-base font-bold text-[var(--theme-text-on-surface)]">{activeNew.name}</p>
                    <p className="mt-1 text-lg font-black text-[var(--theme-price)]">RM {activeNew.price}</p>
                  </button>
                ) : (
                  <p className="mt-4 text-sm text-[var(--theme-text-muted)]">新品正在准备中，先看看全部商品。</p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goNewArrivalsPage}
                    className="rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-bold text-[var(--theme-primary-foreground)] shadow-[var(--theme-shadow)]"
                  >
                    {heroCtaText}
                  </button>
                  {activeNew ? (
                    <button
                      type="button"
                      onClick={goActiveNewProduct}
                      className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2 text-xs font-bold text-[var(--theme-text)]"
                    >
                      查看当前新品
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            {newest.length > 1 ? (
              <div className="absolute bottom-5 right-5 flex gap-1.5">
                {newest.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNewArrivalIndex(idx)}
                    aria-label={`查看新品 ${idx + 1}`}
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: idx === newArrivalIndex ? 18 : 8,
                      backgroundColor:
                        idx === newArrivalIndex
                          ? "var(--theme-price)"
                          : inactiveDotColor,
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>
        <section className="mt-section">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-widest text-[var(--theme-text-on-surface)]">
              <Flame className="h-5 w-5 text-[var(--theme-price)]" />
              今日热销
            </h2>
            {hotBatches.length > 1 ? (
              <button
                type="button"
                onClick={() => setHotBatchIndex((prev) => (prev + 1) % hotBatches.length)}
                className="flex items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)]"
              >
                <RefreshCw size={12} />
                换一批              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {homeLoading
              ? Array.from({ length: HOT_BATCH_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)
              : hot.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
        <section className="mt-section">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold tracking-widest text-[var(--theme-text-on-surface)]">
                <Star className="h-5 w-5 text-[var(--theme-price)]" />
                猜你喜欢
              </h2>
              <p className="mt-1 text-xs tracking-wider text-[var(--theme-text-muted)]">根据你的浏览与偏好推荐</p>
            </div>
            {recBatches.length > 1 ? (
              <button
                type="button"
                onClick={() => setRecBatchIndex((prev) => (prev + 1) % recBatches.length)}
                className="flex items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)]"
              >
                <RefreshCw size={12} />
                换一批              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {homeLoading
              ? Array.from({ length: REC_BATCH_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)
              : rec.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      </main>
    </div>
  );
}

function resolveNewArrivalImage(product: Product | null, fallbackIndex: number): string {
  if (!product) return "";
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  if (images.length > 0) {
    return images[fallbackIndex % images.length];
  }
  if (product.cover_image) return product.cover_image;
  return "";
}

function toBatches<T>(list: T[], size: number): T[][] {
  if (!Array.isArray(list) || list.length === 0 || size <= 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
}




