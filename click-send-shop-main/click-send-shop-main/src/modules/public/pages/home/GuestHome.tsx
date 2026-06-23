import { lazy, useEffect, useMemo } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  GraduationCap,
  Home,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import StoreTabHeader from "@/components/store/StoreTabHeader";
import BannerCarousel from "@/components/BannerCarousel";
import HomeTrustBar from "@/components/HomeTrustBar";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import { useProductStore } from "@/stores/useProductStore";
import HomeOpsBlocks from "./HomeOpsBlocks";
import HomeSkinShowcase from "./HomeSkinShowcase";
import LazyHomeSection from "./LazyHomeSection";
import NewArrivalSection from "./NewArrivalOpsSection";
import type { Product } from "@/types/product";
import type { FooterNavItem } from "@/types/content";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getProductGridClassName } from "@/utils/productGridClasses";
import { AnimatedSection } from "@/modules/micro-interactions/components/AnimatedSection";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";
import { getHomeModuleCustomTitle, getHomeModuleTitle, isHomeModuleEnabled } from "@/constants/homeModules";
import {
  HOME_GUEST_FOOTER_WRAP_CLASS,
  HOME_GUEST_MAIN_CLASS,
} from "@/constants/homeLayout";
import { STORE_COPY } from "@/constants/storeCopy";
import { cn } from "@/lib/utils";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/utils/structuredData";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import SilkProductGrid from "@/components/motion/SilkProductGrid";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const FlashSaleSection = lazy(() => import("./FlashSaleSection"));
const GuestMobileFooter = lazy(() => import("@/components/GuestMobileFooter"));
const MarketingFullReductionSection = lazy(() => import("./MarketingFullReductionSection"));
const MarketingPromotionBannerSection = lazy(() => import("./MarketingPromotionBannerSection"));
const MarketingCouponRailSection = lazy(() => import("./MarketingCouponRailSection"));

function mergeHomeProductsForGuest(hot: Product[], recommended: Product[], max: number): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const list of [hot, recommended]) {
    for (const p of list) {
      if (!p?.id || seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= max) return out;
    }
  }
  return out;
}

function parseFooterNav(json?: string): FooterNavItem[] | null {
  if (!json || !json.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    const items = parsed
      .filter(
        (it): it is FooterNavItem =>
          it &&
          typeof it.label === "string" &&
          typeof it.path === "string" &&
          it.enabled !== false &&
          (it.section === undefined ||
            it.section === "support" ||
            it.section === "policy" ||
            it.section === "other"),
      )
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

function dedupeFooterNav(items: FooterNavItem[]): FooterNavItem[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = `${it.label}::${it.path}`;
    if (!it.path.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const guestRecommendFallbackItems = [
  {
    title: "找房安家",
    description: "租房、搬家、家具家电和入住事项。",
    path: "/categories?keyword=%E6%89%BE%E6%88%BF",
    icon: Home,
  },
  {
    title: "留学生活",
    description: "住宿、陪读、学校生活和日常支持。",
    path: "/categories?keyword=%E7%95%99%E5%AD%A6",
    icon: GraduationCap,
  },
  {
    title: "本地服务",
    description: "维修、清洁、安装、缴费等常用入口。",
    path: "/categories?keyword=%E6%9C%AC%E5%9C%B0%E6%9C%8D%E5%8A%A1",
    icon: Wrench,
  },
  {
    title: "商务资源",
    description: "商铺办公室、供应链和本地推广对接。",
    path: "/categories?keyword=%E5%95%86%E5%8A%A1",
    icon: BriefcaseBusiness,
  },
];

function GuestRecommendFallback({
  onNavigate,
  onRetry,
}: {
  onNavigate: (path: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow">
      <div className="border-b border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,transparent)] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] shadow-sm">
            <ShoppingBag size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--theme-text)]">商品数据正在同步</p>
            <p className="mt-1 text-xs leading-5 text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]">
              先从常用服务入口继续浏览，商品接口恢复后点击刷新即可展示真实爆款内容。
            </p>
            <UnifiedButton
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]"
            >
              <RefreshCw size={13} />
              刷新商品
            </UnifiedButton>
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {guestRecommendFallbackItems.map((item) => {
          const Icon = item.icon;
          return (
            <UnifiedButton
              key={item.title}
              type="button"
              onClick={() => onNavigate(item.path)}
              className="group flex min-h-24 items-center gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--theme-primary)] hover:bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-bg))]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-bg))] text-[var(--theme-primary)]">
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--theme-text)]">{item.title}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[var(--theme-text-muted)]">
                  {item.description}
                </span>
              </span>
              <ArrowRight className="shrink-0 text-[var(--theme-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--theme-primary)]" size={17} />
            </UnifiedButton>
          );
        })}
      </div>
    </div>
  );
}

