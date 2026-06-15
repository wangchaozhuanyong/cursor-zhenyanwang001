import { useState, type CSSProperties, type FormEvent, type MouseEvent } from "react";
import { Bell, ChevronDown, Grid3X3, Search, UserRound } from "lucide-react";
import BannerCarousel from "@/components/BannerCarousel";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { cn } from "@/lib/utils";
import { isDarkClientDesignStyle, type ClientDesignStyle } from "@/utils/clientDesignStyle";
import type { Banner } from "@/types/banner";
import type { ThemeConfig } from "@/types/theme";
import { STORE_COPY } from "@/constants/storeCopy";
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

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const value = keyword.trim();
    onNavigate(value ? `/search?keyword=${encodeURIComponent(value)}` : "/search");
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
            slogan={slogan}
            description={description}
            logoSrc={logoSrc}
            clientStyle={clientStyle}
          />
        )}

        <div className="pointer-events-none absolute inset-0 z-[35] flex flex-col">
          <HeroChrome
            siteName={siteName}
            logoSrc={logoSrc}
            onNavigate={onNavigate}
          />
          <div className="store-home-v4-copy pointer-events-auto mt-auto w-full px-4 pb-5 sm:px-6 sm:pb-6 lg:px-9 lg:pb-8">
            {!hasBanner ? (
              <div className="store-home-v4-title-wrap mb-4 max-w-2xl text-white">
                <span className="store-home-v4-kicker">首页 Banner 轮播</span>
                <h2 className="store-home-v4-title">{slogan}</h2>
                <p className="store-home-v4-desc">{description}</p>
              </div>
            ) : null}
            <form
              onSubmit={submitSearch}
              className="store-home-v4-search-dock"
              onClick={stopPropagation}
              aria-label="首页搜索"
            >
              <button
                type="button"
                className="store-home-v4-search-scope"
                onClick={() => onNavigate("/search")}
              >
                全部内容
                <ChevronDown size={14} aria-hidden />
              </button>
              <Search size={19} className="store-home-v4-search-icon" aria-hidden />
              <label className="sr-only" htmlFor="home-v4-search">搜索商品、服务、品牌、优惠券</label>
              <input
                id="home-v4-search"
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索商品、服务、优惠券"
                className="store-home-v4-search-input"
              />
              <UnifiedButton
                type="submit"
                className="store-home-v4-search-submit"
              >
                搜索
              </UnifiedButton>
            </form>
            <div className="store-home-v4-hot-terms" aria-label="热门搜索">
              <UnifiedButton type="button" onClick={() => onNavigate("/categories?sort=sales_desc")}>热销</UnifiedButton>
              <UnifiedButton type="button" onClick={() => onNavigate("/coupons")}>优惠券</UnifiedButton>
              <UnifiedButton type="button" onClick={() => onNavigate("/categories?keyword=%E6%9C%AC%E5%9C%B0%E9%85%8D%E9%80%81")}>本地配送</UnifiedButton>
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

function HeroChrome({
  siteName,
  logoSrc,
  onNavigate,
}: {
  siteName: string;
  logoSrc?: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="store-home-v4-chrome pointer-events-auto mx-4 mt-4 flex items-center gap-3 rounded-[1.15rem] border px-3 py-2 text-white backdrop-blur-xl sm:mx-6 sm:mt-5 lg:mx-9">
      <UnifiedButton
        type="button"
        onClick={() => onNavigate("/")}
        className="store-home-v4-brand flex min-w-0 shrink-0 items-center gap-2 border-0 bg-transparent p-0 text-white"
        aria-label={`${siteName || STORE_COPY.brandName} 首页`}
      >
        <span className="store-home-v4-brand-mark">
          {logoSrc ? <img src={logoSrc} alt="" className="h-5 w-5 object-contain" /> : <Grid3X3 size={18} aria-hidden />}
        </span>
        <span className="truncate">{siteName || STORE_COPY.brandName}</span>
      </UnifiedButton>
      <nav className="store-home-v4-links hidden min-w-0 flex-1 items-center justify-center gap-5 text-xs font-black lg:flex" aria-label="首页快速导航">
        <UnifiedButton type="button" onClick={() => onNavigate("/")}>首页</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate("/categories")}>分类</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate("/categories?sort=sales_desc")}>秒杀</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate("/coupons")}>优惠券</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate("/support-download?tab=support")}>本地服务</UnifiedButton>
        <UnifiedButton type="button" onClick={() => onNavigate("/profile")}>会员</UnifiedButton>
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <UnifiedButton
          type="button"
          className="store-home-v4-icon-button"
          onClick={() => onNavigate("/notifications")}
          aria-label="消息通知"
        >
          <Bell size={16} aria-hidden />
        </UnifiedButton>
        <UnifiedButton
          type="button"
          className="store-home-v4-icon-button"
          onClick={() => onNavigate("/profile")}
          aria-label="我的"
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
