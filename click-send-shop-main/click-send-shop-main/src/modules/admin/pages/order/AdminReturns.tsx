import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import * as returnService from "@/services/admin/returnService";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import { toastErrorMessage } from "@/utils/errorMessage";
import { RETURN_STATUS, RETURN_STATUS_FILTER_OPTIONS, getReturnStatusBadgeClass, getReturnStatusLabel } from "@/constants/statusDictionary";
import type { ApproveReturnParams, ReturnRequest } from "@/types/return";

type ReturnDetail = ReturnRequest & {
  order_info?: { total_amount?: number; payment_status?: string; status?: string };
  item_info?: { product_name?: string; sku_code?: string; request_qty?: number };
  refund_records?: Array<{ id: string; event_type: string; processing_result: string; created_at: string }>;
  inventory_restore_records?: Array<{ id: string; quantity_delta: number; created_at: string }>;
  operation_logs?: Array<{ id: string; summary?: string; created_at: string; result?: string }>;
};

const defaultApproveForm: ApproveReturnParams = {
  refund_amount: 0,
  admin_remark: "",
  refund_mode: "none",
  restore_stock: false,
  restore_coupon: false,
  reverse_points: false,
  reverse_rewards: false,
};

export default function AdminReturns() {
  const [list, setList] = useState<ReturnRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  const [detail, setDetail] = useState<ReturnDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [approveTarget, setApproveTarget] = useState<ReturnDetail | null>(null);
  const [approveForm, setApproveForm] = useState<ApproveReturnParams>(defaultApproveForm);
  const [rejectTarget, setRejectTarget] = useState<ReturnDetail | null>(null);
  const [rejectRemark, setRejectRemark] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await returnService.fetchReturnRequests({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        status: status === "all" ? undefined : status,
      } as any);
      setList(res.list);
      setTotal(res.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载售后列表失败"));
    } finally {
      setLoading(false);
    }
  }, [keyword, page, pageSize, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await returnService.fetchReturnById(id);
      setDetail(data as ReturnDetail);
      return data as ReturnDetail;
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载售后详情失败"));
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openApprove = async (row: ReturnRequest) => {
    const d = await fetchDetail(row.id);
    if (!d) return;
    const orderTotal = Number(d.order_info?.total_amount || 0);
    setApproveTarget(d);
    setApproveForm({
      ...defaultApproveForm,
      refund_amount: Math.max(0, Number(d.refund_amount || 0)),
      admin_remark: d.admin_remark || "",
      refund_mode: orderTotal > 0 ? "manual" : "none",
    });
  };

  const openReject = async (row: ReturnRequest) => {
    const d = await fetchDetail(row.id);
    if (!d) return;
    setRejectTarget(d);
    setRejectRemark(d.admin_remark || "");
  };

  const orderTotal = useMemo(() => Number(approveTarget?.order_info?.total_amount || 0), [approveTarget]);

  const submitApprove = async () => {
    if (!approveTarget) return;
    if (!Number.isFinite(approveForm.refund_amount) || approveForm.refund_amount < 0) {
      toast.error("退款金额必须大于等于 0");
      return;
    }
    if (approveForm.refund_amount > orderTotal) {
      toast.error("退款金额不能超过订单实付金额");
      return;
    }
    try {
      await returnService.approveReturn(approveTarget.id, approveForm);
      toast.success("售后已通过");
      setApproveTarget(null);
      setApproveForm(defaultApproveForm);
      await loadData();
      if (detail?.id === approveTarget.id) {
        await fetchDetail(approveTarget.id);
      }
    } catch (e) {
      toast.error(toastErrorMessage(e, "售后通过失败"));
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!rejectRemark.trim()) {
      toast.error("拒绝原因不能为空");
      return;
    }
    try {
      await returnService.rejectReturn(rejectTarget.id, rejectRemark.trim());
      toast.success("售后已拒绝");
      setRejectTarget(null);
      setRejectRemark("");
      await loadData();
      if (detail?.id === rejectTarget.id) {
        await fetchDetail(rejectTarget.id);
      }
    } catch (e) {
      toast.error(toastErrorMessage(e, "售后拒绝失败"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          placeholder="搜索售后单号/订单号"
          className="h-10 w-64 rounded border border-border px-3 text-sm"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-10 rounded border border-border px-3 text-sm"
        >
          {RETURN_STATUS_FILTER_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-3 py-2">售后单</th>
              <th className="px-3 py-2">订单号</th>
              <th className="px-3 py-2">类型</th>
              <th className="px-3 py-2">退款金额</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">创建时间</th>
              <th className="px-3 py-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">{r.id.slice(0, 8)}</td>
                <td className="px-3 py-2">{r.order_no || "-"}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{Number(r.refund_amount || 0).toFixed(2)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${getReturnStatusBadgeClass(r.status)}`}>
                    {getReturnStatusLabel(r.status)}
                  </span>
                </td>
                <td className="px-3 py-2">{new Date(r.created_at).toLocaleString("zh-CN")}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="rounded border border-border px-2 py-1 text-xs"
                      onClick={() => { void fetchDetail(r.id); }}
                    >
                      <Eye size={14} />
                    </button>
                    {r.status === RETURN_STATUS.PENDING ? (
                      <PermissionGate permission="return.handle">
                        <div className="flex items-center gap-2">
                          <button className="rounded bg-emerald-600 px-2 py-1 text-xs text-white" onClick={() => { void openApprove(r); }}>通过</button>
                          <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600" onClick={() => { void openReject(r); }}>拒绝</button>
                        </div>
                      </PermissionGate>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && list.length === 0 ? (
              <tr><td className="px-3 py-8 text-center text-muted-foreground" colSpan={7}>暂无售后记录</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-base font-semibold">售后详情</div>
            {detailLoading ? <div className="text-sm text-muted-foreground">加载中...</div> : null}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>用户：{(detail as any).user_info?.name || "-"}</div>
              <div>手机号：{(detail as any).user_info?.phone || "-"}</div>
              <div>订单号：{(detail as any).order_info?.order_no || detail.order_no || "-"}</div>
              <div>支付状态：{(detail as any).order_info?.payment_status || "-"}</div>
              <div>商品：{(detail as any).item_info?.product_name || "-"}</div>
              <div>SKU：{(detail as any).item_info?.sku_code || "-"}</div>
              <div>申请数量：{(detail as any).item_info?.request_qty || detail.quantity || 0}</div>
              <div>退款金额：{Number(detail.refund_amount || 0).toFixed(2)}</div>
              <div className="col-span-2">申请原因：{detail.reason || "-"}</div>
              <div className="col-span-2">管理员备注：{detail.admin_remark || "-"}</div>
            </div>
            <div className="mt-4 text-sm font-medium">退款记录</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {(detail as any).refund_records?.length ? (detail as any).refund_records.map((x: any) => (
                <div key={x.id}>{x.event_type} / {x.processing_result} / {new Date(x.created_at).toLocaleString("zh-CN")}</div>
              )) : <div>暂无</div>}
            </div>
            <div className="mt-4 text-sm font-medium">库存恢复记录</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {(detail as any).inventory_restore_records?.length ? (detail as any).inventory_restore_records.map((x: any) => (
                <div key={x.id}>Δ{x.quantity_delta} / {new Date(x.created_at).toLocaleString("zh-CN")}</div>
              )) : <div>暂无</div>}
            </div>
            <div className="mt-4 text-sm font-medium">操作日志</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {(detail as any).operation_logs?.length ? (detail as any).operation_logs.map((x: any) => (
                <div key={x.id}>{x.summary || x.result} / {new Date(x.created_at).toLocaleString("zh-CN")}</div>
              )) : <div>暂无</div>}
            </div>
          </div>
        </div>
      ) : null}

      {approveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setApproveTarget(null)}>
          <div className="w-full max-w-lg rounded-xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-base font-semibold">售后通过处理</div>
            <div className="space-y-2 text-sm">
              <label className="block">
                <span>退款金额</span>
                <input
                  type="number"
                  min={0}
                  max={orderTotal}
                  value={approveForm.refund_amount}
                  onChange={(e) => setApproveForm((s) => ({ ...s, refund_amount: Number(e.target.value) }))}
                  className="mt-1 h-10 w-full rounded border border-border px-3"
                />
              </label>
              <label className="block">
                <span>管理员备注</span>
                <textarea
                  value={approveForm.admin_remark || ""}
                  onChange={(e) => setApproveForm((s) => ({ ...s, admin_remark: e.target.value }))}
                  className="mt-1 w-full rounded border border-border p-2"
                />
              </label>
              <label className="block">
                <span>退款模式</span>
                <select
                  value={approveForm.refund_mode}
                  onChange={(e) => setApproveForm((s) => ({ ...s, refund_mode: e.target.value as any }))}
                  className="mt-1 h-10 w-full rounded border border-border px-3"
                >
                  <option value="none">none</option>
                  <option value="manual">manual</option>
                  <option value="provider">provider</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label><input type="checkbox" checked={approveForm.restore_stock} onChange={(e) => setApproveForm((s) => ({ ...s, restore_stock: e.target.checked }))} /> 恢复库存</label>
                <label><input type="checkbox" checked={approveForm.restore_coupon} onChange={(e) => setApproveForm((s) => ({ ...s, restore_coupon: e.target.checked }))} /> 恢复优惠券</label>
                <label><input type="checkbox" checked={approveForm.reverse_points} onChange={(e) => setApproveForm((s) => ({ ...s, reverse_points: e.target.checked }))} /> 回滚积分</label>
                <label><input type="checkbox" checked={approveForm.reverse_rewards} onChange={(e) => setApproveForm((s) => ({ ...s, reverse_rewards: e.target.checked }))} /> 冲正返现</label>
              </div>
              <div className="text-xs text-muted-foreground">订单实付金额：{orderTotal.toFixed(2)}</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => setApproveTarget(null)}>取消</button>
              <button className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white" onClick={() => { void submitApprove(); }}>确认通过</button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectTarget(null)}>
          <div className="w-full max-w-lg rounded-xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-base font-semibold">拒绝售后</div>
            <textarea
              value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              placeholder="请输入拒绝原因（必填）"
              className="w-full rounded border border-border p-2"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => setRejectTarget(null)}>取消</button>
              <button className="rounded bg-red-600 px-3 py-1.5 text-sm text-white" onClick={() => { void submitReject(); }}>确认拒绝</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
