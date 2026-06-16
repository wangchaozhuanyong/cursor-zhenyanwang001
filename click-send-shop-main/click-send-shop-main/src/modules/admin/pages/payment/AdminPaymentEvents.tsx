import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, RefreshCw, ShieldCheck } from "lucide-react";
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
import type { PaymentEventAdminRow, PaymentReviewStatus } from "@/types/adminPayment";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { labelPaymentReviewStatus } from "@/utils/paymentAdminLabels";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";
import {
  adminTableCellClass,
  adminTableTheadRow,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "left", "left", "center", "center", "left", "left", "center", "left", "right",
];

const VERIFY_LABELS: Record<string, string> = { pending: "待验签", success: "验签通过", failed: "验签失败", manual: "人工确认" };
const RESULT_LABELS: Record<string, string> = { pending: "待处理", success: "处理成功", failed: "处理失败", rejected: "已拒绝", logged: "已记录", refunded: "已退款", partially_refunded: "部分退款" };
const PROVIDER_LABELS: Record<string, string> = { stripe: "Stripe", manual: "人工", internal: "内部", malaysia_local: "马来西亚本地支付", billplz: "Billplz", fpx: "FPX" };

const EVENT_TYPE_LABELS: Record<string, string> = {
  payment_success: "支付成功",
  "payment_intent.succeeded": "Stripe 支付成功",
  admin_mark_paid: "后台补记支付",
  reward_wallet_paid: "返现钱包扣款",
  manual_webhook_received: "手动回调记录",
  "refund.provider_recorded": "渠道退款记录",
  "refund.manual_recorded": "人工退款记录",
  "billplz.paid": "Billplz 支付成功",
  "billplz.failed": "Billplz 支付失败",
  "billplz.webhook_rejected": "Billplz 回调拒绝",
  "fpx.paid": "FPX 支付成功",
  "fpx.failed": "FPX 支付失败",
  "fpx.webhook_rejected": "FPX 回调拒绝",
};

const REVIEW_STATUS_OPTIONS: Array<{ value: PaymentReviewStatus; label: string }> = [
  { value: "confirmed", label: "已复核" },
  { value: "needs_followup", label: "需跟进" },
  { value: "ignored", label: "已忽略" },
  { value: "rejected", label: "已驳回" },
];
const REVIEW_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "全部复核状态" },
  { value: "pending", label: "待复核" },
  { value: "needs_review", label: "需复核" },
  { value: "confirmed", label: "已复核" },
  { value: "needs_followup", label: "需跟进" },
  { value: "rejected", label: "已驳回" },
  { value: "ignored", label: "已忽略" },
];
const VERIFY_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "全部验签状态" },
  { value: "pending", label: "待验签" },
  { value: "success", label: "验签通过" },
  { value: "failed", label: "验签失败" },
  { value: "manual", label: "人工确认" },
];
const RESULT_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "全部处理结果" },
  { value: "pending", label: "待处理" },
  { value: "success", label: "处理成功" },
  { value: "failed", label: "处理失败" },
  { value: "rejected", label: "已拒绝" },
  { value: "logged", label: "已记录" },
  { value: "refunded", label: "已退款" },
  { value: "partially_refunded", label: "部分退款" },
];

const TABLE_HEADERS = ["事件", "网关", "关联状态", "验签", "处理结果", "金额校验", "错误信息", "复核", "创建时间", "操作"] as const;

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

