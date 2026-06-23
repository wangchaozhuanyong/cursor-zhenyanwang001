import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, Clock, Gift, Tag, TicketPercent } from "lucide-react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { cn } from "@/lib/utils";
import StorefrontBadge from "../components/StorefrontBadge";
import StorefrontTitleRow from "../components/StorefrontTitleRow";
import { useClientDesignStyle } from "../design/useClientDesignStyle";
import type { StorefrontCampaignVm } from "../campaign/campaignTypes";
import { CAMPAIGN_TYPE_LABELS, campaignActionLabel, formatHomeV2Money, pickPrimaryCampaign } from "./homeV2Utils";

type HomePrimaryCampaignV2Props = {
  campaigns: StorefrontCampaignVm[];
  fallbackCampaigns?: StorefrontCampaignVm[];
  loading: boolean;
  onNavigate: (path: string) => void;
  onCampaignImpression?: (campaign: StorefrontCampaignVm, position: string) => void;
  onCampaignClick?: (campaign: StorefrontCampaignVm, position: string) => void;
};

const CAMPAIGN_SKELETON_COUNT = 4;

export default function HomePrimaryCampaignV2({
  campaigns,
  fallbackCampaigns = [],
  loading,
  onNavigate,
  onCampaignImpression,
  onCampaignClick,
}: HomePrimaryCampaignV2Props) {
  const clientStyle = useClientDesignStyle();
  const trackedImpressionsRef = useRef<Set<string>>(new Set());
  const primary = useMemo(() => pickPrimaryCampaign(campaigns), [campaigns]);
  const secondary = useMemo(
    () => campaigns.filter((campaign) => campaign.id !== primary?.id).slice(0, 3),
    [campaigns, primary?.id],
  );
  const visibleCampaigns = useMemo(() => {
    const configured = primary ? [primary, ...secondary] : [];
    const configuredTypes = new Set(configured.map((campaign) => campaign.type));
    const fallbackFillers = fallbackCampaigns.filter((campaign) => !configuredTypes.has(campaign.type));
    return [...configured, ...fallbackFillers].slice(0, 4);
  }, [fallbackCampaigns, primary, secondary]);

  useEffect(() => {
    if (loading || !onCampaignImpression) return;
    visibleCampaigns.forEach((campaign, index) => {
      if (campaign.source === "local") return;
      const position = index === 0 ? "home_primary_campaign" : `home_secondary_campaign_${index}`;
      const key = `${position}:${campaign.type}:${campaign.id}`;
      if (trackedImpressionsRef.current.has(key)) return;
      trackedImpressionsRef.current.add(key);
      onCampaignImpression(campaign, position);
    });
  }, [loading, onCampaignImpression, visibleCampaigns]);

  const handleCampaignNavigate = (campaign: StorefrontCampaignVm, position: string) => {
    if (campaign.source !== "local") onCampaignClick?.(campaign, position);
    onNavigate(campaign.href || "/categories");
  };

  if (loading && !primary) {
    return (
      <section
        className="store-home-v4-campaigns store-home-v4-campaigns--festive min-w-0"
        aria-busy="true"
        aria-label="活动优惠加载中"
      >
        <StorefrontTitleRow
          title="今日优惠"
          action={(
            <UnifiedButton
              type="button"
              disabled
              className="store-home-v12-shelf__action"
              aria-label="活动优惠加载中"
            >
              <Gift size={14} aria-hidden />
              <span>去领取</span>
            </UnifiedButton>
          )}
        />
        <div className="store-home-v4-campaign-grid grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: CAMPAIGN_SKELETON_COUNT }).map((_, index) => (
            <div
              key={index}
              className="store-home-v4-campaign-card store-home-v4-campaign-card--loading flex min-h-[7.25rem] min-w-0 items-center gap-3 border bg-[var(--theme-surface)] p-3 text-left shadow-sm"
              data-campaign-priority={index === 0 ? "primary" : "secondary"}
              aria-hidden="true"
            >
              <span className="store-home-v4-campaign-icon skeleton-base skeleton-shimmer grid h-12 w-12 shrink-0 place-items-center rounded-[0.875rem]" />
              <span className="min-w-0 flex-1 space-y-2">
                <span className="skeleton-base skeleton-shimmer block h-4 w-24 rounded-full" />
                <span className="skeleton-base skeleton-shimmer block h-5 w-4/5 max-w-full rounded-full" />
                <span className="skeleton-base skeleton-shimmer block h-3 w-3/5 max-w-full rounded-full" />
              </span>
              <span className="store-home-v4-campaign-action skeleton-base skeleton-shimmer inline-flex h-8 w-20 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!visibleCampaigns.length) return null;

  return (
    <section className="store-home-v4-campaigns store-home-v4-campaigns--festive min-w-0">
      <StorefrontTitleRow
        title="今日优惠"
        action={(
          <UnifiedButton
            type="button"
            onClick={() => onNavigate("/promotions")}
            className="store-home-v12-shelf__action"
            aria-label="去领取，进入优惠活动页面"
          >
            <Gift size={14} aria-hidden />
            <span>去领取</span>
          </UnifiedButton>
        )}
      />
      <div className="store-home-v4-campaign-grid grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleCampaigns.map((campaign, index) => (
          <CampaignCard
            key={`${campaign.source}-${campaign.type}-${campaign.id}`}
            campaign={campaign}
            clientStyle={clientStyle}
            priority={index === 0 ? "primary" : "secondary"}
            position={index === 0 ? "home_primary_campaign" : `home_secondary_campaign_${index}`}
            onClick={handleCampaignNavigate}
          />
        ))}
      </div>
    </section>
  );
}

