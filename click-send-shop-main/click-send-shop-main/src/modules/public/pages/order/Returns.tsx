import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, FileText, Plus, RefreshCw } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import * as returnService from "@/services/returnService";
import type { ReturnRequest } from "@/types/return";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { getReturnStatusBadgeClass } from "@/constants/statusDictionary";
import { formatDateTime } from "@/utils/formatDateTime";
import ReturnApplySheet from "./ReturnApplySheet";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import afterSaleProgressHero from "./assets/after-sale-progress-hero.webp";
import {
  RETURN_FILTERS,
  type ReturnFilterKey,
  getBuyerReturnAction,
  getReturnItemImage,
  getReturnItemName,
  getReturnStatusLabel,
  getReturnTypeLabel,
  shouldShowReturnInFilter,
} from "./returnProgress";
import ProductCoverImage from "@/components/ProductCoverImage";

export default function Returns() {
  const goBack = useGoBack();
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

  const closeApply = () => {
    setApplyOpen(false);
    if (applyOrderId) {
      const next = new URLSearchParams(searchParams);
      next.delete("apply");
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <StoreAccountLayout title="售后进度" onBack={goBack} mainClassName="sm:px-4 xl:py-6">
      <main className="mx-auto w-full max-w-3xl space-y-4 text-sm">
        <section className="relative overflow-hidden rounded-[28px] border border-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))_0%,var(--theme-surface)_56%,color-mix(in_srgb,var(--theme-primary)_7%,var(--theme-surface))_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_36%,color-mix(in_srgb,var(--theme-primary)_18%,transparent),transparent_34%),radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.9),transparent_34%)]" aria-hidden />
          <img
            src={afterSaleProgressHero}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-[-2.5rem] z-0 h-[78%] max-h-[12.5rem] w-auto select-none object-contain opacity-95 [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.2)_28%,black_48%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.2)_28%,black_48%)] sm:bottom-0 sm:right-0 sm:max-h-[15rem]"
            draggable={false}
          />
          <div className="relative z-10 flex min-h-[11.5rem] max-w-[68%] flex-col justify-center sm:min-h-[13.5rem] sm:max-w-[60%]">
            <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">售后进度中心</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">查看退款、退货、换货和维修处理进度。</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <UnifiedButton
                type="button"
                onClick={() => void loadList()}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--theme-border)_80%,white)] bg-[var(--theme-surface)] px-3.5 py-2 text-sm font-medium shadow-sm"
              >
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                刷新
              </UnifiedButton>
              <UnifiedButton
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--theme-primary)] px-3.5 py-2 text-sm font-medium text-[var(--theme-primary-foreground)] shadow-sm"
                onClick={() => setApplyOpen(true)}
              >
                <Plus size={17} />
                发起售后
              </UnifiedButton>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-3 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
          <div className="relative overflow-hidden">
            <div
              className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden scroll-smooth px-1 py-1 [-webkit-overflow-scrolling:touch]"
              role="tablist"
              aria-label="售后状态"
            >
              {RETURN_FILTERS.map((item) => {
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

        {loading ? <p className="rounded-xl border border-border bg-card p-4 text-muted-foreground">加载中...</p> : null}
        {!loading && filteredList.length === 0 ? (
          <section className="rounded-[28px] border border-border bg-card px-6 py-12 text-center shadow-[0_14px_34px_rgba(15,23,42,0.06)] sm:py-14">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] text-muted-foreground">
              <FileText size={44} strokeWidth={1.6} />
            </div>
            <p className="mt-5 text-lg font-medium text-foreground">暂无售后记录</p>
            <p className="mt-1 text-xs text-muted-foreground">可以从已发货或已完成订单发起售后申请。</p>
          </section>
        ) : null}

        <section className="space-y-3">
          {filteredList.map((item) => {
            const action = getBuyerReturnAction(item);
            const image = getReturnItemImage(item);
            return (
              <article key={item.id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                <UnifiedButton
                  type="button"
                  onClick={() => navigate(`/returns/${item.id}`)}
                  className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 text-left"
                >
                  <div className="h-16 w-16 overflow-hidden rounded-xl bg-secondary">
                    {image ? (
                      <ProductCoverImage
                        url={image}
                        alt={getReturnItemName(item)}
                        className="h-full w-full object-cover"
                        imgClassName="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="max-w-full truncate font-medium text-foreground">{getReturnItemName(item)}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${getReturnStatusBadgeClass(item.status)}`}>
                        {getReturnStatusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getReturnTypeLabel(item.type)} · 订单 {item.order_no}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(item.created_at)}
                      {item.refund_amount != null && Number(item.refund_amount) > 0 ? ` · 退款 RM ${Number(item.refund_amount).toFixed(2)}` : ""}
                    </p>
                    {action ? (
                      <p className="mt-2 rounded-lg bg-[var(--theme-primary)]/10 px-2 py-1 text-xs text-[var(--theme-primary)]">
                        下一步：{action.label}
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
