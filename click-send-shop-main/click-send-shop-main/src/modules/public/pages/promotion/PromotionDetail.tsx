import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import * as marketingService from "@/services/marketingService";
import type { StorefrontPromotion, StorefrontPromotionCoupon } from "@/services/marketingService";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useCouponAction } from "@/features/coupon/useCouponAction";
import { usePublicLocale } from "@/i18n/publicLocale";
import type { CouponClaimStatus } from "@/types/coupon";
import { buildCanonical } from "@/utils/seo";

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

function formatCouponValue(coupon: StorefrontPromotionCoupon, t: (key: string) => string) {
  if (coupon.type === "percentage") return `${toNumber(coupon.value)}%`;
  if (coupon.type === "shipping") return t("promotion.freeShipping");
  return money(coupon.value);
}

function couponClaimStatusAfterSuccess(status: CouponClaimStatus = "already_claimed") {
  return {
    claim_status: status,
    claimable: false,
  };
}

export default function PromotionDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
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

  if (loading) {
    return (
      <main className="store-page-shell store-v12-page store-promotion-detail-v12-page flex min-h-[60vh] items-center justify-center text-[var(--theme-text-muted)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("promotion.loading")}
      </main>
    );
  }

  if (error || !promotion) {
    return (
      <main className="store-page-shell store-v12-page store-promotion-detail-v12-page mx-auto max-w-4xl px-4 py-8">
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
      title={promotion.title}
      description={promotion.description || promotion.subtitle || t("promotion.detailFallback")}
      canonical={buildCanonical(`${PROMOTIONS_BASE_PATH}/${promotion.slug || slug}`)}
      robots="index,follow"
    />
    <main className="store-page-shell store-v12-page store-promotion-detail-v12-page mx-auto max-w-6xl px-[var(--store-page-x)] pb-6 pt-[var(--store-page-y)] md:px-6 md:pb-8 md:pt-6 lg:px-8">
      <button
        type="button"
        className="store-promotion-detail-v12-back mb-2 inline-flex h-9 items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-[var(--theme-text-muted)] transition-colors hover:text-[var(--theme-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--theme-primary)_24%,transparent)] md:mb-3"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} />
        {t("common.back")}
      </button>

      <section className="store-promotion-detail-v12-hero">
        {promotion.cover_image ? (
          <div className="store-promotion-detail-v12-hero__media">
            <img src={promotion.cover_image} alt={promotion.title} />
          </div>
        ) : null}
        <div className="store-promotion-detail-v12-hero__body">
          <div className="store-promotion-detail-v12-hero__copy">
            <div className="store-promotion-detail-v12-hero__badges">
              <span>{promotionTypeLabel(promotion.type)}</span>
              <b>{statusLabel}</b>
              {promotion.promo_label ? <em>{promotion.promo_label}</em> : null}
            </div>
            <h1>{promotion.title}</h1>
            <p>{promotion.description || promotion.subtitle || t("promotion.detailFallback")}</p>
          </div>

          <div className="store-promotion-detail-v12-hero__stats">
            <div>
              <CalendarDays size={18} aria-hidden />
              <span>{t("promotion.time")}</span>
              <strong>{formatDate(promotion.start_at)} - {formatDate(promotion.end_at)}</strong>
            </div>
            <div>
              <Clock3 size={18} aria-hidden />
              <span>{t("promotion.countdown")}</span>
              <strong>{countdownLabel}</strong>
            </div>
            <div>
              <BadgePercent size={18} aria-hidden />
              <span>{t("promotion.stackable")}</span>
              <strong>{promotion.stackable ? t("promotion.stackableYes") : t("promotion.stackableNo")}</strong>
            </div>
            <div>
              <PackageSearch size={18} aria-hidden />
              <span>{t("promotion.applyScope")}</span>
              <strong>{promotion.scope_type || "all"} · {itemCount} 件商品</strong>
            </div>
          </div>
        </div>
      </section>

      {policies.length ? (
        <section className="mt-6 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 store-promotion-detail-v12-rules">
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">{t("promotion.policyEntries")}</h2>
          <dl className="mt-4 grid gap-3 md:grid-cols-3">
            {policies.map((policy) => (
              <div className="rounded-lg bg-[var(--theme-muted)] p-3" key={policy.key}>
                <dt className="text-xs uppercase text-[var(--theme-text-muted)]">{policy.key}</dt>
                <dd className="mt-1 break-words text-sm text-[var(--theme-text)]">{policy.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {rules.length ? (
        <section className="mt-6 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">{t("promotion.ruleEntries")}</h2>
          <dl className="mt-4 grid gap-3 md:grid-cols-2">
            {rules.map((rule) => (
              <div className="rounded-lg bg-[var(--theme-muted)] p-3" key={rule.key}>
                <dt className="text-xs uppercase text-[var(--theme-text-muted)]">{rule.key}</dt>
                <dd className="mt-1 break-words text-sm text-[var(--theme-text)]">{rule.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {coupons.length ? (
        <section className="mt-6 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--theme-text)]">{t("promotion.couponRewards")}</h2>
              <p className="mt-1 text-sm text-[var(--theme-text-muted)]">{t("promotion.couponRewardsHint")}</p>
            </div>
            <Link className="store-v12-compact-cta inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm font-medium text-[var(--theme-text)]" to={localizedPath("/coupons")}>
              <TicketPercent size={16} />
              {t("promotion.goCoupons")}
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {coupons.map((coupon) => {
              const actionState = getActionState(coupon);
              const remaining = coupon.total_quantity && coupon.total_quantity > 0
                ? Math.max(0, coupon.total_quantity - Number(coupon.claimed_count || 0))
                : null;
              return (
                <article className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-muted)] p-4" key={coupon.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-[var(--theme-primary)]">{coupon.display_badge || t("promotion.couponBadge")}</p>
                      <h3 className="mt-1 line-clamp-2 text-base font-semibold text-[var(--theme-text)]">{coupon.title}</h3>
                      {coupon.description ? <p className="mt-1 line-clamp-2 text-sm text-[var(--theme-text-muted)]">{coupon.description}</p> : null}
                    </div>
                    <strong className="shrink-0 text-lg text-[var(--theme-price)]">{formatCouponValue(coupon, t)}</strong>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-[var(--theme-text-muted)] sm:grid-cols-2">
                    <span>{t("promotion.minSpend")} {money(coupon.min_amount)}</span>
                    <span>{t("promotion.validUntil")} {formatDate(coupon.end_date)}</span>
                    {remaining !== null ? <span>{t("promotion.remainingCoupons")} {remaining}</span> : null}
                    {coupon.category_names?.length ? <span className="truncate">{t("promotion.scopeCategories")} {coupon.category_names.join(", ")}</span> : null}
                  </div>
                  {actionState.reason ? <p className="mt-3 text-xs text-[var(--theme-text-muted)]">{actionState.reason}</p> : null}
                  <UnifiedButton
                    type="button"
                    disabled={actionState.disabled || claimingId === coupon.id}
                    onClick={() => void handleClaimCoupon(coupon)}
                    className="store-v12-compact-cta mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2"
                  >
                    {claimingId === coupon.id ? <Loader2 size={16} className="animate-spin" /> : <TicketPercent size={16} />}
                    {claimingId === coupon.id ? t("promotion.claimingCoupon") : actionState.actionLabel}
                  </UnifiedButton>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {promotion.items?.length ? (
        <section className="store-promotion-detail-v12-products mt-6">
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">{t("promotion.items")}</h2>
          <div className="store-promotion-detail-v12-products__list mt-4 grid gap-3">
            {promotion.items.map((item) => (
              <Link className="store-promotion-detail-v12-product-row rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-sm" key={item.product_id} to={localizedPath(`/product/${item.product_id}`)}>
                {item.cover_image ? (
                  <div className="store-promotion-detail-v12-product-row__media">
                    <img className="h-full w-full object-cover" src={item.cover_image} alt={item.product_name} />
                  </div>
                ) : null}
                <div className="store-promotion-detail-v12-product-row__content">
                  <h3 className="line-clamp-2 text-sm font-semibold text-[var(--theme-text)]">{item.product_name}</h3>
                  <div className="store-promotion-detail-v12-product-row__price">
                    {item.activity_price > 0 ? <strong className="text-[var(--theme-price)]">{money(item.activity_price)}</strong> : null}
                    {item.product_price > item.activity_price && item.activity_price > 0 ? (
                      <span className="text-[var(--theme-text-muted)] line-through">{money(item.product_price)}</span>
                    ) : null}
                    {item.saving_amount > 0 ? (
                      <span className="store-promotion-detail-v12-product-row__save">
                        {t("promotion.save")} {money(item.saving_amount)}
                      </span>
                    ) : null}
                  </div>
                  <div className="store-promotion-detail-v12-product-row__stock">
                    <span>{t("promotion.sold")} {item.sold_count}</span>
                    <span>{item.sold_out ? t("promotion.soldOut") : `${t("promotion.stock")} ${item.remaining_stock}`}</span>
                  </div>
                  <div className="store-promotion-detail-v12-product-row__progress">
                    <div
                      className="store-promotion-detail-v12-product-row__progress-fill"
                      style={{ width: `${clampPercent(item.stock_progress_percent)}%` }}
                    />
                  </div>
                  {item.limit_per_user > 0 ? (
                    <p className="store-promotion-detail-v12-product-row__limit">{t("promotion.limitPerUser")} {item.limit_per_user}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
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
    <section className="store-promotion-detail-v12-state-panel" aria-live="polite">
      <div className="store-promotion-detail-v12-state-panel__icon">
        <ShieldCheck size={22} aria-hidden />
      </div>
      <div className="store-promotion-detail-v12-state-panel__copy">
        <p className="store-promotion-detail-v12-state-panel__eyebrow">活动详情</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="store-promotion-detail-v12-state-panel__checks" aria-label="活动详情说明">
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

      <div className="store-promotion-detail-v12-state-panel__actions">
        <UnifiedButton type="button" onClick={onRetry} className="store-promotion-detail-v12-state-panel__primary">
          <RefreshCw size={16} />
          重新加载
        </UnifiedButton>
        <Link className="store-promotion-detail-v12-state-panel__secondary" to={promotionsHref}>
          <BadgePercent size={16} />
          {allPromotionsLabel}
        </Link>
        <Link className="store-promotion-detail-v12-state-panel__secondary" to={categoriesHref}>
          <ShoppingBag size={16} />
          {browseLabel}
        </Link>
        <UnifiedButton type="button" onClick={onBack} className="store-promotion-detail-v12-state-panel__ghost">
          <ArrowLeft size={16} />
          {backLabel}
        </UnifiedButton>
      </div>
    </section>
  );
}
