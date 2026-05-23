import { useEffect, useMemo, useState } from "react";
import { Flame, Gift, RefreshCw, ShoppingCart, Star, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import BannerCarousel from "@/components/BannerCarousel";
import HomeTrustBar from "@/components/HomeTrustBar";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import HomeOpsBlocks from "./HomeOpsBlocks";
import { AnimatedSection } from "@/modules/micro-interactions";
import NewArrivalSection from "./NewArrivalOpsSection";
import FlashSaleSection from "./FlashSaleSection";
import MarketingCouponCenterSection from "./MarketingCouponCenterSection";
import MarketingNewUserGiftSection from "./MarketingNewUserGiftSection";
import MarketingFullReductionSection from "./MarketingFullReductionSection";
import MarketingPromotionBannerSection from "./MarketingPromotionBannerSection";
import type { UserCoupon } from "@/types/coupon";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import StoreTabHeader from "@/components/store/StoreTabHeader";
import { userCouponToPremiumDisplay } from "@/utils/couponDisplay";
import { toast } from "sonner";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getProductGridClassName } from "@/utils/productGridClasses";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { buildPersonalizedRecommendations } from "@/utils/personalizedRecommendations";
import { isLoggedIn } from "@/utils/token";
import * as authService from "@/services/authService";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";
import { isHomeModuleEnabled } from "@/constants/homeModules";
import { HOME_HERO_STACK_CLASS, HOME_PAGE_MAIN_CLASS } from "@/constants/homeLayout";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/utils/structuredData";
import SilkProductGrid from "@/components/motion/SilkProductGrid";

function Header({ title, icon: Icon, subtitle }: { title: string; icon?: React.ElementType; subtitle?: string }) {
  return (
    <div className="mb-3 md:mb-4">
      <h2 className="flex items-center gap-2 store-section-title tracking-widest text-[var(--theme-text-on-surface)]">
        {Icon && <Icon className="h-5 w-5 text-[var(--theme-price)]" />}
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs tracking-wider text-[color-mix(in_srgb,var(--theme-text-on-surface)_70%,var(--theme-text-muted))]">{subtitle}</p>}
    </div>
  );
}

