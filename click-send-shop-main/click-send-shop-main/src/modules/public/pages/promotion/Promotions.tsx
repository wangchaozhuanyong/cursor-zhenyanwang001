import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgePercent,
  CalendarDays,
  Clock3,
  Gem,
  Gift,
  PackageSearch,
  RefreshCw,
  Store,
  TicketPercent,
  Timer,
  Zap,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StorePageHeader from "@/components/store/StorePageHeader";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import * as marketingService from "@/services/marketingService";
import { buildCanonical } from "@/utils/seo";
import { cn } from "@/lib/utils";
import { usePublicLocale } from "@/i18n/publicLocale";
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";
import { isInternalStorefrontCopy, storefrontDisplayText } from "@/utils/storefrontCopySanitizer";
import type { PromotionType, StorefrontPromotion } from "@/services/marketingService";

type PromotionFilter = PromotionType | "";
const PROMOTIONS_BASE_PATH = "/promotions";
const PROMOTION_LIST_TTL_MS = 5 * 60 * 1000;
const PROMOTION_LOADING_CARD_COUNT = 3;

const promotionListCache = new Map<string, { list: StorefrontPromotion[]; cachedAt: number }>();

function promotionCacheKey(type: PromotionFilter) {
  return type || "all";
}

function readPromotionListCache(type: PromotionFilter) {
  const cached = promotionListCache.get(promotionCacheKey(type));
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > PROMOTION_LIST_TTL_MS) {
    promotionListCache.delete(promotionCacheKey(type));
    return null;
  }
  return cached;
}

function writePromotionListCache(type: PromotionFilter, list: StorefrontPromotion[]) {
  promotionListCache.set(promotionCacheKey(type), { list, cachedAt: Date.now() });
}

const FILTERABLE_PROMOTION_TYPES: PromotionType[] = [
  "coupon",
  "flash_sale",
  "full_reduction",
  "full_discount",
  "limited_time_discount",
  "member_price",
  "points_reward",
  "checkin_reward",
  "campaign",
];

const FILTERS: Array<{ type: PromotionFilter; icon: typeof Gift; fallbackLabel: string }> = [
  { type: "", icon: Gift, fallbackLabel: "全部" },
  { type: "coupon", icon: BadgePercent, fallbackLabel: "优惠券" },
  { type: "flash_sale", icon: Zap, fallbackLabel: "秒杀" },
  { type: "full_reduction", icon: TicketPercent, fallbackLabel: "满减" },
  { type: "full_discount", icon: TicketPercent, fallbackLabel: "满折" },
  { type: "member_price", icon: Gem, fallbackLabel: "会员价" },
];

function typeTone(type: PromotionType) {
  if (type === "flash_sale" || type === "limited_time_discount") {
    return "sf-next-promo-card__type--hot";
  }
  if (type === "coupon" || type === "full_reduction" || type === "full_discount") {
    return "sf-next-promo-card__type--coupon";
  }
  if (type === "member_price" || type === "points_reward" || type === "checkin_reward") {
    return "sf-next-promo-card__type--member";
  }
  return "sf-next-promo-card__type--default";
}

function statusTone(status: StorefrontPromotion["runtime_status"]) {
  if (status === "scheduled") return "sf-next-promo-card__runtime--scheduled";
  if (status === "ended") return "sf-next-promo-card__runtime--ended";
  return "sf-next-promo-card__runtime--active";
}

function runtimeStatusLabel(status: StorefrontPromotion["runtime_status"], t: (key: string) => string) {
  if (status === "scheduled") return t("promotion.notStarted");
  if (status === "ended") return t("promotion.ended");
  return t("promotion.active");
}

function formatDuration(seconds: unknown) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  if (minutes > 0) return `${minutes}分钟`;
  return "即将变化";
}

function runtimeStatusHint(promotion: StorefrontPromotion, t: (key: string) => string) {
  if (promotion.runtime_status === "scheduled") {
    return promotion.starts_in_seconds > 0
      ? `${t("promotion.startsIn")} ${formatDuration(promotion.starts_in_seconds)}`
      : t("promotion.notStarted");
  }
  if (promotion.runtime_status === "ended") return t("promotion.ended");
  return promotion.countdown_seconds > 0 ? `剩余 ${formatDuration(promotion.countdown_seconds)}` : t("promotion.endingSoon");
}

