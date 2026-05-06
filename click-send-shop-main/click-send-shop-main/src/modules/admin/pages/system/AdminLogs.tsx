import { useState, useEffect } from "react";
import { Search, Loader2, Shield, ChevronRight } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import { toast } from "sonner";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { fetchAuditLogs } from "@/services/admin/logService";
import type { AuditLogRow } from "@/services/admin/logService";

export default function AdminLogs() {
  const can = useAdminPermissionStore((s) => s.can);
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const canAudit = isSuperAdmin || can("audit.view");

  const [auditList, setAuditList] = useState<AuditLogRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditKeyword, setAuditKeyword] = useState("");
  const [auditResult, setAuditResult] = useState<"" | "success" | "failure">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detail, setDetail] = useState<AuditLogRow | null>(null);

  useEffect(() => {
    if (!canAudit) return;
    setAuditLoading(true);
    fetchAuditLogs({
      page: auditPage,
      pageSize: auditPageSize,
      keyword: auditKeyword.trim() || undefined,
      result: auditResult || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortOrder: "desc",
    })
      .then((p) => {
        setAuditList(p.list);
        setAuditTotal(p.total);
      })
      .catch(() => toast.error("加载审计日志失败"))
      .finally(() => setAuditLoading(false));
    // 仅分页变化时自动拉取；筛选项变更由「查询」触发，避免输入时频繁请求
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 见上
  }, [canAudit, auditPage, auditPageSize]);

  const handleAuditSearch = () => {
    setAuditPage(1);
    setAuditLoading(true);
    fetchAuditLogs({
      page: 1,
      pageSize: auditPageSize,
      keyword: auditKeyword.trim() || undefined,
      result: auditResult || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortOrder: "desc",
    })
      .then((p) => {
        setAuditList(p.list);
        setAuditTotal(p.total);
      })
      .catch(() => toast.error("加载审计日志失败"))
      .finally(() => setAuditLoading(false));
  };

  if (!canAudit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">审计日志</h1>
          <p className="text-sm text-muted-foreground">你无权查看审计日志。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">审计日志</h1>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Shield size={16} className="shrink-0 text-[var(--theme-price)]" />
          管理端操作审计（含失败记录与前后快照）
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">关键词</label>
          <div className="flex items-center gap-1.5 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              placeholder="摘要 / 操作人 / 动作 / 对象 ID / 错误信息"
              value={auditKeyword}
              onChange={(e) => setAuditKeyword(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">结果</label>
          <select
            value={auditResult}
            onChange={(e) => setAuditResult(e.target.value as "" | "success" | "failure")}
            className="w-full min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
          >
            <option value="">全部</option>
            <option value="success">成功</option>
            <option value="failure">失败</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">开始日期</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">结束日期</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleAuditSearch}
          className="min-h-[44px] theme-rounded px-5 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)]"
          style={{ background: "var(--theme-gradient)" }}
        >
          查询
        </button>
      </div>

      {auditLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-price)]" />
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {auditList.map((row) => (
              <div key={row.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleString("zh-CN") : "—"}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${row.result === "success" ? "bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)] text-[var(--theme-price)]" : "bg-destructive/15 text-destructive"}`}>
                    {row.result === "success" ? "成功" : "失败"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{row.operator_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{row.operator_role || ""}</p>
                <p className="mt-2 font-mono text-xs text-foreground">{row.action_type}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.object_type}{row.object_id ? ` · ${row.object_id}` : ""}</p>
                <p className="mt-2 line-clamp-3 text-xs text-foreground">{row.summary}</p>
                <button type="button" onClick={() => setDetail(row)} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1 theme-rounded border border-[var(--theme-border)] py-2 text-sm text-[var(--theme-price)]">
                  详情 <ChevronRight size={16} />
                </button>
              </div>
            ))}
            {auditList.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">暂无审计记录</div>
            )}
            <Pagination
              total={auditTotal}
              page={auditPage}
              pageSize={auditPageSize}
              onPageChange={setAuditPage}
              onPageSizeChange={(n) => { setAuditPageSize(n); setAuditPage(1); }}
            />
          </div>

          <div className="hidden overflow-hidden theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] md:block theme-shadow">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70">
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">时间</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">操作人</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">动作</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">对象</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">摘要</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">结果</th>
                    <th className="px-3 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {auditList.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--theme-border)] last:border-0 hover:bg-[var(--theme-bg)]">
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {row.created_at ? new Date(row.created_at).toLocaleString("zh-CN") : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="font-medium text-foreground">{row.operator_name || "—"}</div>
                        <div className="text-muted-foreground">{row.operator_role || ""}</div>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-foreground">{row.action_type}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className="text-muted-foreground">{row.object_type}</span>
                        {row.object_id && <div className="font-mono text-[10px] truncate max-w-[120px]">{row.object_id}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground max-w-[200px] truncate">{row.summary}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${row.result === "success" ? "bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)] text-[var(--theme-price)]" : "bg-destructive/15 text-destructive"}`}>
                          {row.result === "success" ? "成功" : "失败"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => setDetail(row)} className="text-[var(--theme-price)] hover:underline">
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {auditList.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">暂无审计记录</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              total={auditTotal}
              page={auditPage}
              pageSize={auditPageSize}
              onPageChange={setAuditPage}
              onPageSizeChange={(n) => { setAuditPageSize(n); setAuditPage(1); }}
            />
          </div>
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow"
          >
            <h3 className="text-sm font-bold text-foreground mb-3">审计详情</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">动作</dt><dd className="font-mono text-right">{detail.action_type}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">路径</dt><dd className="text-right break-all">{detail.request_method} {detail.request_path}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">IP</dt><dd>{detail.ip || "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">UA</dt><dd className="text-right break-all max-w-[70%]">{detail.user_agent || "—"}</dd></div>
              {detail.result === "failure" && detail.error_message && (
                <div className="rounded-lg bg-destructive/10 p-2 text-destructive">{detail.error_message}</div>
              )}
              <div>
                <dt className="text-muted-foreground mb-1">变更前</dt>
                <pre className="max-h-40 overflow-auto rounded-lg bg-secondary p-2 text-[10px]">{detail.before_json != null ? JSON.stringify(detail.before_json, null, 2) : "—"}</pre>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1">变更后</dt>
                <pre className="max-h-40 overflow-auto rounded-lg bg-secondary p-2 text-[10px]">{detail.after_json != null ? JSON.stringify(detail.after_json, null, 2) : "—"}</pre>
              </div>
            </dl>
            <button type="button" onClick={() => setDetail(null)} className="mt-4 w-full theme-rounded border border-[var(--theme-border)] py-2 text-sm">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
