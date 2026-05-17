import { useLayoutEffect, useMemo } from "react";
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
import NewArrivalOpsSection from "./NewArrivalOpsSection";
import type { Product } from "@/types/product";
import type { FooterNavItem } from "@/types/content";
import { ROUTES } from "@/constants/routes";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { AnimatedSection } from "@/modules/micro-interactions";
import { useHomeModuleSettings } from "@/hooks/useHomeModuleSettings";
import { isHomeModuleEnabled } from "@/constants/homeModules";

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
    const items = parsed.filter(
      (it): it is FooterNavItem =>
        it && typeof it.label === "string" && typeof it.path === "string",
    );
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
  const siteName = siteInfo.siteName || "FlashCast";
  const logoSrc = (siteInfo.logoUrl || "").trim() || logoWebp;
  const slogan = siteInfo.siteSlogan || "精选全球好物，品质生活";
  const description = siteInfo.siteDescription || "精选全球好物，品质生活购物平台";
  const { banners } = useHomeBanners();
  const { themeConfig } = useThemeRuntime();
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

  useLayoutEffect(() => {
    const { hotProducts, newProducts, recommendedProducts, loading } = useProductStore.getState();
    if (!loading && (hotProducts.length > 0 || newProducts.length > 0 || recommendedProducts.length > 0)) {
      useProductStore.setState({ loading: true });
    }
    void loadHomeData();
  }, [loadHomeData]);

  const gridProducts = useMemo(
    () => mergeHomeProductsForGuest(hotProducts, recommendedProducts, guestGridMax),
    [hotProducts, recommendedProducts, guestGridMax],
  );

  const customNav = useMemo(() => parseFooterNav(siteInfo.footerNav), [siteInfo.footerNav]);

  const supportNav = useMemo(() => {
    if (customNav?.length) return dedupeFooterNav(customNav.slice(0, 4));
    return dedupeFooterNav([
      { label: "首页", path: "/" },
      { label: "全部分类", path: "/categories" },
      { label: "购物车", path: "/cart" },
      { label: "我的订单", path: "/orders" },
    ]);
  }, [customNav]);

  const policyNav = useMemo(() => {
    const base: FooterNavItem[] =
      customNav && customNav.length > 4
        ? customNav.slice(4)
        : [
            { label: "常见问题", path: "/help" },
            { label: "关于我们", path: "/about" },
          ];
    const extra: FooterNavItem[] = [];
    if (siteInfo.privacyPolicyPath) extra.push({ label: "隐私政策", path: siteInfo.privacyPolicyPath });
    if (siteInfo.termsPath) extra.push({ label: "服务条款", path: siteInfo.termsPath });
    if (siteInfo.refundPolicyPath) extra.push({ label: "退款政策", path: siteInfo.refundPolicyPath });
    if (siteInfo.shippingPolicyPath) extra.push({ label: "配送政策", path: siteInfo.shippingPolicyPath });
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
  return (
    <div className={`min-h-screen bg-[var(--theme-bg)] ${bottomNavSafe} text-[var(--theme-text)]`} data-theme-home-layout={themeConfig.homeLayout}>
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

      <main className={`mx-auto max-w-screen-xl px-4 pt-4 ${isMagazineLayout ? "bg-[color-mix(in_srgb,var(--theme-bg)_88%,black)]" : ""}`}>
        {isHomeModuleEnabled(homeModules, "banner", "guest") ? (
          <AnimatedSection>
            <div className={isPremiumLayout || isMagazineLayout ? "overflow-hidden rounded-2xl border border-[var(--theme-border)] theme-shadow" : ""}>
              <BannerCarousel banners={banners} themeConfigOverride={themeConfig} />
            </div>
          </AnimatedSection>
        ) : null}
        {isHomeModuleEnabled(homeModules, "trust_bar", "guest") ? (
          <AnimatedSection delay={0.05}>
            <HomeTrustBar className="mt-3" />
          </AnimatedSection>
        ) : null}
        {isHomeModuleEnabled(homeModules, "nav_grid", "guest") ? (
          <AnimatedSection delay={0.08} className="-mx-4 mt-3">
            <HomeOpsBlocks />
          </AnimatedSection>
        ) : null}

        {isHomeModuleEnabled(homeModules, "new_arrivals", "guest") ? (
        <AnimatedSection delay={0.1} className="mt-4">
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
        </AnimatedSection>
        ) : null}

        {isHomeModuleEnabled(homeModules, "guest_recommend", "guest") ? (
        <AnimatedSection delay={0.12} className="mt-4">
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold tracking-widest text-[var(--theme-text)]">
            <Sparkles className="h-5 w-5 text-[var(--theme-price)]" />
            全网爆款
          </h2>
          {homeError && (
            <div className="mt-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-center text-sm text-[var(--theme-text-muted)]">
              <p>{homeError}</p>
              <button
                type="button"
                onClick={() => loadHomeData()}
                className="mt-3 rounded-full bg-[var(--theme-primary)] px-5 py-2 text-xs font-semibold text-[var(--theme-primary-foreground)]"
              >
                重试
              </button>
            </div>
          )}
          {homeLoading && !homeError && (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: guestGridMax }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}
          {!homeLoading && !homeError && gridProducts.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)]/60 px-4 py-10 text-center">
              <p className="text-sm text-[var(--theme-text)]">暂无推荐商品</p>
              <p className="mt-2 text-xs text-[var(--theme-text-muted)]">
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
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {gridProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </section>
        </AnimatedSection>
        ) : null}

        <div className="-mx-4 mt-14">
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
            onNavigate={handleFooterNavigate}
          />
        </div>
      </main>
    </div>
  );
}



