import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";
import HomeTrustBar from "@/components/HomeTrustBar";
import HomeNavIcon from "@/components/store/HomeNavIcon";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProductStore } from "@/stores/useProductStore";
import { useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { cn } from "@/lib/utils";
import { isLoggedIn } from "@/utils/token";
import * as authService from "@/services/authService";
import { scheduleIdleTask } from "@/utils/idleScheduler";
import { buildCanonical } from "@/utils/seo";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/utils/structuredData";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { buildPersonalizedRecommendations } from "@/utils/personalizedRecommendations";
import { appendThemePreviewParams } from "@/utils/themePreviewParams";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";
import { getHomeModuleTitle, isHomeModuleEnabled } from "@/constants/homeModules";
import { STORE_COPY } from "@/constants/storeCopy";
import { usePublicLocale } from "@/i18n/publicLocale";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import type { FooterNavItem, HomeNavItem } from "@/types/content";
import { filterVisibleHomeNavItems } from "@/utils/homeNavCapabilities";
import { normalizeHomeNavText, openHomeNavItemTarget } from "@/utils/homeNavTarget";
import { isLoyaltyFeatureEnabled } from "@/utils/loyaltyFeatureVisibility";
import { useClientDesignStyle } from "../design/useClientDesignStyle";
import type { StorefrontCampaignVm } from "../campaign/campaignTypes";
import {
  fetchStorefrontCampaigns,
  recordStorefrontCampaignClick,
  recordStorefrontCampaignImpression,
} from "../campaign/campaignService";
import { storefrontPageClassName } from "../design/classes";
import HomeHeroV2 from "./HomeHeroV2";
import HomePrimaryCampaignV2 from "./HomePrimaryCampaignV2";
import HomeProductSectionV2 from "./HomeProductSectionV2";
import { buildHomeCampaignEntrances, dedupeFooterNav, parseFooterNav, uniqueProducts } from "./homeV2Utils";

const GuestMobileFooter = lazy(() => import("@/components/GuestMobileFooter"));

export default function StoreHomeV2() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const audience = isAuthenticated ? "member" : "guest";
  const siteInfo = useSiteInfo();
  const siteCapabilities = useSiteCapabilities();
  const { themeConfig } = useThemeRuntime();
  const { localizedPath } = usePublicLocale();
  const clientStyle = useClientDesignStyle();
  const { settings: homeModules, navItems, ready: homeModulesReady } = useHomeModuleSettings();
  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();
  const { banners, loading: bannersLoading } = useHomeBanners();

  const hotProducts = useProductStore((state) => state.hotProducts);
  const newProducts = useProductStore((state) => state.newProducts);
  const recommendedProducts = useProductStore((state) => state.recommendedProducts);
  const homeLoading = useProductStore((state) => state.loading);
  const homeError = useProductStore((state) => state.error);
  const loadHomeData = useProductStore((state) => state.loadHomeData);

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
  }, [loadHomeData]);

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
  const fallbackCampaignEntrances = useMemo(() => {
    if (!homeModulesReady) return [];
    const types: Parameters<typeof buildHomeCampaignEntrances>[0] = [];
    if (isHomeModuleEnabled(homeModules, "flash_sale_section", audience)) types.push("flash_sale");
    if (isHomeModuleEnabled(homeModules, "coupon_center", audience)) types.push("coupon", "new_user_gift");
    if (isHomeModuleEnabled(homeModules, "full_reduction_notice", audience)) types.push("full_reduction", "full_discount");
    return buildHomeCampaignEntrances(types);
  }, [audience, homeModules, homeModulesReady]);

  const newArrivalDisplayCount = useMemo(
    () => clampNewArrivalDisplayCount(siteInfo.newArrivalDisplayCount),
    [siteInfo.newArrivalDisplayCount],
  );
  const newArrivalTitle = useMemo(
    () => siteInfo.newArrivalSectionTitle?.trim() || getHomeModuleTitle(homeModules, "new_arrivals", "新品上市"),
    [homeModules, siteInfo.newArrivalSectionTitle],
  );
  const newArrivalProducts = useMemo(
    () => uniqueProducts(newProducts, newArrivalDisplayCount),
    [newArrivalDisplayCount, newProducts],
  );
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
    navigateWithStoreTransition(navigate, appendThemePreviewParams(localizedPath(path)));
  };

  const buildCampaignEventContext = useCallback(
    (campaign: StorefrontCampaignVm, position: string) => ({
      campaignType: campaign.type,
      position,
      audience,
      title: campaign.title,
      href: campaign.href,
    }),
    [audience],
  );

  const handleCampaignImpression = useCallback(
    (campaign: StorefrontCampaignVm, position: string) => {
      void recordStorefrontCampaignImpression(campaign.id, buildCampaignEventContext(campaign, position));
    },
    [buildCampaignEventContext],
  );

  const handleCampaignClick = useCallback(
    (campaign: StorefrontCampaignVm, position: string) => {
      void recordStorefrontCampaignClick(campaign.id, buildCampaignEventContext(campaign, position));
    },
    [buildCampaignEventContext],
  );

  const showBanner = isHomeModuleEnabled(homeModules, "banner", audience);
  const showTrustBar = isHomeModuleEnabled(homeModules, "trust_bar", audience);
  const showNavGrid = isHomeModuleEnabled(homeModules, "nav_grid", audience);
  const showNewArrivals = isHomeModuleEnabled(homeModules, "new_arrivals", audience);
  const showHotSales = isHomeModuleEnabled(homeModules, "hot_sales", audience);
  const showRecommend = isAuthenticated && isHomeModuleEnabled(homeModules, "recommend", "member");
  const showGuestRecommend = !isAuthenticated && isHomeModuleEnabled(homeModules, "guest_recommend", "guest");
  const showInviteEntry = isHomeModuleEnabled(homeModules, "invite_entry", audience)
    && !loyaltyLoading
    && isLoyaltyFeatureEnabled("referral", siteCapabilities, loyaltyConfig);
  return (
    <div
      className={cn(
        "sf-next-page sf-next-storefront-root sf-next-home-page text-[var(--sf-ink)]",
      )}
      data-storefront-layout="silent-commerce"
      data-storefront-client-style={clientStyle}
    >
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
      <main className={storefrontPageClassName("sf-next-home-main")}>
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

        {showNavGrid ? (
          <HomeQuickEntryPanel
            navItems={navItems}
            ready={homeModulesReady}
            capabilities={siteCapabilities}
            onNavigate={navigatePath}
          />
        ) : null}

        <HomePrimaryCampaignV2
          campaigns={enabledCampaigns}
          fallbackCampaigns={fallbackCampaignEntrances}
          loading={campaignsLoading || !homeModulesReady}
          onNavigate={navigatePath}
          onCampaignImpression={handleCampaignImpression}
          onCampaignClick={handleCampaignClick}
        />

        {showTrustBar ? <HomeTrustBar className="sf-next-home-trust-compact" /> : null}

        {siteCapabilities.mallEnabled && showNewArrivals ? (
          <HomeProductSectionV2
            title={newArrivalTitle}
            products={newArrivalProducts}
            loading={homeLoading && newArrivalProducts.length === 0}
            skeletonCount={newArrivalDisplayCount}
            actionLabel="查看新品"
            actionPath={NEW_ARRIVAL_CATEGORY_PATH}
            emptyText="新品正在整理中，可以先看分类。"
            emptyActionLabel="去分类"
            showPrice={siteInfo.newArrivalShowPrice !== "0"}
            previewLimit={newArrivalDisplayCount}
            onNavigate={navigatePath}
          />
        ) : null}

        {siteCapabilities.mallEnabled && showGuestRecommend ? (
          <HomeProductSectionV2
            title={getHomeModuleTitle(homeModules, "guest_recommend", "精选商品")}
            products={guestProducts}
            loading={homeLoading && guestProducts.length === 0}
            skeletonCount={homeModules.guestRecommendMax}
            actionLabel="全部商品"
            emptyText="精选商品暂时没有更新，可以先进入分类浏览。"
            emptyActionLabel="浏览分类"
            previewLimit={homeModules.guestRecommendMax}
            onNavigate={navigatePath}
          />
        ) : null}

        {showInviteEntry ? (
          <HomeInviteEntry
            authenticated={isAuthenticated}
            title={getHomeModuleTitle(homeModules, "invite_entry", "邀请好友")}
            onNavigate={navigatePath}
          />
        ) : null}

        {siteCapabilities.mallEnabled && showHotSales ? (
          <HomeProductSectionV2
            title={getHomeModuleTitle(homeModules, "hot_sales", "今日热销")}
            products={hotHomeProducts}
            loading={homeLoading && hotHomeProducts.length === 0}
            skeletonCount={homeModules.hotBatchSize}
            actionLabel="热销榜"
            actionPath="/categories?sort=sales_desc"
            emptyText="热销榜暂时没有数据，可以先看全部商品。"
            emptyActionLabel="全部商品"
            previewLimit={homeModules.hotBatchSize}
            onNavigate={navigatePath}
          />
        ) : null}

        {siteCapabilities.mallEnabled && showRecommend ? (
          <HomeProductSectionV2
            title={getHomeModuleTitle(homeModules, "recommend", "猜你喜欢")}
            products={memberRecommendations}
            loading={homeLoading && memberRecommendations.length === 0}
            skeletonCount={homeModules.recBatchSize}
            actionLabel="更多推荐"
            emptyText="还没有足够的浏览记录生成推荐，可以先看看热销商品。"
            emptyActionLabel="看热销"
            previewLimit={homeModules.recBatchSize}
            onNavigate={navigatePath}
          />
        ) : null}

        {homeError ? (
          <div className="rounded-[1.125rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm text-[var(--theme-text-muted)]">
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

function HomeQuickEntryPanel({
  navItems,
  ready,
  capabilities,
  onNavigate,
}: {
  navItems: HomeNavItem[];
  ready: boolean;
  capabilities: ReturnType<typeof useSiteCapabilities>;
  onNavigate: (path: string) => void;
}) {
  const actions = useMemo(
    () => filterVisibleHomeNavItems(Array.isArray(navItems) ? navItems : [], capabilities).slice(0, 10),
    [capabilities, navItems],
  );

  if (ready && actions.length === 0) return null;

  return (
    <section
      className="sf-next-quick-entry"
      aria-label="快捷入口"
      data-home-nav-source="admin-home-ops"
      data-command-count={ready ? actions.length : 10}
    >
      <div className="sf-next-quick-entry__header">
        <h2>快捷入口</h2>
      </div>
      <div className="sf-next-quick-entry__grid">
        {!ready
          ? Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="sf-next-quick-entry__item sf-next-quick-entry__item--loading" aria-hidden>
                <span className="sf-next-quick-entry__icon skeleton-base skeleton-shimmer" />
                <span className="sf-next-quick-entry__copy">
                  <span className="skeleton-base skeleton-shimmer h-3 w-14 rounded-full" />
                </span>
              </div>
            ))
          : actions.map((action) => (
              <UnifiedButton
                key={action.id}
                type="button"
                onClick={() => openHomeNavItemTarget(action, capabilities, onNavigate, toast.error)}
                className="sf-next-quick-entry__item"
              >
                <span className="sf-next-quick-entry__icon">
                  <HomeNavIcon
                    value={action.icon_url}
                    className="sf-next-quick-entry__icon-media"
                    imageClassName="sf-next-quick-entry__icon-image"
                  />
                </span>
                <span className="sf-next-quick-entry__copy">
                  <strong>{normalizeHomeNavText(action.title, "分类")}</strong>
                </span>
              </UnifiedButton>
            ))}
      </div>
    </section>
  );
}

function HomeInviteEntry({
  authenticated,
  title,
  onNavigate,
}: {
  authenticated: boolean;
  title: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <section className="sf-next-home-invite" aria-label="邀请好友">
      <div className="sf-next-home-invite__mark" aria-hidden="true">
        <Users size={22} />
      </div>
      <div className="sf-next-home-invite__copy">
        <h2>{title}</h2>
        <p>{authenticated ? "分享邀请码，查看奖励与邀请记录" : "登录后生成专属邀请卡"}</p>
      </div>
      <UnifiedButton
        type="button"
        className="sf-next-home-invite__action"
        onClick={() => onNavigate(authenticated ? "/invite" : "/login?from=/invite")}
      >
        {authenticated ? "去邀请" : "去登录"}
      </UnifiedButton>
    </section>
  );
}

function clampNewArrivalDisplayCount(value?: string) {
  const count = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(count)) return 8;
  return Math.min(16, Math.max(1, count));
}

function isCampaignEnabled(
  campaign: StorefrontCampaignVm,
  settings: Parameters<typeof isHomeModuleEnabled>[0],
  audience: "member" | "guest",
) {
  if (campaign.type === "flash_sale") return isHomeModuleEnabled(settings, "flash_sale_section", audience);
  if (campaign.type === "full_reduction" || campaign.type === "full_discount") return isHomeModuleEnabled(settings, "full_reduction_notice", audience);
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
    { label: "分类", path: "/categories" },
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
