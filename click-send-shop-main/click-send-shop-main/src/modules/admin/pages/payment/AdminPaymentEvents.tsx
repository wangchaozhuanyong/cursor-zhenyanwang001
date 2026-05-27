import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import {
  AdminFilterButton,
  AdminFilterInput,
  AdminFilterSelect,
} from "@/components/admin/AdminFilterControls";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { PaymentEventAdminRow } from "@/types/adminPayment";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";

const VERIFY_LABELS: Record<string, string> = { pending: "待验签", success: "验签通过", failed: "验签失败", manual: "人工确认" };
const RESULT_LABELS: Record<string, string> = { pending: "待处理", success: "处理成功", failed: "处理失败", rejected: "已拒绝", logged: "已记录", refunded: "已退款", partially_refunded: "部分退款" };
const PROVIDER_LABELS: Record<string, string> = { stripe: "Stripe", manual: "人工", internal: "内部", malaysia_local: "马来西亚本地支付" };

const EVENT_TYPE_LABELS: Record<string, string> = {
  payment_success: "支付成功",
  "payment_intent.succeeded": "Stripe 支付成功",
  admin_mark_paid: "后台补记支付",
  reward_wallet_paid: "返现钱包扣款",
  manual_webhook_received: "手动回调记录",
  "refund.provider_recorded": "渠道退款记录",
  "refund.manual_recorded": "人工退款记录",
};

const TABLE_HEADERS = ["事件", "网关", "关联状态", "验签", "处理结果", "错误信息", "创建时间", "操作"] as const;

function localizedMapLabel(map: Record<string, string>, value: string, tText: (zh: string) => string) {
  const zh = map[value];
  if (zh) return tText(zh);
  return value || "-";
}

function relatedBusinessLabel(row: PaymentEventAdminRow, tText: (zh: string) => string) {
  if (row.order_id && row.payment_order_id) return tText("已关联订单与支付");
  if (row.order_id) return tText("已关联订单");
  if (row.payment_order_id) return tText("已关联支付");
  return tText("未关联业务单据");
}

export default function AdminPaymentEvents() {
  const { tText } = useAdminT();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [provider, setProvider] = useState("");
  const [orderId, setOrderId] = useState("");

  const tableHeaders = useMemo(() => TABLE_HEADERS.map((h) => tText(h)), [tText]);
  const providerOptions = useMemo(
    () => Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label: tText(label) })),
    [tText],
  );

  const labelEventType = (type: string) => {
    const zh = EVENT_TYPE_LABELS[type];
    return zh ? tText(zh) : type || "-";
  };

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
      toast.success(tText("事件已重新处理，支付与订单数据会自动刷新"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
      ]);
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("重放事件失败"))),
  });

  const rows = eventsQuery.data?.list || [];
  const total = eventsQuery.data?.total || 0;

  const renderMobileCard = (row: PaymentEventAdminRow) => (
    <AdminTableMobileCard>
      <div className="mb-2">
        <p className="text-sm font-semibold">{labelEventType(row.event_type)}</p>
        <p className="font-mono text-[11px] text-muted-foreground">{row.provider_event_id || row.id}</p>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{localizedMapLabel(PROVIDER_LABELS, row.provider, tText)}</span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{localizedMapLabel(VERIFY_LABELS, row.verify_status, tText)}</span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{localizedMapLabel(RESULT_LABELS, row.processing_result, tText)}</span>
      </div>
      <div className="space-y-2">
        <AdminTableMobileCardField label={tText("关联状态")}>
          <span className="text-xs text-muted-foreground">{relatedBusinessLabel(row, tText)}</span>
        </AdminTableMobileCardField>
        {row.error_message ? (
          <AdminTableMobileCardField label={tText("错误信息")}>
            <span className="text-xs text-red-500 line-clamp-2">{row.error_message}</span>
          </AdminTableMobileCardField>
        ) : null}
        <AdminTableMobileCardField label={tText("创建时间")}>
          <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
        </AdminTableMobileCardField>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <button type="button" onClick={() => replayMutation.mutate(row)} disabled={replayMutation.isPending} className="touch-manipulation w-full rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-60"><Tx>重新处理</Tx></button>
      </div>
    </AdminTableMobileCard>
  );

  return (
    <PermissionGate permission="payment.manage">
      <AdminPageShell
        hint={<Tx>回调事件使用低频轮询兜底，SSE 到达时会精准刷新。</Tx>}
        toolbar={(
          <button type="button" onClick={() => void eventsQuery.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
            <RefreshCw size={16} className={eventsQuery.isFetching ? "animate-spin" : ""} />
            <Tx>刷新</Tx>
          </button>
        )}
        filters={(
          <>
            <PaymentAdminSubnav />
            <div className="grid gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 md:grid-cols-[220px_1fr_auto]">
              <AdminFilterSelect value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }}>
                <option value=""><Tx>全部网关</Tx></option>
                {providerOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </AdminFilterSelect>
              <AdminFilterInput value={orderId} onChange={(e) => { setOrderId(e.target.value); setPage(1); }} placeholder={tText("按关联单据编号筛选")} />
              <AdminFilterButton onClick={() => { setProvider(""); setOrderId(""); setPage(1); }}><Tx>清空筛选</Tx></AdminFilterButton>
            </div>
          </>
        )}
      >
        <AnimatedTable
          loading={eventsQuery.isLoading}
          rows={rows}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={8}
          emptyIcon={Radio}
          emptyTitle={tText("暂无支付事件")}
          emptyDescription={tText("当前筛选条件下没有回调或支付事件。")}
          className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName="min-w-[1040px] w-full text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={<tr>{tableHeaders.map((head) => <th key={head} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{head}</th>)}</tr>}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          renderMobileCard={renderMobileCard}
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
              <td className="px-4 py-3 text-sm text-foreground">{localizedMapLabel(PROVIDER_LABELS, row.provider, tText)}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{relatedBusinessLabel(row, tText)}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{localizedMapLabel(VERIFY_LABELS, row.verify_status, tText)}</span></td>
              <td className="px-4 py-3"><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{localizedMapLabel(RESULT_LABELS, row.processing_result, tText)}</span></td>
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
                <button type="button" onClick={() => replayMutation.mutate(row)} disabled={replayMutation.isPending} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-60"><Tx>重新处理</Tx></button>
              </td>
            </>
          )}
        />
      </AdminPageShell>
    </PermissionGate>
  );
}