function formatRM(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return `RM ${amount.toLocaleString("zh-CN", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function isDisplayablePromoLabel(value: string | null | undefined) {
  const label = value?.trim() || "";
  return Boolean(label)
    && !isInternalStorefrontCopy(label)
    && !["秒杀", "优惠券", "满减", "满折", "活动"].includes(label);
}

function displayPromotionTitle(promotion: StorefrontPromotion, promotionTypeLabel: (type: string) => string) {
  const fallbackByType: Record<PromotionType, string> = {
    campaign: "精选主题活动",
    coupon: "领券优惠专区",
    full_reduction: "满减优惠专区",
    full_discount: "满折优惠专区",
    limited_time_discount: "限时折扣专区",
    flash_sale: "限时秒杀专区",
    member_price: "会员专享优惠",
    checkin_reward: "签到福利专区",
    points_reward: "积分奖励专区",
  };
  return storefrontDisplayText(promotion.title, fallbackByType[promotion.type] || `${promotionTypeLabel(promotion.type)}专区`);
}

function displayPromotionSubtitle(promotion: StorefrontPromotion) {
  const fallbackByType: Record<PromotionType, string> = {
    campaign: "精选活动限时开放",
    coupon: "领券后下单更划算",
    full_reduction: "满足金额自动优惠",
    full_discount: "凑单享受组合折扣",
    limited_time_discount: "限时商品优惠进行中",
    flash_sale: "指定商品限时优惠",
    member_price: "会员专享价格与权益",
    checkin_reward: "每日签到领取福利",
    points_reward: "下单可获得积分奖励",
  };
  return storefrontDisplayText(
    promotion.subtitle?.trim() || promotion.description?.trim(),
    fallbackByType[promotion.type] || "精选优惠活动",
  );
}

function promotionBenefitLabel(promotion: StorefrontPromotion) {
  const itemSavings = (promotion.items || [])
    .map((item) => Number(item.saving_amount) || 0)
    .filter((value) => value > 0);
  const bestSaving = itemSavings.length ? Math.max(...itemSavings) : 0;
  const itemSavingPercents = (promotion.items || [])
    .map((item) => Number(item.saving_percent) || 0)
    .filter((value) => value > 0);
  const bestSavingPercent = itemSavingPercents.length ? Math.max(...itemSavingPercents) : 0;
  const couponCount = promotion.coupons?.length || 0;

  if (bestSaving > 0) return `最高省 ${formatRM(bestSaving)}`;
  if (bestSavingPercent > 0) return `最高优惠 ${Math.round(bestSavingPercent)}%`;
  if (couponCount > 0) return `${couponCount} 张优惠券待领取`;
  if (isDisplayablePromoLabel(promotion.promo_label)) {
    return promotion.promo_label.trim();
  }

  const fallbackByType: Record<PromotionType, string> = {
    campaign: "精选福利",
    coupon: "先领券再下单",
    full_reduction: "满额立减",
    full_discount: "满额折扣",
    limited_time_discount: "限时直降",
    flash_sale: "限时秒杀",
    member_price: "会员专享价",
    checkin_reward: "签到有礼",
    points_reward: "积分加速",
  };
  return fallbackByType[promotion.type] || "优惠进行中";
}

function promotionActionLabel(type: PromotionType) {
  const labels: Record<PromotionType, string> = {
    campaign: "查看活动",
    coupon: "去领券",
    full_reduction: "去凑单",
    full_discount: "去凑单",
    limited_time_discount: "马上抢",
    flash_sale: "马上抢",
    member_price: "看会员价",
    checkin_reward: "去签到",
    points_reward: "赚积分",
  };
  return labels[type] || "查看活动";
}

function buildFilterHref(type: PromotionFilter) {
  return type ? `${PROMOTIONS_BASE_PATH}?type=${type}` : PROMOTIONS_BASE_PATH;
}

function filterScrollKey(type: PromotionFilter) {
  return type || "all";
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

function PromotionCard({ promotion }: { promotion: StorefrontPromotion }) {
  const { formatDate, localizedPath, promotionTypeLabel, t } = usePublicLocale();
  const detailPath = localizedPath(`${PROMOTIONS_BASE_PATH}/${promotion.slug}`);
  const itemCount = promotion.items?.length || 0;
  const couponCount = promotion.coupons?.length || 0;
  const displayTitle = displayPromotionTitle(promotion, promotionTypeLabel);
  const displaySubtitle = displayPromotionSubtitle(promotion);
  const benefitLabel = promotionBenefitLabel(promotion);
  const actionLabel = promotionActionLabel(promotion.type);
  const scopeLabel = promotionScopeLabel(promotion.scope_type, t);
  const typeLabel = promotionTypeLabel(promotion.type);
  const showBenefit = benefitLabel
    && benefitLabel !== typeLabel
    && benefitLabel !== displayTitle
    && benefitLabel !== displaySubtitle
    && (benefitLabel.includes("RM") || benefitLabel.includes("%") || benefitLabel.includes("券") || isDisplayablePromoLabel(promotion.promo_label));

  return (
    <article
      className="sf-next-promo-card group"
      data-promotion-type={promotion.type}
    >
      {promotion.cover_image ? (
        <Link to={detailPath} className="sf-next-promo-card__media">
          <img
            src={promotion.cover_image}
            alt={displayTitle}
            className="sf-next-promo-card__image"
            loading="lazy"
          />
        </Link>
      ) : null}

      <div className="sf-next-promo-card__body">
        <div className="sf-next-promo-card__ribbon">
          <span className={cn("sf-next-promo-card__type", typeTone(promotion.type))}>
            {typeLabel}
          </span>
          <span className={cn("sf-next-promo-card__runtime", statusTone(promotion.runtime_status))}>
            {runtimeStatusLabel(promotion.runtime_status, t)}
          </span>
        </div>

        <div className="sf-next-promo-card__headline">
          <Link to={detailPath} className="block min-w-0">
            <h2 className="sf-next-promo-card__title">
              {displayTitle}
            </h2>
            {showBenefit ? <p className="sf-next-promo-card__benefit">{benefitLabel}</p> : null}
            <p className="sf-next-promo-card__subtitle">{displaySubtitle}</p>
          </Link>
        </div>

        <div className="sf-next-promo-card__facts">
          <span>
            <Clock3 size={15} className="shrink-0" />
            <span className="truncate">{runtimeStatusHint(promotion, t)}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <CalendarDays size={15} className="shrink-0" />
            <span className="truncate">{formatDate(promotion.start_at)} - {formatDate(promotion.end_at)}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Store size={15} className="shrink-0" />
            <span className="truncate">{scopeLabel}</span>
          </span>
        </div>

        <div className="sf-next-promo-card__footer">
          <span className="sf-next-promo-card__count">
            {itemCount ? `${itemCount} 件商品参与` : couponCount ? `${couponCount} 张券可用` : "限时福利"}
          </span>
          <Link
            className="sf-next-promo-card__cta"
            to={detailPath}
          >
            {actionLabel}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function PromotionStatePanel({
  kind,
  onRetry,
}: {
  kind: "error" | "empty";
  onRetry: () => void;
}) {
  const { localizedPath, t } = usePublicLocale();
  const isError = kind === "error";

  return (
    <section className={cn("sf-next-state-panel sf-next-promo-state", isError && "is-error")}>
      <span className="sf-next-state-panel__icon">
        {isError ? <Timer size={24} aria-hidden /> : <PackageSearch size={24} aria-hidden />}
      </span>
      <div className="sf-next-state-panel__copy">
        <h2>{isError ? t("promotion.errorFallback") : t("promotion.emptyTitle")}</h2>
        <p>{isError ? t("promotion.errorActionHint") : t("promotion.emptyHint")}</p>
      </div>
      <div className="sf-next-state-panel__actions">
        {isError ? (
          <UnifiedButton type="button" onClick={onRetry} className="sf-next-state-panel__primary">
            <RefreshCw size={16} aria-hidden />
            {t("common.retry")}
          </UnifiedButton>
        ) : null}
        <Link className="sf-next-state-panel__primary" to={localizedPath("/categories")}>
          <PackageSearch size={16} aria-hidden />
          {t("common.browseProducts")}
        </Link>
        <Link className="sf-next-state-panel__secondary" to={localizedPath("/coupons")}>
          <TicketPercent size={16} aria-hidden />
          {t("promotion.goCoupons")}
        </Link>
      </div>
    </section>
  );
}

function PromotionSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={cn("sf-next-promo-card sf-next-promo-card--skeleton", className)}>
      <div className="sf-next-promo-card__media skeleton-base skeleton-shimmer" />
      <div className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="skeleton-base skeleton-shimmer h-6 w-20 rounded-full" />
          <div className="skeleton-base skeleton-shimmer h-6 w-14 rounded-full" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="skeleton-base skeleton-shimmer h-4 w-24 rounded-full" />
          <div className="skeleton-base skeleton-shimmer h-6 w-4/5 rounded" />
          <div className="skeleton-base skeleton-shimmer h-4 w-24 rounded-full" />
          <div className="skeleton-base skeleton-shimmer h-4 w-full rounded" />
          <div className="skeleton-base skeleton-shimmer h-4 w-3/5 rounded" />
        </div>
      </div>
    </div>
  );
}

function PromotionsFolio({
  list,
  selectedType,
}: {
  list: StorefrontPromotion[];
  selectedType: PromotionFilter;
}) {
  const { localizedPath, promotionTypeLabel, t } = usePublicLocale();
  const featured = list[0];
  const activeCount = list.filter((promotion) => promotion.runtime_status === "active").length;
  const typeCount = new Set(list.map((promotion) => promotion.type)).size;
  const label = selectedType ? promotionTypeLabel(selectedType) : t("common.allPromotions");
  const title = featured ? displayPromotionTitle(featured, promotionTypeLabel) : t("promotion.headerTitle");
  const description = featured ? displayPromotionSubtitle(featured) : t("promotion.headerSubtitle");
  const actionHref = featured
    ? localizedPath(`${PROMOTIONS_BASE_PATH}/${featured.slug}`)
    : localizedPath("/coupons");
  const actionLabel = featured ? promotionActionLabel(featured.type) : t("promotion.goCoupons");

  return (
    <section className="sf-next-promo-folio" aria-label="活动概览">
      <div className="sf-next-promo-folio__copy">
        <span className="sf-next-promo-folio__eyebrow">
          <Gift size={15} aria-hidden />
          {label}
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="sf-next-promo-folio__stats" aria-label="活动数据">
        <span>
          <Gift size={15} aria-hidden />
          <strong>{list.length}</strong>
          活动
        </span>
        <span>
          <Zap size={15} aria-hidden />
          <strong>{activeCount}</strong>
          进行中
        </span>
        <span>
          <Store size={15} aria-hidden />
          <strong>{typeCount}</strong>
          类型
        </span>
      </div>

      <Link className="sf-next-promo-folio__action" to={actionHref}>
        {actionLabel}
        <ArrowRight size={16} aria-hidden />
      </Link>
    </section>
  );
}

function PromotionsFolioSkeleton() {
  return (
    <section className="sf-next-promo-folio sf-next-promo-folio--loading" aria-busy="true" aria-label="活动概览加载中">
      <div className="sf-next-promo-folio__copy">
        <span className="sf-next-promo-folio__eyebrow skeleton-base skeleton-shimmer" />
        <span className="sf-next-promo-folio__title-skeleton skeleton-base skeleton-shimmer" />
        <span className="sf-next-promo-folio__text-skeleton skeleton-base skeleton-shimmer" />
      </div>
      <div className="sf-next-promo-folio__stats" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <span key={index}>
            <i className="skeleton-base skeleton-shimmer" />
            <strong className="skeleton-base skeleton-shimmer" />
            <small className="skeleton-base skeleton-shimmer" />
          </span>
        ))}
      </div>
      <span className="sf-next-promo-folio__action skeleton-base skeleton-shimmer" aria-hidden="true" />
    </section>
  );
}

export default function Promotions() {
  const [searchParams] = useSearchParams();
  const { localizedPath, promotionTypeLabel, t } = usePublicLocale();
  const selectedType = useMemo(() => {
    const raw = searchParams.get("type") || "";
    return FILTERABLE_PROMOTION_TYPES.includes(raw as PromotionType) ? raw as PromotionType : "";
  }, [searchParams]);
  const initialCache = useMemo(() => readPromotionListCache(selectedType), [selectedType]);
  const [list, setList] = useState<StorefrontPromotion[]>(() => initialCache?.list || []);
  const [loading, setLoading] = useState(() => !initialCache);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const cached = readPromotionListCache(selectedType);
    if (cached) {
      setList(cached.list);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const promotionResult = await marketingService.fetchPromotions({ pageSize: 60, type: selectedType });
      const nextList = promotionResult.list || [];
      writePromotionListCache(selectedType, nextList);
      setList(nextList);
    } catch {
      setList((current) => current.length > 0 ? current : []);
      setError(t("promotion.errorFallback"));
    } finally {
      setLoading(false);
    }
  }, [selectedType, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeFilterKey = filterScrollKey(selectedType);
  const { containerRef: filtersRef, setItemRef: setFilterRef, scrollToKey: scrollFilterToKey } =
    useHorizontalActiveScroll<HTMLElement, HTMLAnchorElement>(activeFilterKey, FILTERS.length);
  const showFullSkeleton = loading && list.length === 0;

  return (
    <div className="sf-next-page sf-next-promotions-page">
      <SeoHead
        title={t("promotion.headerTitle")}
        description={t("promotion.headerSubtitle")}
        canonical={buildCanonical(PROMOTIONS_BASE_PATH)}
        robots="index,follow"
      />
      <StorePageHeader
        className="sf-next-route-header"
        matchTabHeaderHeight
        centerTitle
        title={t("common.promotions")}
      />

      <main className="sf-next-container sf-next-promotions-main">
        {showFullSkeleton ? (
          <PromotionsFolioSkeleton />
        ) : list.length ? (
          <PromotionsFolio list={list} selectedType={selectedType} />
        ) : null}

        <nav
          ref={filtersRef}
          className="sf-next-promo-filters no-scrollbar"
          aria-label={t("promotion.quickNav")}
        >
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const active = selectedType === filter.type;
            const label = filter.type ? promotionTypeLabel(filter.type) : t("common.allPromotions");
            const scrollKey = filterScrollKey(filter.type);
            return (
              <Link
                key={filter.type || "all"}
                ref={(node) => setFilterRef(scrollKey, node)}
                to={localizedPath(buildFilterHref(filter.type))}
                preventScrollReset
                aria-current={active ? "page" : undefined}
                onClick={() => scrollFilterToKey(scrollKey)}
                className={cn(
                  "sf-next-promo-filter",
                  active && "is-active",
                )}
              >
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{label || filter.fallbackLabel}</span>
              </Link>
            );
          })}
        </nav>
        {showFullSkeleton ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={t("common.loadingPromotions")}>
            {Array.from({ length: PROMOTION_LOADING_CARD_COUNT }).map((_, index) => (
              <PromotionSkeleton key={index} className={index > 0 ? "hidden sm:block" : ""} />
            ))}
          </section>
        ) : error && list.length === 0 ? (
          <PromotionStatePanel kind="error" onRetry={() => void load()} />
        ) : list.length ? (
          <section
            className={cn(
              "sf-next-promo-list",
              list.length === 1 && "sf-next-promo-list--single",
            )}
            aria-label={t("common.promotions")}
          >
            {list.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}
          </section>
        ) : (
          <PromotionStatePanel kind="empty" onRetry={() => void load()} />
        )}
      </main>
    </div>
  );
}
