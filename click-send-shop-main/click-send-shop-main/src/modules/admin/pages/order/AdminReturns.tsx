import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import * as returnService from "@/services/admin/returnService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { ApproveReturnParams, ReturnDetail, ReturnRequest } from "@/types/return";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";

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

const TYPE_LABELS: Record<string, string> = {
  refund: "仅退款",
  return_refund: "退货退款",
  exchange: "换货",
  repair: "维修",
};

function money(value: unknown) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

function labelStatus(status?: string) {
  return status ? STATUS_LABELS[status] || status : "-";
}

function labelType(type?: string) {
  return type ? TYPE_LABELS[type] || type : "-";
}

type ReviewMode = "approve" | "reject";

export default function AdminReturns() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [adminRemark, setAdminRemark] = useState("");

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
      toast.success("售后申请已通过，订单与仪表盘会自动刷新");
      setReviewMode(null);
      setAdminRemark("");
      setRefundAmount("");
      await invalidateReturns();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "审核通过失败")),
  });

  const rejectMutation = useMutation({
    mutationFn: async (detail: ReturnDetail) => returnService.rejectReturn(detail.id, adminRemark.trim() || "售后申请未通过"),
    onSuccess: async () => {
      toast.success("售后申请已拒绝");
      setReviewMode(null);
      setAdminRemark("");
      await invalidateReturns();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "拒绝售后失败")),
  });

  const rows = returnsQuery.data?.list || [];
  const total = returnsQuery.data?.total || 0;
  const detail = detailQuery.data;

  const openReview = (mode: ReviewMode, row: ReturnRequest) => {
    setSelectedId(row.id);
    setReviewMode(mode);
    setRefundAmount(String(row.refund_amount || ""));
    setAdminRemark("");
  };

  return (
    <PermissionGate permission="order.return.manage">
      <div className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">售后管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">售后列表由 Query 缓存管理，审核后刷新订单、售后和仪表盘。</p>
          </div>
          <button type="button" onClick={() => void returnsQuery.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
            <RefreshCw size={16} className={returnsQuery.isFetching ? "animate-spin" : ""} />
            刷新
          </button>
        </div>

        <div className="mb-4 grid gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 md:grid-cols-[180px_1fr_auto]">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder="搜索订单号、原因、商品或用户信息" className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm" />
          </div>
          <button type="button" onClick={() => { setStatus(""); setKeyword(""); setPage(1); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">清空筛选</button>
        </div>

        <AnimatedTable
          loading={returnsQuery.isLoading}
          rows={rows}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={8}
          emptyIcon={RotateCcw}
          emptyTitle="暂无售后申请"
          emptyDescription="当前筛选条件下没有售后记录。"
          className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName="min-w-[1040px] w-full text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={<tr>{['申请', '订单', '类型', '原因', '退款金额', '状态', '创建时间', '操作'].map((head) => <th key={head} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{head}</th>)}</tr>}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          renderRow={(row) => (
            <>
              <td className="px-4 py-3 font-mono text-xs text-foreground">{row.id}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{row.order_no}</div>
                <div className="text-[11px] text-muted-foreground">{row.sku_code || row.product_id || '-'}</div>
              </td>
              <td className="px-4 py-3 text-sm">{labelType(row.type)}</td>
              <td className="max-w-[14rem] px-4 py-3 align-middle">
                <AdminTableCell
                  value={row.reason || row.description || '-'}
                  fullText={[row.reason, row.description].filter(Boolean).join('\n') || '-'}
                  maxWidth="13rem"
                  muted
                />
              </td>
              <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{money(row.refund_amount)}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{labelStatus(row.status)}</span></td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedId(row.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">详情</button>
                  <button type="button" onClick={() => openReview('approve', row)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">通过</button>
                  <button type="button" onClick={() => openReview('reject', row)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">拒绝</button>
                </div>
              </td>
            </>
          )}
        />

        <AdminResponsiveSheet
          open={!!selectedId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedId(null);
              setReviewMode(null);
            }
          }}
          title="售后详情"
          description={selectedId ?? undefined}
          size="lg"
          height="85vh"
        >
              {detailQuery.isLoading ? <p className="mt-2 text-sm text-muted-foreground">正在加载详情...</p> : null}
              {detail ? (
                <div className="mt-5 space-y-4 text-sm">
                  <div className="rounded-xl border border-border p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div><span className="text-muted-foreground">订单号：</span>{detail.order_no}</div>
                      <div><span className="text-muted-foreground">状态：</span>{labelStatus(detail.status)}</div>
                      <div><span className="text-muted-foreground">类型：</span>{labelType(detail.type)}</div>
                      <div><span className="text-muted-foreground">退款金额：</span>{money(detail.refund_amount)}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="font-medium text-foreground">申请原因</p>
                    <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{detail.reason || detail.description || '-'}</p>
                  </div>
                  {detail.operation_logs?.length ? (
                    <div className="rounded-xl border border-border p-4">
                      <p className="font-medium text-foreground">处理记录</p>
                      <div className="mt-3 space-y-2">
                        {detail.operation_logs.map((log) => (
                          <div key={log.id} className="rounded-lg bg-secondary/60 p-3 text-xs">
                            <div>{log.summary || log.result || '操作记录'}</div>
                            <div className="mt-1 text-muted-foreground">{formatDateTime(log.created_at)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {reviewMode ? (
                    <div className="rounded-xl border border-border p-4">
                      <p className="font-medium text-foreground">{reviewMode === 'approve' ? '通过售后' : '拒绝售后'}</p>
                      {reviewMode === 'approve' ? (
                        <label className="mt-3 block text-xs text-muted-foreground">
                          退款金额
                          <input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                        </label>
                      ) : null}
                      <label className="mt-3 block text-xs text-muted-foreground">
                        处理备注
                        <textarea value={adminRemark} onChange={(e) => setAdminRemark(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                      </label>
                      <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setReviewMode(null)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">取消</button>
                        <button
                          type="button"
                          onClick={() => reviewMode === 'approve' ? approveMutation.mutate(detail) : rejectMutation.mutate(detail)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          提交处理
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
        </AdminResponsiveSheet>
      </div>
    </PermissionGate>
  );
}
