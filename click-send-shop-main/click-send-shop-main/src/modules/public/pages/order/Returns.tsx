import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, FileText, Plus, RefreshCw } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import * as returnService from "@/services/returnService";
import type { ReturnRequest } from "@/types/return";
import PageHeader from "@/components/PageHeader";
import { getReturnStatusBadgeClass } from "@/constants/statusDictionary";
import { formatDateTime } from "@/utils/formatDateTime";
import ReturnApplySheet from "./ReturnApplySheet";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
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

export default function Returns() {
  const goBack = useGoBack();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const applyOrderId = searchParams.get("apply")?.trim() || null;

  const [list, setList] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReturnFilterKey>("all");
  const [applyOpen, setApplyOpen] = useState(!!applyOrderId);

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
    <div className="min-h-screen bg-[var(--theme-bg)] pb-8 text-[var(--theme-text)]">
      <PageHeader title="售后进度" onBack={goBack} />
      <main className="mx-auto w-full max-w-3xl space-y-4 px-[var(--store-page-x)] py-[var(--store-page-y)] text-sm sm:p-4">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">售后进度中心</h1>
              <p className="mt-1 text-xs text-muted-foreground">查看退款、退货、换货和维修处理进度。</p>
            </div>
            <div className="flex gap-2">
              <UnifiedButton
                type="button"
                onClick={() => void loadList()}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                刷新
              </UnifiedButton>
              <UnifiedButton
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-primary)] px-3 py-2 text-xs font-medium text-[var(--theme-primary-foreground)]"
                onClick={() => setApplyOpen(true)}
              >
                <Plus size={14} />
                发起售后
              </UnifiedButton>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {RETURN_FILTERS.map((item) => (
              <UnifiedButton
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                  filter === item.key
                    ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {item.label}
              </UnifiedButton>
            ))}
          </div>
        </section>

        {loading ? <p className="rounded-xl border border-border bg-card p-4 text-muted-foreground">加载中...</p> : null}
        {!loading && filteredList.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <FileText className="mx-auto text-muted-foreground" size={34} />
            <p className="mt-3 font-medium text-foreground">暂无售后记录</p>
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
                    {image ? <img src={image} alt={getReturnItemName(item)} className="h-full w-full object-cover" /> : null}
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
    </div>
  );
}
