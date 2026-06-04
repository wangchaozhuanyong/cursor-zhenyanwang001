import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as marketingService from "@/services/marketingService";
import * as homeService from "@/services/homeService";
import type { MarketingActivitySummary } from "@/services/marketingService";
import { AnimatedSection } from "@/modules/micro-interactions";
import { trackEventLazy } from "@/services/trackEventLazy";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export default function MarketingPromotionBannerSection({ delay = 0 }: { delay?: number }) {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<MarketingActivitySummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    const cached = homeService.getCachedHomeBootstrap();
    if (Array.isArray(cached?.marketing?.promotionBanners)) {
      setBanners(cached.marketing.promotionBanners as MarketingActivitySummary[]);
    }
    homeService.fetchHomeBootstrap().then((bootstrap) => {
      if (cancelled) return;
      if (Array.isArray(bootstrap?.marketing?.promotionBanners)) {
        setBanners(bootstrap.marketing.promotionBanners as MarketingActivitySummary[]);
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
          <img src={banner.cover_image} alt="" className="h-28 w-full object-cover md:h-36" />
        ) : (
          <div className="h-28 w-full bg-gradient-to-r from-[var(--theme-primary)]/20 to-[var(--theme-bg)] md:h-36" />
        )}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/55 to-transparent p-4">
          <p className="text-sm font-bold text-white">{banner.title}</p>
          {banner.promo_label ? <p className="text-xs text-white/85">{banner.promo_label}</p> : null}
        </div>
      </UnifiedButton>
    </section>
    </AnimatedSection>
  );
}
