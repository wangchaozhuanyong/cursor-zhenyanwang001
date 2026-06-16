import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgePercent,
  CalendarDays,
  Gem,
  Gift,
  PackageSearch,
  RefreshCw,
  Sparkles,
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
import type { PromotionType, StorefrontPromotion } from "@/services/marketingService";

type PromotionFilter = PromotionType | "";

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

function formatCount(value: number) {
  return Math.max(0, Number(value) || 0).toLocaleString("zh-CN");
}

function buildFilterHref(type: PromotionFilter) {
  return type ? `/promotions?type=${type}` : "/promotions";
}

function PromotionCard({ promotion }: { promotion: StorefrontPromotion }) {
  const { formatDate, localizedPath, promotionTypeLabel, t } = usePublicLocale();
  const detailPath = localizedPath(`/promotions/${promotion.slug}`);
  const itemCount = promotion.items?.length || 0;
  const couponCount = promotion.coupons?.length || 0;
  const description = promotion.description || promotion.subtitle || t("promotion.detailFallback");

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.1rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--theme-primary)_28%,var(--theme-border))]">
      {promotion.cover_image ? (
        <Link to={detailPath} className="block aspect-[16/9] overflow-hidden bg-[color-mix(in_srgb,var(--theme-primary)_7%,var(--theme-bg))]">
          <img
            src={promotion.cover_image}
            alt={promotion.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </Link>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-black", typeTone(promotion.type))}>
            {promotionTypeLabel(promotion.type)}
          </span>
          <span className={cn("inline-flex shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold", statusTone(promotion.runtime_status))}>
            {promotion.runtime_status === "scheduled" ? t("promotion.startsIn") : promotion.runtime_status === "ended" ? t("promotion.soldOut") : t("promotion.active")}
          </span>
        </div>

        <Link to={detailPath} className="mt-3 block min-w-0">
          <h2 className="line-clamp-2 text-base font-black leading-6 text-[var(--theme-text)] sm:text-lg">
            {promotion.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--theme-text-muted)] sm:text-sm sm:leading-6">
            {description}
          </p>
        </Link>

        <div className="mt-3 grid gap-2 text-xs text-[var(--theme-text-muted)]">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <CalendarDays size={15} className="shrink-0" />
            <span className="truncate">{formatDate(promotion.start_at)} - {formatDate(promotion.end_at)}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <BadgePercent size={15} className="shrink-0" />
            <span className="truncate">{promotion.stackable ? t("promotion.stackableYes") : t("promotion.stackableNo")}</span>
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {promotion.promo_label ? (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] px-2 py-1 text-[11px] font-black text-[var(--theme-price)]">
              {promotion.promo_label}
            </span>
          ) : null}
          {couponCount ? (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] px-2 py-1 text-[11px] font-semibold text-[var(--theme-primary)]">
              {couponCount} {t("promotion.couponUnit")}
            </span>
          ) : null}
          {itemCount ? (
            <span className="rounded-full bg-[var(--theme-muted)] px-2 py-1 text-[11px] font-semibold text-[var(--theme-text-muted)]">
              {itemCount} {t("promotion.items")}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="min-w-0 truncate text-[11px] font-medium text-[var(--theme-text-muted)]">
            {promotion.scope_type || "all"}
          </span>
          <Link
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--theme-primary)] px-3 py-2 text-xs font-black text-[var(--theme-primary-foreground)]"
            to={detailPath}
          >
            {t("promotion.view")}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function PromotionSkeleton() {
  return (
    <div className="rounded-[1.1rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3.5">
      <div className="skeleton-base skeleton-shimmer aspect-[16/9] rounded-[0.9rem]" />
      <div className="mt-3 space-y-2">
        <div className="skeleton-base skeleton-shimmer h-4 w-24 rounded-full" />
        <div className="skeleton-base skeleton-shimmer h-5 w-4/5 rounded" />
        <div className="skeleton-base skeleton-shimmer h-4 w-full rounded" />
        <div className="skeleton-base skeleton-shimmer h-4 w-3/5 rounded" />
      </div>
    </div>
  );
}

