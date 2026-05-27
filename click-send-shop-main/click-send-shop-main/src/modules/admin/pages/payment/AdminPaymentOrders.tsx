import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import {
  AdminFilterButton,
  AdminFilterSelect,
} from "@/components/admin/AdminFilterControls";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { adminRealtimeQueryOptions } from "@/lib/adminRealtimeQueryOptions";
import type { PaymentOrderAdminRow } from "@/types/adminPayment";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import { useLocalizedOptions } from "@/hooks/useLocalizedOptions";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { labelChannelCode } from "@/utils/paymentAdminLabels";
import { shortId } from "@/utils/shortId";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTableClassName,
  adminTdClassName,
  adminThClassName,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";

const STATUS_FILTER_OPTIONS = [
  { value: "pending", label: "待支付" },
  { value: "paid", label: "已支付" },
  { value: "failed", label: "支付失败" },
  { value: "cancelled", label: "已取消" },
  { value: "refunded", label: "已退款" },
  { value: "partially_refunded", label: "部分退款" },
] as const;

const TABLE_HEADERS: ReadonlyArray<{
  key: string;
  label: string;
  className: string;
  align: AdminTableAlign;
}> = [
  { key: "order", label: "订单", className: "min-w-[9.5rem]", align: "left" },
  { key: "user", label: "用户", className: "min-w-[8.5rem]", align: "left" },
  { key: "amount", label: "金额", className: "min-w-[6.5rem]", align: "right" },
  { key: "channel", label: "渠道", className: "min-w-[7.5rem]", align: "left" },
  { key: "status", label: "状态", className: "min-w-[5.5rem]", align: "center" },
  { key: "txn", label: "交易号", className: "min-w-[7rem]", align: "left" },
  { key: "time", label: "支付时间", className: "min-w-[10.5rem]", align: "left" },
  { key: "action", label: "操作", className: "min-w-[5.5rem]", align: "right" },
];

function money(value: unknown, currency = "MYR") {
  const amount = Number(value || 0);
  return `${currency || "MYR"} ${amount.toFixed(2)}`;
}

function resolveChannelLabel(code: string, tText: (zh: string) => string) {
  const full = labelChannelCode(code);
  if (full.length <= 8) return full;
  if (code === "manual_bank") return tText("银行转账");
  if (code === "stripe_checkout") return "Stripe";
  if (code === "reward_wallet") return tText("返现钱包");
  return full.split(/[/·]/)[0]?.trim() || full;
}

