import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Clock3, FileText, PackageCheck, Plus, RefreshCw } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import * as returnService from "@/services/returnService";
import type { ReturnRequest } from "@/types/return";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { getReturnStatusBadgeClass } from "@/constants/statusDictionary";
import { formatDateTime } from "@/utils/formatDateTime";
import ReturnApplySheet from "./ReturnApplySheet";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import afterSaleProgressHero from "./assets/after-sale-progress-hero.webp";
import {
  type ReturnFilterKey,
  getBuyerReturnAction,
  getReturnFilters,
  getReturnItemImage,
  getReturnItemName,
  getReturnStatusLabel,
  getReturnTypeLabel,
  shouldShowReturnInFilter,
} from "./returnProgress";
import ProductCoverImage from "@/components/ProductCoverImage";
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";

const RETURNS_COPY: Record<PublicLocale, {
  title: string;
  heroTitle: string;
  heroDescription: string;
  refresh: string;
  apply: string;
  statusTabs: string;
  loading: string;
  emptyTitle: string;
  emptyDescription: string;
  order: string;
  refund: string;
  nextStep: string;
}> = {
  zh: {
    title: "售后进度",
    heroTitle: "售后进度中心",
    heroDescription: "查看退款、退货、换货和维修处理进度。",
    refresh: "刷新",
    apply: "发起售后",
    statusTabs: "售后状态",
    loading: "加载中...",
    emptyTitle: "暂无售后记录",
    emptyDescription: "可以从已发货或已完成订单发起售后申请。",
    order: "订单",
    refund: "退款",
    nextStep: "下一步",
  },
  en: {
    title: "Returns progress",
    heroTitle: "After-sales progress",
    heroDescription: "Track refunds, returns, exchanges, and repair requests.",
    refresh: "Refresh",
    apply: "Request service",
    statusTabs: "Return status",
    loading: "Loading...",
    emptyTitle: "No after-sales records",
    emptyDescription: "You can request service from shipped or completed orders.",
    order: "Order",
    refund: "Refund",
    nextStep: "Next step",
  },
};

