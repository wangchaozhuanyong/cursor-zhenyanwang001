import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import type { PaymentReconciliationRow } from "@/types/adminPayment";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";

export default function AdminPaymentReconciliations() {
  const [list, setList] = useState<PaymentReconciliationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [reconcileDate, setReconcileDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [provider, setProvider] = useState("stripe");
  const [channelCode, setChannelCode] = useState("");
  const [diffAmount, setDiffAmount] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await paymentAdmin.fetchAdminPaymentReconciliations({
        page: String(page),
        pageSize: String(pageSize),
      });
      setList(data.list);
      setTotal(data.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载对账失败"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    try {
      await paymentAdmin.createAdminPaymentReconciliation({
        reconcile_date: reconcileDate,
        provider,
        channel_code: channelCode.trim() || undefined,
        diff_amount: diffAmount.trim() ? Number(diffAmount) : undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("已创建对账草稿");
      setNotes("");
      setDiffAmount("");
      void load();
    } catch (e) {
      toast.error(toastErrorMessage(e, "创建失败"));
    }
  };

  return (
    <PermissionGate permission="payment.manage">
      <div className="p-4 md:p-6">
        <div className="mb-2">
          <h1 className="text-xl font-bold text-foreground">支付管理</h1>
          <p className="text-sm text-muted-foreground">按日 / 渠道汇总实收与差异（手续费来自渠道 JSON 配置）</p>
        </div>
        <PaymentAdminSubnav />

        <div className="theme-rounded mb-6 border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <h2 className="mb-3 text-sm font-semibold text-foreground">新建对账草稿</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-muted-foreground">
              对账日期
              <input
                type="date"
                value={reconcileDate}
                onChange={(e) => setReconcileDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Provider
              <input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              渠道 code（可选）
              <input
                value={channelCode}
                onChange={(e) => setChannelCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="stripe_checkout"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              差异金额（可选）
              <input
                value={diffAmount}
                onChange={(e) => setDiffAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
          </div>
          <label className="mt-3 block text-xs text-muted-foreground">
            备注
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void create()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--theme-price)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} /> 创建草稿
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto theme-rounded border border-[var(--theme-border)]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">日期</th>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">渠道</th>
                    <th className="px-3 py-2">笔数</th>
                    <th className="px-3 py-2">成功金额</th>
                    <th className="px-3 py-2">差异</th>
                    <th className="px-3 py-2">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2">{r.reconcile_date}</td>
                      <td className="px-3 py-2">{r.provider}</td>
                      <td className="px-3 py-2">{r.channel_code || "—"}</td>
                      <td className="px-3 py-2">{r.order_count}</td>
                      <td className="px-3 py-2">RM {Number(r.success_amount).toFixed(2)}</td>
                      <td className="px-3 py-2">RM {Number(r.diff_amount).toFixed(2)}</td>
                      <td className="px-3 py-2">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">暂无对账记录</div>
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
