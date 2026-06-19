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
import { STORE_MOBILE_PAGE_HEADER_CLASS } from "@/constants/storeLayout";
import * as marketingService from "@/services/marketingService";
import { buildCanonical } from "@/utils/seo";
import { cn } from "@/lib/utils";
import { usePublicLocale } from "@/i18n/publicLocale";
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";
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

const PROMOTION_TEST_COPY_RE = /测试|test|demo|样例|副标题|互斥|规则判断/i;

function typeTone(type: PromotionType) {
  if (type === "flash_sale" || type === "limited_time_discount") {
    return "border-rose-100 bg-rose-50 text-rose-700";
  }
  if (type === "coupon" || type === "full_reduction" || type === "full_discount") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }
  if (type === "member_price" || type === "points_reward" || type === "checkin_reward") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
  return "border-[var(--theme-border)] bg-[var(--theme-muted)] text-[var(--theme-text)]";
}

function statusTone(status: StorefrontPromotion["runtime_status"]) {
  if (status === "scheduled") return "bg-sky-50 text-sky-700";
  if (status === "ended") return "bg-[var(--theme-muted)] text-[var(--theme-text-muted)]";
  return "bg-[color-mix(in_srgb,var(--theme-success)_12%,var(--theme-surface))] text-[var(--theme-success)]";
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

function formatCount(value: number) {
  return Math.max(0, Number(value) || 0).toLocaleString("zh-CN");
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
    && !PROMOTION_TEST_COPY_RE.test(label)
    && !["秒杀", "优惠券", "满减", "满折", "活动"].includes(label);
}

function displayPromotionTitle(promotion: StorefrontPromotion, promotionTypeLabel: (type: string) => string) {
  const title = promotion.title?.trim();
  if (title && !PROMOTION_TEST_COPY_RE.test(title)) return title;
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
  return fallbackByType[promotion.type] || `${promotionTypeLabel(promotion.type)}专区`;
}

function displayPromotionSubtitle(promotion: StorefrontPromotion) {
  const subtitle = promotion.subtitle?.trim() || promotion.description?.trim() || "";
  if (subtitle && !PROMOTION_TEST_COPY_RE.test(subtitle)) return subtitle;
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
  return fallbackByType[promotion.type] || "精选优惠活动";
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
      className="store-promotions-v12-card store-promotions-v12-card--poster group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.1rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--theme-primary)_28%,var(--theme-border))]"
      data-promotion-type={promotion.type}
    >
      {promotion.cover_image ? (
        <Link to={detailPath} className="store-promotions-v12-card__media block aspect-[16/9] overflow-hidden bg-[color-mix(in_srgb,var(--theme-primary)_7%,var(--theme-bg))]">
          <img
            src={promotion.cover_image}
            alt={displayTitle}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </Link>
      ) : null}

      <div className="store-promotions-v12-card__body flex min-h-0 flex-1 flex-col p-3.5 sm:p-4">
        <div className="store-promotions-v12-card__ribbon flex min-w-0 items-start justify-between gap-2">
          <span className={cn("store-promotions-v12-card__type inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-black", typeTone(promotion.type))}>
            {typeLabel}
          </span>
          <span className={cn("store-promotions-v12-card__runtime inline-flex shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold", statusTone(promotion.runtime_status))}>
            {runtimeStatusLabel(promotion.runtime_status, t)}
          </span>
        </div>

        <div className="store-promotions-v12-card__headline mt-3 min-w-0">
          <Link to={detailPath} className="block min-w-0">
            <h2 className="store-promotions-v12-card__title line-clamp-2 text-base font-black leading-6 text-[var(--theme-text)] sm:text-lg">
              {displayTitle}
            </h2>
            {showBenefit ? <p className="store-promotions-v12-card__benefit">{benefitLabel}</p> : null}
            <p className="store-promotions-v12-card__subtitle line-clamp-2">{displaySubtitle}</p>
          </Link>
        </div>

        <div className="store-promotions-v12-card__facts mt-3 grid gap-2 text-xs text-[var(--theme-text-muted)]">
          <span className="store-promotions-v12-card__status-hint">
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

        <div className="store-promotions-v12-card__footer mt-4 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[11px] font-medium text-[var(--theme-text-muted)]">
            {itemCount ? `${itemCount} 件商品参与` : couponCount ? `${couponCount} 张券可用` : "限时福利"}
          </span>
          <Link
            className="store-v12-compact-cta store-promotions-v12-card__cta inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--theme-primary)] px-3 py-2 text-xs font-black text-[var(--theme-primary-foreground)]"
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
    <section className={cn("store-promotions-v12-state-panel", isError && "is-error")}>
      <span className="store-promotions-v12-state-panel__icon">
        {isError ? <Timer size={24} aria-hidden /> : <PackageSearch size={24} aria-hidden />}
      </span>
      <div className="store-promotions-v12-state-panel__copy">
        <h2>{isError ? t("promotion.errorFallback") : t("promotion.emptyTitle")}</h2>
        <p>{isError ? t("promotion.errorActionHint") : t("promotion.emptyHint")}</p>
      </div>
      <div className="store-promotions-v12-state-panel__actions">
        {isError ? (
          <UnifiedButton type="button" onClick={onRetry} className="store-promotions-v12-state-panel__primary">
            <RefreshCw size={16} aria-hidden />
            {t("common.retry")}
          </UnifiedButton>
        ) : null}
        <Link className="store-promotions-v12-state-panel__primary" to={localizedPath("/categories")}>
          <PackageSearch size={16} aria-hidden />
          {t("common.browseProducts")}
        </Link>
        <Link className="store-promotions-v12-state-panel__secondary" to={localizedPath("/coupons")}>
          <TicketPercent size={16} aria-hidden />
          {t("promotion.goCoupons")}
        </Link>
      </div>
    </section>
  );
}

function PromotionSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={cn("store-promotions-v12-card store-promotions-v12-card--poster rounded-[1.1rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3.5", className)}>
      <div className="store-promotions-v12-card__media skeleton-base skeleton-shimmer block aspect-[16/9] overflow-hidden rounded-[14px]" />
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

export default function Promotions() {
  const [searchParams] = useSearchParams();
  const { localizedPath, promotionTypeLabel, t } = usePublicLocale();
  const selectedType = useMemo(() => {
    const raw = searchParams.get("type") || "";
    return FILTERABLE_PROMOTION_TYPES.includes(raw as PromotionType) ? raw as PromotionType : "";
  }, [searchParams]);
  const initialCache = useMemo(() => readPromotionListCache(selectedType), [selectedType]);
  const initialSummaryCache = useMemo(() => readPromotionListCache(""), []);
  const [list, setList] = useState<StorefrontPromotion[]>(() => initialCache?.list || []);
  const [summaryList, setSummaryList] = useState<StorefrontPromotion[]>(() => initialSummaryCache?.list || (!selectedType && initialCache?.list) || []);
  const [loading, setLoading] = useState(() => !initialCache);
  const [summaryLoading, setSummaryLoading] = useState(() => Boolean(selectedType && !initialSummaryCache));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    const cached = readPromotionListCache("");
    if (cached) {
      setSummaryList(cached.list);
      setSummaryLoading(false);
      return;
    }

    setSummaryLoading(true);
    try {
      const promotionResult = await marketingService.fetchPromotions({ pageSize: 60, type: "" });
      const nextList = promotionResult.list || [];
      writePromotionListCache("", nextList);
      setSummaryList(nextList);
    } catch {
      setSummaryList((current) => current);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    const cached = readPromotionListCache(selectedType);
    if (cached) {
      setList(cached.list);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }
    setError("");
    try {
      const promotionResult = await marketingService.fetchPromotions({ pageSize: 60, type: selectedType });
      const nextList = promotionResult.list || [];
      writePromotionListCache(selectedType, nextList);
      setList(nextList);
      if (!selectedType) {
        setSummaryList(nextList);
      }
    } catch {
      setList((current) => current.length > 0 ? current : []);
      setError(t("promotion.errorFallback"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedType) {
      void loadSummary();
    }
  }, [loadSummary, selectedType]);

  const summary = useMemo(() => {
    const summarySource = summaryList.length > 0 ? summaryList : selectedType ? [] : list;
    return {
      active: summarySource.filter((item) => item.runtime_status === "active").length,
      coupon: summarySource.filter((item) => item.type === "coupon").length,
      flash: summarySource.filter((item) => item.type === "flash_sale" || item.type === "limited_time_discount").length,
    };
  }, [list, selectedType, summaryList]);
  const summaryPending = summaryLoading && selectedType && summaryList.length === 0;
  const activeFilterKey = filterScrollKey(selectedType);
  const { containerRef: filtersRef, setItemRef: setFilterRef, scrollToKey: scrollFilterToKey } =
    useHorizontalActiveScroll<HTMLElement, HTMLAnchorElement>(activeFilterKey, FILTERS.length);
  const showFullSkeleton = loading && list.length === 0;
  const showSoftRefreshing = refreshing && list.length > 0;

  return (
    <div className="store-page-shell store-v12-page store-promotions-v12-page store-bottom-safe min-h-[100dvh] bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <SeoHead
        title={t("promotion.headerTitle")}
        description={t("promotion.headerSubtitle")}
        canonical={buildCanonical(PROMOTIONS_BASE_PATH)}
        robots="index,follow"
      />
      <StorePageHeader
        className={STORE_MOBILE_PAGE_HEADER_CLASS}
        matchTabHeaderHeight
        centerTitle
        title={t("common.promotions")}
      />

      <main className="mx-auto w-full max-w-6xl px-[var(--store-page-x)] pb-6 pt-3 md:px-6 md:py-8 lg:px-8">
        <section className="store-promotions-v12-hero overflow-hidden rounded-[1.35rem] border border-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))_0%,var(--theme-surface)_58%,color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-bg))_100%)] p-4 shadow-[0_18px_50px_color-mix(in_srgb,var(--theme-price)_10%,transparent)] sm:p-6">
          <div className="store-promotions-v12-hero__stats" aria-label="活动统计">
            <div>
              <strong>{summaryPending ? "..." : formatCount(summary.active)}</strong>
              <span>{t("promotion.active")}</span>
            </div>
            <div>
              <strong>{summaryPending ? "..." : formatCount(summary.flash)}</strong>
              <span>{t("promotion.timed")}</span>
            </div>
            <div>
              <strong>{summaryPending ? "..." : formatCount(summary.coupon)}</strong>
              <span>可领券</span>
            </div>
          </div>
        </section>

        <nav
          ref={filtersRef}
          className="store-promotions-v12-filters no-scrollbar mt-4 flex gap-2 overflow-x-auto overflow-y-hidden scroll-smooth pb-1 [-webkit-overflow-scrolling:touch] sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0 lg:grid-cols-10"
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
                  "store-promotions-v12-filter inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-black transition",
                  active
                    ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                    : "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]",
                )}
              >
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{label || filter.fallbackLabel}</span>
              </Link>
            );
          })}
        </nav>
        {showSoftRefreshing ? (
          <p className="mt-3 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-center text-xs font-semibold text-[var(--theme-text-muted)]">
            正在同步最新优惠
          </p>
        ) : null}

        {showFullSkeleton ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={t("common.loadingPromotions")}>
            {Array.from({ length: PROMOTION_LOADING_CARD_COUNT }).map((_, index) => (
              <PromotionSkeleton key={index} className={index > 0 ? "hidden sm:block" : ""} />
            ))}
          </section>
        ) : error && list.length === 0 ? (
          <PromotionStatePanel kind="error" onRetry={() => void load()} />
        ) : list.length ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}
          </section>
        ) : (
          <PromotionStatePanel kind="empty" onRetry={() => void load()} />
        )}
      </main>
    </div>
  );
}