export default function MemberHome() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();
  const productGridClass = getProductGridClassName(themeConfig.productCardVariant);
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
  const { banners, loading: bannersLoading } = useHomeBanners();
  const { settings: homeModules } = useHomeModuleSettings();
  const homeLayout = themeConfig.homeLayout ?? "classic";
  const isPremiumLayout = homeLayout === "premium";
  const isDealLayout = homeLayout === "deal";
  const isMagazineLayout = homeLayout === "magazine";
  const siteName = siteInfo.siteName || "官方商城";
  const seoTitle = siteInfo.seoTitle || siteName;
  const seoDescription =
    siteInfo.seoDescription ||
    siteInfo.siteDescription ||
    "本平台提供商品、服务与客户支持信息。";
  const seoImage = siteInfo.ogImageUrl || siteInfo.defaultOgImageUrl || siteInfo.logoUrl || "/og-default.png";

  useEffect(() => {
    const state = useProductStore.getState();
    const hasHomeData = state.hotProducts.length > 0 || state.newProducts.length > 0 || state.recommendedProducts.length > 0;
    void loadHomeData({ background: hasHomeData });
  }, [loadHomeData]);

  useEffect(() => {
    if (!isLoggedIn()) return;
    void authService.getProfile()
      .then(() => {
        useNotificationStore.getState().fetchUnreadCount();
        useCouponStore.getState().loadCoupons();
        void loadHistory().catch(() => {});
        void loadFavorites().catch(() => {});
        void loadCart().catch(() => {});
        void loadOrders({ page: 1, pageSize: 20 }).catch(() => {});
      })
      .catch(() => {});
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
  const HOT_BATCH_SIZE = homeModules.hotBatchSize;
  const REC_BATCH_SIZE = homeModules.recBatchSize;

  const hotList = useMemo(() => hotProducts.slice(0, 16), [hotProducts]);
  const recList = useMemo(() => {
    const excludedIds = new Set([...hotList, ...newProducts].map((p) => p.id));
    return buildPersonalizedRecommendations({
      candidates: recommendedProducts,
      fallbackProducts: [...recommendedProducts, ...hotProducts],
      historyProducts,
      favoriteIds,
      favoriteProducts,
      cartItems,
      orders,
      limit: 24,
    }).filter((p) => !excludedIds.has(p.id)).slice(0, 16);
  }, [recommendedProducts, newProducts, hotProducts, hotList, historyProducts, favoriteIds, favoriteProducts, cartItems, orders]);
  const hotBatches = useMemo(() => toBatches(hotList, HOT_BATCH_SIZE), [hotList, HOT_BATCH_SIZE]);
  const recBatches = useMemo(() => toBatches(recList, REC_BATCH_SIZE), [recList, REC_BATCH_SIZE]);
  const hot = hotBatches.length > 0 ? hotBatches[hotBatchIndex % hotBatches.length] : [];
  const rec = recBatches.length > 0 ? recBatches[recBatchIndex % recBatches.length] : [];

  return (
    <div className={`store-page-shell store-bottom-safe text-[var(--theme-text)] ${isMagazineLayout ? "bg-[color-mix(in_srgb,var(--theme-bg)_90%,black)]" : "bg-[var(--theme-bg)]"}`} data-theme-home-layout={themeConfig.homeLayout}>
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        keywords={siteInfo.seoKeywords}
        canonical={buildCanonical("/")}
        ogTitle={seoTitle}
        ogDescription={seoDescription}
        ogImage={seoImage}
        googleSiteVerification={siteInfo.googleSiteVerification}
        ogSiteName={siteName}
        ogType="website"
        jsonLd={[
          { id: "website", data: buildWebsiteJsonLd(siteInfo) },
          { id: "organization", data: buildOrganizationJsonLd(siteInfo) },
        ]}
      />
      <StoreTabHeader searchMode="navigate" />
      <main className={HOME_PAGE_MAIN_CLASS}>
        {(isHomeModuleEnabled(homeModules, "banner", "member") ||
          isHomeModuleEnabled(homeModules, "trust_bar", "member") ||
          isHomeModuleEnabled(homeModules, "nav_grid", "member")) ? (
          <div className={HOME_HERO_STACK_CLASS}>
        {isHomeModuleEnabled(homeModules, "banner", "member") ? (
          <AnimatedSection>
            <div className={isPremiumLayout || isMagazineLayout ? "overflow-hidden rounded-2xl border border-[var(--theme-border)] theme-shadow" : ""}>
              <BannerCarousel banners={banners} loading={bannersLoading} themeConfigOverride={themeConfig} />
            </div>
          </AnimatedSection>
        ) : null}
        {isHomeModuleEnabled(homeModules, "trust_bar", "member") ? (
          <AnimatedSection delay={0.05}>
            <HomeTrustBar />
          </AnimatedSection>
        ) : null}
        {isHomeModuleEnabled(homeModules, "nav_grid", "member") ? (
          <AnimatedSection delay={0.08} className="-mx-[var(--store-page-x)] md:mx-0">
            <HomeOpsBlocks />
          </AnimatedSection>
        ) : null}
          </div>
        ) : null}
        {isHomeModuleEnabled(homeModules, "member_coupons", "member") ? (
        <AnimatedSection delay={0.1}>
        <section>
          <Header title="会员专属礼包" icon={Ticket} />
          <div className="no-scrollbar -mx-[var(--store-page-x)] flex items-stretch gap-3 overflow-x-auto overflow-y-hidden px-[var(--store-page-x)] pb-2 snap-x snap-mandatory md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 md:snap-none lg:grid-cols-3 lg:gap-5">
            {(couponLoading ? Array.from({ length: 4 }) : couponTop).map((c: UserCoupon | number, i) => {
              if (couponLoading || typeof c === "number") {
                return (
                  <div
                    key={i}
                    className="snap-center min-h-[5.5rem] w-[min(88vw,360px)] shrink-0 animate-pulse rounded-xl bg-[var(--theme-surface)]/70 ring-1 ring-[var(--theme-border)] md:w-full"
                  />
                );
              }

              const display = userCouponToPremiumDisplay(c);
              const isClaimed = Boolean(c.claimed_at);
              return (
                <div
                  key={c.id}
                  className="snap-center w-[min(88vw,360px)] shrink-0 md:w-full"
                >
                  <PremiumCouponCard
                    colorScheme="invite"
                    layout="home"
                    title={display.title}
                    amountPrefix={display.amountPrefix}
                    amount={display.amount}
                    minSpendText={display.minSpendText}
                    expireText={display.expireText}
                    scopeText={display.scopeText}
                    actionLabel={isClaimed ? "使用" : "领取"}
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
            <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)]/60 px-4 py-8 text-center text-sm text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]">
              暂无可用会员礼包
            </div>
          ) : null}
        </section>
        </AnimatedSection>
        ) : null}
        {isHomeModuleEnabled(homeModules, "new_arrivals", "member") ? (
        <AnimatedSection delay={0.12}>
        <NewArrivalSection
          products={newProducts}
          loading={homeLoading}
          title={siteInfo.newArrivalSectionTitle}
          displayCount={Number(siteInfo.newArrivalDisplayCount || 8)}
          showPrice={siteInfo.newArrivalShowPrice !== "0"}
        />
        </AnimatedSection>
        ) : null}
        {isHomeModuleEnabled(homeModules, "promotion_banner", "member") ? (
          <MarketingPromotionBannerSection delay={0.125} />
        ) : null}
        {isHomeModuleEnabled(homeModules, "flash_sale_section", "member") ? (
          <FlashSaleSection delay={0.13} />
        ) : null}
        {isHomeModuleEnabled(homeModules, "full_reduction_notice", "member") ? (
          <MarketingFullReductionSection delay={0.131} />
        ) : null}
        {isHomeModuleEnabled(homeModules, "coupon_center", "member") ? (
          <MarketingCouponCenterSection delay={0.132} />
        ) : null}
        {isHomeModuleEnabled(homeModules, "new_user_gift", "member") ? (
          <MarketingNewUserGiftSection delay={0.133} />
        ) : null}
        {isHomeModuleEnabled(homeModules, "hot_sales", "member") ? (
        <AnimatedSection delay={0.14}>
        <section>
          <div className="mb-3 flex items-center justify-between md:mb-4">
            <h2 className="flex items-center gap-2 store-section-title tracking-widest text-[var(--theme-text-on-surface)]">
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
          <SilkProductGrid
            products={hot}
            className={productGridClass}
            skeletonCount={HOT_BATCH_SIZE}
            showFullSkeleton={homeLoading && hot.length === 0}
          />
        </section>
        </AnimatedSection>
        ) : null}
        {isHomeModuleEnabled(homeModules, "recommend", "member") ? (
        <AnimatedSection delay={0.16}>
        <section>
          <div className="mb-3 flex items-center justify-between md:mb-4">
            <div>
              <h2 className="flex items-center gap-2 store-section-title tracking-widest text-[var(--theme-text-on-surface)]">
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
          <SilkProductGrid
            products={rec}
            className={productGridClass}
            skeletonCount={REC_BATCH_SIZE}
            showFullSkeleton={homeLoading && rec.length === 0}
          />
        </section>
        </AnimatedSection>
        ) : null}
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
