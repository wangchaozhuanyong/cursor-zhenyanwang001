import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, Clock, Gift, Tag } from "lucide-react";
import RatioImage from "@/components/client/RatioImage";
import ProductCoverImage from "@/components/ProductCoverImage";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StorefrontBadge from "../components/StorefrontBadge";
import type { StorefrontCampaignVm } from "../campaign/campaignTypes";
import { CAMPAIGN_TYPE_LABELS, campaignActionLabel, formatHomeV2Money, pickPrimaryCampaign } from "./homeV2Utils";

type HomePrimaryCampaignV2Props = {
  campaigns: StorefrontCampaignVm[];
  loading: boolean;
  onNavigate: (path: string) => void;
  onCampaignImpression?: (campaign: StorefrontCampaignVm, position: string) => void;
  onCampaignClick?: (campaign: StorefrontCampaignVm, position: string) => void;
};

export default function HomePrimaryCampaignV2({
  campaigns,
  loading,
  onNavigate,
  onCampaignImpression,
  onCampaignClick,
}: HomePrimaryCampaignV2Props) {
  const trackedImpressionsRef = useRef<Set<string>>(new Set());
  const primary = useMemo(() => pickPrimaryCampaign(campaigns), [campaigns]);
  const secondary = useMemo(
    () => campaigns.filter((campaign) => campaign.id !== primary?.id).slice(0, 3),
    [campaigns, primary?.id],
  );
  const visibleCampaigns = useMemo(() => (primary ? [primary, ...secondary] : []), [primary, secondary]);

  useEffect(() => {
    if (loading || !onCampaignImpression) return;
    visibleCampaigns.forEach((campaign, index) => {
      const position = index === 0 ? "home_primary_campaign" : `home_secondary_campaign_${index}`;
      const key = `${position}:${campaign.type}:${campaign.id}`;
      if (trackedImpressionsRef.current.has(key)) return;
      trackedImpressionsRef.current.add(key);
      onCampaignImpression(campaign, position);
    });
  }, [loading, onCampaignImpression, visibleCampaigns]);

  const handleCampaignNavigate = (campaign: StorefrontCampaignVm, position: string) => {
    onCampaignClick?.(campaign, position);
    onNavigate(campaign.href || "/categories");
  };

  if (loading && !primary) {
    return (
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="h-56 animate-pulse rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]" />
        <div className="grid gap-3">
          <div className="h-24 animate-pulse rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]" />
          <div className="h-24 animate-pulse rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]" />
        </div>
      </section>
    );
  }

  if (!primary) return null;

  const hasCover = Boolean(primary.coverImage);

  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
      <UnifiedButton
        type="button"
        onClick={() => handleCampaignNavigate(primary, "home_primary_campaign")}
        className="group relative min-h-[15rem] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_24%,var(--theme-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface)),var(--theme-surface)_46%,color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-bg)))] p-0 text-left shadow-[var(--theme-shadow)]"
      >
        {hasCover ? (
          <RatioImage
            src={primary.coverImage}
            alt=""
            ratio="16 / 9"
            rounded="none"
            className="absolute inset-0 h-full w-full object-cover opacity-20 transition duration-300 group-hover:scale-[1.02]"
            imgClassName="object-cover"
            loading="lazy"
          />
        ) : null}
        <div className="relative flex min-h-[15rem] flex-col justify-between gap-5 p-4 md:p-5">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StorefrontBadge tone={primary.type === "flash_sale" ? "hot" : "sale"}>
                {CAMPAIGN_TYPE_LABELS[primary.type]}
              </StorefrontBadge>
              {primary.promoLabel ? (
                <span className="rounded-full bg-[var(--theme-surface)]/82 px-2.5 py-1 text-xs font-bold text-[var(--theme-price)] ring-1 ring-[color-mix(in_srgb,var(--theme-price)_24%,transparent)]">
                  {primary.promoLabel}
                </span>
              ) : null}
            </div>
            <h2 className="line-clamp-2 text-2xl font-extrabold leading-tight text-[var(--theme-text)] md:text-3xl">{primary.title}</h2>
            {primary.subtitle || primary.description ? (
              <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-6 text-[var(--theme-text-muted)]">
                {primary.subtitle || primary.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <CampaignMetric campaign={primary} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-price)] px-4 py-2 text-sm font-bold text-[var(--theme-price-foreground)]">
              {campaignActionLabel(primary)}
              <ArrowRight size={15} />
            </span>
          </div>
        </div>
      </UnifiedButton>

      <div className="grid gap-3">
        {secondary.length > 0 ? (
          secondary.map((campaign, index) => (
            <UnifiedButton
              key={`${campaign.type}-${campaign.id}`}
              type="button"
              onClick={() => handleCampaignNavigate(campaign, `home_secondary_campaign_${index + 1}`)}
              className="flex min-h-[6.75rem] items-center gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-left shadow-sm transition hover:border-[color-mix(in_srgb,var(--theme-price)_32%,var(--theme-border))]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-price)_11%,var(--theme-surface))] text-[var(--theme-price)]">
                {campaign.type === "coupon" || campaign.type === "new_user_gift" ? <Gift size={20} /> : <Tag size={20} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-[var(--theme-price)]">{CAMPAIGN_TYPE_LABELS[campaign.type]}</span>
                <span className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-[var(--theme-text)]">{campaign.title}</span>
                {campaign.promoLabel ? <span className="mt-1 block truncate text-xs text-[var(--theme-text-muted)]">{campaign.promoLabel}</span> : null}
              </span>
              <ArrowRight size={16} className="shrink-0 text-[var(--theme-text-muted)]" />
            </UnifiedButton>
          ))
        ) : (
          <div className="flex min-h-[6.75rem] items-center gap-3 rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-sm text-[var(--theme-text-muted)]">
            后台发布更多活动后，这里会自动展示辅助活动。
          </div>
        )}
      </div>
    </section>
  );
}

function CampaignMetric({ campaign }: { campaign: StorefrontCampaignVm }) {
  if (campaign.type === "flash_sale" && campaign.products.length > 0) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        {campaign.products.slice(0, 3).map((product) => (
          <span
            key={product.product_id}
            className="relative w-7 overflow-hidden rounded-xl border border-white/70 bg-[var(--theme-surface)]"
            style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}
          >
            <ProductCoverImage
              url={product.cover_image}
              alt={product.product_name}
              className="h-full w-full"
              imgClassName="h-full w-full object-cover"
              sizes="44px"
              loading="lazy"
            />
          </span>
        ))}
        <span className="text-xs font-semibold text-[var(--theme-text-muted)]">精选秒杀商品</span>
      </div>
    );
  }

  if (campaign.type === "full_reduction" && campaign.thresholdAmount) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-surface)]/88 px-3 py-2 text-sm font-bold text-[var(--theme-text)] ring-1 ring-[var(--theme-border)]">
        <Tag size={15} />
        满 RM {formatHomeV2Money(campaign.thresholdAmount)} 减 RM {formatHomeV2Money(campaign.discountAmount)}
      </span>
    );
  }

  if (campaign.endsAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-surface)]/88 px-3 py-2 text-xs font-semibold text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]">
        <Clock size={14} />
        限时活动
      </span>
    );
  }

  return null;
}
