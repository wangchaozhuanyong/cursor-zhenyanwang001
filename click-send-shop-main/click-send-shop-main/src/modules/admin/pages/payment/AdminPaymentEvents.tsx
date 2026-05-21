import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { PaymentEventAdminRow } from "@/types/adminPayment";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";

const VERIFY_LABELS: Record<string, string> = { pending: "待验签", success: "验签通过", failed: "验签失败", manual: "人工确认" };
const RESULT_LABELS: Record<string, string> = { pending: "待处理", success: "处理成功", failed: "处理失败", rejected: "已拒绝", logged: "已记录", refunded: "已退款", partially_refunded: "部分退款" };
const PROVIDER_LABELS: Record<string, string> = { stripe: "Stripe", manual: "人工", internal: "内部", malaysia_local: "马来西亚本地支付" };

function label(map: Record<string, string>, value: string) {
  return map[value] || value || "-";
}

function labelEventType(type: string) {
  const map: Record<string, string> = {
    payment_success: "支付成功",
    "payment_intent.succeeded": "Stripe 支付成功",
    admin_mark_paid: "后台补记支付",
    reward_wallet_paid: "返现钱包扣款",
    manual_webhook_received: "手动回调记录",
    "refund.provider_recorded": "渠道退款记录",
    "refund.manual_recorded": "人工退款记录",
  };
  return map[type] || type || "-";
}

export default function AdminPaymentEvents() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [provider, setProvider] = useState("");
  const [orderId, setOrderId] = useState("");

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (provider) next.provider = provider;
    if (orderId.trim()) next.orderId = orderId.trim();
    return next;
  }, [orderId, page, pageSize, provider]);

  const eventsQuery = useQuery({
    queryKey: [...adminQueryKeys.paymentsRoot(), "events", params],
    queryFn: () => paymentAdmin.fetchAdminPaymentEvents(params),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const replayMutation = useMutation({
    mutationFn: (row: PaymentEventAdminRow) => paymentAdmin.replayAdminPaymentEvent(row.id),
    onSuccess: async () => {
      toast.success("事件已重新处理，支付与订单数据会自动刷新");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
      ]);
    },
    onError: (error) => toast.error(toastErrorMessage(error, "重放事件失败")),
  });

  const rows = eventsQuery.data?.list || [];
  const total = eventsQuery.data?.total || 0;

  return (
    <PermissionGate permission="payment.view">
      <div className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">支付回调 / 事件</h1>
            <p className="mt-1 text-sm text-muted-foreground">回调事件使用低频轮询兜底，SSE 到达时会精准刷新。</p>
          </div>
          <button type="button" onClick={() => void eventsQuery.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
            <RefreshCw size={16} className={eventsQuery.isFetching ? "animate-spin" : ""} />
            刷新
          </button>
        </div>

        <PaymentAdminSubnav />

        <div className="mb-4 grid gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 md:grid-cols-[220px_1fr_auto]">
          <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">全部网关</option>
            {Object.entries(PROVIDER_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
          <input value={orderId} onChange={(e) => { setOrderId(e.target.value); setPage(1); }} placeholder="按订单 ID / 支付单 ID 筛选" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button type="button" onClick={() => { setProvider(""); setOrderId(""); setPage(1); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">清空筛选</button>
        </div>

        <AnimatedTable
          loading={eventsQuery.isLoading}
          rows={rows}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={8}
          emptyIcon={Radio}
          emptyTitle="暂无支付事件"
          emptyDescription="当前筛选条件下没有回调或支付事件。"
          className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName="min-w-[1040px] w-full text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={<tr>{['事件', '网关', '支付单', '验签', '处理结果', '错误信息', '创建时间', '操作'].map((head) => <th key={head} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{head}</th>)}</tr>}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          renderRow={(row) => (
            <>
              <td className="max-w-[11rem] px-4 py-3 align-middle">
                <AdminTableCellGroup
                  maxWidth="10.5rem"
                  lines={[
                    { text: labelEventType(row.event_type) },
                    { text: row.provider_event_id || row.id, muted: true, mono: true },
                  ]}
                />
              </td>
              <td className="px-4 py-3 text-sm text-foreground">{label(PROVIDER_LABELS, row.provider)}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.payment_order_id || row.order_id || '-'}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{label(VERIFY_LABELS, row.verify_status)}</span></td>
              <td className="px-4 py-3"><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{label(RESULT_LABELS, row.processing_result)}</span></td>
              <td className="max-w-[15rem] px-4 py-3 align-middle">
                <AdminTableCell
                  value={row.error_message || '-'}
                  fullText={row.error_message || ''}
                  maxWidth="14rem"
                  className="text-red-500"
                />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.created_at)}</td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => replayMutation.mutate(row)} disabled={replayMutation.isPending} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-60">重新处理</button>
              </td>
            </>
          )}
        />
      </div>
    </PermissionGate>
  );
}