function CampaignCard({
  campaign,
  clientStyle,
  priority,
  position,
  onClick,
}: {
  campaign: StorefrontCampaignVm;
  clientStyle: ReturnType<typeof useClientDesignStyle>;
  priority: "primary" | "secondary";
  position: string;
  onClick: (campaign: StorefrontCampaignVm, position: string) => void;
}) {
  const isHighlight = campaign.type === "flash_sale" || campaign.type === "full_reduction" || campaign.type === "full_discount";
  return (
    <UnifiedButton
      type="button"
      onClick={() => onClick(campaign, position)}
      data-campaign-type={campaign.type}
      data-campaign-priority={priority}
      className={cn(
        "store-home-v4-campaign-card group flex min-h-[7.25rem] min-w-0 items-center gap-3 border bg-[var(--theme-surface)] p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--theme-primary)_28%,var(--theme-border))] hover:shadow-[0_12px_34px_color-mix(in_srgb,var(--theme-primary)_10%,transparent)]",
        clientStyle === "deep_enterprise" ? "rounded-[0.875rem]" : "rounded-[1rem]",
        isHighlight
          ? "border-[color-mix(in_srgb,var(--theme-price)_18%,var(--theme-border))]"
          : "border-[color-mix(in_srgb,var(--theme-border)_84%,transparent)]",
        clientStyle === "black_gold" && "border-[color-mix(in_srgb,var(--theme-primary)_18%,var(--theme-border))]",
      )}
    >
      <span className={cn(
        "store-home-v4-campaign-icon grid h-12 w-12 shrink-0 place-items-center rounded-[0.875rem] text-[var(--theme-primary)]",
        isHighlight
          ? "bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] text-[var(--theme-price)]"
          : "bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))]",
      )}>
        {campaign.type === "coupon" || campaign.type === "new_user_gift" ? <Gift size={20} /> : campaign.type === "full_reduction" || campaign.type === "full_discount" ? <TicketPercent size={20} /> : <Tag size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex min-w-0 items-center gap-1.5">
          <StorefrontBadge
            tone={campaign.type === "flash_sale" ? "hot" : "normal"}
            className="store-home-v4-campaign-badge"
          >
            {CAMPAIGN_TYPE_LABELS[campaign.type]}
          </StorefrontBadge>
          {campaign.promoLabel ? <span className="store-home-v4-campaign-promo truncate text-xs font-black text-[var(--theme-price)]">{campaign.promoLabel}</span> : null}
        </span>
        <span className="line-clamp-1 text-sm font-black leading-5 text-[var(--theme-text)]">{campaign.title}</span>
        <CampaignMetric campaign={campaign} />
        {campaign.subtitle || campaign.description ? (
          <span className="mt-1 line-clamp-1 text-xs text-[var(--theme-text-muted)]">
            {campaign.subtitle || campaign.description}
          </span>
        ) : null}
      </span>
      <span className="store-home-v4-campaign-action inline-flex shrink-0 items-center gap-1 text-xs font-black text-[var(--theme-primary)]">
        {campaignActionLabel(campaign)}
        <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
      </span>
    </UnifiedButton>
  );
}

function CampaignMetric({ campaign }: { campaign: StorefrontCampaignVm }) {
  if (campaign.type === "flash_sale" && campaign.products.length > 0) {
    return (
      <span className="mt-1 block truncate text-xs text-[var(--theme-text-muted)]">
        {campaign.products.length} 件精选秒杀商品
      </span>
    );
  }

  if (campaign.type === "full_reduction" && campaign.thresholdAmount) {
    return (
      <span className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-xs font-semibold text-[var(--theme-text-muted)]">
        <Tag size={15} />
        满 RM {formatHomeV2Money(campaign.thresholdAmount)} 减 RM {formatHomeV2Money(campaign.discountAmount)}
      </span>
    );
  }

  if (campaign.type === "full_discount" && campaign.thresholdAmount) {
    return (
      <span className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-xs font-semibold text-[var(--theme-text-muted)]">
        <Tag size={15} />
        满 RM {formatHomeV2Money(campaign.thresholdAmount)} 打 {formatHomeV2Money((campaign.discountPercent || 0) / 10)} 折
      </span>
    );
  }

  if (campaign.endsAt) {
    return (
      <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--theme-text-muted)]">
        <Clock size={14} />
        限时活动
      </span>
    );
  }

  return null;
}
