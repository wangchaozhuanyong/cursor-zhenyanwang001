import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CreditCard, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { PaymentOrderAdminRow } from "@/types/adminPayment";
import { getPaymentStatusBadgeClass, getPaymentStatusLabel } from "@/constants/statusDictionary";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { labelChannelCode, labelPaymentOrderStatus } from "@/utils/paymentAdminLabels";
import { shortId } from "@/utils/shortId";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTableClassName,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";

const STATUS_FILTER_OPTIONS = [
  { value: "pending", label: "待支付" },
  { value: "paid", label: "已支付" },
  { value: "failed", label: "支付失败" },
  { value: "cancelled", label: "已取消" },
  { value: "refunded", label: "已退款" },
  { value: "partially_refunded", label: "部分退款" },
] as const;

const TABLE_HEADERS = [
  { key: "order", label: "订单", className: "min-w-[9.5rem]" },
  { key: "user", label: "用户", className: "min-w-[8.5rem]" },
  { key: "amount", label: "金额", className: "min-w-[6.5rem]" },
  { key: "channel", label: "渠道", className: "min-w-[7.5rem]" },
  { key: "status", label: "状态", className: "min-w-[5.5rem]" },
  { key: "txn", label: "交易号", className: "min-w-[7rem]" },
  { key: "time", label: "支付时间", className: "min-w-[10.5rem]" },
  { key: "action", label: "操作", className: "min-w-[5.5rem]" },
] as const;

function money(value: unknown, currency = "MYR") {
  const amount = Number(value || 0);
  return `${currency || "MYR"} ${amount.toFixed(2)}`;
}

function resolvePaymentStatusLabel(status: string) {
  const mapped = getPaymentStatusLabel(status);
  return mapped === "未知支付状态" ? labelPaymentOrderStatus(status) : mapped;
}

function resolvePaymentStatusBadge(status: string) {
  const badge = getPaymentStatusBadgeClass(status);
  if (badge !== "bg-secondary text-muted-foreground") return badge;
  if (status === "cancelled") return "bg-secondary text-muted-foreground";
  return badge;
}

function resolveChannelLabel(code: string) {
  const full = labelChannelCode(code);
  if (full.length <= 8) return full;
  if (code === "manual_bank") return "银行转账";
  if (code === "stripe_checkout") return "Stripe";
  if (code === "reward_wallet") return "返现钱包";
  return full.split(/[/·]/)[0]?.trim() || full;
}

