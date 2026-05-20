import { useEffect, useState } from "react";
import { useGoBack } from "@/hooks/useGoBack";
import * as returnService from "@/services/returnService";
import type { ReturnRequest } from "@/types/return";
import PageHeader from "@/components/PageHeader";

export default function Returns() {
  const goBack = useGoBack();
  const [list, setList] = useState<ReturnRequest[]>([]);

  useEffect(() => {
    void returnService
      .fetchReturnRequests()
      .then((r) => setList(r.list || []))
      .catch(() => setList([]));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-8 text-[var(--theme-text)]">
      <PageHeader title="售后申请" onBack={goBack} />
      <main className="mx-auto w-full max-w-xl space-y-2 px-[var(--store-page-x)] py-[var(--store-page-y)] text-sm sm:p-4">
        {list.map((r) => (
          <div key={r.id} className="rounded-xl border p-3">
            {r.order_no} / {r.status} / RM {Number(r.refund_amount || 0).toFixed(2)}
          </div>
        ))}
        {list.length === 0 ? <div className="text-muted-foreground">暂无售后记录</div> : null}
      </main>
    </div>
  );
}
