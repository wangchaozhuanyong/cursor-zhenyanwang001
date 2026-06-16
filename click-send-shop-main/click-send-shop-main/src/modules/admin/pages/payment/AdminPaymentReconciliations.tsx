import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import PermissionGate from "@/components/admin/PermissionGate";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import Pagination from "@/components/admin/Pagination";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import {
  AdminFilterButton,
  AdminFilterSelect,
} from "@/components/admin/AdminFilterControls";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import type { PaymentReconciliationRow, PaymentReviewStatus } from "@/types/adminPayment";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  labelChannelCode,
  labelPaymentReviewStatus,
  labelProvider,
  labelReconciliationStatus,
  PAYMENT_CHANNEL_FILTER_OPTIONS,
  PAYMENT_PROVIDER_FILTER_OPTIONS,
} from "@/utils/paymentAdminLabels";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminT } from "@/hooks/useAdminT";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import {
  adminTableHeadCellClass,
  adminTdClassName,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";

const RECONCILIATION_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "left", "left", "right", "right", "right", "right", "right", "center", "center", "right",
];
const RECONCILIATION_HEADERS = ["日期", "支付网关", "支付渠道", "笔数", "系统实收", "网关实收", "手续费", "差异", "状态", "复核", "操作"] as const;

type PaymentReconciliationReviewStatus = Extract<PaymentReviewStatus, "confirmed" | "needs_followup" | "rejected" | "ignored">;

const RECON_REVIEW_STATUS_OPTIONS: Array<{ value: PaymentReconciliationReviewStatus; label: string }> = [
  { value: "confirmed", label: "已确认" },
  { value: "needs_followup", label: "需跟进" },
  { value: "rejected", label: "已驳回" },
  { value: "ignored", label: "已忽略" },
];
const RECON_STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "全部对账状态" },
  { value: "draft", label: "草稿" },
  { value: "matched", label: "已匹配" },
  { value: "needs_review", label: "需复核" },
  { value: "confirmed", label: "已确认" },
  { value: "closed", label: "已关闭" },
];
const RECON_REVIEW_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "全部复核状态" },
  { value: "pending", label: "待复核" },
  { value: "needs_review", label: "需复核" },
  { value: "confirmed", label: "已复核" },
  { value: "needs_followup", label: "需跟进" },
  { value: "rejected", label: "已驳回" },
  { value: "ignored", label: "已忽略" },
];

function rm(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return `RM ${Number(value || 0).toFixed(2)}`;
}

function hasDiff(row: PaymentReconciliationRow) {
  return Math.abs(Number(row.diff_amount || 0)) >= 0.01;
}

function reconciliationNeedsReview(row: PaymentReconciliationRow) {
  return row.status === "needs_review" || !row.review_status || row.review_status === "pending" || row.review_status === "needs_review";
}