export default function Returns() {
  const { localizedPath, locale } = usePublicLocale();
  const copy = RETURNS_COPY[locale];
  const goBack = useGoBack(localizedPath("/profile"));
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const applyOrderId = searchParams.get("apply")?.trim() || null;

  const [list, setList] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReturnFilterKey>("all");
  const [applyOpen, setApplyOpen] = useState(!!applyOrderId);
  const filterButtonRefs = useRef<Map<ReturnFilterKey, HTMLButtonElement>>(new Map());

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await returnService.fetchReturnRequests({ page: 1, pageSize: 50 });
      setList(r.list || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (applyOrderId) setApplyOpen(true);
  }, [applyOrderId]);

  useEffect(() => {
    filterButtonRefs.current.get(filter)?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [filter]);

  const filteredList = useMemo(
    () => list.filter((item) => shouldShowReturnInFilter(item, filter)),
    [filter, list],
  );
  const returnStats = useMemo(() => [
    {
      label: "全部售后",
      value: list.length,
      hint: "退款/退货/换货/维修",
      icon: FileText,
    },
    {
      label: "待我操作",
      value: list.filter((item) => {
        const action = getBuyerReturnAction(item, locale);
        return action?.key === "evidence" || action?.key === "logistics" || action?.key === "confirm";
      }).length,
      hint: "需补凭证或物流",
      icon: Clock3,
    },
    {
      label: "处理中",
      value: list.filter((item) => shouldShowReturnInFilter(item, "processing")).length,
      hint: "商家审核/收货中",
      icon: RefreshCw,
    },
    {
      label: "已完成",
      value: list.filter((item) => item.status === "completed").length,
      hint: "售后已结束",
      icon: PackageCheck,
    },
  ], [list, locale]);

  const closeApply = () => {
    setApplyOpen(false);
    if (applyOrderId) {
      const next = new URLSearchParams(searchParams);
      next.delete("apply");
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <StoreAccountLayout title={copy.title} onBack={goBack} className="store-v12-page store-returns-v12-page" mainClassName="sm:px-4 xl:py-6">
      <main className="mx-auto w-full max-w-3xl space-y-4 text-sm">
        <section className="store-returns-v12-hero relative overflow-hidden rounded-[28px] border border-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))_0%,var(--theme-surface)_56%,color-mix(in_srgb,var(--theme-primary)_7%,var(--theme-surface))_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_36%,color-mix(in_srgb,var(--theme-primary)_18%,transparent),transparent_34%),radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.9),transparent_34%)]" aria-hidden />
          <img
            src={afterSaleProgressHero}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-[-2.5rem] z-0 h-[78%] max-h-[12.5rem] w-auto select-none object-contain opacity-95 [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.2)_28%,black_48%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.2)_28%,black_48%)] sm:bottom-0 sm:right-0 sm:max-h-[15rem]"
            draggable={false}
          />
          <div className="relative z-10 flex min-h-[11.5rem] max-w-[68%] flex-col justify-center sm:min-h-[13.5rem] sm:max-w-[60%]">
            <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{copy.heroTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{copy.heroDescription}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <UnifiedButton
                type="button"
                onClick={() => void loadList()}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--theme-border)_80%,white)] bg-[var(--theme-surface)] px-3.5 py-2 text-sm font-medium shadow-sm"
              >
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                {copy.refresh}
              </UnifiedButton>
              <UnifiedButton
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--theme-primary)] px-3.5 py-2 text-sm font-medium text-[var(--theme-primary-foreground)] shadow-sm"
                onClick={() => setApplyOpen(true)}
              >
                <Plus size={17} />
                {copy.apply}
              </UnifiedButton>
            </div>
          </div>
        </section>

        <section className="store-returns-v12-summary store-orders-v12-stat-grid" aria-label="售后统计">
          {returnStats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="store-orders-v12-stat">
                <span className="store-orders-v12-stat__icon" aria-hidden>
                  <Icon size={17} />
                </span>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </div>
            );
          })}
        </section>

        <section className="rounded-[24px] border border-border bg-card p-3 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
          <div className="relative overflow-hidden">
            <div
              className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden scroll-smooth px-1 py-1 [-webkit-overflow-scrolling:touch]"
              role="tablist"
              aria-label={copy.statusTabs}
            >
              {getReturnFilters(locale).map((item) => {
                const active = filter === item.key;
                return (
                  <UnifiedButton
                    key={item.key}
                    ref={(el) => {
                      if (el) filterButtonRefs.current.set(item.key, el);
                      else filterButtonRefs.current.delete(item.key);
                    }}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(item.key)}
                    className={`min-h-10 shrink-0 snap-center whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
                      active
                        ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] font-medium text-[var(--theme-primary)]"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </UnifiedButton>
                );
              })}
            </div>
            <span className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-card to-transparent" aria-hidden />
            <span className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-card to-transparent" aria-hidden />
          </div>
        </section>

        {loading ? <p className="rounded-xl border border-border bg-card p-4 text-center text-muted-foreground">{copy.loading}</p> : null}
        {!loading && filteredList.length === 0 ? (
          <ClientEmptyState
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            icon={<FileText size={30} strokeWidth={1.8} />}
            action={
              <ClientButton type="button" variant="secondary" onClick={() => setApplyOpen(true)}>
                {copy.apply}
              </ClientButton>
            }
          />
        ) : null}

        <section className="space-y-3">
          {filteredList.map((item) => {
            const action = getBuyerReturnAction(item, locale);
            const image = getReturnItemImage(item);
            return (
              <article key={item.id} className="store-returns-v12-card rounded-2xl border border-border bg-card p-3 shadow-sm">
                <UnifiedButton
                  type="button"
                  onClick={() => navigate(localizedPath(`/returns/${item.id}`))}
                  className="grid w-full grid-cols-[48px_1fr_auto] items-center gap-3 text-left"
                >
                  <div className="w-12 overflow-hidden rounded-xl bg-secondary" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE}>
                    {image ? (
                      <ProductCoverImage
                        url={image}
                        alt={getReturnItemName(item, locale)}
                        className="h-full w-full object-cover"
                        imgClassName="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="max-w-full truncate font-medium text-foreground">{getReturnItemName(item, locale)}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${getReturnStatusBadgeClass(item.status)}`}>
                        {getReturnStatusLabel(item.status, locale)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getReturnTypeLabel(item.type, locale)} · {copy.order} {item.order_no}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(item.created_at)}
                      {item.refund_amount != null && Number(item.refund_amount) > 0 ? ` · ${copy.refund} RM ${Number(item.refund_amount).toFixed(2)}` : ""}
                    </p>
                    {action ? (
                      <p className="mt-2 rounded-lg bg-[var(--theme-primary)]/10 px-2 py-1 text-xs text-[var(--theme-primary)]">
                        {copy.nextStep}: {action.label}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </UnifiedButton>
              </article>
            );
          })}
        </section>
      </main>

      <ReturnApplySheet
        orderId={applyOrderId}
        open={applyOpen}
        onClose={closeApply}
        onSuccess={() => {
          closeApply();
          void loadList();
        }}
      />
    </StoreAccountLayout>
  );
}
