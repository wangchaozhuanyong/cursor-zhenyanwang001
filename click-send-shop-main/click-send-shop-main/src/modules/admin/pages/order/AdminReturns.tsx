import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import AdminPageShell from "@/components/admin/AdminPageShell";
import {
  AdminFilterButton,
  AdminFilterSelect,
} from "@/components/admin/AdminFilterControls";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import Pagination from "@/components/admin/Pagination";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import * as returnService from "@/services/admin/returnService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { ApproveReturnParams, ReturnDetail, ReturnRequest } from "@/types/return";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { useLocalizedOptions } from "@/hooks/useLocalizedOptions";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import AdminRowActionsMenu from "@/components/admin/AdminRowActionsMenu";
import {
  adminTableCellClass,
  adminTableTheadRow,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "left", "left", "left", "right", "center", "left", "right",
];

const STATUS_LABELS: Record<string, string> = {
  pending: "待审核",
  need_evidence: "待补凭证",
  approved: "已通过",
  rejected: "已拒绝",
  processing: "处理中",
  waiting_return: "待寄回",
  return_in_transit: "退货在途",
  received: "已收货",
  refund_pending: "待退款",
  refunded: "已退款",
  exchange_shipping: "换货发出",
  completed: "已完成",
  cancelled: "已取消",
};

function money(value: unknown) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

type ReviewMode = "approve" | "reject";

const TABLE_HEADERS = ["申请", "订单", "类型", "原因", "退款金额", "状态", "创建时间", "操作"] as const;

