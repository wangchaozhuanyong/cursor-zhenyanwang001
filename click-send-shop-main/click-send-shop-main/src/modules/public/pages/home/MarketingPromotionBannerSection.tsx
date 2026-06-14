import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Megaphone, Sparkles } from "lucide-react";
import * as marketingService from "@/services/marketingService";
import * as homeService from "@/services/homeService";
import type { MarketingActivitySummary } from "@/services/marketingService";
import { AnimatedSection } from "@/modules/micro-interactions";
import { trackEventLazy } from "@/services/trackEventLazy";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import RatioImage from "@/components/client/RatioImage";

export default function MarketingPromotionBannerSection({ delay = 0, title = "" }: { delay?: number; title?: string }) {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<MarketingActivitySummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    const cached = homeService.getCachedHomeMarketing();
    if (Array.isArray(cached?.promotionBanners)) {
      setBanners(cached.promotionBanners as MarketingActivitySummary[]);
    }
    homeService.fetchHomeMarketing().then((marketing) => {
      if (cancelled) return;
      if (Array.isArray(marketing?.promotionBanners)) {
        setBanners(marketing.promotionBanners as MarketingActivitySummary[]);
        return;
      }
      return marketingService.fetchMarketingNotices("promotion_banner").then((data) => {
        if (!cancelled) setBanners(data);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const banner = banners[0];
  if (!banner) return null;
  const openBanner = () => {
    trackEventLazy({ event_type: "activity_click", module: "promotion_banner", activity_id: banner.id });
    navigate(banner.link_url || "/categories");
  };

  const displayTitle = title || banner.title || "限时活动";
  const supportingText = banner.promo_label || banner.subtitle || "精选优惠，数量有限";

  return (
    <AnimatedSection delay={delay}>
      <section className="w-full">
        <UnifiedButton
          type="button"
          onClick={openBanner}
          className="group relative block min-h-[112px] w-full overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--theme-primary)_18%,var(--theme-border))] bg-[var(--theme-surface)] p-4 text-left theme-shadow transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--theme-primary)_38%,var(--theme-border))] hover:shadow-[var(--theme-shadow-hover)] md:min-h-[132px] md:p-5"
        >
          {banner.cover_image ? (
            <>
              <RatioImage
                src={banner.cover_image}
                alt=""
                ratio="16 / 9"
                rounded="none"
                className="absolute inset-0 h-full w-full"
                imgClassName="object-cover transition duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" aria-hidden />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 14% 18%, color-mix(in srgb, var(--theme-primary) 18%, transparent), transparent 32%), radial-gradient(circle at 86% 82%, color-mix(in srgb, var(--theme-price) 16%, transparent), transparent 34%), linear-gradient(135deg, color-mix(in srgb, var(--theme-surface) 92%, white), color-mix(in srgb, var(--theme-primary) 10%, var(--theme-bg)))",
              }}
              aria-hidden
            />
          )}

          <div className="relative z-[1] flex min-h-[80px] items-center justify-between gap-3 md:min-h-[92px]">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-sm ${banner.cover_image ? "bg-white/20 text-white backdrop-blur" : "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"}`}>
                <Megaphone size={19} />
              </span>
              <div className="min-w-0">
                <span className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${banner.cover_image ? "bg-white/20 text-white backdrop-blur" : "bg-[color-mix(in_srgb,var(--theme-primary)_12%,transparent)] text-[var(--theme-primary)]"}`}>
                  <Sparkles size={11} />
                  今日活动
                </span>
                <p className={`line-clamp-1 text-[15px] font-bold leading-5 ${banner.cover_image ? "text-white" : "text-[var(--theme-text)]"}`}>
                  {displayTitle}
                </p>
                <p className={`mt-1 line-clamp-1 text-xs leading-5 ${banner.cover_image ? "text-white/80" : "text-[var(--theme-text-muted)]"}`}>
                  {supportingText}
                </p>
              </div>
            </div>
            <span className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${banner.cover_image ? "bg-white text-[var(--theme-text)]" : "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"}`}>
              查看
              <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </UnifiedButton>
      </section>
    </AnimatedSection>
  );
}
