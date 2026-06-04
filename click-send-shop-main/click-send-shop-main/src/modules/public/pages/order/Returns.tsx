import { useCallback, useEffect, useState } from "react";
import { useGoBack } from "@/hooks/useGoBack";
import { useSearchParams } from "react-router-dom";
import * as returnService from "@/services/returnService";
import type { ReturnRequest } from "@/types/return";
import PageHeader from "@/components/PageHeader";
import { getReturnStatusBadgeClass, getReturnStatusLabel } from "@/constants/statusDictionary";
import { formatDateTime } from "@/utils/formatDateTime";
import ReturnApplySheet from "./ReturnApplySheet";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export default function Returns() {
  const goBack = useGoBack();
  const [searchParams, setSearchParams] = useSearchParams();
  const applyOrderId = searchParams.get("apply")?.trim() || null;

  const [list, setList] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
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
      <PageHeader title="售后申请" onBack={goBack} />
      <main className="mx-auto w-full max-w-xl space-y-3 px-[var(--store-page-x)] py-[var(--store-page-y)] text-sm sm:p-4">
        <UnifiedButton
          type="button"
          className="w-full rounded-xl border border-[var(--theme-primary)] bg-[var(--theme-primary)] py-2.5 text-sm font-medium text-[var(--theme-primary-foreground)]"
          onClick={() => setApplyOpen(true)}
        >
          发起售后申请
        </UnifiedButton>

        {loading ? <p className="text-muted-foreground">加载中...</p> : null}
        {!loading && list.length === 0 ? (
          <p className="text-muted-foreground">暂无售后记录，可从「我的订单」已发货/已完成订单发起申请。</p>
        ) : null}

        {list.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">订单 {r.order_no}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${getReturnStatusBadgeClass(r.status)}`}>
                {getReturnStatusLabel(r.status)}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">类型：{r.type} · 原因：{r.reason}</p>
            {r.refund_amount != null && Number(r.refund_amount) > 0 ? (
              <p className="mt-1 text-sm">退款金额 RM {Number(r.refund_amount).toFixed(2)}</p>
            ) : null}
          </div>
        ))}
      </main>

      <ReturnApplySheet
        orderId={applyOrderId}
        open={applyOpen}
        onClose={closeApply}
        onSuccess={() => { void loadList(); }}
      />
    </div>
  );
}
