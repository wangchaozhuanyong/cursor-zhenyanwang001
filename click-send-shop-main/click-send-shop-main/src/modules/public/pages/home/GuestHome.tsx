import { useEffect, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import logoWebp from "@/assets/logo.webp";
import StoreTabHeader from "@/components/store/StoreTabHeader";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import BannerCarousel from "@/components/BannerCarousel";
import HomeTrustBar from "@/components/HomeTrustBar";
import { useHomeBanners } from "@/hooks/useHomeBanners";
import { useProductStore } from "@/stores/useProductStore";
import GuestMobileFooter from "@/components/GuestMobileFooter";
import HomeOpsBlocks from "./HomeOpsBlocks";
import NewArrivalSection from "./NewArrivalOpsSection";
import FlashSaleSection from "./FlashSaleSection";
import MarketingCouponCenterSection from "./MarketingCouponCenterSection";
import MarketingNewUserGiftSection from "./MarketingNewUserGiftSection";
import MarketingFullReductionSection from "./MarketingFullReductionSection";
import MarketingPromotionBannerSection from "./MarketingPromotionBannerSection";
import type { Product } from "@/types/product";
import type { FooterNavItem } from "@/types/content";
import { ROUTES } from "@/constants/routes";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getProductGridClassName } from "@/utils/productGridClasses";
import { AnimatedSection } from "@/modules/micro-interactions";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";
import { isHomeModuleEnabled } from "@/constants/homeModules";
import {
  HOME_GUEST_FOOTER_WRAP_CLASS,
  HOME_GUEST_MAIN_CLASS,
  HOME_HERO_STACK_CLASS,
} from "@/constants/homeLayout";
import { cn } from "@/lib/utils";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/utils/structuredData";
import StorefrontLoadErrorPanel from "@/components/store/StorefrontLoadErrorPanel";

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

