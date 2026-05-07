import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import type { PaymentOrderAdminRow } from "@/types/adminPayment";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";

const statusOpts = [
  { value: "", label: "全部" },
  { value: "pending", label: "待支付" },
  { value: "paid", label: "已支付" },
];

export default function AdminPaymentOrders() {
  const [list, setList] = useState<PaymentOrderAdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [markOrderId, setMarkOrderId] = useState("");
  const [markReason, setMarkReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (status) params.status = status;
      if (keyword.trim()) params.keyword = keyword.trim();
      const data = await paymentAdmin.fetchAdminPaymentOrders(params);
      setList(data.list);
      setTotal(data.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载支付流水失败"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, keyword]);

  useEffect(() => {
    void load();
  }, [load]);

  const markPaid = async () => {
    const id = markOrderId.trim();
    if (!id) {
      toast.error("请填写订单 ID");
      return;
    }
    try {
      await paymentAdmin.markAdminOrderPaid(id, { reason: markReason.trim() || undefined });
      toast.success("已补记为已支付");
      setMarkOrderId("");
      setMarkReason("");
      void load();
    } catch (e) {
      toast.error(toastErrorMessage(e, "补记失败"));
    }
  };

  return (
    <PermissionGate permission="payment.manage">
      <div className="p-4 md:p-6">
        <div className="mb-2">
          <h1 className="text-xl font-bold text-foreground">支付管理</h1>
          <p className="text-sm text-muted-foreground">支付单流水、线下补单</p>
        </div>
        <PaymentAdminSubnav />

        <div className="theme-rounded mb-6 border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <h2 className="mb-2 text-sm font-semibold text-foreground">补记已支付（线下转账核对后）</h2>
          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <label className="flex-1 text-xs text-muted-foreground">
              订单 ID
              <input
                value={markOrderId}
                onChange={(e) => setMarkOrderId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="orders 表主键 UUID"
              />
            </label>
            <label className="flex-[2] text-xs text-muted-foreground">
              备注
              <input
                value={markReason}
                onChange={(e) => setMarkReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="可选"
              />
            </label>
            <button
              type="button"
              onClick={() => void markPaid()}
              className="rounded-full bg-[var(--theme-price)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              确认补单
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {statusOpts.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), void load())}
            placeholder="订单号 / 交易号"
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
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">支付单</th>
                    <th className="px-3 py-2">订单</th>
                    <th className="px-3 py-2">渠道</th>
                    <th className="px-3 py-2">金额</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">交易号</th>
                    <th className="px-3 py-2">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{r.id.slice(0, 8)}…</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.order_no}</td>
                      <td className="px-3 py-2">{r.channel_code}</td>
                      <td className="px-3 py-2">{r.currency} {Number(r.amount).toFixed(2)}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.payment_transaction_no || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {r.payment_time ? new Date(r.payment_time).toLocaleString() : "—"}
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
