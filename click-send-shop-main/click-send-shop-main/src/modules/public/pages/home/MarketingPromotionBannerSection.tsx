import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as marketingService from "@/services/marketingService";
import * as homeService from "@/services/homeService";
import type { MarketingActivitySummary } from "@/services/marketingService";
import { AnimatedSection } from "@/modules/micro-interactions";
import { trackEventLazy } from "@/services/trackEventLazy";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StableImage from "@/components/ui/StableImage";

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

  return (
    <AnimatedSection delay={delay}>
    <section className="w-full">
      <UnifiedButton
        type="button"
        onClick={openBanner}
        className="relative block w-full overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-left theme-shadow"
      >
        {banner.cover_image ? (
          <StableImage
            src={banner.cover_image}
            alt=""
            width={960}
            height={360}
            className="h-28 w-full object-cover md:h-36"
            imgClassName="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-28 w-full bg-gradient-to-r from-[var(--theme-primary)]/20 to-[var(--theme-bg)] md:h-36" />
        )}
        <div className="absolute inset-0 flex flex-col justify-end bg-[linear-gradient(to_top,color-mix(in_srgb,var(--overlay-color)_55%,transparent),transparent)] p-4">
          <p className="text-sm font-bold text-[var(--hero-foreground)]">{title || banner.title}</p>
          {banner.promo_label ? <p className="text-xs text-[color-mix(in_srgb,var(--hero-foreground)_85%,transparent)]">{banner.promo_label}</p> : null}
        </div>
      </UnifiedButton>
    </section>
    </AnimatedSection>
  );
}