export default function GuestHome() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const siteName = siteInfo.siteName || "官方商城";
  const logoSrc = (siteInfo.logoUrl || "").trim() || logoWebp;
  const slogan = siteInfo.siteSlogan || "官方商品与服务平台";
  const description = siteInfo.siteDescription || "本平台提供商品、服务与客户支持信息。";
  const { banners } = useHomeBanners();
  const { themeConfig } = useThemeRuntime();
  const productGridClass = getProductGridClassName(themeConfig.productCardVariant);
  const { settings: homeModules } = useHomeModuleSettings();
  const guestGridMax = homeModules.guestRecommendMax;
  const {
    hotProducts,
    newProducts,
    recommendedProducts,
    loading: homeLoading,
    error: homeError,
    loadHomeData,
  } = useProductStore();

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
      { label: "全部分类", path: "/categories" },
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

  const bottomNavSafe = "store-bottom-safe";
  const homeLayout = themeConfig.homeLayout ?? "classic";
  const isPremiumLayout = homeLayout === "premium";
  const isMagazineLayout = homeLayout === "magazine";
  const seoTitle = siteInfo.seoTitle || siteName;
  const seoDescription = siteInfo.seoDescription || description;
  const canonical = buildCanonical("/");
  const seoImage = siteInfo.ogImageUrl || siteInfo.defaultOgImageUrl || siteInfo.logoUrl || "/og-default.png";
  return (
    <div className={`min-h-screen bg-[var(--theme-bg)] ${bottomNavSafe} text-[var(--theme-text)]`} data-theme-home-layout={themeConfig.homeLayout}>
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
        searchMode="none"
        showSiteNameMobile
        rightSlot={(
          <button
            type="button"
            onClick={() => navigate(ROUTES.LOGIN, { state: { from: ROUTES.HOME } })}
            className="shrink-0 rounded-full bg-[var(--theme-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]"
          >
            登录 / 注册
          </button>
        )}
      />

      <main
        className={cn(
          HOME_GUEST_MAIN_CLASS,
          isMagazineLayout && "bg-[color-mix(in_srgb,var(--theme-bg)_88%,black)]",
        )}
      >
        <section className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3">
          <h1 className="text-base font-semibold text-[var(--theme-text)]">{slogan}</h1>
          <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
            {description}
          </p>
        </section>

        {(isHomeModuleEnabled(homeModules, "banner", "guest") ||
          isHomeModuleEnabled(homeModules, "trust_bar", "guest") ||
          isHomeModuleEnabled(homeModules, "nav_grid", "guest")) ? (
          <div className={HOME_HERO_STACK_CLASS}>
        {isHomeModuleEnabled(homeModules, "banner", "guest") ? (
          <AnimatedSection>
            <div className={isPremiumLayout || isMagazineLayout ? "overflow-hidden rounded-2xl border border-[var(--theme-border)] theme-shadow" : ""}>
              <BannerCarousel banners={banners} themeConfigOverride={themeConfig} />
            </div>
          </AnimatedSection>
        ) : null}
        {isHomeModuleEnabled(homeModules, "trust_bar", "guest") ? (
          <AnimatedSection delay={0.05}>
            <HomeTrustBar />
          </AnimatedSection>
        ) : null}
        {isHomeModuleEnabled(homeModules, "nav_grid", "guest") ? (
          <AnimatedSection delay={0.08} className="-mx-[var(--store-page-x)] md:mx-0">
            <HomeOpsBlocks />
          </AnimatedSection>
        ) : null}
          </div>
        ) : null}

        {isHomeModuleEnabled(homeModules, "new_arrivals", "guest") ? (
        <AnimatedSection delay={0.1}>
          <NewArrivalSection
            products={newProducts}
            loading={homeLoading}
            title={siteInfo.newArrivalSectionTitle}
            displayCount={Number(siteInfo.newArrivalDisplayCount || 8)}
            showPrice={siteInfo.newArrivalShowPrice !== "0"}
          />
        </AnimatedSection>
        ) : null}

        {isHomeModuleEnabled(homeModules, "promotion_banner", "guest") ? (
          <MarketingPromotionBannerSection delay={0.105} />
        ) : null}

        {isHomeModuleEnabled(homeModules, "flash_sale_section", "guest") ? (
          <FlashSaleSection delay={0.11} />
        ) : null}

        {isHomeModuleEnabled(homeModules, "full_reduction_notice", "guest") ? (
          <MarketingFullReductionSection delay={0.111} />
        ) : null}

        {isHomeModuleEnabled(homeModules, "coupon_center", "guest") ? (
          <MarketingCouponCenterSection delay={0.112} />
        ) : null}

        {isHomeModuleEnabled(homeModules, "new_user_gift", "guest") ? (
          <MarketingNewUserGiftSection delay={0.113} />
        ) : null}

        {isHomeModuleEnabled(homeModules, "guest_recommend", "guest") ? (
        <AnimatedSection delay={0.12}>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold tracking-widest text-[var(--theme-text)] md:mb-4">
            <Sparkles className="h-5 w-5 text-[var(--theme-price)]" />
            全网爆款
          </h2>
          {homeError && gridProducts.length === 0 ? (
            <div className="mt-4">
              <StorefrontLoadErrorPanel
                message={homeError}
                onRetry={() => void loadHomeData({ force: true })}
              />
            </div>
          ) : null}
          {homeError && gridProducts.length > 0 ? (
            <p className="mb-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-center text-xs text-[var(--theme-text-muted)]">
              部分推荐内容暂时无法刷新，以下为缓存数据
            </p>
          ) : null}
          {homeLoading && !homeError && (
            <div className={`mt-4 ${productGridClass}`}>
              {Array.from({ length: guestGridMax }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}
          {!homeLoading && !homeError && gridProducts.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)]/60 px-4 py-10 text-center">
              <p className="text-sm text-[var(--theme-text)]">暂无推荐商品</p>
              <p className="mt-2 text-xs text-[color-mix(in_srgb,var(--theme-text-on-surface)_70%,var(--theme-text-muted))]">
                请先浏览分类或登录查看；商家上架商品后，这里会自动展示。              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/categories")}
                  className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)]"
                >
                  全部分类
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login", { state: { from: "/" } })}
                  className="rounded-full bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]"
                >
                  登录 / 注册
                </button>
              </div>
            </div>
          )}
          {!homeLoading && !homeError && gridProducts.length > 0 && (
            <div className={`mt-4 ${productGridClass}`}>
              {gridProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </section>
        </AnimatedSection>
        ) : null}

        <div className={HOME_GUEST_FOOTER_WRAP_CLASS}>
          <GuestMobileFooter
            siteName={siteName}
            slogan={slogan}
            description={description}
            supportNav={supportNav}
            policyNav={policyNav}
            contactPhone={siteInfo.contactPhone}
            contactEmail={siteInfo.contactEmail}
            contactWhatsApp={siteInfo.contactWhatsApp}
            businessHours={siteInfo.businessHours}
            address={siteInfo.address}
            whatsappUrl={siteInfo.whatsappUrl}
            wechatId={siteInfo.wechatId}
            instagramUrl={siteInfo.instagramUrl}
            facebookUrl={siteInfo.facebookUrl}
            tiktokUrl={siteInfo.tiktokUrl}
            xhsUrl={siteInfo.xhsUrl}
            footerCompanyName={siteInfo.footerCompanyName}
            footerCopyright={siteInfo.footerCopyright}
            footerIcpNo={siteInfo.footerIcpNo}
            onNavigate={handleFooterNavigate}
          />
        </div>
      </main>
    </div>
  );
}
