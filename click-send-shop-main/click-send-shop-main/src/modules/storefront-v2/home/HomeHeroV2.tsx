import { useState, type CSSProperties, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { ChevronDown, Grid3X3, Search, ShoppingCart, UserRound } from "lucide-react";
import BannerCarousel from "@/components/BannerCarousel";
import NotificationIconButton from "@/components/NotificationIconButton";
import StoreBrandLogo from "@/components/store/StoreBrandLogo";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { cn } from "@/lib/utils";
import { isDarkClientDesignStyle, type ClientDesignStyle } from "@/utils/clientDesignStyle";
import type { Banner } from "@/types/banner";
import type { ThemeConfig } from "@/types/theme";
import { STORE_COPY } from "@/constants/storeCopy";
import { usePublicLocale } from "@/i18n/publicLocale";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useClientDesignStyle } from "../design/useClientDesignStyle";

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
  const clientStyle = useClientDesignStyle();
  const { locale, localizedPath, t } = usePublicLocale();
  const displaySlogan = locale !== "zh" && containsCjk(slogan) ? t("hero.siteSlogan") : slogan;
  const displayDescription = locale !== "zh" && containsCjk(description) ? t("hero.siteDescription") : description;
  const isBlackGold = clientStyle === "black_gold";
  const blackGoldHeroVars: CSSProperties | undefined = isBlackGold
    ? {
        "--theme-text": "#F7F3E8",
        "--theme-text-muted": "#C9C2B2",
        "--theme-surface": "#171717",
        "--theme-bg": "#0A0A0A",
        "--theme-border": "#3B3428",
      } as CSSProperties
    : undefined;

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
      style={blackGoldHeroVars}
      className={cn(
        "store-home-hero-v2 store-home-hero-v4 relative overflow-hidden",
        isBlackGold
          ? "rounded-[1.35rem] bg-[linear-gradient(132deg,#0F0F0F_0%,#18140F_48%,#0A0A0A_100%)] shadow-[0_24px_70px_color-mix(in_srgb,var(--theme-primary)_18%,transparent)]"
          : clientStyle === "deep_enterprise"
            ? "rounded-[1rem] bg-[linear-gradient(135deg,#FFFFFF_0%,color-mix(in_srgb,var(--theme-primary)_7%,var(--theme-surface))_52%,#F2F6FC_100%)] shadow-[0_16px_46px_rgba(15,23,42,0.09)]"
            : clientStyle === "blue_portal"
              ? "rounded-[1.25rem] bg-[linear-gradient(145deg,#FFFFFF_0%,color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))_52%,#FFFFFF_100%)] shadow-[0_18px_54px_rgba(37,99,235,0.10)]"
              : "rounded-[1.75rem] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))_0%,var(--theme-surface)_48%,color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-bg))_100%)] shadow-[0_18px_56px_color-mix(in_srgb,var(--theme-primary)_12%,transparent)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--theme-primary)_32%,transparent),transparent)]" aria-hidden />
      <HeroChrome
        siteName={siteName}
        logoSrc={logoSrc}
        onNavigate={onNavigate}
      />
      <div className="store-home-v4-hero-media relative min-w-0 overflow-hidden">
        {hasBanner ? (
          <BannerCarousel
            banners={banners}
            loading={bannersLoading}
            themeConfigOverride={themeConfig}
            autoRotateMs={autoRotateMs}
            trackingModule="home_v2_banner"
          />
        ) : (
          <HeroFallbackVisual
            siteName={siteName}
            logoSrc={logoSrc}
            clientStyle={clientStyle}
            slogan={displaySlogan}
            description={displayDescription}
          />
        )}

        <div className="pointer-events-none absolute inset-0 z-[35] flex flex-col">
          <div className="store-home-v4-copy pointer-events-auto mt-auto w-full px-4 pb-5 sm:px-6 sm:pb-6 lg:px-9 lg:pb-8">
            {!hasBanner ? (
              <div className="store-home-v4-title-wrap mb-4 max-w-2xl text-white">
                <span className="store-home-v4-kicker">{t("hero.bannerKicker")}</span>
                <h2 className="store-home-v4-title">{displaySlogan}</h2>
                <p className="store-home-v4-desc">{displayDescription}</p>
              </div>
            ) : null}
            <form
              onSubmit={submitSearch}
              className="store-home-v4-search-dock"
              onClick={stopPropagation}
              aria-label={t("hero.searchAria")}
            >
              <button
                type="button"
                className="store-home-v4-search-scope"
                onClick={() => onNavigate(localizedPath("/search"))}
              >
                {t("common.searchScopeAll")}
                <ChevronDown size={14} aria-hidden />
              </button>
              <Search size={19} className="store-home-v4-search-icon" aria-hidden />
              <label className="sr-only" htmlFor="home-v4-search">{t("hero.searchLabel")}</label>
              <input
                id="home-v4-search"
                type="search"
                value={keyword}
                readOnly
                onChange={(event) => setKeyword(event.target.value)}
                onClick={() => openSearchPage()}
                onFocus={() => openSearchPage()}
                placeholder={t("hero.searchPlaceholder")}
                className="store-home-v4-search-input"
              />
              <UnifiedButton
                type="submit"
                className="store-home-v4-search-submit"
              >
                {t("common.searchSubmit")}
              </UnifiedButton>
            </form>
            <div className="store-home-v4-hot-terms" aria-label={t("hero.searchLabel")}>
              <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/categories?sort=sales_desc"))}>{t("hero.hotSales")}</UnifiedButton>
              <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/coupons"))}>{t("common.coupons")}</UnifiedButton>
              <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/categories?keyword=%E6%9C%AC%E5%9C%B0%E9%85%8D%E9%80%81"))}>{t("hero.hotLocalDelivery")}</UnifiedButton>
            </div>
          </div>
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
    <div className="store-home-v4-chrome pointer-events-auto flex items-center gap-3 rounded-[1.15rem] border px-3 py-2 text-white backdrop-blur-xl">
      <UnifiedButton
        type="button"
        onClick={() => onNavigate(localizedPath("/"))}
        className="store-home-v4-brand flex min-w-0 shrink-0 items-center gap-2 border-0 bg-transparent p-0 text-white"
        aria-label={`${brandName} ${t("common.home")}`}
      >
        <StoreBrandLogo
          src={logoSrc}
          siteName={brandName}
          fallbackText={brandName.trim().slice(0, 1)}
          width={34}
          height={34}
          className="store-home-v4-brand-logo"
        />
        <span className="store-home-v4-brand-copy min-w-0">
          <span className="store-home-v4-brand-name truncate">{brandName}</span>
          <span className="store-home-v4-brand-meta hidden truncate sm:block">{STORE_COPY.siteSlogan}</span>
        </span>
      </UnifiedButton>
      <nav className="store-home-v4-links hidden min-w-0 flex-1 items-center justify-center gap-5 text-xs font-black xl:flex" aria-label={t("hero.quickNav")}>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/"))}>{t("common.home")}</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/categories"))}>{t("common.categories")}</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/categories?sort=sales_desc"))}>{t("common.flashSale")}</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/coupons"))}>{t("common.coupons")}</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/cart"))}>{t("common.cart")}</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate(localizedPath("/profile"))}>{t("common.member")}</UnifiedButton>
      </nav>
      <div className="store-home-v4-actions ml-auto flex shrink-0 items-center gap-1.5">
        <NotificationIconButton
          unreadCount={unreadCount}
          onClick={() => onNavigate(localizedPath("/notifications"))}
          className="store-home-v4-action-button"
        />
        <HeroChromeActionButton
          label={t("common.categories")}
          onClick={() => onNavigate(localizedPath("/categories"))}
          icon={<Grid3X3 size={16} aria-hidden />}
        />
        <HeroChromeActionButton
          label={t("common.cart")}
          onClick={() => onNavigate(localizedPath("/cart"))}
          icon={<ShoppingCart size={16} aria-hidden />}
        />
        <UnifiedButton
          type="button"
          className="store-home-v4-action-button store-home-v4-icon-button"
          onClick={() => onNavigate(localizedPath("/profile"))}
          aria-label={t("common.myAccount")}
        >
          <UserRound size={16} aria-hidden />
        </UnifiedButton>
      </div>
    </div>
  );
}

function HeroChromeActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <UnifiedButton
      type="button"
      className="store-home-v4-action-button store-home-v4-icon-button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon}
    </UnifiedButton>
  );
}

function HeroFallbackVisual({
  siteName,
  slogan,
  description,
  logoSrc,
  clientStyle,
}: {
  siteName: string;
  slogan: string;
  description: string;
  logoSrc?: string;
  clientStyle: ClientDesignStyle;
}) {
  const darkStyle = isDarkClientDesignStyle(clientStyle);
  return (
    <div
      className={cn(
        "store-home-v4-fallback relative min-h-[23rem] overflow-hidden md:min-h-[24rem]",
        darkStyle
          ? "bg-[linear-gradient(145deg,#19140D_0%,#111_54%,#070707_100%)]"
          : clientStyle === "deep_enterprise"
            ? "bg-[linear-gradient(145deg,#FFFFFF_0%,#EEF4FF_54%,#FFFFFF_100%)]"
            : "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--theme-primary)_18%,white)_0%,color-mix(in_srgb,var(--theme-primary)_7%,var(--theme-surface))_52%,var(--theme-surface)_100%)]",
      )}
    >
      <picture className="absolute inset-0">
        <source media="(max-width: 767px)" srcSet="/assets/home-banners/home-hero-01-platform-bg-mobile.webp" />
        <img
          src="/assets/home-banners/home-hero-01-platform-bg.webp"
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
        />
      </picture>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.10),rgba(0,0,0,0.34))]" aria-hidden />
      <div className="absolute -right-10 bottom-6 h-36 w-36 rounded-[1.75rem] bg-white/78 shadow-[0_28px_68px_rgba(0,0,0,0.22)] rotate-6 md:h-52 md:w-52" aria-hidden>
        {logoSrc ? <img src={logoSrc} alt="" className="h-full w-full object-contain p-10 opacity-80" /> : null}
      </div>
      <div className="absolute -right-12 top-16 h-56 w-56 rounded-full border border-white/26 bg-white/12" aria-hidden />
      <span className="sr-only">{siteName}{slogan}{description}</span>
    </div>
  );
}
