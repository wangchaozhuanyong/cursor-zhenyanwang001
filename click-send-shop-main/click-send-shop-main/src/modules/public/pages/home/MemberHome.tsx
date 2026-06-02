import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Star } from "lucide-react";
import { useProductStore } from "@/stores/useProductStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
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
import HomeHotSalesSection from "./HomeHotSalesSection";
import FlashSaleSection from "./FlashSaleSection";
import MarketingCouponRailSection from "./MarketingCouponRailSection";
import MarketingFullReductionSection from "./MarketingFullReductionSection";
import MarketingPromotionBannerSection from "./MarketingPromotionBannerSection";
import StoreTabHeader from "@/components/store/StoreTabHeader";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getProductGridClassName } from "@/utils/productGridClasses";
import { buildPersonalizedRecommendations } from "@/utils/personalizedRecommendations";
import { isLoggedIn } from "@/utils/token";
import * as authService from "@/services/authService";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";
import { isHomeModuleEnabled } from "@/constants/homeModules";
import { HOME_HERO_STACK_CLASS, HOME_PAGE_MAIN_CLASS } from "@/constants/homeLayout";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/utils/structuredData";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import SilkProductGrid from "@/components/motion/SilkProductGrid";

export default function MemberHome() {
  useDocumentTitle(undefined);
  const { themeConfig } = useThemeRuntime();
  const productGridClass = getProductGridClassName(themeConfig.productCardVariant);
  const { hotProducts, newProducts, recommendedProducts, loading: homeLoading, loadHomeData } = useProductStore();
  const siteInfo = useSiteInfo();
  const cartItems = useCartStore((s) => s.items);
  const loadCart = useCartStore((s) => s.loadCart);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const favoriteProducts = useFavoritesStore((s) => s.favoriteProducts);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  const historyProducts = useHistoryStore((s) => s.history);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const orders = useOrderStore((s) => s.orders);
  const loadOrders = useOrderStore((s) => s.loadOrders);
  const { banners, loading: bannersLoading } = useHomeBanners();
  const { settings: homeModules } = useHomeModuleSettings();
  const homeLayout = themeConfig.homeLayout ?? "classic";
  const isPremiumLayout = homeLayout === "premium";
  const isDealLayout = homeLayout === "deal";
  const isMagazineLayout = homeLayout === "magazine";
  const showCouponCenter = isHomeModuleEnabled(homeModules, "coupon_center", "member");
  const showNewUserGift = isHomeModuleEnabled(homeModules, "new_user_gift", "member");
  const siteName = siteInfo.siteName || "官方商城";
  const seoTitle = siteInfo.seoTitle || siteName;
  const seoDescription =
    siteInfo.seoDescription ||
    siteInfo.siteDescription ||
    "本平台提供商品、服务与客户支持信息。";
  const seoImage = siteInfo.ogImageUrl || resolveSiteLogoUrl(siteInfo) || "/og-default.png";

  useEffect(() => {
    const state = useProductStore.getState();
    const hasHomeData = state.hotProducts.length > 0 || state.newProducts.length > 0 || state.recommendedProducts.length > 0;
    void loadHomeData({ background: hasHomeData });
  }, [loadHomeData]);

  useEffect(() => {
    if (!isLoggedIn()) return;
    void authService.restoreSessionFromCookie().then((ok) => {
      if (!ok) return;
      useNotificationStore.getState().fetchUnreadCount();
      void loadHistory().catch(() => {});
      void loadFavorites().catch(() => {});
      void loadCart().catch(() => {});
      void loadOrders({ page: 1, pageSize: 20 }).catch(() => {});
    });
  }, [loadHistory, loadFavorites, loadCart, loadOrders]);

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
        {showCouponCenter || showNewUserGift ? (
          <MarketingCouponRailSection
            delay={0.132}
            showCouponCenter={showCouponCenter}
            showNewUserGift={showNewUserGift}
          />
        ) : null}
        {isHomeModuleEnabled(homeModules, "hot_sales", "member") ? (
        <AnimatedSection delay={0.14}>
          <HomeHotSalesSection
            products={hot}
            loading={homeLoading && hot.length === 0}
            skeletonCount={HOT_BATCH_SIZE}
            showRotate={hotBatches.length > 1}
            onRotate={() => setHotBatchIndex((prev) => (prev + 1) % hotBatches.length)}
          />
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
