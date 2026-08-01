import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronRight, FileText, Plus, RefreshCw } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import * as returnService from "@/services/returnService";
import type { ReturnRequest } from "@/types/return";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { formatDateTime } from "@/utils/formatDateTime";
import ReturnApplySheet from "./ReturnApplySheet";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
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
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";
import "@/styles/returns-route.css";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

const RETURNS_COPY: Record<PublicLocale, {
  title: string;
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
  const navigate = useStorefrontNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const applyOrderId = searchParams.get("apply")?.trim() || null;

  const [list, setList] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReturnFilterKey>("all");
  const [applyOpen, setApplyOpen] = useState(!!applyOrderId);
  const returnFilters = getReturnFilters(locale);
  const { containerRef: filterRailRef, setItemRef: setFilterRef, scrollToKey: scrollFilterToKey } =
    useHorizontalActiveScroll<HTMLDivElement, HTMLButtonElement>(filter, returnFilters.length);

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

  const filteredList = useMemo(
    () => list.filter((item) => shouldShowReturnInFilter(item, filter)),
    [filter, list],
  );
  const closeApply = () => {
    setApplyOpen(false);
    if (applyOrderId) {
      const next = new URLSearchParams(searchParams);
      next.delete("apply");
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <StoreAccountLayout
      title={copy.title}
      onBack={goBack}
      className="sf-next-page sf-next-route-page sf-next-returns-page"
      mainClassName="sf-next-account-main sm:px-4 xl:py-6"
    >
      <main className="sf-next-returns-main">
        <section className="sf-next-returns-hero sf-next-returns-hero--compact">
          <div className="sf-next-returns-hero__copy">
            <p>{copy.heroDescription}</p>
          </div>
          <div className="sf-next-returns-hero__actions">
            <UnifiedButton
              type="button"
              onClick={() => void loadList()}
              className="sf-next-returns-hero__button"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              {copy.refresh}
            </UnifiedButton>
            <UnifiedButton
              type="button"
              className="sf-next-returns-hero__button sf-next-returns-hero__button--primary"
              onClick={() => setApplyOpen(true)}
            >
              <Plus size={17} />
              {copy.apply}
            </UnifiedButton>
          </div>
        </section>

        <section className="sf-next-returns-tabs-shell">
          <div className="sf-next-returns-tabs-viewport">
            <div
              ref={filterRailRef}
              className="sf-next-returns-tabs no-scrollbar"
              role="tablist"
              aria-label={copy.statusTabs}
            >
              {returnFilters.map((item) => {
                const active = filter === item.key;
                return (
                  <UnifiedButton
                    key={item.key}
                    ref={(el) => setFilterRef(item.key, el)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      scrollFilterToKey(item.key);
                      setFilter(item.key);
                    }}
                    className={`sf-next-returns-tab ${active ? "is-active" : ""}`}
                  >
                    {item.label}
                  </UnifiedButton>
                );
              })}
            </div>
          </div>
        </section>

        {loading ? (
          <section className="sf-next-state-panel sf-next-returns-state" aria-live="polite">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <RefreshCw size={28} className="animate-spin" />
            </span>
            <h2>{copy.loading}</h2>
            <p>正在同步退款、退货、换货和维修记录。</p>
          </section>
        ) : null}
        {!loading && filteredList.length === 0 ? (
          <section className="sf-next-state-panel sf-next-returns-state">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <FileText size={28} strokeWidth={1.8} />
            </span>
            <h2>{copy.emptyTitle}</h2>
            <p>{copy.emptyDescription}</p>
            <UnifiedButton type="button" onClick={() => setApplyOpen(true)} className="sf-next-state-panel__primary">
              <Plus size={17} aria-hidden />
              {copy.apply}
            </UnifiedButton>
          </section>
        ) : null}

        <section className="sf-next-returns-list">
          {filteredList.map((item) => {
            const action = getBuyerReturnAction(item, locale);
            const image = getReturnItemImage(item);
            return (
              <article key={item.id} className="sf-next-returns-card">
                <UnifiedButton
                  type="button"
                  onClick={() => navigate(localizedPath(`/returns/${item.id}`))}
                  className="sf-next-returns-card__button"
                >
                  <div className="sf-next-returns-card__media">
                    {image ? (
                      <ProductCoverImage
                        url={image}
                        alt={getReturnItemName(item, locale)}
                        className="h-full w-full object-cover"
                        imgClassName="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="sf-next-returns-card__copy">
                    <div className="sf-next-returns-card__title-row">
                      <p>{getReturnItemName(item, locale)}</p>
                      <span className="sf-next-returns-card__status">
                        {getReturnStatusLabel(item.status, locale)}
                      </span>
                    </div>
                    <p className="sf-next-returns-card__meta">
                      {getReturnTypeLabel(item.type, locale)} · {copy.order} {item.order_no}
                    </p>
                    <p className="sf-next-returns-card__meta">
                      {formatDateTime(item.created_at)}
                      {item.refund_amount != null && Number(item.refund_amount) > 0 ? ` · ${copy.refund} RM ${Number(item.refund_amount).toFixed(2)}` : ""}
                    </p>
                    {action ? (
                      <p className="sf-next-returns-card__next">
                        {copy.nextStep}: {action.label}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight size={18} className="sf-next-returns-card__chevron" />
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
