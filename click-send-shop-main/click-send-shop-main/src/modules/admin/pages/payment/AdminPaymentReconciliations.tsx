import { useCallback, useEffect, useState } from "react";
import { Plus, Scale } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import PermissionGate from "@/components/admin/PermissionGate";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
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
              <div className="mt-1">
                <SegmentedDateInput
                  value={reconcileDate}
                  onChange={setReconcileDate}
                  className="w-full [&>div]:border-border [&>div]:bg-background"
                />
              </div>
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

        <AnimatedTable
          loading={loading}
          rows={list}
          rowKey={(r) => r.id}
          skeletonRows={8}
          skeletonCols={7}
          className="theme-rounded border border-[var(--theme-border)] overflow-x-auto"
          tableClassName="w-full min-w-[720px] text-left text-sm"
          theadClassName="bg-secondary/50 text-xs text-muted-foreground"
          thead={(
            <tr>
              <th className="px-3 py-2">日期</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">渠道</th>
              <th className="px-3 py-2">笔数</th>
              <th className="px-3 py-2">成功金额</th>
              <th className="px-3 py-2">差异</th>
              <th className="px-3 py-2">状态</th>
            </tr>
          )}
          footer={<Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={() => {}} />}
          emptyIcon={Scale}
          emptyTitle="暂无对账记录"
          renderRow={(r) => (
            <>
              <td className="px-3 py-2">{r.reconcile_date}</td>
              <td className="px-3 py-2">{r.provider}</td>
              <td className="px-3 py-2">{r.channel_code || "—"}</td>
              <td className="px-3 py-2">{r.order_count}</td>
              <td className="px-3 py-2">RM {Number(r.success_amount).toFixed(2)}</td>
              <td className="px-3 py-2">RM {Number(r.diff_amount).toFixed(2)}</td>
              <td className="px-3 py-2">{r.status}</td>
            </>
          )}
        />
      </div>
    </PermissionGate>
  );
}
