/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Eye, CheckCircle, XCircle, Search, RotateCcw } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import { toast } from "sonner";
import Pagination from "@/components/admin/Pagination";
import * as returnService from "@/services/admin/returnService";
import PermissionGate from "@/components/admin/PermissionGate";
import { Tx } from "@/components/admin/AdminText";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  RETURN_STATUS,
  RETURN_STATUS_FILTER_OPTIONS,
  getReturnStatusBadgeClass,
  getReturnStatusLabel,
} from "@/constants/statusDictionary";
import { internalIdTitle, labelReturnType } from "@/utils/adminDisplayLabels";

export default function AdminReturns() {
  const { confirm } = useAdminConfirm();
  const [returns, setReturns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  /** 关键词变化时须先回到第 1 页，且要在 loadData 的 effect 之前完成，避免仍用旧 page 请求 */
  useLayoutEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (filter !== "all") params.status = filter;
      if (debouncedSearch) params.keyword = debouncedSearch;
      const p = await returnService.fetchReturnRequests(params as any);
      setReturns(p.list);
      setTotal(p.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载数据失败"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filter, debouncedSearch]);

  useEffect(() => { void loadData(); }, [loadData]);

  const paginatedData = returns;

  const runAction = (id: string, action: "approve" | "reject") => {
    const promise = action === "approve"
      ? returnService.approveReturn(id)
      : returnService.rejectReturn(id, "管理员拒绝");

    promise
      .then(() => {
        toast.success(`售后 ${id.slice(0, 8)}… 已${action === "approve" ? "通过" : "拒绝"}`);
        setDetail(null);
        void loadData();
      })
      .catch((e) => toast.error(toastErrorMessage(e, "操作失败")));
  };

  const handleAction = (id: string, action: "approve" | "reject") => {
    confirm({
      title: action === "approve" ? "确认通过" : "确认拒绝",
      description: action === "approve" ? "确定通过该售后申请？" : "确定拒绝该售后申请？",
      confirmText: action === "approve" ? "通过" : "拒绝",
      danger: action === "reject",
      onConfirm: () => runAction(id, action),
    });
  };

  return (
    <div className="space-y-6" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground"><Tx>退款/售后管理</Tx></h1>
          <p className="text-sm text-muted-foreground"><Tx>处理用户退货退款申请</Tx></p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {returns.filter((r) => r.status === RETURN_STATUS.PENDING).length} 待处理
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-h-[44px] w-full items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 sm:w-auto sm:min-w-[240px]">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            placeholder="搜索售后单号 / 订单号"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RETURN_STATUS_FILTER_OPTIONS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key ? "bg-gold text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 移动端：卡片 */}
      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <div className="space-y-2">
                <div className="skeleton-base skeleton-shimmer h-3 w-24 rounded" />
                <div className="skeleton-base skeleton-shimmer h-4 w-32 rounded" />
                <div className="skeleton-base skeleton-shimmer h-10 w-full rounded-xl" />
              </div>
            </div>
          ))
          : null}
        {!loading && paginatedData.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gold" title={internalIdTitle(r.id, "售后内部编号")}>
                  {r.order_no || "无订单号"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  申请 {new Date(r.created_at).toLocaleString("zh-CN")}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getReturnStatusBadgeClass(r.status)}`}>
                {getReturnStatusLabel(r.status)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${r.type === "refund" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                {labelReturnType(r.type)}
              </span>
              <span className="font-semibold text-gold">{r.refund_amount ? `RM ${parseFloat(r.refund_amount).toFixed(2)}` : "—"}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.reason || "—"}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString("zh-CN")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setDetail(r)} className="touch-manipulation flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl border border-border py-2 text-sm">
                <Eye size={16} /><Tx> 详情
              </Tx></button>
              {r.status === RETURN_STATUS.PENDING && (
                <PermissionGate permission="return.handle">
                  <>
                    <button type="button" onClick={() => handleAction(r.id, "approve")} className="touch-manipulation min-h-[44px] flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-medium text-white"><Tx>
                      通过
                    </Tx></button>
                    <button type="button" onClick={() => handleAction(r.id, "reject")} className="touch-manipulation min-h-[44px] flex-1 rounded-xl border border-red-500/50 py-2 text-sm font-medium text-red-600"><Tx>
                      拒绝
                    </Tx></button>
                  </>
                </PermissionGate>
              )}
            </div>
          </div>
        ))}
        {!loading && paginatedData.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground"><Tx>暂无售后记录</Tx></div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <div className="hidden md:block">
        <AnimatedTable
          loading={loading}
          rows={paginatedData}
          rowKey={(r) => r.id}
          skeletonRows={8}
          skeletonCols={8}
          className="overflow-hidden rounded-2xl border border-border bg-card"
          tableClassName="w-full min-w-[900px] text-sm"
          theadClassName="border-b border-border bg-secondary/50"
          thead={(
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>申请日期</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>关联订单</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>类型</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>退款金额</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>原因</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>状态</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>申请时间</Tx></th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground"><Tx>操作</Tx></th>
            </tr>
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          emptyIcon={RotateCcw}
          emptyTitle="暂无售后记录"
          renderRow={(r) => (
            <>
              <td className="px-4 py-3 text-xs text-muted-foreground" title={internalIdTitle(r.id, "售后内部编号")}>
                {new Date(r.created_at).toLocaleDateString("zh-CN")}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gold">{r.order_no || "—"}</td>
              <td className="px-4 py-3">
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${r.type === "refund" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                  {labelReturnType(r.type)}
                </span>
              </td>
              <td className="px-4 py-3 font-semibold text-gold">{r.refund_amount ? `RM ${parseFloat(r.refund_amount).toFixed(2)}` : "—"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate">{r.reason}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getReturnStatusBadgeClass(r.status)}`}>
                  {getReturnStatusLabel(r.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString("zh-CN")}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <button type="button" onClick={() => setDetail(r)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <Eye size={14} />
                  </button>
                  {r.status === RETURN_STATUS.PENDING && (
                    <PermissionGate permission="return.handle">
                      <>
                        <button type="button" onClick={() => handleAction(r.id, "approve")} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                          <CheckCircle size={14} />
                        </button>
                        <button type="button" onClick={() => handleAction(r.id, "reject")} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <XCircle size={14} />
                        </button>
                      </>
                    </PermissionGate>
                  )}
                </div>
              </td>
            </>
          )}
        />
      </div>
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground"><Tx>售后详情</Tx></h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getReturnStatusBadgeClass(detail.status)}`}>
                {getReturnStatusLabel(detail.status)}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground"><Tx>关联订单</Tx></span><span className="text-gold">{detail.order_no || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground"><Tx>类型</Tx></span><span>{labelReturnType(detail.type)}</span></div>
              {detail.refund_amount && <div className="flex justify-between"><span className="text-muted-foreground"><Tx>退款金额</Tx></span><span className="font-bold text-gold">RM {parseFloat(detail.refund_amount).toFixed(2)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground"><Tx>原因</Tx></span><span>{detail.reason}</span></div>
              {detail.description && <div><span className="text-muted-foreground text-xs"><Tx>描述：</Tx></span><p className="text-xs mt-1">{detail.description}</p></div>}
              {detail.admin_remark && <div><span className="text-muted-foreground text-xs"><Tx>管理员备注：</Tx></span><p className="text-xs mt-1">{detail.admin_remark}</p></div>}
              {Array.isArray(detail.images) && detail.images.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs"><Tx>凭证图片</Tx></span>
                  <div className="flex gap-2 mt-1">
                    {detail.images.map((img: string, i: number) => (
                      <img key={i} src={img} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {detail.status === RETURN_STATUS.PENDING && (
              <PermissionGate permission="return.handle">
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => handleAction(detail.id, "approve")} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white"><Tx>通过</Tx></button>
                  <button type="button" onClick={() => handleAction(detail.id, "reject")} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white"><Tx>拒绝</Tx></button>
                </div>
              </PermissionGate>
            )}
            <button onClick={() => setDetail(null)} className="w-full rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:bg-secondary"><Tx>关闭</Tx></button>
          </div>
        </div>
      )}
    </div>
  );
}
