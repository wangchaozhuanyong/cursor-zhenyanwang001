import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  RefreshCw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import * as marketingService from "@/services/marketingService";
import type { StorefrontPromotion, StorefrontPromotionCoupon } from "@/services/marketingService";
import StorefrontQuietLoading from "@/components/storefront-motion/StorefrontQuietLoading";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useCouponAction } from "@/features/coupon/useCouponAction";
import { usePublicLocale } from "@/i18n/publicLocale";
import type { CouponClaimStatus } from "@/types/coupon";
import { buildCanonical } from "@/utils/seo";
import { storefrontDisplayText, storefrontOptionalDisplayText } from "@/utils/storefrontCopySanitizer";
import ValueVaultCoupon, {
  type ValueVaultKind,
  type ValueVaultStatus,
} from "@/modules/storefront-v2/design/components/ValueVaultCoupon";
import "@/styles/promotions-route.css";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

const PROMOTIONS_BASE_PATH = "/promotions";

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function money(value: unknown) {
  return `RM ${toNumber(value).toFixed(2)}`;
}

function clampPercent(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(toNumber(value))));
}

function formatDuration(seconds: unknown) {
  const total = Math.max(0, Math.floor(toNumber(seconds)));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)) : [];
}

function formatPercent(value: unknown) {
  const percent = toNumber(value);
  if (percent > 0 && percent <= 1) return percent * 100;
  return percent;
}

function formatDiscountFold(percent: number) {
  return `${(percent / 10).toFixed(2).replace(/\.?0+$/, "")}`;
}

function couponIdsFromConfig(config: Record<string, unknown> | null) {
  const ids = Array.isArray(config?.coupon_ids)
    ? config.coupon_ids
    : Array.isArray(config?.couponIds)
      ? config.couponIds
      : [];
  return ids.map((id) => String(id || "").trim()).filter(Boolean);
}

const ruleConfigLabelKeys: Record<string, string> = {
  badge: "promotion.ruleBadge",
  countdown: "promotion.ruleCountdown",
  limit_per_user: "promotion.limitPerUser",
  stock_progress: "promotion.stockProgress",
};

function normalizeRuleConfigKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function formatRuleConfigKey(key: string, t: (key: string) => string) {
  const normalized = normalizeRuleConfigKey(key);
  const labelKey = ruleConfigLabelKeys[normalized];
  if (labelKey) return t(labelKey);
  return t("promotion.ruleCustomField");
}

function formatRuleConfigValue(value: unknown, t: (key: string) => string): string {
  if (typeof value === "boolean") return t(value ? "common.yes" : "common.no");
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return t("common.yes");
    if (normalized === "false") return t("common.no");
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatRuleConfigValue(item, t)).join(" / ");
  }
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ruleEntries(promotion: StorefrontPromotion | null, t: (key: string) => string) {
  const config = promotion?.rule_config || null;
  if (!config) return [];
  const entries: Array<{ key: string; value: string }> = [];

  const fullReductionRules = asRecordArray(config.full_reduction_rules);
  if (fullReductionRules.length) {
    entries.push({
      key: t("promotion.fullReductionRules"),
      value: fullReductionRules
        .map((rule) => `${money(rule.threshold_amount)} - ${money(rule.discount_amount)}`)
        .join(" / "),
    });
  }

  const fullDiscountRules = asRecordArray(config.full_discount_rules);
  if (fullDiscountRules.length) {
    entries.push({
      key: t("promotion.fullDiscountRules"),
      value: fullDiscountRules
        .map((rule) => `${money(rule.threshold_amount)} -> ${formatDiscountFold(formatPercent(rule.discount_percent ?? rule.discount_rate ?? rule.rate))}${t("promotion.discountFold")}`)
        .join(" / "),
    });
  }

  const memberPriceRules = asRecordArray(config.member_price_rules);
  if (memberPriceRules.length) {
    entries.push({
      key: t("promotion.memberPriceRules"),
      value: memberPriceRules
        .map((rule) => `${formatDiscountFold(formatPercent(rule.discount_percent ?? rule.discount_rate ?? rule.rate))}${t("promotion.discountFold")}`)
        .join(" / "),
    });
  }

  const rewardPoints = config.reward_points ?? config.points ?? config.daily_points ?? config.sign_in_points;
  if (rewardPoints != null && rewardPoints !== "") {
    entries.push({ key: t("promotion.rewardPoints"), value: `${Math.max(0, Math.trunc(toNumber(rewardPoints)))} ${t("common.points")}` });
  }

  const couponIds = couponIdsFromConfig(config);
  if (couponIds.length) {
    entries.push({ key: t("promotion.linkedCoupons"), value: `${couponIds.length} ${t("promotion.couponUnit")}` });
  }

  const consumedKeys = new Set([
    "full_reduction_rules",
    "full_discount_rules",
    "member_price_rules",
    "reward_points",
    "points",
    "daily_points",
    "sign_in_points",
    "coupon_ids",
    "couponIds",
  ]);
  for (const [key, value] of Object.entries(config)) {
    if (entries.length >= 8) break;
    if (consumedKeys.has(key) || value === null || value === undefined || value === "") continue;
    entries.push({
      key: formatRuleConfigKey(key, t),
      value: formatRuleConfigValue(value, t),
    });
  }

  return entries.slice(0, 8);
}