export default function AdminPaymentOrders() {
  const { tText } = useAdminT();
  const statusFilterOptions = useLocalizedOptions(
    STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  );
  const tableHeaders = useMemo(
    () => TABLE_HEADERS.map((h) => ({ ...h, label: tText(h.label) })),
    [tText],
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [markingRow, setMarkingRow] = useState<PaymentOrderAdminRow | null>(null);
  const [markReason, setMarkReason] = useState("");
  const markDirty = Boolean(markingRow && markReason.trim().length > 0);
  useAdminTabDirty(markDirty);

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (status) next.status = status;
    if (keyword.trim()) next.keyword = keyword.trim();
    return next;
  }, [keyword, page, pageSize, status]);

  const ordersQuery = useQuery({
    queryKey: [...adminQueryKeys.paymentsRoot(), "orders", params],
    queryFn: () => paymentAdmin.fetchAdminPaymentOrders(params),
    ...adminRealtimeQueryOptions.payment,
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      if (!markingRow) return;
      await paymentAdmin.markAdminOrderPaid(markingRow.order_id, {
        reason: markReason.trim() || tText("后台人工确认收款"),
        channel_code: markingRow.channel_code,
        payment_channel: markingRow.channel_code,
      });
    },
    onSuccess: async () => {
      toast.success(tText("已标记为已支付，相关订单数据会自动刷新"));
      setMarkingRow(null);
      setMarkReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
      ]);
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("标记支付失败"))),
  });

  const rows = ordersQuery.data?.list || [];
  const total = ordersQuery.data?.total || 0;

  const renderMobileCard = (row: PaymentOrderAdminRow) => {
    const orderNo = row.order_no || tText("未生成订单号");
    const channelLabel = resolveChannelLabel(row.channel_code, tText);
    const txnRaw = row.payment_transaction_no?.trim() || "";
    const txnNo = txnRaw || "—";
    const paidAt = row.payment_time ? formatDateTime(row.payment_time) : formatDateTime(row.created_at);

    return (
      <AdminTableMobileCard>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-sm font-semibold">{orderNo}</p>
          </div>
          <PaymentStatusBadge status={row.status} />
        </div>
        <p className="mb-2 text-base font-semibold text-[var(--theme-price)]">{money(row.amount, row.currency)}</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{channelLabel}</span>
        </div>
        <div className="space-y-2">
          <AdminTableMobileCardField label={tText("用户")}>
            <span className="text-xs text-muted-foreground">{row.buyer_phone || tText("未留手机号")}</span>
          </AdminTableMobileCardField>
          {txnRaw ? (
            <AdminTableMobileCardField label={tText("交易号")}>
              <span className="font-mono text-xs text-muted-foreground break-all">{txnNo}</span>
            </AdminTableMobileCardField>
          ) : null}
          <AdminTableMobileCardField label={tText("支付时间")}>
            <span className="text-xs text-muted-foreground">{paidAt}</span>
          </AdminTableMobileCardField>
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {row.order_id ? (
            <button
              type="button"
              onClick={() => navigate(`/admin/orders/${row.order_id}`)}
              className="touch-manipulation w-full rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary"
            >
              <Tx>查看订单</Tx>
            </button>
          ) : null}
          <button
            type="button"
            disabled={row.status === "paid"}
            onClick={() => setMarkingRow(row)}
            className="touch-manipulation w-full rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Tx>人工确认</Tx>
          </button>
        </div>
      </AdminTableMobileCard>
    );
  };

  const renderRow = (row: PaymentOrderAdminRow) => {
    const orderNo = row.order_no || tText("未生成订单号");
    const channelLabel = resolveChannelLabel(row.channel_code, tText);
    const txnRaw = row.payment_transaction_no?.trim() || "";
    const txnNo = txnRaw || "—";
    const txnDisplay = txnRaw && txnRaw.length > 18 ? shortId(txnRaw, 10) : txnNo;
    const paidAt = row.payment_time ? formatDateTime(row.payment_time) : formatDateTime(row.created_at);

    return (
      <>
        <td className={adminTdClassName("max-w-[10rem] px-4 py-2.5", "left")}>
          <AdminTableCellGroup
            maxWidth="9.5rem"
            lines={[
              {
                text: row.order_id ? `${tText("订单")} ${orderNo}` : orderNo,
                mono: true,
              },
            ]}
            tooltipLines={[
              `${tText("订单号")}：${row.order_no || "—"}`,
            ]}
          />
        </td>
        <td className={adminTdClassName("max-w-[9rem] px-4 py-2.5", "left")}>
          <AdminTableCellGroup
            maxWidth="8.5rem"
            lines={[
              { text: row.buyer_phone || tText("未留手机号"), mono: Boolean(row.buyer_phone) },
            ]}
            tooltipLines={[
              row.buyer_phone ? `${tText("手机号")}：${row.buyer_phone}` : tText("未留手机号"),
            ]}
          />
        </td>
        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} px-4 py-2.5 font-semibold`, "right")}>
          <AdminTableCell value={money(row.amount, row.currency)} fullText={money(row.amount, row.currency)} maxWidth="7rem" />
        </td>
        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} px-4 py-2.5`, "left")}>
          <AdminTableCell
            value={channelLabel}
            fullText={labelChannelCode(row.channel_code)}
            maxWidth="7.5rem"
          />
        </td>
        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} px-4 py-2.5`, "center")}>
          <PaymentStatusBadge status={row.status} />
        </td>
        <td className={adminTdClassName("max-w-[8rem] px-4 py-2.5", "left")}>
          <AdminTableCell
            value={txnDisplay}
            fullText={txnNo}
            mono
            maxWidth="7.5rem"
          />
        </td>
        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} px-4 py-2.5 text-xs text-muted-foreground`, "left")}>
          <AdminTableCell value={paidAt} fullText={paidAt} maxWidth="10rem" muted />
        </td>
        <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} px-4 py-2.5`, "right")}>
          <div className="flex flex-col gap-1.5">
            {row.order_id ? (
              <button
                type="button"
                onClick={() => navigate(`/admin/orders/${row.order_id}`)}
                className="text-left text-[11px] font-medium text-[var(--theme-price)] hover:underline"
              >
                <Tx>查看订单</Tx>
              </button>
            ) : null}
            <button
              type="button"
              disabled={row.status === "paid"}
              onClick={() => setMarkingRow(row)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs whitespace-nowrap hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Tx>人工确认</Tx>
            </button>
          </div>
        </td>
      </>
    );
  };

  return (
    <PermissionGate permission="payment.manage">
      <AdminPageShell
        hint={<Tx>使用 Query 缓存和 SSE 自动刷新，人工补记后会同步订单与仪表盘。</Tx>}
        toolbar={(
          <button
            type="button"
            onClick={() => void ordersQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <RefreshCw size={16} className={ordersQuery.isFetching ? "animate-spin" : ""} />
            <Tx>刷新</Tx>
          </button>
        )}
        filters={(
          <>
            <PaymentAdminSubnav />
            <div className="grid gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 md:grid-cols-[180px_1fr_auto]">
          <AdminFilterSelect
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value=""><Tx>全部状态</Tx></option>
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </AdminFilterSelect>
          <AdminSearchInput
            value={keyword}
            onChange={(value) => { setKeyword(value); setPage(1); }}
            placeholder={tText("搜索订单号、交易号或手机号")}
          />
          <AdminFilterButton
            onClick={() => { setStatus(""); setKeyword(""); setPage(1); }}
          >
            <Tx>清空筛选</Tx>
          </AdminFilterButton>
            </div>
          </>
        )}
      >
        <AnimatedTable
          loading={ordersQuery.isLoading}
          rows={rows}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={8}
          emptyIcon={CreditCard}
          emptyTitle={tText("暂无支付流水")}
          emptyDescription={tText("当前筛选条件下没有支付记录。")}
          className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName={adminTableClassName("min-w-[920px] w-full text-sm")}
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={(
            <tr>
              {tableHeaders.map((head) => (
                <th
                  key={head.key}
                  className={adminThClassName(`${head.className} px-4 py-3 whitespace-nowrap`, head.align)}
                >
                  {head.label}
                </th>
              ))}
            </tr>
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          renderMobileCard={renderMobileCard}
          renderRow={renderRow}
        />

        <AdminFormSheet
          open={!!markingRow}
          onOpenChange={(open) => {
            if (!open) {
              setMarkingRow(null);
              setMarkReason("");
            }
          }}
          title={tText("人工确认收款")}
          description={
            markingRow
              ? tText(`订单 ${markingRow.order_no || tText("未生成订单号")} 将被标记为已支付，请填写操作原因，方便审计追踪。`)
              : undefined
          }
          submitText={tText("确认收款")}
          loading={markPaidMutation.isPending}
          onSubmit={() => markPaidMutation.mutateAsync()}
          size="sm"
        >
          <textarea
            value={markReason}
            onChange={(e) => setMarkReason(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder={tText("例如：已核对银行入账流水")}
          />
        </AdminFormSheet>
      </AdminPageShell>
    </PermissionGate>
  );
}
