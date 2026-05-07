import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import type { PaymentEventAdminRow } from "@/types/adminPayment";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";

export default function AdminPaymentEvents() {
  const [list, setList] = useState<PaymentEventAdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [provider, setProvider] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (provider.trim()) params.provider = provider.trim();
      if (orderId.trim()) params.orderId = orderId.trim();
      const data = await paymentAdmin.fetchAdminPaymentEvents(params);
      setList(data.list);
      setTotal(data.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载事件失败"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, provider, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const replay = async (id: string) => {
    try {
      await paymentAdmin.replayAdminPaymentEvent(id);
      toast.success("已记录重放操作");
    } catch (e) {
      toast.error(toastErrorMessage(e, "操作失败"));
    }
  };

  return (
    <PermissionGate permission="payment.manage">
      <div className="p-4 md:p-6">
        <div className="mb-2">
          <h1 className="text-xl font-bold text-foreground">支付管理</h1>
          <p className="text-sm text-muted-foreground">Webhook 与内部支付事件审计</p>
        </div>
        <PaymentAdminSubnav />

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="provider：stripe / manual / internal"
            className="min-w-[160px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="订单 ID"
            className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => { setPage(1); void load(); }}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            查询
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto theme-rounded border border-[var(--theme-border)]">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">时间</th>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">类型</th>
                    <th className="px-3 py-2">验签/处理</th>
                    <th className="px-3 py-2">订单</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{r.provider}</td>
                      <td className="px-3 py-2 text-xs">{r.event_type}</td>
                      <td className="px-3 py-2 text-xs">
                        {r.verify_status} / {r.processing_result}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.order_id?.slice(0, 8) ?? "—"}…</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void replay(r.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--theme-price)]"
                        >
                          <RotateCcw size={12} /> 重放记录
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">暂无数据</div>
              )}
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          </>
        )}
      </div>
    </PermissionGate>
  );
}