function policyEntries(
  promotion: StorefrontPromotion | null,
  t: (key: string) => string,
  promotionTypeLabel: (type: string) => string,
) {
  if (!promotion) return [];
  const entries = [
    {
      key: t("promotion.status"),
      value: promotion.runtime_status === "scheduled"
        ? t("promotion.notStarted")
        : promotion.runtime_status === "ended"
          ? t("promotion.ended")
          : t("promotion.active"),
    },
    {
      key: t("promotion.stackable"),
      value: promotion.stackable ? t("promotion.stackableYes") : t("promotion.stackableNo"),
    },
    {
      key: t("promotion.exclusiveWith"),
      value: promotion.exclusive_with?.length
        ? promotion.exclusive_with.map((type) => promotionTypeLabel(type)).join(" / ")
        : t("promotion.noExclusive"),
    },
    {
      key: t("promotion.usageLimitTotal"),
      value: promotion.usage_limit_total ? String(promotion.usage_limit_total) : t("promotion.unlimited"),
    },
    {
      key: t("promotion.usageLimitPerUser"),
      value: promotion.usage_limit_per_user ? String(promotion.usage_limit_per_user) : t("promotion.unlimited"),
    },
    {
      key: t("promotion.ruleVersion"),
      value: `v${promotion.version || 1}`,
    },
  ];
  return entries;
}

function formatCompactNumber(value: unknown) {
  return toNumber(value).toFixed(2).replace(/\.?0+$/, "");
}

function formatShortDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(date).replace(/\//g, ".");
}