function PaymentReconciliationRiskSummary({
  rows,
  total,
  tText,
}: {
  rows: PaymentReconciliationRow[];
  total: number;
  tText: (zh: string) => string;
}) {
  const diffRows = rows.filter(hasDiff);
  const pendingReview = rows.filter(reconciliationNeedsReview).length;
  const missingReason = diffRows.filter((row) => !String(row.difference_reason || "").trim()).length;
  const diffTotal = diffRows.reduce((sum, row) => sum + Math.abs(Number(row.diff_amount || 0)), 0);
  const confirmed = rows.filter((row) => row.review_status === "confirmed" || row.status === "confirmed").length;
  const cards = [
    { label: tText("当前筛选总数"), value: String(total), tone: "text-foreground" },
    { label: tText("待复核"), value: String(pendingReview), tone: pendingReview ? "text-amber-600" : "text-muted-foreground" },
    { label: tText("有差异记录"), value: String(diffRows.length), tone: diffRows.length ? "text-red-600" : "text-muted-foreground" },
    { label: tText("差异绝对值"), value: rm(diffTotal), tone: diffTotal >= 0.01 ? "text-red-600" : "text-muted-foreground" },
    { label: tText("差异未写原因"), value: String(missingReason), tone: missingReason ? "text-amber-600" : "text-muted-foreground" },
    { label: tText("已确认"), value: String(confirmed), tone: "text-emerald-600" },
  ];
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className={`mt-1 text-xl font-semibold ${card.tone}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminPaymentReconciliations() {
  const { tText } = useAdminT();
  const reconciliationsEmptyGuide = useLocalizedAdminEmptyGuide(ADMIN_EMPTY_GUIDES.paymentReconciliations);
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [listProvider, setListProvider] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [listReviewStatus, setListReviewStatus] = useState("");
  const [reconcileDate, setReconcileDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [provider, setProvider] = useState("stripe");
  const [channelCode, setChannelCode] = useState("");
  const [diffAmount, setDiffAmount] = useState("");
  const [providerReportAmount, setProviderReportAmount] = useState("");
  const [providerReference, setProviderReference] = useState("");
  const [differenceReason, setDifferenceReason] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewingRow, setReviewingRow] = useState<PaymentReconciliationRow | null>(null);
  const [reviewStatus, setReviewStatus] = useState<PaymentReconciliationReviewStatus>("confirmed");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewDifferenceReason, setReviewDifferenceReason] = useState("");

  const queryParams = useMemo(
    () => {
      const next: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (listProvider) next.provider = listProvider;
      if (listStatus) next.status = listStatus;
      if (listReviewStatus) next.reviewStatus = listReviewStatus;
      return next;
    },
    [listProvider, listReviewStatus, listStatus, page, pageSize],
  );

  const listQuery = useQuery({
    queryKey: adminQueryKeys.paymentReconciliations(queryParams),
    queryFn: () => paymentAdmin.fetchAdminPaymentReconciliations(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const list = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading && !listQuery.data;

  const createMutation = useMutation({
    mutationFn: () =>
      paymentAdmin.createAdminPaymentReconciliation({
        reconcile_date: reconcileDate,
        provider,
        channel_code: channelCode.trim() || undefined,
        diff_amount: diffAmount.trim() ? Number(diffAmount) : undefined,
        provider_report_amount: providerReportAmount.trim() ? Number(providerReportAmount) : undefined,
        provider_reference: providerReference.trim() || undefined,
        difference_reason: differenceReason.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success(tText("已创建对账草稿"));
      setNotes("");
      setDiffAmount("");
      setProviderReportAmount("");
      setProviderReference("");
      setDifferenceReason("");
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentReconciliationsRoot() });
    },
    onError: (e) => toast.error(toastErrorMessage(e, tText("创建失败"))),
  });

  const create = () => createMutation.mutate();

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!reviewingRow) return;
      await paymentAdmin.reviewAdminPaymentReconciliation(reviewingRow.id, {
        review_status: reviewStatus,
        review_notes: reviewNotes.trim(),
        difference_reason: reviewDifferenceReason.trim(),
      });
    },
    onSuccess: async () => {
      toast.success(tText("对账复核已保存"));
      setReviewingRow(null);
      setReviewStatus("confirmed");
      setReviewNotes("");
      setReviewDifferenceReason("");
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentReconciliationsRoot() });
    },
    onError: (e) => toast.error(toastErrorMessage(e, tText("复核失败"))),
  });

  const openReview = (row: PaymentReconciliationRow) => {
    setReviewingRow(row);
    setReviewStatus("confirmed");
    setReviewNotes(row.review_notes || "");
    setReviewDifferenceReason(row.difference_reason || "");
  };

  const renderMobileCard = (r: PaymentReconciliationRow) => (
    <AdminTableMobileCard>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{r.reconcile_date}</p>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{tText(labelReconciliationStatus(r.status))}</span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{tText(labelProvider(r.provider))}</span>
        {r.channel_code ? <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{tText(labelChannelCode(r.channel_code))}</span> : null}
      </div>
      <div className="space-y-2">
        <AdminTableMobileCardField label={tText("笔数")}>
          <span className="text-xs text-muted-foreground">{r.order_count}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("成功金额")}>
          <span className="text-sm font-semibold text-[var(--theme-price)]">{rm(r.success_amount)}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("网关实收")}>
          <span className="text-xs text-muted-foreground">{rm(r.provider_report_amount)}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("预计结算")}>
          <span className="text-xs text-muted-foreground">{rm(r.expected_settlement_amount)}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("差异")}>
          <span className={Math.abs(Number(r.diff_amount || 0)) >= 0.01 ? "text-xs text-red-500" : "text-xs text-muted-foreground"}>{rm(r.diff_amount)}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("复核")}>
          <span className="text-xs text-muted-foreground">{tText(labelPaymentReviewStatus(r.review_status || "pending"))}</span>
        </AdminTableMobileCardField>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <UnifiedButton type="button" onClick={() => openReview(r)} className="inline-flex touch-manipulation w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary">
          <ShieldCheck size={14} />
          <Tx>复核</Tx>
        </UnifiedButton>
      </div>
    </AdminTableMobileCard>
  );

  return (
    <PermissionGate permission="payment.manage">
      <AdminPageShell
        hint={<Tx>按日 / 渠道汇总实收与差异（手续费来自渠道 JSON 配置）</Tx>}
        filters={(
          <>
            <PaymentAdminSubnav />
            <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[180px_180px_180px_auto]">
              <AdminFilterSelect value={listProvider} onChange={(e) => { setListProvider(e.target.value); setPage(1); }}>
                {PAYMENT_PROVIDER_FILTER_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>{tText(option.value ? option.label : "全部支付网关")}</option>
                ))}
              </AdminFilterSelect>
              <AdminFilterSelect value={listStatus} onChange={(e) => { setListStatus(e.target.value); setPage(1); }}>
                {RECON_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>{tText(option.label)}</option>
                ))}
              </AdminFilterSelect>
              <AdminFilterSelect value={listReviewStatus} onChange={(e) => { setListReviewStatus(e.target.value); setPage(1); }}>
                {RECON_REVIEW_FILTER_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>{tText(option.label)}</option>
                ))}
              </AdminFilterSelect>
              <AdminFilterButton onClick={() => { setListProvider(""); setListStatus(""); setListReviewStatus(""); setPage(1); }}>
                <Tx>清空筛选</Tx>
              </AdminFilterButton>
            </div>
          </>
        )}
      >
        <PaymentReconciliationRiskSummary rows={list} total={total} tText={tText} />
        <div className="theme-rounded mb-6 border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <h2 className="mb-3 text-sm font-semibold text-foreground"><Tx>新建对账草稿</Tx></h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-muted-foreground"><Tx>
              对账日期
              </Tx><div className="mt-1">
                <SegmentedDateInput
                  value={reconcileDate}
                  onChange={setReconcileDate}
                  className="w-full [&>div]:border-border [&>div]:bg-background"
                />
              </div>
            </label>
            <label className="text-xs text-muted-foreground"><Tx>
              支付网关
              </Tx><select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {PAYMENT_PROVIDER_FILTER_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>
                    {tText(o.label)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground"><Tx>
              支付渠道（可选）
              </Tx><select
                value={channelCode}
                onChange={(e) => setChannelCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {PAYMENT_CHANNEL_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || "any"} value={o.value}>
                    {tText(o.label)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground"><Tx>
              差异金额（可选）
              </Tx><input
                value={diffAmount}
                onChange={(e) => setDiffAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
            <label className="text-xs text-muted-foreground"><Tx>
              网关账单实收（可选）
              </Tx><input
                value={providerReportAmount}
                onChange={(e) => setProviderReportAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
            <label className="text-xs text-muted-foreground"><Tx>
              网关参考号（可选）
              </Tx><input
                value={providerReference}
                onChange={(e) => setProviderReference(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Billplz / FPX statement ref"
              />
            </label>
            <label className="text-xs text-muted-foreground lg:col-span-2"><Tx>
              差异原因（可选）
              </Tx><input
                value={differenceReason}
                onChange={(e) => setDifferenceReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder={tText("例如：手续费未入账、跨日到账、渠道退款")}
              />
            </label>
          </div>
          <label className="mt-3 block text-xs text-muted-foreground"><Tx>
            备注
            </Tx><input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <UnifiedButton
            type="button"
            onClick={() =>
              confirm({ title: tText("确认创建"),
                description: tText(`确定创建 ${reconcileDate} 的对账草稿？`),
                confirmText: tText("创建"),
                onConfirm: () => create(),
              })
            }
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--theme-price)] px-5 py-2.5 text-sm font-semibold btn-theme-gradient"
          >
            <Plus size={16} /><Tx> 创建草稿
          </Tx></UnifiedButton>
        </div>

        <AnimatedTable
          loading={loading}
          rows={list}
          rowKey={(r) => r.id}
          skeletonRows={8}
          skeletonCols={11}
          className="theme-rounded border border-[var(--theme-border)] overflow-x-auto"
          tableClassName="w-full min-w-[1180px] text-left text-sm"
          theadClassName="bg-secondary/50 text-xs text-muted-foreground"
          thead={(
            <tr>
              {RECONCILIATION_HEADERS.map((label, index) => (
                <th key={label} className={adminTableHeadCellClass(RECONCILIATION_COLUMN_ALIGNS[index], "px-3 py-2")}>
                  <Tx>{label}</Tx>
                </th>
              ))}
            </tr>
          )}
          footer={<Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={() => {}} showPageSizeSelect={false} />}
          emptyIcon={reconciliationsEmptyGuide.icon}
          emptyTitle={reconciliationsEmptyGuide.title}
          emptyDescription={reconciliationsEmptyGuide.description}
          emptyAction={<AdminEmptyGuideActions guide={reconciliationsEmptyGuide} />}
          renderMobileCard={renderMobileCard}
          renderRow={(r) => (
            <>
              <td className={adminTdClassName("px-3 py-2", "left")}>{r.reconcile_date}</td>
              <td className={adminTdClassName("px-3 py-2", "left")}>{tText(labelProvider(r.provider))}</td>
              <td className={adminTdClassName("px-3 py-2", "left")}>{r.channel_code ? tText(labelChannelCode(r.channel_code)) : "—"}</td>
              <td className={adminTdClassName("px-3 py-2", "right")}>{r.order_count}</td>
              <td className={adminTdClassName("px-3 py-2", "right")}>{rm(r.success_amount)}</td>
              <td className={adminTdClassName("px-3 py-2", "right")}>{rm(r.provider_report_amount)}</td>
              <td className={adminTdClassName("px-3 py-2", "right")}>{rm(r.provider_fee_amount)}</td>
              <td className={adminTdClassName(Math.abs(Number(r.diff_amount || 0)) >= 0.01 ? "px-3 py-2 text-red-500" : "px-3 py-2", "right")}>{rm(r.diff_amount)}</td>
              <td className={adminTdClassName("px-3 py-2", "center")}>{tText(labelReconciliationStatus(r.status))}</td>
              <td className={adminTdClassName("px-3 py-2", "center")}>{tText(labelPaymentReviewStatus(r.review_status || "pending"))}</td>
              <td className={adminTdClassName("px-3 py-2", "right")}>
                <UnifiedButton type="button" onClick={() => openReview(r)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                  <ShieldCheck size={14} />
                  <Tx>复核</Tx>
                </UnifiedButton>
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
              setReviewNotes("");
              setReviewDifferenceReason("");
            }
          }}
          title={tText("对账人工复核")}
          description={reviewingRow ? [
            reviewingRow.reconcile_date,
            tText(labelProvider(reviewingRow.provider)),
          ].filter(Boolean).join(" · ") : undefined}
          submitText={tText("保存复核")}
          loading={reviewMutation.isPending}
          onSubmit={() => reviewMutation.mutateAsync()}
          size="sm"
        >
          <label className="block text-xs text-muted-foreground">
            <Tx>复核结果</Tx>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as PaymentReconciliationReviewStatus)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {RECON_REVIEW_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{tText(option.label)}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">
            <Tx>差异原因</Tx>
            <textarea
              value={reviewDifferenceReason}
              onChange={(e) => setReviewDifferenceReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder={tText("记录手续费、跨日、退款或网关账单差异原因")}
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            <Tx>复核备注</Tx>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder={tText("记录人工核对依据")}
            />
          </label>
        </AdminFormSheet>
      </AdminPageShell>
    </PermissionGate>
  );
}
