import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as marketingService from "@/services/marketingService";
import type { MarketingActivitySummary } from "@/services/marketingService";

export default function MarketingPromotionBannerSection() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<MarketingActivitySummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    marketingService.fetchMarketingNotices("promotion_banner").then((data) => {
      if (!cancelled) setBanners(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const banner = banners[0];
  if (!banner) return null;

  return (
    <section className="w-full">
      <button
        type="button"
        onClick={() => navigate(banner.link_url || "/categories")}
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
      </button>
    </section>
  );
}
