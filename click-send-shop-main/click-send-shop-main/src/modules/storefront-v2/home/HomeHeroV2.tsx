import { useState, type FormEvent, type MouseEvent } from "react";
import { ChevronDown, Search, UserRound } from "lucide-react";
import BannerCarousel from "@/components/BannerCarousel";
import NotificationIconButton from "@/components/NotificationIconButton";
import StoreBrandLogo from "@/components/store/StoreBrandLogo";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Banner } from "@/types/banner";
import type { ThemeConfig } from "@/types/theme";
import { STORE_COPY } from "@/constants/storeCopy";
import { usePublicLocale } from "@/i18n/publicLocale";
import { useNotificationStore } from "@/stores/useNotificationStore";

type HomeHeroV2Props = {
  siteName: string;
  slogan: string;
  description: string;
  logoSrc?: string;
  banners: Banner[];
  bannersLoading: boolean;
  bannerEnabled: boolean;
  themeConfig: ThemeConfig;
  autoRotateMs: number;
  onNavigate: (path: string) => void;
};

export default function HomeHeroV2({
  siteName,
  slogan,
  description,
  logoSrc,
  banners,
  bannersLoading,
  bannerEnabled,
  themeConfig,
  autoRotateMs,
  onNavigate,
}: HomeHeroV2Props) {
  const hasBanner = bannerEnabled && (bannersLoading || banners.length > 0);
  const [keyword, setKeyword] = useState("");
  const { locale, localizedPath, t } = usePublicLocale();
  const displaySlogan = locale !== "zh" && containsCjk(slogan) ? t("hero.siteSlogan") : slogan;
  const displayDescription = locale !== "zh" && containsCjk(description) ? t("hero.siteDescription") : description;
  const heroTitle = buildQuietHeroTitle(siteName, displaySlogan);
  const compactHeroDescription = normalizeHeroDescription(displayDescription, heroTitle);

  const openSearchPage = (value = keyword) => {
    const trimmed = value.trim();
    onNavigate(localizedPath(trimmed ? `/search?keyword=${encodeURIComponent(trimmed)}` : "/search"));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    openSearchPage();
  };

  return (
    <section
      data-store-skin-showcase
      data-hero-layout={themeConfig.homeLayout}
      data-hero-banner-style={themeConfig.bannerStyle}
      className="sf-next-home-hero store-skin-hero"
    >
      <HeroChrome
        siteName={siteName}
        logoSrc={logoSrc}
        onNavigate={onNavigate}
      />

      <form
        onSubmit={submitSearch}
        className="sf-next-home-hero__search"
        onClick={stopPropagation}
        aria-label={t("hero.searchAria")}
      >
        <button
          type="button"
          className="sf-next-home-hero__search-scope"
          onClick={() => onNavigate(localizedPath("/search"))}
        >
          {t("common.searchScopeAll")}
          <ChevronDown size={14} aria-hidden />
        </button>
        <Search size={18} className="sf-next-home-hero__search-icon" aria-hidden />
        <label className="sr-only" htmlFor="home-v4-search">{t("hero.searchLabel")}</label>
        <input
          id="home-v4-search"
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t("hero.searchPlaceholder")}
          className="sf-next-home-hero__search-input"
        />
        <UnifiedButton
          type="submit"
          className="sf-next-home-hero__search-submit"
        >
          {t("common.searchSubmit")}
        </UnifiedButton>
      </form>

      <div className="sf-next-home-hero__feature">
        <div className="sf-next-home-hero__copy">
          <span className="sf-next-home-hero__kicker">{siteName}</span>
          <h2>{heroTitle}</h2>
          {compactHeroDescription ? <p>{compactHeroDescription}</p> : null}
          <UnifiedButton
            type="button"
            className="sf-next-home-hero__feature-action"
            onClick={() => onNavigate(localizedPath("/categories"))}
          >
            查看
          </UnifiedButton>
        </div>

        <div className="sf-next-home-hero__visual">
          <div className="sf-next-home-hero__art" aria-hidden="true">
            <span className="sf-next-home-hero__art-block sf-next-home-hero__art-block--ink" />
            <span className="sf-next-home-hero__art-block sf-next-home-hero__art-block--mint" />
            <span className="sf-next-home-hero__art-orb" />
            <span className="sf-next-home-hero__art-base" />
          </div>
          {hasBanner ? (
            <div className="sf-next-home-hero__banner-texture" aria-hidden="true">
              <BannerCarousel
                banners={banners}
                loading={bannersLoading}
                themeConfigOverride={themeConfig}
                autoRotateMs={autoRotateMs}
                trackingModule="home_v2_banner"
                showCopyLayer={false}
              />
            </div>
          ) : (
            <HeroFallbackVisual
              siteName={siteName}
              logoSrc={logoSrc}
              slogan={displaySlogan}
              description={displayDescription}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function stopPropagation(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function containsCjk(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function buildQuietHeroTitle(siteName: string, slogan: string) {
  const cleaned = slogan.replace(/\s+/g, " ").trim();
  if (!cleaned) return siteName || STORE_COPY.brandName;
  if (/马来西亚|华人|一站式|生活|服务/.test(cleaned)) {
    return "生活服务与优选商城";
  }
  if (cleaned.length <= 18) return cleaned;
  if (/商城|商品|好物/.test(cleaned) && /服务|生活|华人/.test(cleaned)) {
    return "生活服务与优选商城";
  }
  return cleaned.slice(0, 18);
}

function normalizeHeroDescription(description: string, title: string) {
  const cleaned = description
    .replace(/\s+/g, " ")
    .trim();
  const cleanedTitle = title.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned === cleanedTitle) return "";
  if (cleanedTitle && cleaned.includes(cleanedTitle) && cleaned.length <= cleanedTitle.length + 8) return "";
  if (cleaned.length > 34) return "";
  return cleaned;
}

function HeroChrome({
  siteName,
  logoSrc,
  onNavigate,
}: {
  siteName: string;
  logoSrc?: string;
  onNavigate: (path: string) => void;
}) {
  const { localizedPath, t } = usePublicLocale();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const brandName = siteName || STORE_COPY.brandName;
  return (
    <div className="sf-next-home-hero__chrome">
      <UnifiedButton
        type="button"
        onClick={() => onNavigate(localizedPath("/"))}
        className="sf-next-home-hero__brand"
        aria-label={`${brandName} ${t("common.home")}`}
      >
        <StoreBrandLogo
          src={logoSrc}
          siteName={brandName}
          fallbackText={brandName.trim().slice(0, 1)}
          width={34}
          height={34}
          className="sf-next-home-hero__brand-logo"
        />
        <span className="sf-next-home-hero__brand-copy">
          <span className="sf-next-home-hero__brand-name">{brandName}</span>
          <span className="sf-next-home-hero__brand-meta">{STORE_COPY.siteSlogan}</span>
        </span>
      </UnifiedButton>
      <nav className="sf-next-home-hero__links" aria-label={t("hero.quickNav")}>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/"))}>{t("common.home")}</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/categories"))}>{t("common.categories")}</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/categories?sort=sales_desc"))}>{t("common.flashSale")}</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/coupons"))}>{t("common.coupons")}</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/cart"))}>{t("common.cart")}</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/profile"))}>{t("common.member")}</UnifiedButton>
      </nav>
      <div className="sf-next-home-hero__actions">
        <NotificationIconButton
          unreadCount={unreadCount}
          onClick={() => onNavigate(localizedPath("/notifications"))}
          className="sf-next-home-hero__action"
        />
        <UnifiedButton
          type="button"
          className="sf-next-home-hero__action"
          onClick={() => onNavigate(localizedPath("/profile"))}
          aria-label={t("common.myAccount")}
        >
          <UserRound size={16} aria-hidden />
        </UnifiedButton>
      </div>
    </div>
  );
}

function HeroFallbackVisual({
  siteName,
  slogan,
  description,
  logoSrc,
}: {
  siteName: string;
  slogan: string;
  description: string;
  logoSrc?: string;
}) {
  return (
    <div className="sf-next-home-hero__fallback">
      <div className="sf-next-home-hero__fallback-mark" aria-hidden>
        {logoSrc ? <img src={logoSrc} alt="" className="h-full w-full object-contain p-10 opacity-80" /> : null}
      </div>
      <span className="sr-only">{siteName}{slogan}{description}</span>
    </div>
  );
}
