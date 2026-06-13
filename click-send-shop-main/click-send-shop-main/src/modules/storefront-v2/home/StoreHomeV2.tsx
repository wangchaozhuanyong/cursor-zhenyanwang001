import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import StoreTabHeader from "@/components/store/StoreTabHeader";
import HomeTrustBar from "@/components/HomeTrustBar";
import HomeOpsBlocks from "@/modules/public/pages/home/HomeOpsBlocks";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProductStore } from "@/stores/useProductStore";
import { useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { isLoggedIn } from "@/utils/token";
import * as authService from "@/services/authService";
import { scheduleIdleTask } from "@/utils/idleScheduler";
import { buildCanonical } from "@/utils/seo";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/utils/structuredData";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { buildPersonalizedRecommendations } from "@/utils/personalizedRecommendations";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";
import { getHomeModuleTitle, isHomeModuleEnabled } from "@/constants/homeModules";
import { STORE_COPY } from "@/constants/storeCopy";
import type { FooterNavItem } from "@/types/content";
import type { StorefrontCampaignVm } from "../campaign/campaignTypes";
import { fetchStorefrontCampaigns } from "../campaign/campaignService";
import { storefrontPageClassName } from "../design/classes";
import HomeHeroV2 from "./HomeHeroV2";
import HomePrimaryCampaignV2 from "./HomePrimaryCampaignV2";
import HomeCategoryRailV2 from "./HomeCategoryRailV2";
import HomeProductSectionV2 from "./HomeProductSectionV2";
import { dedupeFooterNav, parseFooterNav, uniqueProducts } from "./homeV2Utils";

const GuestMobileFooter = lazy(() => import("@/components/GuestMobileFooter"));

export default function StoreHomeV2() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const audience = isAuthenticated ? "member" : "guest";
  const siteInfo = useSiteInfo();
  const siteCapabilities = useSiteCapabilities();
  const { themeConfig } = useThemeRuntime();
  const { settings: homeModules, ready: homeModulesReady } = useHomeModuleSettings();
  const { banners, loading: bannersLoading } = useHomeBanners();

  const hotProducts = useProductStore((state) => state.hotProducts);
  const newProducts = useProductStore((state) => state.newProducts);
  const recommendedProducts = useProductStore((state) => state.recommendedProducts);
  const categories = useProductStore((state) => state.categories);
  const homeLoading = useProductStore((state) => state.loading);
  const homeError = useProductStore((state) => state.error);
  const loadHomeData = useProductStore((state) => state.loadHomeData);
  const loadCategories = useProductStore((state) => state.loadCategories);

  const cartItems = useCartStore((state) => state.items);
  const loadCart = useCartStore((state) => state.loadCart);
  const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
  const favoriteProducts = useFavoritesStore((state) => state.favoriteProducts);
  const loadFavorites = useFavoritesStore((state) => state.loadFavorites);
  const historyProducts = useHistoryStore((state) => state.history);
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const orders = useOrderStore((state) => state.orders);
  const loadOrders = useOrderStore((state) => state.loadOrders);

  const [campaigns, setCampaigns] = useState<StorefrontCampaignVm[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  useEffect(() => {
    const state = useProductStore.getState();
    const hasHomeData = state.hotProducts.length > 0 || state.newProducts.length > 0 || state.recommendedProducts.length > 0;
    void loadHomeData({ background: hasHomeData });
    void loadCategories();
  }, [loadCategories, loadHomeData]);

  useEffect(() => {
    if (!isAuthenticated || !isLoggedIn()) return;
    let cancelled = false;
    let cancelIdle: (() => void) | undefined;
    void authService.restoreSessionFromCookie().then((ok) => {
      if (!ok || cancelled) return;
      cancelIdle = scheduleIdleTask("store-home-v2-member-data", () => {
        if (cancelled) return;
        void Promise.allSettled([
          loadHistory(),
          loadFavorites(),
          loadCart(),
          loadOrders({ page: 1, pageSize: 20 }),
        ]);
      }, { delayMs: 2500, timeoutMs: 4500 });
    });
    return () => {
      cancelled = true;
      cancelIdle?.();
    };
  }, [isAuthenticated, loadCart, loadFavorites, loadHistory, loadOrders]);

  useEffect(() => {
    let cancelled = false;
    setCampaignsLoading(true);
    void fetchStorefrontCampaigns()
      .then((next) => {
        if (cancelled) return;
        setCampaigns(next);
      })
      .catch(() => {
        if (!cancelled) setCampaigns([]);
      })
      .finally(() => {
        if (!cancelled) setCampaignsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const slogan = siteInfo.siteSlogan || STORE_COPY.siteSlogan;
  const description = siteInfo.siteDescription || STORE_COPY.siteDescription;
  const seoTitle = siteInfo.seoTitle || siteName;
  const seoDescription = siteInfo.seoDescription || description;
  const seoImage = siteInfo.ogImageUrl || logoSrc || "/og-default.png";

  const enabledCampaigns = useMemo(
    () => campaigns.filter((campaign) => isCampaignEnabled(campaign, homeModules, audience)),
    [audience, campaigns, homeModules],
  );

  const newArrivalProducts = useMemo(() => uniqueProducts(newProducts, 8), [newProducts]);
  const hotHomeProducts = useMemo(() => uniqueProducts(hotProducts, homeModules.hotBatchSize * 2), [homeModules.hotBatchSize, hotProducts]);
  const guestProducts = useMemo(
    () => uniqueProducts([...hotProducts, ...recommendedProducts], homeModules.guestRecommendMax),
    [homeModules.guestRecommendMax, hotProducts, recommendedProducts],
  );
  const memberRecommendations = useMemo(() => uniqueProducts(
    buildPersonalizedRecommendations({
      candidates: recommendedProducts,
      fallbackProducts: [...recommendedProducts, ...hotProducts, ...newProducts],
      historyProducts,
      favoriteIds,
      favoriteProducts,
      cartItems,
      orders,
      limit: homeModules.recBatchSize * 2,
    }),
    homeModules.recBatchSize * 2,
  ), [
    cartItems,
    favoriteIds,
    favoriteProducts,
    historyProducts,
    homeModules.recBatchSize,
    hotProducts,
    newProducts,
    orders,
    recommendedProducts,
  ]);

  const customNav = useMemo(() => parseFooterNav(siteInfo.footerNav), [siteInfo.footerNav]);
  const supportNav = useMemo(() => buildSupportNav(customNav), [customNav]);
  const policyNav = useMemo(() => buildPolicyNav(customNav, siteInfo), [customNav, siteInfo]);

  const navigatePath = (path: string) => {
    if (!path) return;
    if (/^https?:\/\//i.test(path)) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(path);
  };

  const showBanner = isHomeModuleEnabled(homeModules, "banner", audience);
  const showTrustBar = isHomeModuleEnabled(homeModules, "trust_bar", audience);
  const showNavGrid = isHomeModuleEnabled(homeModules, "nav_grid", audience);
  const showNewArrivals = isHomeModuleEnabled(homeModules, "new_arrivals", audience);
  const showHotSales = isAuthenticated && isHomeModuleEnabled(homeModules, "hot_sales", "member");
  const showRecommend = isAuthenticated && isHomeModuleEnabled(homeModules, "recommend", "member");
  const showGuestRecommend = !isAuthenticated && isHomeModuleEnabled(homeModules, "guest_recommend", "guest");

  return (
    <div className="store-page-shell store-bottom-safe bg-[var(--theme-bg)] text-[var(--theme-text)]" data-store-home-version="v2">
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
      <StoreTabHeader
        searchMode="navigate"
        searchPlaceholder={STORE_COPY.searchPlaceholder}
        showSiteNameMobile
        className="store-home-topbar"
      />

      <main className={storefrontPageClassName("space-y-4 pt-[var(--store-page-y)] md:space-y-6")}>
        <h1 className="sr-only">{slogan}</h1>
        <p className="sr-only">{description}</p>

        <HomeHeroV2
          siteName={siteName}
          slogan={slogan}
          description={description}
          logoSrc={logoSrc}
          banners={banners}
          bannersLoading={bannersLoading}
          bannerEnabled={showBanner}
          themeConfig={themeConfig}
          autoRotateMs={homeModules.bannerAutoplaySeconds * 1000}
          onNavigate={navigatePath}
        />

        <HomePrimaryCampaignV2
          campaigns={enabledCampaigns}
          loading={campaignsLoading && homeModulesReady}
          onNavigate={navigatePath}
        />

        {showTrustBar ? <HomeTrustBar className="store-home-desktop-trust" /> : null}

        {showNavGrid ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm">
            <HomeOpsBlocks />
          </div>
        ) : null}

        {siteCapabilities.mallEnabled ? (
          <HomeCategoryRailV2 categories={categories} onNavigate={navigatePath} />
        ) : null}

        {siteCapabilities.mallEnabled && showNewArrivals ? (
          <HomeProductSectionV2
            title={getHomeModuleTitle(homeModules, "new_arrivals", "新品上市")}
            subtitle="最新上架，先看这一组"
            products={newArrivalProducts}
            loading={homeLoading && newArrivalProducts.length === 0}
            skeletonCount={8}
            actionLabel="查看新品"
            actionPath={NEW_ARRIVAL_CATEGORY_PATH}
            showPrice={siteInfo.newArrivalShowPrice !== "0"}
            onNavigate={navigatePath}
          />
        ) : null}

        {siteCapabilities.mallEnabled && showGuestRecommend ? (
          <HomeProductSectionV2
            title={getHomeModuleTitle(homeModules, "guest_recommend", "精选商品")}
            subtitle="活动、热销和推荐商品合并展示"
            products={guestProducts}
            loading={homeLoading && guestProducts.length === 0}
            skeletonCount={homeModules.guestRecommendMax}
            onNavigate={navigatePath}
          />
        ) : null}

        {siteCapabilities.mallEnabled && showHotSales ? (
          <HomeProductSectionV2
            title={getHomeModuleTitle(homeModules, "hot_sales", "今日热销")}
            subtitle="高频购买商品优先展示"
            products={hotHomeProducts}
            loading={homeLoading && hotHomeProducts.length === 0}
            skeletonCount={homeModules.hotBatchSize}
            actionPath="/categories?sort=sales_desc"
            onNavigate={navigatePath}
          />
        ) : null}

        {siteCapabilities.mallEnabled && showRecommend ? (
          <HomeProductSectionV2
            title={getHomeModuleTitle(homeModules, "recommend", "猜你喜欢")}
            subtitle="根据浏览、收藏、购物车和订单信号推荐"
            products={memberRecommendations}
            loading={homeLoading && memberRecommendations.length === 0}
            skeletonCount={homeModules.recBatchSize}
            onNavigate={navigatePath}
          />
        ) : null}

        {homeError ? (
          <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm text-[var(--theme-text-muted)]">
            部分首页内容暂时无法刷新。
            <UnifiedButton
              type="button"
              onClick={() => void loadHomeData({ force: true })}
              className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-[var(--theme-price)]"
            >
              <RefreshCw size={13} />
              重试
            </UnifiedButton>
          </div>
        ) : null}

        {!isAuthenticated ? (
          <Suspense fallback={null}>
            <GuestMobileFooter
              siteName={siteName}
              logoSrc={logoSrc}
              slogan={slogan}
              description={description}
              supportNav={supportNav}
              policyNav={policyNav}
              contactPhone={siteInfo.contactPhone}
              contactEmail={siteInfo.contactEmail}
              address={siteInfo.address}
              instagramUrl={siteInfo.instagramUrl}
              facebookUrl={siteInfo.facebookUrl}
              tiktokUrl={siteInfo.tiktokUrl}
              xhsUrl={siteInfo.xhsUrl}
              footerCompanyName={siteInfo.footerCompanyName}
              footerCopyright={siteInfo.footerCopyright}
              footerIcpNo={siteInfo.footerIcpNo}
              onNavigate={navigatePath}
            />
          </Suspense>
        ) : null}
      </main>
    </div>
  );
}

function isCampaignEnabled(
  campaign: StorefrontCampaignVm,
  settings: Parameters<typeof isHomeModuleEnabled>[0],
  audience: "member" | "guest",
) {
  if (campaign.type === "flash_sale") return isHomeModuleEnabled(settings, "flash_sale_section", audience);
  if (campaign.type === "full_reduction") return isHomeModuleEnabled(settings, "full_reduction_notice", audience);
  if (campaign.type === "coupon" || campaign.type === "new_user_gift") return isHomeModuleEnabled(settings, "coupon_center", audience);
  if (campaign.type === "promotion") return isHomeModuleEnabled(settings, "promotion_banner", audience);
  return true;
}

function buildSupportNav(customNav: FooterNavItem[] | null) {
  if (customNav?.length) {
    const withSection = customNav.filter((item) => item.section === "support");
    return dedupeFooterNav(withSection.length ? withSection : customNav.slice(0, 4));
  }
  return dedupeFooterNav([
    { label: "首页", path: "/" },
    { label: "全部分类", path: "/categories" },
    { label: "购物车", path: "/cart" },
    { label: "我的订单", path: "/orders" },
  ]);
}

function buildPolicyNav(customNav: FooterNavItem[] | null, siteInfo: ReturnType<typeof useSiteInfo>) {
  if (customNav?.length) {
    const policyItems = customNav.filter((item) => item.section === "policy" || item.section === "other");
    return dedupeFooterNav(policyItems.length ? policyItems : customNav.slice(4));
  }

  const base: FooterNavItem[] = [
    { label: "常见问题", path: "/help" },
    { label: "关于我们", path: "/about" },
  ];
  const extra: FooterNavItem[] = [];
  if (siteInfo.privacyPolicyPath) extra.push({ label: "隐私政策", path: siteInfo.privacyPolicyPath });
  if (siteInfo.termsPath) extra.push({ label: "服务条款", path: siteInfo.termsPath });
  if (siteInfo.refundPolicyPath) extra.push({ label: "退款政策", path: siteInfo.refundPolicyPath });
  if (siteInfo.shippingPolicyPath) extra.push({ label: "配送政策", path: siteInfo.shippingPolicyPath });
  extra.push({ label: "合规说明", path: "/content/compliance-notice" });
  extra.push({ label: "联系我们", path: "/content/contact-us" });
  return dedupeFooterNav([...base, ...extra]);
}
