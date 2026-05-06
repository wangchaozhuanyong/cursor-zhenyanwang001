import { useState, useEffect } from "react";
import { Search, User, Clock, Loader2, Shield, ScrollText, ChevronRight } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { fetchAdminLogs, fetchAuditLogs } from "@/services/admin/logService";
import type { AuditLogRow } from "@/services/admin/logService";

type TabKey = "legacy" | "audit";

export default function AdminLogs() {
  const can = useAdminPermissionStore((s) => s.can);
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const canAudit = isSuperAdmin || can("audit.view");
  const canLegacy = isSuperAdmin || can("admin_log.view");
  const showTabSwitch = canAudit && canLegacy;

  const [tab, setTab] = useState<TabKey>(() => {
    const s = useAdminPermissionStore.getState();
    const ca = s.isSuperAdmin || s.can("audit.view");
    const cl = s.isSuperAdmin || s.can("admin_log.view");
    if (!ca && cl) return "legacy";
    return "audit";
  });

  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (canAudit && !canLegacy) setTab("audit");
    else if (!canAudit && canLegacy) setTab("legacy");
  }, [canAudit, canLegacy]);

  useEffect(() => {
    if (!canLegacy) {
      setLoading(false);
      setLogs([]);
      return;
    }
    setLoading(true);
    fetchAdminLogs()
      .then((p) => setLogs(p.list))
      .catch(() => toast.error("加载日志失败"))
      .finally(() => setLoading(false));
  }, [canLegacy]);

  const loadAudit = () => {
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
  };

  useEffect(() => {
    if (tab === "audit" && canAudit) loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, auditPage, auditPageSize, canAudit]);

  const actorLabel = (l: { operator?: string; admin_id?: string }) =>
    (l.operator && String(l.operator).trim()) || l.admin_id || "—";

  const filtered = logs.filter((l) => {
    const who = actorLabel(l);
    if (
      search
      && !l.action?.includes(search)
      && !who.includes(search)
      && !l.detail?.includes(search)
    ) {
      return false;
    }
    return true;
  });

  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filtered);

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

  if (loading && tab === "legacy" && canLegacy) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-price)]" />
      </div>
    );
  }

  if (!canAudit && !canLegacy) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">操作与审计</h1>
          <p className="text-sm text-muted-foreground">你无权查看此类日志。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">操作与审计</h1>
        <p className="text-sm text-muted-foreground">旧版操作日志与正式审计记录（含失败、前后快照）</p>
      </div>

      {showTabSwitch ? (
        <div className="flex flex-wrap gap-2 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1 theme-shadow">
          {canAudit ? (
            <button
              type="button"
              onClick={() => setTab("audit")}
              className={`flex items-center gap-2 theme-rounded px-4 py-2 text-sm font-medium transition-colors ${tab === "audit" ? "bg-[var(--theme-price)] text-white" : "text-muted-foreground hover:bg-[var(--theme-bg)]"}`}
            >
              <Shield size={16} /> 审计日志
            </button>
          ) : null}
          {canLegacy ? (
            <button
              type="button"
              onClick={() => setTab("legacy")}
              className={`flex items-center gap-2 theme-rounded px-4 py-2 text-sm font-medium transition-colors ${tab === "legacy" ? "bg-[var(--theme-price)] text-white" : "text-muted-foreground hover:bg-[var(--theme-bg)]"}`}
            >
              <ScrollText size={16} /> 旧版操作日志
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === "legacy" && canLegacy && (
        <>
          <div className="flex items-center gap-1.5 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 max-w-md">
            <Search size={14} className="text-muted-foreground" />
            <input
              placeholder="搜索操作/操作人..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-3 md:hidden">
            {paginatedData.map((l) => (
              <div key={l.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock size={12} />{l.created_at ? new Date(l.created_at).toLocaleString("zh-CN") : "—"}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground">
                  <User size={14} className="text-muted-foreground" />{actorLabel(l)}
                </p>
                <p className="mt-2 font-medium text-foreground">{l.action || "—"}</p>
                <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{l.detail || "—"}</p>
              </div>
            ))}
            {paginatedData.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">暂无日志记录</div>
            )}
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>

          <div className="hidden overflow-hidden theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] md:block theme-shadow">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">时间</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作人</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">详情</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((l) => (
                    <tr key={l.id} className="border-b border-[var(--theme-border)] last:border-0 hover:bg-[var(--theme-bg)] transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1"><Clock size={12} />{l.created_at ? new Date(l.created_at).toLocaleString("zh-CN") : "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5"><User size={12} className="text-muted-foreground" />{actorLabel(l)}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{l.action || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{l.detail || "—"}</td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">暂无日志记录</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        </>
      )}

      {tab === "audit" && canAudit && (
        <>
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
              className="min-h-[44px] theme-rounded px-5 py-2 text-sm font-semibold text-white"
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
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${row.result === "success" ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"}`}>
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
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${row.result === "success" ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"}`}>
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
        </>
      )}
    </div>
  );
}