export default function Promotions() {
  const [list, setList] = useState<StorefrontPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const { localizedPath, promotionTypeLabel, t } = usePublicLocale();
  const selectedType = useMemo(() => {
    const raw = searchParams.get("type") || "";
    return FILTERABLE_PROMOTION_TYPES.includes(raw as PromotionType) ? raw as PromotionType : "";
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await marketingService.fetchPromotions({ pageSize: 60, type: selectedType });
      setList(data.list || []);
    } catch {
      setError(t("promotion.errorFallback"));
    } finally {
      setLoading(false);
    }
  }, [selectedType, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => ({
    total: list.length,
    coupon: list.filter((item) => item.type === "coupon").length,
    flash: list.filter((item) => item.type === "flash_sale" || item.type === "limited_time_discount").length,
    member: list.filter((item) => ["member_price", "points_reward", "checkin_reward"].includes(item.type)).length,
  }), [list]);

  return (
    <div className="store-page-shell store-bottom-safe min-h-[100dvh] bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <SeoHead
        title={t("promotion.headerTitle")}
        description={t("promotion.headerSubtitle")}
        canonical={buildCanonical("/promotions")}
        robots="index,follow"
      />
      <StorePageHeader
        className={STORE_MOBILE_PAGE_HEADER_CLASS}
        matchTabHeaderHeight
        centerTitle
        title={t("common.promotions")}
      />

      <main className="mx-auto w-full max-w-6xl px-[var(--store-page-x)] pb-6 pt-3 md:px-6 md:py-8 lg:px-8">
        <section className="overflow-hidden rounded-[1.35rem] border border-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))_0%,var(--theme-surface)_58%,color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-bg))_100%)] p-4 shadow-[0_18px_50px_color-mix(in_srgb,var(--theme-price)_10%,transparent)] sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-[color-mix(in_srgb,var(--theme-price)_16%,var(--theme-surface))] text-[var(--theme-price)]">
              <Sparkles size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-black uppercase tracking-[0.08em] text-[var(--theme-price)]">
                {t("promotion.headerEyebrow")}
              </span>
              <h1 className="mt-1 text-2xl font-black leading-tight text-[var(--theme-text)] sm:text-3xl">
                {t("promotion.headerTitle")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">
                {t("promotion.headerSubtitle")}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[0.95rem] border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_82%,transparent)] px-2 py-3 backdrop-blur">
              <strong className="block text-xl font-black text-[var(--theme-text)]">{formatCount(summary.total)}</strong>
              <span className="text-[11px] font-medium text-[var(--theme-text-muted)]">{t("promotion.active")}</span>
            </div>
            <div className="rounded-[0.95rem] border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_82%,transparent)] px-2 py-3 backdrop-blur">
              <strong className="block text-xl font-black text-[var(--theme-price)]">{formatCount(summary.flash)}</strong>
              <span className="text-[11px] font-medium text-[var(--theme-text-muted)]">{t("promotion.timed")}</span>
            </div>
            <div className="rounded-[0.95rem] border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_82%,transparent)] px-2 py-3 backdrop-blur">
              <strong className="block text-xl font-black text-[var(--theme-primary)]">{formatCount(summary.coupon + summary.member)}</strong>
              <span className="text-[11px] font-medium text-[var(--theme-text-muted)]">{t("common.coupons")}</span>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 rounded-[1.1rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] text-[var(--theme-primary)]">
              <Gift size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-[var(--theme-text)]">{t("coupon.claimCenter")}</h2>
              <p className="line-clamp-1 text-xs text-[var(--theme-text-muted)]">{t("promotion.couponRewardsHint")}</p>
            </div>
          </div>
          <Link
            to={localizedPath("/coupons")}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--theme-primary)] px-4 text-sm font-black text-[var(--theme-primary-foreground)]"
          >
            {t("promotion.goCoupons")}
            <ArrowRight size={15} />
          </Link>
        </section>

        <nav className="no-scrollbar -mx-[var(--store-page-x)] mt-4 flex gap-2 overflow-x-auto px-[var(--store-page-x)] pb-1 md:mx-0 md:px-0" aria-label={t("promotion.quickNav")}>
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const active = selectedType === filter.type;
            const label = filter.type ? promotionTypeLabel(filter.type) : t("common.allPromotions");
            return (
              <Link
                key={filter.type || "all"}
                to={localizedPath(buildFilterHref(filter.type))}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-black transition",
                  active
                    ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                    : "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]",
                )}
              >
                <Icon size={15} />
                {label || filter.fallbackLabel}
              </Link>
            );
          })}
        </nav>

        {loading ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={t("common.loadingPromotions")}>
            {Array.from({ length: 6 }).map((_, index) => <PromotionSkeleton key={index} />)}
          </section>
        ) : error ? (
          <section className="mt-5 rounded-[1.1rem] border border-rose-200 bg-rose-50 p-5 text-rose-700">
            <div className="flex items-start gap-3">
              <Timer size={20} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="font-black">{t("promotion.errorFallback")}</h2>
                <p className="mt-1 text-sm leading-6">{error}</p>
              </div>
            </div>
            <UnifiedButton type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-rose-700">
              <RefreshCw size={16} />
              {t("common.retry")}
            </UnifiedButton>
          </section>
        ) : list.length ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}
          </section>
        ) : (
          <section className="mt-5 rounded-[1.1rem] border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 text-center">
            <PackageSearch className="mx-auto h-10 w-10 text-[var(--theme-text-muted)]" />
            <h2 className="mt-3 text-lg font-black text-[var(--theme-text)]">{t("promotion.emptyTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted)]">{t("promotion.emptyDescription")}</p>
            <Link
              to={localizedPath("/categories")}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-sm font-black text-[var(--theme-primary-foreground)]"
            >
              {t("common.browseProducts")}
              <ArrowRight size={15} />
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