export default function GuestHome() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const siteCapabilities = useSiteCapabilities();
  const productCardSiteContext = useMemo(
    () => ({
      restrictedComplianceEnabled: siteCapabilities.restrictedProductComplianceEnabled,
      siteInfo,
    }),
    [siteCapabilities.restrictedProductComplianceEnabled, siteInfo],
  );
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const slogan = siteInfo.siteSlogan || STORE_COPY.siteSlogan;
  const description = siteInfo.siteDescription || STORE_COPY.siteDescription;
  const { banners, loading: bannersLoading } = useHomeBanners();
  const { themeConfig } = useThemeRuntime();
  const productGridClass = getProductGridClassName(themeConfig.productCardVariant);
  const { settings: homeModules, ready: homeModulesReady } = useHomeModuleSettings();
  const guestBannerEnabled = isHomeModuleEnabled(homeModules, "banner", "guest");
  const showGuestIntroFallback =
    !bannersLoading && (!guestBannerEnabled || banners.length === 0);
  const guestGridMax = homeModules.guestRecommendMax;
  const hotProducts = useProductStore((s) => s.hotProducts);
  const newProducts = useProductStore((s) => s.newProducts);
  const recommendedProducts = useProductStore((s) => s.recommendedProducts);
  const homeLoading = useProductStore((s) => s.loading);
  const homeError = useProductStore((s) => s.error);
  const loadHomeData = useProductStore((s) => s.loadHomeData);

  useEffect(() => {
    const state = useProductStore.getState();
    const hasHomeData = state.hotProducts.length > 0 || state.newProducts.length > 0 || state.recommendedProducts.length > 0;
    void loadHomeData({ background: hasHomeData });
  }, [loadHomeData]);

  const gridProducts = useMemo(
    () => mergeHomeProductsForGuest(hotProducts, recommendedProducts, guestGridMax),
    [hotProducts, recommendedProducts, guestGridMax],
  );

  const customNav = useMemo(() => parseFooterNav(siteInfo.footerNav), [siteInfo.footerNav]);

  const supportNav = useMemo(() => {
    if (customNav?.length) {
      const withSection = customNav.filter((it) => it.section === "support");
      if (withSection.length) return dedupeFooterNav(withSection);
      return dedupeFooterNav(customNav.slice(0, 4));
    }
    return dedupeFooterNav([
      { label: "首页", path: "/" },
      { label: "分类", path: "/categories" },
      { label: "购物车", path: "/cart" },
      { label: "我的订单", path: "/orders" },
    ]);
  }, [customNav]);

  const policyNav = useMemo(() => {
    if (customNav?.length) {
      const policyItems = customNav.filter((it) => it.section === "policy" || it.section === "other");
      if (policyItems.length) return dedupeFooterNav(policyItems);
      return dedupeFooterNav(customNav.slice(4));
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
  }, [
    customNav,
    siteInfo.privacyPolicyPath,
    siteInfo.termsPath,
    siteInfo.refundPolicyPath,
    siteInfo.shippingPolicyPath,
  ]);

  const handleFooterNavigate = (path: string) => {
    if (path.startsWith("http")) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(path);
  };

  const homeLayout = themeConfig.homeLayout ?? "classic";
  const isMagazineLayout = homeLayout === "magazine";
  const showNavGrid = isHomeModuleEnabled(homeModules, "nav_grid", "guest");
  const showCouponCenter = isHomeModuleEnabled(homeModules, "coupon_center", "guest");
  const showCouponRail = homeModulesReady && showCouponCenter;
  const showPromotionBanner = isHomeModuleEnabled(homeModules, "promotion_banner", "guest");
  const showFlashSaleSection = isHomeModuleEnabled(homeModules, "flash_sale_section", "guest");
  const showFullReductionNotice = isHomeModuleEnabled(homeModules, "full_reduction_notice", "guest");
  const newArrivalsCustomTitle = getHomeModuleCustomTitle(homeModules, "new_arrivals");
  const promotionBannerTitle = getHomeModuleCustomTitle(homeModules, "promotion_banner");
  const flashSaleTitle = getHomeModuleCustomTitle(homeModules, "flash_sale_section");
  const fullReductionTitle = getHomeModuleCustomTitle(homeModules, "full_reduction_notice");
  const couponCenterTitle = getHomeModuleCustomTitle(homeModules, "coupon_center");
  const couponRailTitle = couponCenterTitle;
  const guestRecommendTitle = getHomeModuleTitle(homeModules, "guest_recommend", "最新服务与精选好物");
  const showGuestNewArrivals =
    isHomeModuleEnabled(homeModules, "new_arrivals", "guest") && (homeLoading || newProducts.length > 0);
  const compactCouponRailAfterNav =
    showCouponRail &&
    showNavGrid &&
    !showGuestNewArrivals &&
    !showPromotionBanner &&
    !showFlashSaleSection &&
    !showFullReductionNotice;
  const seoTitle = siteInfo.seoTitle || siteName;
  const seoDescription = siteInfo.seoDescription || description;
  const canonical = buildCanonical("/");
  const seoImage = siteInfo.ogImageUrl || logoSrc || "/og-default.png";
  return (
    <div
      className="store-page-shell store-bottom-safe store-home-desktop-shell store-skin-home-page bg-[var(--theme-bg)] text-[var(--theme-text)]"
      data-theme-home-layout={themeConfig.homeLayout}
    >
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        keywords={siteInfo.seoKeywords}
        canonical={canonical}
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

      <main
        className={cn(
          HOME_GUEST_MAIN_CLASS,
          "store-skin-home-main",
          isMagazineLayout && "bg-[color-mix(in_srgb,var(--theme-bg)_88%,black)]",
        )}
      >
        <h1 className="sr-only">{slogan}</h1>
        <p className="sr-only">{description}</p>

        {showGuestIntroFallback ? (
          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-4">
            <h2 className="text-base font-semibold text-[var(--theme-text)]">{slogan}</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--theme-text-muted)]">
              {description}
            </p>
          </section>
        ) : null}

        {(guestBannerEnabled ||
          isHomeModuleEnabled(homeModules, "trust_bar", "guest") ||
          showNavGrid) ? (
          <HomeSkinShowcase
            audience="guest"
            title={slogan}
            subtitle={description}
            hero={guestBannerEnabled ? (
              <div className="store-home-desktop-hero-panel">
                <div className="store-home-desktop-hero-media">
                  <BannerCarousel
                    banners={banners}
                    loading={bannersLoading}
                    themeConfigOverride={themeConfig}
                    autoRotateMs={homeModules.bannerAutoplaySeconds * 1000}
                  />
                </div>
              </div>
            ) : undefined}
            trust={isHomeModuleEnabled(homeModules, "trust_bar", "guest") ? (
              <HomeTrustBar className="store-home-desktop-trust" />
            ) : undefined}
            nav={showNavGrid ? <HomeOpsBlocks /> : undefined}
          />
        ) : null}

        {showGuestNewArrivals ? (
        <AnimatedSection delay={0.1}>
          <NewArrivalSection
            products={newProducts}
            loading={homeLoading}
            title={newArrivalsCustomTitle || siteInfo.newArrivalSectionTitle}
            exactTitle={Boolean(newArrivalsCustomTitle)}
            displayCount={Number(siteInfo.newArrivalDisplayCount || 8)}
            showPrice={siteInfo.newArrivalShowPrice !== "0"}
            className="store-home-primary-arrivals"
          />
        </AnimatedSection>
        ) : null}

        {showPromotionBanner ? (
          <LazyHomeSection>
            <MarketingPromotionBannerSection delay={0.105} title={promotionBannerTitle} />
          </LazyHomeSection>
        ) : null}

        {showFlashSaleSection ? (
          <LazyHomeSection>
            <FlashSaleSection delay={0.11} title={flashSaleTitle} />
          </LazyHomeSection>
        ) : null}

        {showFullReductionNotice ? (
          <LazyHomeSection>
            <MarketingFullReductionSection delay={0.111} title={fullReductionTitle || "满减特惠"} />
          </LazyHomeSection>
        ) : null}

        {showCouponRail ? (
          <LazyHomeSection delayMs={0}>
            <MarketingCouponRailSection
              showCouponCenter={showCouponCenter}
              showNewUserGift={showCouponCenter}
              title={couponRailTitle}
              compactAfterNav={compactCouponRailAfterNav}
            />
          </LazyHomeSection>
        ) : null}

        {isHomeModuleEnabled(homeModules, "guest_recommend", "guest") ? (
        <AnimatedSection delay={0.12}>
        <section className="store-home-featured-section store-skin-product-section">
          <div className="store-home-section-heading">
            <div>
              <h2 className="store-section-title flex items-center gap-2 tracking-widest text-[var(--theme-text)]">
                <Sparkles className="h-5 w-5 text-[var(--theme-price)]" />
                {guestRecommendTitle}
              </h2>
            </div>
          </div>
          <div className="store-home-featured-layout">
            <div className="store-home-featured-products">
          <h2 className="sr-only">
            <Sparkles className="h-5 w-5 text-[var(--theme-price)]" />
            {guestRecommendTitle}
          </h2>
          {homeError && gridProducts.length === 0 ? (
            <GuestRecommendFallback
              onNavigate={navigate}
              onRetry={() => void loadHomeData({ force: true })}
            />
          ) : null}
          {homeError && gridProducts.length > 0 ? (
            <p className="mb-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-center text-xs text-[var(--theme-text-muted)]">
              部分推荐内容暂时无法刷新，以下为缓存数据
            </p>
          ) : null}
          <SilkProductGrid
            products={gridProducts}
            className={`mt-4 store-home-featured-grid ${productGridClass}`}
            skeletonCount={guestGridMax}
            siteContext={productCardSiteContext}
            showFullSkeleton={homeLoading && !homeError && gridProducts.length === 0}
            emptyState={
              !homeLoading && !homeError ? (
                <div className="mt-6 rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)]/60 px-4 py-10 text-center">
              <p className="text-sm text-[var(--theme-text)]">暂无推荐商品</p>
              <p className="mt-2 text-xs text-[color-mix(in_srgb,var(--theme-text-on-surface)_70%,var(--theme-text-muted))]">
                请先浏览分类或登录查看；商家上架商品后，这里会自动展示。              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <UnifiedButton
                  type="button"
                  onClick={() => navigate("/categories")}
                  className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)]"
                >
                  {STORE_COPY.browseAllCategories}
                </UnifiedButton>
                <UnifiedButton
                  type="button"
                  onClick={() => navigate("/login", { state: { from: "/" } })}
                  className="rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]"
                >
                  登录 / 注册
                </UnifiedButton>
              </div>
                </div>
              ) : null
            }
          />
            </div>
          </div>
        </section>
        </AnimatedSection>
        ) : null}

        <div className={HOME_GUEST_FOOTER_WRAP_CLASS}>
          <LazyHomeSection>
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
              onNavigate={handleFooterNavigate}
            />
          </LazyHomeSection>
        </div>
      </main>
    </div>
  );
}
