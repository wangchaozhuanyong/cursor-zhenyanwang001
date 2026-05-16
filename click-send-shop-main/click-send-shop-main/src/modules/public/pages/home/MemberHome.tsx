import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Flame, Gift, Heart, RefreshCw, Search, ShoppingCart, Star, Ticket, Truck, ShieldCheck, Wallet } from "lucide-react";
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
import NewArrivalOpsSection from "./NewArrivalOpsSection";
import type { UserCoupon } from "@/types/coupon";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import NotificationIconButton from "@/components/NotificationIconButton";
import { userCouponToPremiumDisplay } from "@/utils/couponDisplay";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { buildPersonalizedRecommendations } from "@/utils/personalizedRecommendations";
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
  const { banners, loading: bannersLoading } = useHomeBanners();
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

  useLayoutEffect(() => {
    const { hotProducts, newProducts, recommendedProducts, loading } = useProductStore.getState();
    if (!loading && (hotProducts.length > 0 || newProducts.length > 0 || recommendedProducts.length > 0)) {
      useProductStore.setState({ loading: true });
    }
    void loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    useNotificationStore.getState().fetchUnreadCount();
    useCouponStore.getState().loadCoupons();
    if (isLoggedIn()) {
      loadHistory().catch(() => {});
      loadFavorites().catch(() => {});
      loadCart().catch(() => {});
      loadOrders({ page: 1, pageSize: 20 }).catch(() => {});
    }
  }, [loadHistory, loadFavorites, loadCart, loadOrders]);

  const couponTop = useMemo(
    () =>
      coupons
        .filter((uc) => uc.status === "available")
        .slice()
        .sort((a, b) => Number(b.coupon?.value || 0) - Number(a.coupon?.value || 0))
        .slice(0, 4),
    [coupons],
  );
  const [hotBatchIndex, setHotBatchIndex] = useState(0);
  const [recBatchIndex, setRecBatchIndex] = useState(0);
  const HOT_BATCH_SIZE = 4;
  const REC_BATCH_SIZE = 4;

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
            <BannerCarousel banners={banners} loading={bannersLoading} themeConfigOverride={themeConfig} />
          </div>
        </section>
        <section className="-mx-4 mt-3">
          <HomeOpsBlocks />
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
          <Header title="会员专属礼包" icon={Ticket} />
          <div className="no-scrollbar -mx-4 flex items-stretch gap-3 overflow-x-auto overflow-y-hidden px-4 pb-2 snap-x snap-mandatory md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 md:snap-none lg:gap-4">
            {(couponLoading ? Array.from({ length: 4 }) : couponTop).map((c: UserCoupon | number, i) => {
              if (couponLoading || typeof c === "number") {
                return (
                  <div
                    key={i}
                    className="snap-center min-h-[118px] w-[min(88vw,360px)] shrink-0 animate-pulse rounded-xl bg-[var(--theme-surface)]/70 ring-1 ring-[var(--theme-border)] md:w-full"
                  />
                );
              }

              const display = userCouponToPremiumDisplay(c);
              const isClaimed = Boolean(c.claimed_at);
              return (
                <div
                  key={c.id}
                  className="snap-center min-h-[118px] w-[min(88vw,360px)] shrink-0 md:w-full"
                >
                  <PremiumCouponCard
                    compact
                    homeCompact
                    className="h-full min-h-[118px] shadow-lg"
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
          {!couponLoading && couponTop.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)]/60 px-4 py-8 text-center text-sm text-[var(--theme-text-muted)]">
              暂无可用会员礼包
            </div>
          ) : null}
        </section>
        <NewArrivalOpsSection
          products={newProducts}
          loading={homeLoading}
          hero={{
            image: siteInfo.newArrivalHeroImage,
            title: siteInfo.newArrivalHeroTitle,
            subtitle: siteInfo.newArrivalHeroSubtitle,
            ctaText: siteInfo.newArrivalHeroCtaText,
            brandColor: siteInfo.brandColor,
            siteSlogan: siteInfo.siteSlogan,
          }}
          homeLayout={themeConfig.homeLayout}
        />
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

function toBatches<T>(list: T[], size: number): T[][] {
  if (!Array.isArray(list) || list.length === 0 || size <= 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
}




