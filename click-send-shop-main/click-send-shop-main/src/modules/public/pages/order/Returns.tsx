import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import * as returnService from "@/services/returnService";
import type { ReturnRequest } from "@/types/return";

export default function Returns() {
  const goBack = useGoBack();
  const [list, setList] = useState<ReturnRequest[]>([]);

  useEffect(() => {
    void returnService.fetchReturnRequests().then((r) => setList(r.list || [])).catch(() => setList([]));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-8">
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <button type="button" onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--theme-bg)]"><ArrowLeft size={18} /></button>
          <h1 className="text-lg font-semibold">售后申请</h1>
        </div>
      </header>
      <main className="mx-auto max-w-xl space-y-2 p-4 text-sm">
        {list.map((r) => <div key={r.id} className="rounded-xl border p-3">{r.order_no} / {r.status} / RM {Number(r.refund_amount || 0).toFixed(2)}</div>)}
        {list.length === 0 ? <div className="text-muted-foreground">暂无售后记录</div> : null}
      </main>
    </div>
  );
}