export default function AdminPaymentOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [markingRow, setMarkingRow] = useState<PaymentOrderAdminRow | null>(null);
  const [markReason, setMarkReason] = useState("");

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (status) next.status = status;
    if (keyword.trim()) next.keyword = keyword.trim();
    return next;
  }, [keyword, page, pageSize, status]);

  const ordersQuery = useQuery({
    queryKey: [...adminQueryKeys.paymentsRoot(), "orders", params],
    queryFn: () => paymentAdmin.fetchAdminPaymentOrders(params),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      if (!markingRow) return;
      await paymentAdmin.markAdminOrderPaid(markingRow.order_id, {
        reason: markReason.trim() || "后台人工确认收款",
        channel_code: markingRow.channel_code,
        payment_channel: markingRow.channel_code,
      });
    },
    onSuccess: async () => {
      toast.success("已标记为已支付，相关订单数据会自动刷新");
      setMarkingRow(null);
      setMarkReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
      ]);
    },
    onError: (error) => toast.error(toastErrorMessage(error, "标记支付失败")),
  });

  const rows = ordersQuery.data?.list || [];
  const total = ordersQuery.data?.total || 0;

  const renderRow = (row: PaymentOrderAdminRow) => {
    const orderNo = row.order_no || shortId(row.order_id, 8);
    const channelLabel = resolveChannelLabel(row.channel_code);
    const statusLabel = resolvePaymentStatusLabel(row.status);
    const txnRaw = row.payment_transaction_no?.trim() || "";
    const txnNo = txnRaw || "—";
    const txnDisplay = txnRaw && txnRaw.length > 18 ? shortId(txnRaw, 10) : txnNo;
    const paidAt = row.payment_time ? formatDateTime(row.payment_time) : formatDateTime(row.created_at);

    return (
      <>
        <td className={adminTdClassName("max-w-[10rem] px-4 py-2.5")}>
          <AdminTableCellGroup
            maxWidth="9.5rem"
            lines={[
              {
                text: row.order_id ? `订单 ${orderNo}` : orderNo,
                mono: true,
              },
              { text: `支付单 ${shortId(row.id)}`, muted: true, mono: true },
            ]}
            tooltipLines={[
              `订单号：${row.order_no || "—"}`,
              `订单 ID：${row.order_id}`,
              `支付单 ID：${row.id}`,
            ]}
          />
        </td>
        <td className={adminTdClassName("max-w-[9rem] px-4 py-2.5")}>
          <AdminTableCellGroup
            maxWidth="8.5rem"
            lines={[
              { text: row.buyer_phone || "未留手机号", mono: Boolean(row.buyer_phone) },
              { text: `用户 ${shortId(row.user_id)}`, muted: true, mono: true },
            ]}
            tooltipLines={[
              row.buyer_phone ? `手机号：${row.buyer_phone}` : "未留手机号",
              `用户 ID：${row.user_id || "—"}`,
            ]}
          />
        </td>
        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} px-4 py-2.5 font-semibold`)}>
          <AdminTableCell value={money(row.amount, row.currency)} fullText={money(row.amount, row.currency)} maxWidth="7rem" />
        </td>
        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} px-4 py-2.5`)}>
          <AdminTableCell
            value={channelLabel}
            fullText={labelChannelCode(row.channel_code)}
            maxWidth="7.5rem"
          />
        </td>
        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} px-4 py-2.5`)}>
          <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${resolvePaymentStatusBadge(row.status)}`}>
            {statusLabel}
          </span>
        </td>
        <td className={adminTdClassName("max-w-[8rem] px-4 py-2.5")}>
          <AdminTableCell
            value={txnDisplay}
            fullText={txnNo}
            mono
            maxWidth="7.5rem"
          />
        </td>
        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} px-4 py-2.5 text-xs text-muted-foreground`)}>
          <AdminTableCell value={paidAt} fullText={paidAt} maxWidth="10rem" muted />
        </td>
        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} px-4 py-2.5`)}>
          <div className="flex flex-col gap-1.5">
            {row.order_id ? (
              <button
                type="button"
                onClick={() => navigate(`/admin/orders/${row.order_id}`)}
                className="text-left text-[11px] font-medium text-[var(--theme-price)] hover:underline"
              >
                查看订单
              </button>
            ) : null}
            <button
              type="button"
              disabled={row.status === "paid"}
              onClick={() => setMarkingRow(row)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs whitespace-nowrap hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              人工确认
            </button>
          </div>
        </td>
      </>
    );
  };

  return (
    <PermissionGate permission="payment.view">
      <div className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">支付流水</h1>
            <p className="mt-1 text-sm text-muted-foreground">使用 Query 缓存和 SSE 自动刷新，人工补记后会同步订单与仪表盘。</p>
          </div>
          <button
            type="button"
            onClick={() => void ordersQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <RefreshCw size={16} className={ordersQuery.isFetching ? "animate-spin" : ""} />
            刷新
          </button>
        </div>

        <PaymentAdminSubnav />

        <div className="mb-4 grid gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 md:grid-cols-[180px_1fr_auto]">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              placeholder="搜索订单号、交易号或手机号"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => { setStatus(""); setKeyword(""); setPage(1); }}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            清空筛选
          </button>
        </div>

        <AnimatedTable
          loading={ordersQuery.isLoading}
          rows={rows}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={8}
          emptyIcon={CreditCard}
          emptyTitle="暂无支付流水"
          emptyDescription="当前筛选条件下没有支付记录。"
          className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName={adminTableClassName("min-w-[920px] w-full text-sm")}
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={(
            <tr>
              {TABLE_HEADERS.map((head) => (
                <th
                  key={head.key}
                  className={adminThClassName(`${head.className} px-4 py-3 whitespace-nowrap`)}
                >
                  {head.label}
                </th>
              ))}
            </tr>
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          renderRow={renderRow}
        />

        {markingRow ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-background p-5 shadow-xl">
              <h2 className="text-lg font-semibold text-foreground">人工确认收款</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                订单 {markingRow.order_no || shortId(markingRow.order_id, 8)} 将被标记为已支付，请填写操作原因，方便审计追踪。
              </p>
              <textarea
                value={markReason}
                onChange={(e) => setMarkReason(e.target.value)}
                rows={4}
                className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="例如：已核对银行入账流水"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setMarkingRow(null)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">取消</button>
                <button
                  type="button"
                  onClick={() => markPaidMutation.mutate()}
                  disabled={markPaidMutation.isPending}
                  className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {markPaidMutation.isPending ? "处理中..." : "确认收款"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PermissionGate>
  );
}
