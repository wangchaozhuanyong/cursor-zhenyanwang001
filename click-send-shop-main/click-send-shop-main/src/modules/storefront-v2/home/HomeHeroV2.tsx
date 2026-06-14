import { useState, type CSSProperties, type FormEvent } from "react";
import { ArrowRight, Compass, PackageCheck, Search, ShieldCheck, ShoppingBag, Sparkles, Truck, WalletCards } from "lucide-react";
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

const heroPills = [
  { icon: <ShoppingBag size={17} />, label: "优选商品", detail: "本地热卖" },
  { icon: <ShieldCheck size={17} />, label: "可信交易", detail: "清晰售后" },
  { icon: <Truck size={17} />, label: "本地配送", detail: "更快履约" },
  { icon: <WalletCards size={17} />, label: "活动优惠", detail: "券与满减" },
];

const heroStyleCopy: Record<ClientDesignStyle, { subline: string; primary: string; secondary: string }> = {
  blue_portal: { subline: "内容清楚 · 商品可信 · 浏览高效", primary: "探索商品", secondary: "精选推荐" },
  sky_tech: { subline: "专业高效 · 清晰筛选 · 快速下单", primary: "浏览商品", secondary: "今日热卖" },
  black_gold: { subline: "臻选品质 · 可信交易 · 高端好物", primary: "查看臻选", secondary: "热门商品" },
  deep_enterprise: { subline: "全站规范 · 信息清晰 · 稳定可信", primary: "进入商城", secondary: "热销排行" },
  classic: { subline: "一站式本地优选平台", primary: "浏览商品", secondary: "今日热卖" },
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
  const heroCopy = heroStyleCopy[clientStyle];
  const darkStyle = isDarkClientDesignStyle(clientStyle);
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
  const wrappedSlogan = addCjkSoftBreaks(slogan);
  const wrappedDescription = addCjkSoftBreaks(description);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = keyword.trim();
    onNavigate(value ? `/search?keyword=${encodeURIComponent(value)}` : "/search");
  };

  return (
    <section
      style={blackGoldHeroVars}
      className={cn(
        "store-home-hero-v2 relative overflow-hidden border p-3 md:p-5 lg:p-6",
        isBlackGold
          ? "rounded-[1.35rem] border-[color-mix(in_srgb,var(--theme-primary)_30%,var(--theme-border))] bg-[linear-gradient(132deg,#0F0F0F_0%,#18140F_48%,#0A0A0A_100%)] shadow-[0_24px_70px_color-mix(in_srgb,var(--theme-primary)_18%,transparent)]"
          : clientStyle === "deep_enterprise"
            ? "rounded-[1rem] border-[color-mix(in_srgb,var(--theme-primary)_16%,var(--theme-border))] bg-[linear-gradient(135deg,#FFFFFF_0%,color-mix(in_srgb,var(--theme-primary)_7%,var(--theme-surface))_52%,#F2F6FC_100%)] shadow-[0_16px_46px_rgba(15,23,42,0.09)]"
            : clientStyle === "blue_portal"
              ? "rounded-[1.25rem] border-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-border))] bg-[linear-gradient(145deg,#FFFFFF_0%,color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))_52%,#FFFFFF_100%)] shadow-[0_18px_54px_rgba(37,99,235,0.10)]"
              : "rounded-[1.75rem] border-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))_0%,var(--theme-surface)_48%,color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-bg))_100%)] shadow-[0_18px_56px_color-mix(in_srgb,var(--theme-primary)_12%,transparent)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--theme-primary)_32%,transparent),transparent)]" aria-hidden />
      <div
        className={cn(
          "grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:items-stretch",
          isBlackGold
            ? "lg:grid-cols-[minmax(0,0.86fr)_minmax(390px,1.14fr)]"
            : clientStyle === "deep_enterprise"
              ? "lg:grid-cols-[minmax(0,1fr)_minmax(390px,1fr)]"
              : "lg:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.96fr)]",
        )}
      >
        <div className="flex min-w-0 max-w-full flex-col justify-between gap-6 overflow-hidden px-1 py-2 md:px-2 lg:py-4">
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-3">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  className="h-11 w-11 rounded-[0.875rem] border border-[color-mix(in_srgb,var(--theme-primary)_18%,var(--theme-border))] bg-[var(--theme-surface)] object-contain p-1 shadow-sm"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--theme-primary)]">
                  {siteName || STORE_COPY.brandName}
                </p>
                <p className={cn("mt-1 text-xs", isBlackGold ? "text-[#D9C9A0]" : "text-[var(--theme-text-muted)]")}>
                  {heroCopy.subline}
                </p>
              </div>
            </div>

            <h2
              aria-label={slogan}
              className={cn(
                "w-full max-w-full whitespace-normal text-[1.45rem] font-black leading-[1.16] tracking-normal [overflow-wrap:anywhere] [word-break:break-all] sm:max-w-2xl sm:text-4xl sm:[word-break:normal] lg:text-5xl",
                isBlackGold
                  ? "text-[#F8F1DD] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
                  : "text-[var(--theme-text)]",
              )}
            >
              {wrappedSlogan}
            </h2>
            <p
              aria-label={description}
              className={cn(
                "mt-4 max-w-full whitespace-normal text-sm leading-6 [overflow-wrap:anywhere] [word-break:break-all] md:max-w-xl md:text-base md:[word-break:normal]",
                isBlackGold ? "text-[#DED3B9]" : "text-[var(--theme-text-muted)]",
              )}
            >
              {wrappedDescription}
            </p>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className={cn(
              "flex min-h-12 w-full max-w-2xl items-center gap-2 rounded-full border p-1.5 backdrop-blur",
              isBlackGold
                ? "border-[#6E552A] bg-[#17140F]/90 shadow-[0_10px_28px_rgba(212,175,55,0.16)]"
                : "border-[color-mix(in_srgb,var(--theme-primary)_18%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-surface)_90%,transparent)] shadow-[0_10px_28px_color-mix(in_srgb,var(--theme-primary)_10%,transparent)]",
            )}
          >
            <label className="sr-only" htmlFor="home-v2-hero-search">搜索商品或服务</label>
            <Search size={18} className={cn("ml-3 shrink-0", isBlackGold ? "text-[#C9B78A]" : "text-[var(--theme-text-muted)]")} aria-hidden />
            <input
              id="home-v2-hero-search"
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={STORE_COPY.searchPlaceholder}
              className={cn(
                "min-w-0 flex-1 bg-transparent text-sm font-medium outline-none",
                isBlackGold
                  ? "text-[#F8F1DD] placeholder:text-[#B9A77D]"
                  : "text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)]",
              )}
            />
            <UnifiedButton
              type="submit"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[var(--theme-primary)] px-4 text-sm font-black text-[var(--theme-primary-foreground)] shadow-[var(--theme-shadow-control)]"
            >
              搜索
              <ArrowRight size={15} />
            </UnifiedButton>
          </form>

          <div className="flex flex-wrap gap-2">
            <UnifiedButton
              type="button"
              onClick={() => onNavigate("/categories")}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-black text-[var(--theme-primary-foreground)] shadow-[var(--theme-shadow-control)]"
            >
              <ShoppingBag size={16} />
              {heroCopy.primary}
            </UnifiedButton>
            <UnifiedButton
              type="button"
              onClick={() => onNavigate("/categories?sort=sales_desc")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--theme-primary)_22%,var(--theme-border))] px-4 py-2.5 text-sm font-bold",
                isBlackGold
                  ? "bg-[#17140F]/84 text-[#F8F1DD]"
                  : darkStyle
                    ? "bg-[color-mix(in_srgb,var(--theme-surface)_84%,transparent)] text-[var(--theme-text)]"
                    : "bg-[var(--theme-surface)] text-[var(--theme-text)]",
              )}
            >
              <Sparkles size={16} />
              {heroCopy.secondary}
            </UnifiedButton>
          </div>
        </div>

        <div className="relative min-h-[15rem] min-w-0 md:min-h-[20rem]">
          <div
            className={cn(
              "h-full min-w-0 overflow-hidden border bg-[var(--theme-surface)] shadow-[0_14px_44px_color-mix(in_srgb,var(--theme-primary)_14%,transparent)]",
              clientStyle === "deep_enterprise" ? "rounded-[0.875rem]" : "rounded-[1.35rem]",
              isBlackGold
                ? "border-[color-mix(in_srgb,var(--theme-primary)_28%,var(--theme-border))] bg-[#111]"
                : "border-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-border))]",
            )}
          >
            {hasBanner ? (
              <BannerCarousel
                banners={banners}
                loading={bannersLoading}
                themeConfigOverride={themeConfig}
                autoRotateMs={autoRotateMs}
                trackingModule="home_v2_banner"
              />
            ) : (
              <HeroFallbackVisual siteName={siteName} logoSrc={logoSrc} clientStyle={clientStyle} />
            )}
          </div>
          <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {heroPills.map((pill) => (
              <div
                key={pill.label}
                className={cn(
                  "store-home-hero-pill flex min-w-0 items-center gap-2 rounded-[0.875rem] border px-2.5 py-2 shadow-sm backdrop-blur-md",
                  isBlackGold
                    ? "border-[rgba(212,175,55,0.24)] bg-[#211D17]/84"
                    : darkStyle
                    ? "border-[color-mix(in_srgb,var(--theme-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_76%,transparent)]"
                    : "border-white/70 bg-[color-mix(in_srgb,var(--theme-surface)_86%,transparent)]",
                )}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_11%,var(--theme-surface))] text-[var(--theme-primary)]">
                  {pill.icon}
                </span>
                <span className="min-w-0">
                  <span className={cn("store-home-hero-pill-title block truncate text-xs font-black", isBlackGold ? "text-[#F8F1DD]" : "text-[var(--theme-text)]")}>
                    {pill.label}
                  </span>
                  <span className={cn("store-home-hero-pill-detail block truncate text-[10px] font-medium", isBlackGold ? "text-[#D9C9A0]" : "text-[var(--theme-text-muted)]")}>
                    {pill.detail}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function addCjkSoftBreaks(value: string) {
  return value.replace(/([\u3400-\u9fff])(?=[\u3400-\u9fff])/g, "$1\u200B");
}

function HeroFallbackVisual({ siteName, logoSrc, clientStyle }: { siteName: string; logoSrc?: string; clientStyle: ClientDesignStyle }) {
  const darkStyle = isDarkClientDesignStyle(clientStyle);
  return (
    <div
      className={cn(
        "relative flex h-full min-h-[15rem] items-center justify-center overflow-hidden px-6 py-10 md:min-h-[20rem]",
        darkStyle
          ? "bg-[linear-gradient(145deg,#19140D_0%,#111_54%,#070707_100%)]"
          : clientStyle === "deep_enterprise"
            ? "bg-[linear-gradient(145deg,#FFFFFF_0%,#EEF4FF_54%,#FFFFFF_100%)]"
            : "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--theme-primary)_18%,white)_0%,color-mix(in_srgb,var(--theme-primary)_7%,var(--theme-surface))_52%,var(--theme-surface)_100%)]",
      )}
    >
      <div className="absolute inset-x-8 top-10 h-24 rounded-full border border-[color-mix(in_srgb,var(--theme-primary)_18%,transparent)] opacity-70" aria-hidden />
      <div className="absolute inset-x-14 top-20 h-28 rounded-full border border-[color-mix(in_srgb,var(--theme-primary)_12%,transparent)] opacity-70" aria-hidden />
      <div
        className={cn(
          "relative w-full max-w-sm border p-5 text-center shadow-[0_18px_52px_color-mix(in_srgb,var(--theme-primary)_18%,transparent)] backdrop-blur",
          clientStyle === "deep_enterprise" ? "rounded-[0.875rem]" : "rounded-[1.25rem]",
          darkStyle
            ? "border-[color-mix(in_srgb,var(--theme-primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_82%,transparent)]"
            : "border-white/72 bg-[color-mix(in_srgb,var(--theme-surface)_86%,transparent)]",
        )}
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[1rem] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] shadow-[var(--theme-shadow-control)]">
          {logoSrc ? <img src={logoSrc} alt="" className="h-10 w-10 object-contain" /> : <Compass size={28} />}
        </div>
        <p className="mt-4 text-lg font-black text-[var(--theme-text)]">{siteName || STORE_COPY.brandName}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">发现商品、服务和本地优惠</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-[var(--theme-primary)]">
          <PackageCheck size={18} />
          <span className="text-xs font-black">精选上架</span>
        </div>
      </div>
    </div>
  );
}
