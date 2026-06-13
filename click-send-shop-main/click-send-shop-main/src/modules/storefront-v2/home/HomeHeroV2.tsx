import { ArrowRight, Search, ShieldCheck, ShoppingBag, Truck, WalletCards } from "lucide-react";
import BannerCarousel from "@/components/BannerCarousel";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Banner } from "@/types/banner";
import type { ThemeConfig } from "@/types/theme";
import { STORE_COPY } from "@/constants/storeCopy";

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
  { icon: <Truck size={17} />, label: "本地配送" },
  { icon: <ShieldCheck size={17} />, label: "售后保障" },
  { icon: <WalletCards size={17} />, label: "活动同享" },
];

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

  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
      <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[var(--theme-shadow)]">
        {hasBanner ? (
          <BannerCarousel
            banners={banners}
            loading={bannersLoading}
            themeConfigOverride={themeConfig}
            autoRotateMs={autoRotateMs}
            trackingModule="home_v2_banner"
          />
        ) : (
          <div className="relative min-h-[260px] overflow-hidden bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-primary)_16%,var(--theme-surface)),var(--theme-surface)_58%,color-mix(in_srgb,var(--theme-price)_12%,var(--theme-bg)))] px-5 py-6 md:min-h-[360px] md:px-8 md:py-9">
            <div className="max-w-2xl">
              <div className="mb-5 flex items-center gap-3">
                {logoSrc ? (
                  <img src={logoSrc} alt="" className="h-11 w-11 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] object-contain p-1" />
                ) : null}
                <span className="text-sm font-bold text-[var(--theme-primary)]">{siteName || STORE_COPY.brandName}</span>
              </div>
              <p className="text-2xl font-extrabold leading-tight text-[var(--theme-text)] md:text-4xl">{slogan}</p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--theme-text-muted)] md:text-base">{description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <UnifiedButton
                  type="button"
                  onClick={() => onNavigate("/categories")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-price)] px-4 py-2.5 text-sm font-bold text-[var(--theme-price-foreground)]"
                >
                  <ShoppingBag size={16} />
                  浏览商品
                </UnifiedButton>
                <UnifiedButton
                  type="button"
                  onClick={() => onNavigate("/search")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-text)]"
                >
                  <Search size={16} />
                  搜索服务
                </UnifiedButton>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)] sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-price)]">Today focus</p>
          <h2 className="mt-2 text-xl font-extrabold leading-tight text-[var(--theme-text)]">今日精选活动</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
            汇总本地好物、限时优惠和常用服务，适合先看活动再进分类慢慢挑。
          </p>
          <UnifiedButton
            type="button"
            onClick={() => onNavigate("/categories")}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-border)] px-3 py-2 text-sm font-semibold text-[var(--theme-text)]"
          >
            看全部
            <ArrowRight size={15} />
          </UnifiedButton>
        </div>
        <div className="grid gap-2 sm:col-span-1 lg:col-span-1">
          {heroPills.map((pill) => (
            <div key={pill.label} className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
                {pill.icon}
              </span>
              <span className="text-sm font-bold text-[var(--theme-text)]">{pill.label}</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