function formatShortRange(start?: string | null, end?: string | null) {
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function promotionScopeLabel(scopeType: string | null | undefined, t: (key: string) => string) {
  const normalized = String(scopeType || "all").trim();
  const labels: Record<string, string> = {
    all: t("promotion.scopeAll"),
    category: t("promotion.scopeCategory"),
    product: t("promotion.scopeProduct"),
    new_user: t("promotion.scopeNewUser"),
    old_user: t("promotion.scopeOldUser"),
  };
  return labels[normalized] || t("promotion.applyScope");
}

function couponVaultKind(type: string): ValueVaultKind {
  if (type === "percentage") return "percentage";
  if (type === "shipping") return "shipping";
  return "fixed";
}

function couponVaultValue(coupon: StorefrontPromotionCoupon) {
  if (coupon.type === "shipping") return undefined;
  return formatCompactNumber(coupon.value);
}

function couponVaultStatus(claimStatus: CouponClaimStatus): ValueVaultStatus {
  if (claimStatus === "claimable" || claimStatus === "login_required") return "claimable";
  if (claimStatus === "already_claimed") return "claimed";
  if (claimStatus === "ended") return "expired";
  if (claimStatus === "disabled") return "invalid";
  return "locked";
}

function couponClaimStatusAfterSuccess(status: CouponClaimStatus = "already_claimed") {
  return {
    claim_status: status,
    claimable: false,
  };
}

export default function PromotionDetail() {
  const { slug = "" } = useParams();
  const navigate = useStorefrontNavigate();
  const { formatDate, localizedPath, promotionTypeLabel, t } = usePublicLocale();
  const detailPath = localizedPath(`${PROMOTIONS_BASE_PATH}/${slug}`);
  const { claim: claimCoupon, getActionState } = useCouponAction(detailPath);
  const [promotion, setPromotion] = useState<StorefrontPromotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  const load = useCallback(async () => {
    if (!slug) {
      setError(t("promotion.detailUnavailable"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const detail = await marketingService.fetchPromotionBySlug(slug);
      setPromotion(detail);
      setCountdownSeconds(toNumber(detail.countdown_seconds));
    } catch {
      setError(t("promotion.errorFallback"));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (countdownSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCountdownSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdownSeconds]);

  const rules = useMemo(() => ruleEntries(promotion, t), [promotion, t]);
  const policies = useMemo(() => policyEntries(promotion, t, promotionTypeLabel), [promotion, promotionTypeLabel, t]);
  const coupons = promotion?.coupons || [];
  const statusLabel = promotion?.runtime_status === "scheduled"
    ? t("promotion.notStarted")
    : promotion?.runtime_status === "ended"
      ? t("promotion.ended")
      : t("promotion.active");
  const countdownLabel = promotion?.runtime_status === "scheduled"
    ? `${t("promotion.startsIn")} ${formatDuration(promotion.starts_in_seconds)}`
    : countdownSeconds > 0
      ? formatDuration(countdownSeconds)
      : t("promotion.endingSoon");
  const itemCount = promotion?.items?.length || 0;
  const summaryItems = useMemo(() => {
    if (!promotion) return [];
    return [
      {
        id: "time",
        label: t("promotion.time"),
        value: formatShortRange(promotion.start_at, promotion.end_at),
      },
      {
        id: "countdown",
        label: t("promotion.countdown"),
        value: countdownLabel,
      },
      {
        id: "status",
        label: t("promotion.status"),
        value: statusLabel,
      },
      {
        id: "scope",
        label: t("promotion.applyScope"),
        value: itemCount > 0 ? `${itemCount} 件商品` : promotionScopeLabel(promotion.scope_type, t),
      },
    ];
  }, [countdownLabel, itemCount, promotion, statusLabel, t]);
  const hasRules = rules.length > 0 || policies.length > 0;
  const displayPromotionTitle = promotion
    ? storefrontDisplayText(promotion.title, `${promotionTypeLabel(promotion.type)}活动`)
    : "";
  const displayPromotionDescription = promotion
    ? storefrontDisplayText(promotion.description || promotion.subtitle, t("promotion.detailFallback"))
    : "";
  const displayPromotionSubtitle = promotion
    ? storefrontOptionalDisplayText(promotion.subtitle)
      || storefrontOptionalDisplayText(promotion.description)
      || t("promotion.detailFallback")
    : "";
  const displayPromoLabel = promotion ? storefrontOptionalDisplayText(promotion.promo_label) : undefined;

  const handleClaimCoupon = async (coupon: StorefrontPromotionCoupon) => {
    setClaimingId(coupon.id);
    try {
      const claimed = await claimCoupon(coupon, {
        from: detailPath,
        successMessage: t("promotion.couponClaimed"),
      });
      if (claimed) {
        setPromotion((current) => current ? {
          ...current,
          coupons: (current.coupons || []).map((item) => (
            item.id === coupon.id
              ? { ...item, ...couponClaimStatusAfterSuccess(), claim_reason: t("promotion.couponAlreadyClaimed") }
              : item
          )),
        } : current);
      }
    } finally {
      setClaimingId(null);
    }
  };

  const handleShare = async () => {
    if (!promotion) return;
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: displayPromotionTitle,
          text: displayPromotionDescription || displayPromotionTitle,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard?.writeText(shareUrl);
    } catch {
      // Sharing is a progressive enhancement; the page remains usable if it is cancelled.
    }
  };

  if (loading) {
    return (
      <main className="sf-next-page-shell sf-next-page sf-next-route-page sf-next-promotion-detail-page">
        <StorefrontQuietLoading label={t("promotion.loading")} className="sf-motion-inline-loading--detail" />
      </main>
    );
  }

  if (error || !promotion) {
    return (
      <main className="sf-next-page-shell sf-next-page sf-next-route-page sf-next-promotion-detail-page">
        <PromotionDetailStatePanel
          title={t("promotion.detailUnavailable")}
          description={error || t("promotion.emptyDescription")}
          onBack={() => navigate(-1)}
          onRetry={() => void load()}
          promotionsHref={localizedPath(PROMOTIONS_BASE_PATH)}
          categoriesHref={localizedPath("/categories")}
          allPromotionsLabel={t("common.allPromotions")}
          backLabel={t("common.back")}
          browseLabel={t("common.browseProducts")}
        />
      </main>
    );
  }

  return (
    <>
    <SeoHead
      title={displayPromotionTitle}
      description={displayPromotionDescription || t("promotion.detailFallback")}
      canonical={buildCanonical(`${PROMOTIONS_BASE_PATH}/${promotion.slug || slug}`)}
      robots="index,follow"
    />
    <main className="sf-next-page-shell sf-next-page sf-next-route-page sf-next-promotion-detail-page">
      <div className="sf-next-promotion-detail-topbar">
        <button
          type="button"
          className="sf-next-promotion-detail-icon-button"
          aria-label={t("common.back")}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={22} />
        </button>
        <h1>活动详情</h1>
        <button
          type="button"
          className="sf-next-promotion-detail-icon-button"
          aria-label="分享活动"
          onClick={() => void handleShare()}
        >
          <Share2 size={22} />
        </button>
      </div>

      <div className="sf-next-promotion-detail-layout">
        <div className="sf-next-promotion-detail-main">
          <section className="sf-next-promotion-detail-hero">
            {promotion.cover_image ? (
              <div className="sf-next-promotion-detail-hero__media">
                <img src={promotion.cover_image} alt={displayPromotionTitle} />
              </div>
            ) : (
              <div className="sf-next-promotion-detail-hero__media sf-next-promotion-detail-hero__media--placeholder" aria-hidden="true">
                <span />
                <i />
                <b />
              </div>
            )}
          </section>

          <section className="sf-next-promotion-detail-intro">
            <div className="sf-next-promotion-detail-hero__badges">
              <span>{promotionTypeLabel(promotion.type)}</span>
              <b>{statusLabel}</b>
              {displayPromoLabel ? <em>{displayPromoLabel}</em> : null}
            </div>
            <h2>{displayPromotionTitle}</h2>
          </section>

          {coupons.length ? (
            <section className="sf-next-promotion-detail-benefits">
              <div className="sf-next-promotion-detail-section-head">
                <div>
                  <h2>{t("promotion.couponRewards")}</h2>
                  <p>{t("promotion.couponRewardsHint")}</p>
                </div>
                <Link className="sf-next-promotion-detail-section-link" to={localizedPath("/coupons")}>
                  <TicketPercent size={16} />
                  {t("promotion.goCoupons")}
                </Link>
              </div>

              <div className="sf-next-promotion-detail-benefits__list">
                {coupons.map((coupon) => {
                  const actionState = getActionState(coupon);
                  return (
                    <ValueVaultCoupon
                      key={coupon.id}
                      kind={couponVaultKind(coupon.type)}
                      status={couponVaultStatus(actionState.claimStatus)}
                      title={coupon.title}
                      value={couponVaultValue(coupon)}
                      meta={`${t("promotion.minSpend")} ${money(coupon.min_amount)}`}
                      validText={`${formatDate(coupon.start_date)} - ${formatDate(coupon.end_date)}`}
                      unavailableReason={actionState.reason}
                      actionLabel={claimingId === coupon.id ? t("promotion.claimingCoupon") : actionState.actionLabel}
                      loading={claimingId === coupon.id}
                      disabled={actionState.disabled || claimingId === coupon.id}
                      onAction={() => void handleClaimCoupon(coupon)}
                    />
                  );
                })}
              </div>
            </section>
          ) : null}

          {promotion.items?.length ? (
            <section className="sf-next-promotion-detail-products">
              <div className="sf-next-promotion-detail-section-head">
                <div>
                  <h2>{t("promotion.items")}</h2>
                  <p>{itemCount} 件商品</p>
                </div>
              </div>
              <div className="sf-next-promotion-detail-products__list">
                {promotion.items.map((item) => (
                  <Link className="sf-next-promotion-detail-product-row" key={item.product_id} to={localizedPath(`/product/${item.product_id}`)}>
                    <div className="sf-next-promotion-detail-product-row__media">
                      {item.cover_image ? (
                        <img className="h-full w-full object-cover" src={item.cover_image} alt={storefrontDisplayText(item.product_name, "活动商品")} />
                      ) : (
                        <ShoppingBag size={22} aria-hidden />
                      )}
                    </div>
                    <div className="sf-next-promotion-detail-product-row__content">
                      <h3 className="line-clamp-2 text-sm font-semibold text-[var(--theme-text)]">{storefrontDisplayText(item.product_name, "活动商品")}</h3>
                      <div className="sf-next-promotion-detail-product-row__price">
                        {item.activity_price > 0 ? <strong className="text-[var(--theme-price)]">{money(item.activity_price)}</strong> : null}
                        {item.product_price > item.activity_price && item.activity_price > 0 ? (
                          <span className="text-[var(--theme-text-muted)] line-through">{money(item.product_price)}</span>
                        ) : null}
                        {item.saving_amount > 0 ? (
                          <span className="sf-next-promotion-detail-product-row__save">
                            {t("promotion.save")} {money(item.saving_amount)}
                          </span>
                        ) : null}
                      </div>
                      <div className="sf-next-promotion-detail-product-row__stock">
                        <span>{t("promotion.sold")} {item.sold_count}</span>
                        <span>{item.sold_out ? t("promotion.soldOut") : `${t("promotion.stock")} ${item.remaining_stock}`}</span>
                      </div>
                      <div className="sf-next-promotion-detail-product-row__progress">
                        <div
                          className="sf-next-promotion-detail-product-row__progress-fill"
                          style={{ width: `${clampPercent(item.stock_progress_percent)}%` }}
                        />
                      </div>
                      {item.limit_per_user > 0 ? (
                        <p className="sf-next-promotion-detail-product-row__limit">{t("promotion.limitPerUser")} {item.limit_per_user}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="sf-next-promotion-detail-sidebar" aria-label="活动信息">
          <section className="sf-next-promotion-detail-subcopy sf-next-promotion-detail-card">
            <div className="sf-next-promotion-detail-subcopy__meta">
              <span>{t("promotion.headerEyebrow")}</span>
              <b>{statusLabel}</b>
            </div>
            <p>{displayPromotionSubtitle}</p>
          </section>

          <section className="sf-next-promotion-detail-summary sf-next-promotion-detail-card" aria-label="活动摘要">
            {summaryItems.map((item) => (
              <div key={item.id}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </section>

          {hasRules ? (
            <section className="sf-next-promotion-detail-rules sf-next-promotion-detail-card">
              <div className="sf-next-promotion-detail-section-head sf-next-promotion-detail-section-head--stacked">
                <div>
                  <h2>{t("promotion.ruleEntries")}</h2>
                  <p>{t("promotion.detailFallback")}</p>
                </div>
              </div>

              {rules.length ? (
                <div className="sf-next-promotion-detail-rules__group">
                  <p className="sf-next-promotion-detail-rules__group-title">{t("promotion.ruleEntries")}</p>
                  <dl className="sf-next-promotion-detail-rule-list">
                    {rules.map((rule, index) => (
                      <div className="sf-next-promotion-detail-rule-row" key={`${rule.key}-${index}`}>
                        <dt>{rule.key}</dt>
                        <dd>{rule.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {policies.length ? (
                <div className="sf-next-promotion-detail-rules__group">
                  <p className="sf-next-promotion-detail-rules__group-title">{t("promotion.policyEntries")}</p>
                  <dl className="sf-next-promotion-detail-rule-list sf-next-promotion-detail-rule-list--policy">
                    {policies.map((rule, index) => (
                      <div className="sf-next-promotion-detail-rule-row" key={`${rule.key}-${index}`}>
                        <dt>{rule.key}</dt>
                        <dd>{rule.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </main>
    </>
  );
}

type PromotionDetailStatePanelProps = {
  allPromotionsLabel: string;
  backLabel: string;
  browseLabel: string;
  categoriesHref: string;
  description: string;
  onBack: () => void;
  onRetry: () => void;
  promotionsHref: string;
  title: string;
};

function PromotionDetailStatePanel({
  allPromotionsLabel,
  backLabel,
  browseLabel,
  categoriesHref,
  description,
  onBack,
  onRetry,
  promotionsHref,
  title,
}: PromotionDetailStatePanelProps) {
  return (
    <section className="sf-next-promotion-detail-state-panel" aria-live="polite">
      <div className="sf-next-promotion-detail-state-panel__icon">
        <ShieldCheck size={22} aria-hidden />
      </div>
      <div className="sf-next-promotion-detail-state-panel__copy">
        <p className="sf-next-promotion-detail-state-panel__eyebrow">活动详情</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="sf-next-promotion-detail-state-panel__checks" aria-label="活动详情说明">
        {[
          ["活动状态", "展示活动时间、状态和可用原因。"],
          ["优惠组合", "优惠资格、叠加互斥、限购和库存会在结算页确认。"],
          ["下单确认", "创建订单前会确认商品、优惠和支付金额。"],
        ].map(([label, value]) => (
          <div key={label}>
            <CheckCircle2 size={16} aria-hidden />
            <span>
              <strong>{label}</strong>
              <small>{value}</small>
            </span>
          </div>
        ))}
      </div>

      <div className="sf-next-promotion-detail-state-panel__actions">
        <UnifiedButton type="button" onClick={onRetry} className="sf-next-promotion-detail-state-panel__primary">
          <RefreshCw size={16} />
          重新加载
        </UnifiedButton>
        <Link className="sf-next-promotion-detail-state-panel__secondary" to={promotionsHref}>
          <BadgePercent size={16} />
          {allPromotionsLabel}
        </Link>
        <Link className="sf-next-promotion-detail-state-panel__secondary" to={categoriesHref}>
          <ShoppingBag size={16} />
          {browseLabel}
        </Link>
        <UnifiedButton type="button" onClick={onBack} className="sf-next-promotion-detail-state-panel__ghost">
          <ArrowLeft size={16} />
          {backLabel}
        </UnifiedButton>
      </div>
    </section>
  );
}
