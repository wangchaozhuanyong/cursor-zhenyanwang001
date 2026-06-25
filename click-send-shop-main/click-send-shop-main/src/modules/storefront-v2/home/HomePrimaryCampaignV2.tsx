import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, Clock, Gift, Tag, TicketPercent } from "lucide-react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { cn } from "@/lib/utils";
import StorefrontTitleRow from "../components/StorefrontTitleRow";
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
        className="sf-next-campaign-section"
        aria-busy="true"
        aria-label="活动优惠加载中"
      >
        <StorefrontTitleRow
          title="今日优惠"
          action={(
            <UnifiedButton
              type="button"
              disabled
              className="sf-next-campaign-section__action"
              aria-label="活动优惠加载中"
            >
              <Gift size={14} aria-hidden />
              <span>去领取</span>
            </UnifiedButton>
          )}
        />
        <div className="sf-next-campaign-list">
          {Array.from({ length: CAMPAIGN_SKELETON_COUNT }).map((_, index) => (
            <div
              key={index}
              className="sf-next-campaign-card sf-next-campaign-card--loading"
              data-campaign-priority={index === 0 ? "primary" : "secondary"}
              aria-hidden="true"
            >
              <span className="sf-next-campaign-card__icon skeleton-base skeleton-shimmer" />
              <span className="sf-next-campaign-card__copy">
                <span className="skeleton-base skeleton-shimmer block h-4 w-24 rounded-full" />
                <span className="skeleton-base skeleton-shimmer block h-5 w-4/5 max-w-full rounded-full" />
                <span className="skeleton-base skeleton-shimmer block h-3 w-3/5 max-w-full rounded-full" />
              </span>
              <span className="sf-next-campaign-card__action skeleton-base skeleton-shimmer" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!visibleCampaigns.length) return null;

  return (
    <section className="sf-next-campaign-section">
      <StorefrontTitleRow
        title="今日优惠"
        action={(
          <UnifiedButton
            type="button"
            onClick={() => onNavigate("/promotions")}
            className="sf-next-campaign-section__action"
            aria-label="去领取，进入优惠活动页面"
          >
            <Gift size={14} aria-hidden />
            <span>去领取</span>
          </UnifiedButton>
        )}
      />
      <div className="sf-next-campaign-list">
        {visibleCampaigns.map((campaign, index) => (
          <CampaignCard
            key={`${campaign.source}-${campaign.type}-${campaign.id}`}
            campaign={campaign}
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
  priority,
  position,
  onClick,
}: {
  campaign: StorefrontCampaignVm;
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
        "sf-next-campaign-card group",
        isHighlight && "sf-next-campaign-card--highlight",
      )}
    >
      <span className={cn(
        "sf-next-campaign-card__icon",
        isHighlight && "sf-next-campaign-card__icon--highlight",
      )}>
        {campaign.type === "coupon" || campaign.type === "new_user_gift" ? <Gift size={20} /> : campaign.type === "full_reduction" || campaign.type === "full_discount" ? <TicketPercent size={20} /> : <Tag size={20} />}
      </span>
      <span className="sf-next-campaign-card__copy">
        <span className="sf-next-campaign-card__meta">
          <span className={cn("sf-next-campaign-card__badge", campaign.type === "flash_sale" && "is-hot")}>
            {CAMPAIGN_TYPE_LABELS[campaign.type]}
          </span>
          {campaign.promoLabel ? <span className="sf-next-campaign-card__promo">{campaign.promoLabel}</span> : null}
        </span>
        <span className="sf-next-campaign-card__title">{campaign.title}</span>
        <CampaignMetric campaign={campaign} />
        {campaign.subtitle || campaign.description ? (
          <span className="sf-next-campaign-card__description">
            {campaign.subtitle || campaign.description}
          </span>
        ) : null}
      </span>
      <span className="sf-next-campaign-card__action">
        {campaignActionLabel(campaign)}
        <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
      </span>
    </UnifiedButton>
  );
}

function CampaignMetric({ campaign }: { campaign: StorefrontCampaignVm }) {
  if (campaign.type === "flash_sale" && campaign.products.length > 0) {
    return (
      <span className="sf-next-campaign-card__metric">
        {campaign.products.length} 件精选秒杀商品
      </span>
    );
  }

  if (campaign.type === "full_reduction" && campaign.thresholdAmount) {
    return (
      <span className="sf-next-campaign-card__metric">
        <Tag size={15} />
        满 RM {formatHomeV2Money(campaign.thresholdAmount)} 减 RM {formatHomeV2Money(campaign.discountAmount)}
      </span>
    );
  }

  if (campaign.type === "full_discount" && campaign.thresholdAmount) {
    return (
      <span className="sf-next-campaign-card__metric">
        <Tag size={15} />
        满 RM {formatHomeV2Money(campaign.thresholdAmount)} 打 {formatHomeV2Money((campaign.discountPercent || 0) / 10)} 折
      </span>
    );
  }

  if (campaign.endsAt) {
    return (
      <span className="sf-next-campaign-card__metric">
        <Clock size={14} />
        限时活动
      </span>
    );
  }

  return null;
}