function formatAmount(value: number | null | undefined, currency?: string) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${currency || "MYR"} ${Number(value).toFixed(2)}`;
}

function amountCheckText(row: PaymentEventAdminRow, tText: (zh: string) => string) {
  const hasExpected = row.expected_amount !== null && row.expected_amount !== undefined;
  const hasActual = row.actual_amount !== null && row.actual_amount !== undefined;
  if (!hasExpected && !hasActual && !row.expected_currency && !row.actual_currency) return "—";
  const expected = formatAmount(row.expected_amount, row.expected_currency || row.actual_currency || "MYR");
  const actual = formatAmount(row.actual_amount, row.actual_currency || row.expected_currency || "MYR");
  if (row.failure_reason_code === "amount_mismatch") return `${tText("金额不一致")}：${actual} / ${expected}`;
  if (row.failure_reason_code === "currency_mismatch") return `${tText("币种不一致")}：${row.actual_currency || "—"} / ${row.expected_currency || "—"}`;
  return `${actual} / ${expected}`;
}

function hasAmountRisk(row: PaymentEventAdminRow) {
  if (row.failure_reason_code === "amount_mismatch" || row.failure_reason_code === "currency_mismatch") return true;
  const hasExpected = row.expected_amount !== null && row.expected_amount !== undefined;
  const hasActual = row.actual_amount !== null && row.actual_amount !== undefined;
  if (hasExpected && hasActual && Math.abs(Number(row.actual_amount || 0) - Number(row.expected_amount || 0)) >= 0.01) return true;
  return Boolean(row.expected_currency && row.actual_currency && row.expected_currency !== row.actual_currency);
}

function needsReview(row: PaymentEventAdminRow) {
  return !row.review_status || row.review_status === "pending" || row.review_status === "needs_review";
}

function PaymentEventRiskSummary({
  rows,
  total,
  tText,
}: {
  rows: PaymentEventAdminRow[];
  total: number;
  tText: (zh: string) => string;
}) {
  const verifyFailed = rows.filter((row) => row.verify_status === "failed").length;
  const processingFailed = rows.filter((row) => row.processing_result === "failed" || row.processing_result === "rejected").length;
  const amountRisk = rows.filter(hasAmountRisk).length;
  const reviewPending = rows.filter((row) => needsReview(row) && (row.error_message || row.failure_reason_code || row.verify_status === "failed" || row.processing_result === "failed" || row.processing_result === "rejected")).length;
  const cards = [
    { label: tText("当前筛选总数"), value: total, tone: "text-foreground" },
    { label: tText("验签失败"), value: verifyFailed, tone: verifyFailed ? "text-red-600" : "text-muted-foreground" },
    { label: tText("处理失败/拒绝"), value: processingFailed, tone: processingFailed ? "text-red-600" : "text-muted-foreground" },
    { label: tText("金额/币种异常"), value: amountRisk, tone: amountRisk ? "text-amber-600" : "text-muted-foreground" },
    { label: tText("异常待复核"), value: reviewPending, tone: reviewPending ? "text-amber-600" : "text-muted-foreground" },
  ];
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className={`mt-1 text-xl font-semibold ${card.tone}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminPaymentEvents() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [provider, setProvider] = useState("");
  const [orderId, setOrderId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [verifyStatus, setVerifyStatus] = useState("");
  const [processingResult, setProcessingResult] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("");
  const [replayingEventId, setReplayingEventId] = useState<string | null>(null);
  const [reviewingRow, setReviewingRow] = useState<PaymentEventAdminRow | null>(null);
  const [reviewStatus, setReviewStatus] = useState<PaymentReviewStatus>("confirmed");
  const [reviewNote, setReviewNote] = useState("");

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
    if (keyword.trim()) next.keyword = keyword.trim();
    if (verifyStatus) next.verifyStatus = verifyStatus;
    if (processingResult) next.processingResult = processingResult;
    if (reviewStatusFilter) next.reviewStatus = reviewStatusFilter;
    return next;
  }, [keyword, orderId, page, pageSize, processingResult, provider, reviewStatusFilter, verifyStatus]);

  const eventsQuery = useQuery({
    queryKey: [...adminQueryKeys.paymentsRoot(), "events", params],
    queryFn: () => paymentAdmin.fetchAdminPaymentEvents(params),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const replayMutation = useMutation({
    mutationFn: (row: PaymentEventAdminRow) => paymentAdmin.replayAdminPaymentEvent(row.id),
    onMutate: (row) => setReplayingEventId(row.id),
    onSuccess: async () => {
      toast.success(tText("事件已重新处理，支付与订单数据会自动刷新"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
      ]);
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("重放事件失败"))),
    onSettled: () => setReplayingEventId(null),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!reviewingRow) return;
      await paymentAdmin.reviewAdminPaymentEvent(reviewingRow.id, {
        review_status: reviewStatus,
        review_note: reviewNote.trim(),
      });
    },
    onSuccess: async () => {
      toast.success(tText("支付事件复核已保存"));
      setReviewingRow(null);
      setReviewStatus("confirmed");
      setReviewNote("");
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentsRoot() });
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("复核失败"))),
  });

  const rows = eventsQuery.data?.list || [];
  const total = eventsQuery.data?.total || 0;

  const confirmReplay = (row: PaymentEventAdminRow) => {
    confirm({
      title: tText("确认重新处理支付事件"),
      description: (
        <>
          {tText("重新处理会再次触发支付事件的业务处理流程，可能刷新订单、支付和报表状态。请确认该事件确实需要重试。")}
          <br />
          {tText("事件")}：{labelEventType(row.event_type)}
          <br />
          ID：{row.provider_event_id || row.id}
        </>
      ),
      confirmText: tText("确认重新处理"),
      onConfirm: async () => {
        await replayMutation.mutateAsync(row);
      },
    });
  };

  const openReview = (row: PaymentEventAdminRow) => {
    setReviewingRow(row);
    setReviewStatus((row.review_status && row.review_status !== "pending" && row.review_status !== "needs_review"
      ? row.review_status
      : "confirmed") as PaymentReviewStatus);
    setReviewNote(row.review_note || "");
  };

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
        <AdminTableMobileCardField label={tText("金额校验")}>
          <span className={row.failure_reason_code ? "text-xs text-red-500" : "text-xs text-muted-foreground"}>
            {amountCheckText(row, tText)}
          </span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("复核")}>
          <span className="text-xs text-muted-foreground">{tText(labelPaymentReviewStatus(row.review_status || "pending"))}</span>
        </AdminTableMobileCardField>
        {row.error_message || row.failure_reason_code ? (
          <AdminTableMobileCardField label={tText("错误信息")}>
            <span className="text-xs text-red-500 line-clamp-2">{row.error_message || row.failure_reason_code}</span>
          </AdminTableMobileCardField>
        ) : null}
        <AdminTableMobileCardField label={tText("创建时间")}>
          <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
        </AdminTableMobileCardField>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <div className="grid grid-cols-2 gap-2">
        <UnifiedButton type="button" onClick={() => openReview(row)} disabled={reviewMutation.isPending} className="inline-flex touch-manipulation w-full items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-60">
          <ShieldCheck size={14} />
          <Tx>复核</Tx>
        </UnifiedButton>
        <UnifiedButton type="button" onClick={() => confirmReplay(row)} disabled={replayMutation.isPending} className="touch-manipulation w-full rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-60">
          {replayingEventId === row.id ? tText("处理中...") : <Tx>重新处理</Tx>}
        </UnifiedButton>
        </div>
      </div>
    </AdminTableMobileCard>
  );

  return (
    <PermissionGate permission="payment.manage" mode="page">
      <AdminPageShell
        hint={<Tx>回调事件使用低频轮询兜底，SSE 到达时会精准刷新。</Tx>}
        toolbar={(
          <UnifiedButton type="button" onClick={() => void eventsQuery.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
            <RefreshCw size={16} className={eventsQuery.isFetching ? "animate-spin" : ""} />
            <Tx>刷新</Tx>
          </UnifiedButton>
        )}
        filters={(
          <>
            <PaymentAdminSubnav />
            <div className="grid gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 md:grid-cols-2 xl:grid-cols-[180px_180px_180px_180px_1fr_auto]">
              <AdminFilterSelect value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }}>
                <option value=""><Tx>全部网关</Tx></option>
                {providerOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </AdminFilterSelect>
              <AdminFilterSelect value={verifyStatus} onChange={(e) => { setVerifyStatus(e.target.value); setPage(1); }}>
                {VERIFY_FILTER_OPTIONS.map(({ value, label }) => <option key={value || "all"} value={value}>{tText(label)}</option>)}
              </AdminFilterSelect>
              <AdminFilterSelect value={processingResult} onChange={(e) => { setProcessingResult(e.target.value); setPage(1); }}>
                {RESULT_FILTER_OPTIONS.map(({ value, label }) => <option key={value || "all"} value={value}>{tText(label)}</option>)}
              </AdminFilterSelect>
              <AdminFilterSelect value={reviewStatusFilter} onChange={(e) => { setReviewStatusFilter(e.target.value); setPage(1); }}>
                {REVIEW_FILTER_OPTIONS.map(({ value, label }) => <option key={value || "all"} value={value}>{tText(label)}</option>)}
              </AdminFilterSelect>
              <AdminFilterInput value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder={tText("事件ID / 失败原因 / 错误信息")} />
              <div className="flex gap-2 md:col-span-2 xl:col-span-1">
                <AdminFilterInput value={orderId} onChange={(e) => { setOrderId(e.target.value); setPage(1); }} placeholder={tText("订单ID")} />
                <AdminFilterButton onClick={() => { setProvider(""); setOrderId(""); setKeyword(""); setVerifyStatus(""); setProcessingResult(""); setReviewStatusFilter(""); setPage(1); }}><Tx>清空</Tx></AdminFilterButton>
              </div>
            </div>
          </>
        )}
      >
        <PaymentEventRiskSummary rows={rows} total={total} tText={tText} />
        <AnimatedTable
          loading={eventsQuery.isLoading && !eventsQuery.data}
          error={eventsQuery.isError && !eventsQuery.data}
          errorTitle={tText("支付事件加载失败")}
          errorDescription={tText("支付事件暂时没有加载成功，请检查网络或稍后重试。")}
          onRetry={() => { void eventsQuery.refetch(); }}
          rows={rows}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={10}
          emptyIcon={Radio}
          emptyTitle={tText("暂无支付事件")}
          emptyDescription={tText("当前筛选条件下没有回调或支付事件。")}
          className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName="min-w-[1280px] w-full text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={adminTableTheadRow(tableHeaders, COLUMN_ALIGNS)}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          renderMobileCard={renderMobileCard}
          renderRow={(row) => (
            <>
              <td className={adminTableCellClass("left", "max-w-[11rem]")}>
                <AdminTableCellGroup
                  maxWidth="10.5rem"
                  lines={[
                    { text: labelEventType(row.event_type) },
                    { text: row.provider_event_id || row.id, muted: true, mono: true },
                  ]}
                />
              </td>
              <td className={adminTableCellClass("left", "text-sm text-foreground")}>{localizedMapLabel(PROVIDER_LABELS, row.provider, tText)}</td>
              <td className={adminTableCellClass("left", "text-xs text-muted-foreground")}>{relatedBusinessLabel(row, tText)}</td>
              <td className={adminTableCellClass("center")}><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{localizedMapLabel(VERIFY_LABELS, row.verify_status, tText)}</span></td>
              <td className={adminTableCellClass("center")}><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{localizedMapLabel(RESULT_LABELS, row.processing_result, tText)}</span></td>
              <td className={adminTableCellClass("left", "max-w-[13rem]")}>
                <AdminTableCell
                  value={amountCheckText(row, tText)}
                  fullText={amountCheckText(row, tText)}
                  maxWidth="12rem"
                  className={row.failure_reason_code ? "text-red-500" : ""}
                />
              </td>
              <td className={adminTableCellClass("left", "max-w-[15rem]")}>
                <AdminTableCell
                  value={row.error_message || row.failure_reason_code || '-'}
                  fullText={row.error_message || row.failure_reason_code || ''}
                  maxWidth="14rem"
                  className="text-red-500"
                />
              </td>
              <td className={adminTableCellClass("center")}><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{tText(labelPaymentReviewStatus(row.review_status || "pending"))}</span></td>
              <td className={adminTableCellClass("left", "text-xs text-muted-foreground whitespace-nowrap")}>{formatDateTime(row.created_at)}</td>
              <td className={adminTableCellClass("right")}>
                <div className="flex justify-end gap-2">
                <UnifiedButton type="button" onClick={() => openReview(row)} disabled={reviewMutation.isPending} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-60">
                  <ShieldCheck size={14} />
                  <Tx>复核</Tx>
                </UnifiedButton>
                <UnifiedButton type="button" onClick={() => confirmReplay(row)} disabled={replayMutation.isPending} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-60">
                  {replayingEventId === row.id ? tText("处理中...") : <Tx>重新处理</Tx>}
                </UnifiedButton>
                </div>
              </td>
            </>
          )}
        />
        <AdminFormSheet
          open={!!reviewingRow}
          onOpenChange={(open) => {
            if (!open) {
              setReviewingRow(null);
              setReviewStatus("confirmed");
              setReviewNote("");
            }
          }}
          title={tText("支付事件复核")}
          description={reviewingRow ? `${tText("事件")}：${reviewingRow.provider_event_id || reviewingRow.id}` : undefined}
          submitText={tText("保存复核")}
          loading={reviewMutation.isPending}
          onSubmit={() => reviewMutation.mutateAsync()}
          size="sm"
        >
          <label className="block text-xs text-muted-foreground">
            <Tx>复核结果</Tx>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as PaymentReviewStatus)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {REVIEW_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{tText(option.label)}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">
            <Tx>复核备注</Tx>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder={tText("记录核对依据、失败原因或后续处理建议")}
            />
          </label>
        </AdminFormSheet>
      </AdminPageShell>
    </PermissionGate>
  );
}