export default function AdminReturns() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const canHandleReturn = useAdminPermissionStore((s) => s.can("return.handle"));
  const { returnType: labelReturnType } = useAdminDisplayLabel();
  const statusOptionsLocalized = useLocalizedOptions(
    Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  );
  const labelStatus = (status?: string) => {
    if (!status) return "-";
    const zh = STATUS_LABELS[status];
    return zh ? tText(zh) : status;
  };
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [adminRemark, setAdminRemark] = useState("");
  const [reviewBaseline, setReviewBaseline] = useState<{ refundAmount: string; adminRemark: string } | null>(null);

  const params = useMemo(() => ({
    page,
    pageSize,
    keyword: keyword.trim() || undefined,
    status: status || undefined,
  }), [keyword, page, pageSize, status]);

  const returnsQuery = useQuery({
    queryKey: [...adminQueryKeys.returnsRoot(), "list", params],
    queryFn: () => returnService.fetchReturnRequests(params),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const detailQuery = useQuery({
    queryKey: [...adminQueryKeys.returnsRoot(), "detail", selectedId],
    queryFn: () => returnService.fetchReturnById(selectedId as string),
    enabled: !!selectedId,
    staleTime: 30_000,
  });

  const invalidateReturns = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.returnsRoot() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
    ]);
  };

  const approveMutation = useMutation({
    mutationFn: async (detail: ReturnDetail) => {
      const payload: ApproveReturnParams = {
        refund_amount: Number(refundAmount || detail.refund_amount || 0),
        admin_remark: adminRemark.trim() || undefined,
        restore_inventory: true,
        rollback_points_rewards: true,
        refund_mode: "manual",
      };
      return returnService.approveReturn(detail.id, payload);
    },
    onSuccess: async () => {
      toast.success(tText("售后申请已通过，订单与仪表盘会自动刷新"));
      closeReviewPanel();
      await invalidateReturns();
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("审核通过失败"))),
  });

  const rejectMutation = useMutation({
    mutationFn: async (detail: ReturnDetail) => returnService.rejectReturn(detail.id, adminRemark.trim() || tText("售后申请未通过")),
    onSuccess: async () => {
      toast.success(tText("售后申请已拒绝"));
      closeReviewPanel();
      await invalidateReturns();
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("拒绝售后失败"))),
  });

  const rows = returnsQuery.data?.list || [];
  const total = returnsQuery.data?.total || 0;
  const detail = detailQuery.data;
  const reviewDirty = Boolean(
    reviewMode
      && reviewBaseline
      && (refundAmount !== reviewBaseline.refundAmount || adminRemark !== reviewBaseline.adminRemark),
  );
  useAdminTabDirty(reviewDirty);

  const closeReviewPanel = () => {
    setReviewMode(null);
    setRefundAmount("");
    setAdminRemark("");
    setReviewBaseline(null);
  };

  const openReview = (mode: ReviewMode, row: ReturnRequest) => {
    setSelectedId(row.id);
    setReviewMode(mode);
    const nextRefundAmount = String(row.refund_amount || "");
    setRefundAmount(nextRefundAmount);
    setAdminRemark("");
    setReviewBaseline({ refundAmount: nextRefundAmount, adminRemark: "" });
  };

  const confirmSubmitReview = (detail: ReturnDetail) => {
    if (!reviewMode) return;
    const approving = reviewMode === "approve";
    const amount = Number(refundAmount || detail.refund_amount || 0);
    if (approving && (!Number.isFinite(amount) || amount < 0)) {
      toast.error(tText("退款金额不正确，请重新填写"));
      return;
    }
    confirm({
      title: approving ? tText("确认通过售后") : tText("确认拒绝售后"),
      description: approving
        ? tText(`确定通过该售后申请并记录退款金额 RM ${amount.toFixed(2)} 吗？审核后订单、售后和仪表盘会刷新。`)
        : tText("确定拒绝该售后申请吗？请确认处理备注已经填写清楚。"),
      confirmText: approving ? tText("确认通过") : tText("确认拒绝"),
      danger: !approving,
      onConfirm: async () => {
        if (approving) await approveMutation.mutateAsync(detail);
        else await rejectMutation.mutateAsync(detail);
      },
    });
  };

  const renderMobileCard = (row: ReturnRequest) => (
    <AdminTableMobileCard>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{row.order_no}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{row.id}</p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{labelStatus(row.status)}</span>
      </div>
      <div className="space-y-2">
        <AdminTableMobileCardField label={tText("类型")}>{labelReturnType(row.type)}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("退款")}><span className="font-semibold">{money(row.refund_amount)}</span></AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("原因")}><span className="text-xs text-muted-foreground line-clamp-2">{row.reason || row.description || "-"}</span></AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("时间")}><span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span></AdminTableMobileCardField>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        <UnifiedButton type="button" onClick={() => setSelectedId(row.id)} className="touch-manipulation rounded-lg border border-border px-3 py-1.5 text-xs"><Tx>详情</Tx></UnifiedButton>
        {canHandleReturn ? (
          <>
            <UnifiedButton type="button" onClick={() => openReview("approve", row)} className="touch-manipulation rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"><Tx>通过</Tx></UnifiedButton>
            <UnifiedButton type="button" onClick={() => openReview("reject", row)} className="touch-manipulation rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"><Tx>拒绝</Tx></UnifiedButton>
          </>
        ) : null}
      </div>
    </AdminTableMobileCard>
  );

  return (
    <PermissionGate anyOf={["return.view", "return.handle"]} mode="page">
      <AdminPageShell
          hint={<Tx>售后列表由 Query 缓存管理，审核后刷新订单、售后和仪表盘。</Tx>}
          toolbar={(
            <UnifiedButton type="button" onClick={() => void returnsQuery.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
              <RefreshCw size={16} className={returnsQuery.isFetching ? "animate-spin" : ""} />
              <Tx>刷新</Tx>
            </UnifiedButton>
          )}
          filters={(
        <div className="grid gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 md:grid-cols-[180px_1fr_auto]">
          <AdminFilterSelect value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value=""><Tx>全部状态</Tx></option>
            {statusOptionsLocalized.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </AdminFilterSelect>
          <AdminSearchInput value={keyword} onChange={(value) => { setKeyword(value); setPage(1); }} placeholder={tText("搜索订单号、原因、商品或用户信息")} />
          <AdminFilterButton onClick={() => { setStatus(""); setKeyword(""); setPage(1); }}><Tx>清空筛选</Tx></AdminFilterButton>
        </div>
          )}
        >
        <AnimatedTable
          loading={returnsQuery.isLoading && !returnsQuery.data}
          error={returnsQuery.isError && !returnsQuery.data}
          errorTitle={tText("售后列表加载失败")}
          errorDescription={tText("售后数据暂时没有加载成功，请检查网络或稍后重试。")}
          onRetry={() => { void returnsQuery.refetch(); }}
          rows={rows}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={8}
          emptyIcon={RotateCcw}
          emptyTitle={tText("暂无售后申请")}
          emptyDescription={tText("当前筛选条件下没有售后记录。")}
          className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName="min-w-[1040px] w-full text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={adminTableTheadRow(TABLE_HEADERS.map((h) => tText(h)), COLUMN_ALIGNS)}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          renderMobileCard={renderMobileCard}
          renderRow={(row) => (
            <>
              <td className={adminTableCellClass("left", "font-mono text-xs text-foreground")}>{row.id}</td>
              <td className={adminTableCellClass("left")}>
                <div className="font-medium text-foreground">{row.order_no}</div>
                <div className="text-[11px] text-muted-foreground">{row.sku_code || row.product_id || '-'}</div>
              </td>
              <td className={adminTableCellClass("left", "text-sm")}>{labelReturnType(row.type)}</td>
              <td className={adminTableCellClass("left", "max-w-[14rem]")}>
                <AdminTableCell
                  value={row.reason || row.description || '-'}
                  fullText={[row.reason, row.description].filter(Boolean).join('\n') || '-'}
                  maxWidth="13rem"
                  muted
                />
              </td>
              <td className={adminTableCellClass("right", "font-semibold text-foreground whitespace-nowrap")}>{money(row.refund_amount)}</td>
              <td className={adminTableCellClass("center")}><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{labelStatus(row.status)}</span></td>
              <td className={adminTableCellClass("left", "text-xs text-muted-foreground whitespace-nowrap")}>{formatDateTime(row.created_at)}</td>
              <td className={adminTableCellClass("right")}>
                <AdminRowActionsMenu
                  primary={(
                    <UnifiedButton
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className="inline-flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      <Tx>详情</Tx>
                    </UnifiedButton>
                  )}
                  moreLabel={<Tx>更多</Tx>}
                  items={[
                    ...(canHandleReturn ? ([
                      {
                        key: "approve",
                        label: <Tx>通过</Tx>,
                        onClick: () => openReview("approve", row),
                      },
                      {
                        key: "reject",
                        label: <Tx>拒绝</Tx>,
                        danger: true,
                        onClick: () => openReview("reject", row),
                      },
                    ] as const) : []),
                  ]}
                />
              </td>
            </>
          )}
        />

        <AdminResponsiveSheet
          open={!!selectedId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedId(null);
              closeReviewPanel();
            }
          }}
          title={tText("售后详情")}
          description={selectedId ?? undefined}
          size="lg"
          height="85vh"
        >
              {detailQuery.isLoading ? <p className="mt-2 text-sm text-muted-foreground"><Tx>正在加载详情...</Tx></p> : null}
              {detail ? (
                <div className="mt-5 space-y-4 text-sm">
                  <div className="rounded-xl border border-border p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div><span className="text-muted-foreground"><Tx>订单号：</Tx></span>{detail.order_no}</div>
                      <div><span className="text-muted-foreground"><Tx>状态：</Tx></span>{labelStatus(detail.status)}</div>
                      <div><span className="text-muted-foreground"><Tx>类型：</Tx></span>{labelReturnType(detail.type)}</div>
                      <div><span className="text-muted-foreground"><Tx>退款金额：</Tx></span>{money(detail.refund_amount)}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="font-medium text-foreground"><Tx>申请原因</Tx></p>
                    <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{detail.reason || detail.description || '-'}</p>
                  </div>
                  {detail.operation_logs?.length ? (
                    <div className="rounded-xl border border-border p-4">
                      <p className="font-medium text-foreground"><Tx>处理记录</Tx></p>
                      <div className="mt-3 space-y-2">
                        {detail.operation_logs.map((log) => (
                          <div key={log.id} className="rounded-lg bg-secondary/60 p-3 text-xs">
                            <div>{log.summary || log.result || tText("操作记录")}</div>
                            <div className="mt-1 text-muted-foreground">{formatDateTime(log.created_at)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {reviewMode ? (
                    <div className="rounded-xl border border-border p-4">
                      <p className="font-medium text-foreground">{reviewMode === "approve" ? tText("通过售后") : tText("拒绝售后")}</p>
                      {reviewMode === "approve" ? (
                        <label className="mt-3 block text-xs text-muted-foreground">
                          <Tx>退款金额</Tx>
                          <input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                        </label>
                      ) : null}
                      <label className="mt-3 block text-xs text-muted-foreground">
                        <Tx>处理备注</Tx>
                        <textarea value={adminRemark} onChange={(e) => setAdminRemark(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                      </label>
                      <div className="mt-4 flex justify-end gap-2">
                        <UnifiedButton type="button" onClick={closeReviewPanel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"><Tx>取消</Tx></UnifiedButton>
                        <UnifiedButton
                          type="button"
                          onClick={() => confirmSubmitReview(detail)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {approveMutation.isPending || rejectMutation.isPending ? tText("处理中...") : <Tx>提交处理</Tx>}
                        </UnifiedButton>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
        </AdminResponsiveSheet>
      </AdminPageShell>
    </PermissionGate>
  );
}
