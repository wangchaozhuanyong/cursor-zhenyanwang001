import { useState, useEffect } from "react";
import { Search, Shield, ChevronRight } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import Pagination from "@/components/admin/Pagination";
import { toast } from "sonner";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { fetchAuditLogs } from "@/services/admin/logService";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import type { AuditLogRow } from "@/services/admin/logService";
import {
  buildAuditChangeSummary,
  zhActionType,
  zhAuditErrorMessage,
  zhAuditResult,
  zhAuditSummary,
  zhObjectType,
  zhOperatorRole,
} from "@/utils/auditLogI18n";
import { Tx } from "@/components/admin/AdminText";

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
          <h1 className="text-xl font-bold text-foreground"><Tx>审计日志</Tx></h1>
          <p className="text-sm text-muted-foreground"><Tx>你无权查看审计日志。</Tx></p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground"><Tx>审计日志</Tx></h1>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Shield size={16} className="shrink-0 text-[var(--theme-price)]" /><Tx>
          管理端操作审计（含失败记录与前后快照）
        </Tx></p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs text-muted-foreground"><Tx>关键词</Tx></label>
          <div className="flex items-center gap-1.5 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              placeholder="摘要 / 操作人 / 动作 / 对象编号 / 错误信息"
              value={auditKeyword}
              onChange={(e) => setAuditKeyword(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground"><Tx>结果</Tx></label>
          <select
            value={auditResult}
            onChange={(e) => setAuditResult(e.target.value as "" | "success" | "failure")}
            className="w-full min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
          >
            <option value=""><Tx>全部</Tx></option>
            <option value="success"><Tx>成功</Tx></option>
            <option value="failure"><Tx>失败</Tx></option>
          </select>
        </div>
        <div>
          <label htmlFor="audit-date-from" className="mb-1 block text-xs text-muted-foreground"><Tx>
            开始日期
          </Tx></label>
          <SegmentedDateInput
            id="audit-date-from"
            value={dateFrom}
            onChange={setDateFrom}
            className="w-full [&>div]:theme-rounded [&>div]:border-[var(--theme-border)] [&>div]:bg-[var(--theme-surface)]"
          />
        </div>
        <div>
          <label htmlFor="audit-date-to" className="mb-1 block text-xs text-muted-foreground"><Tx>
            结束日期
          </Tx></label>
          <SegmentedDateInput
            id="audit-date-to"
            value={dateTo}
            onChange={setDateTo}
            className="w-full [&>div]:theme-rounded [&>div]:border-[var(--theme-border)] [&>div]:bg-[var(--theme-surface)]"
          />
        </div>
        <button
          type="button"
          onClick={handleAuditSearch}
          className="min-h-[44px] theme-rounded px-5 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)]"
          style={{ background: "var(--theme-gradient)" }}
        ><Tx>
          查询
        </Tx></button>
      </div>

      <div className="space-y-3 md:hidden">
        {auditLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow space-y-3">
                <div className="skeleton-base skeleton-shimmer h-3 w-28 rounded" />
                <div className="skeleton-base skeleton-shimmer h-4 w-2/3 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-full rounded" />
                <div className="skeleton-base skeleton-shimmer h-10 w-full rounded-lg" />
              </div>
            ))
          : null}
        {!auditLoading && auditList.map((row) => (
          <div key={row.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleString("zh-CN") : "—"}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${row.result === "success" ? "bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)] text-[var(--theme-price)]" : "bg-destructive/15 text-destructive"}`}>
                {zhAuditResult(row.result)}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{row.operator_name || "—"}</p>
            <p className="text-xs text-muted-foreground">{zhOperatorRole(row.operator_role)}</p>
            <p className="mt-2 text-xs font-semibold text-foreground">{zhActionType(row.action_type)}</p>
            <p className="mt-1 text-xs text-muted-foreground" title={row.object_id || undefined}>
              {zhObjectType(row.object_type)}{row.object_id ? " · 已关联对象" : ""}
            </p>
            <p className="mt-2 line-clamp-3 text-xs text-foreground">{zhAuditSummary(row.summary)}</p>
            <button type="button" onClick={() => setDetail(row)} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1 theme-rounded border border-[var(--theme-border)] py-2 text-sm text-[var(--theme-price)]"><Tx>
              详情 </Tx><ChevronRight size={16} />
            </button>
          </div>
        ))}
        {!auditLoading && auditList.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground"><Tx>暂无审计记录</Tx></div>
        )}
        <Pagination
          total={auditTotal}
          page={auditPage}
          pageSize={auditPageSize}
          onPageChange={setAuditPage}
          onPageSizeChange={(n) => { setAuditPageSize(n); setAuditPage(1); }}
        />
      </div>

      <div className="hidden md:block">
        <AnimatedTable
          loading={auditLoading}
          rows={auditList}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={7}
          className="overflow-hidden theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
          tableClassName="w-full min-w-[900px] text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={(
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"><Tx>时间</Tx></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"><Tx>操作人</Tx></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"><Tx>动作</Tx></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"><Tx>对象</Tx></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"><Tx>摘要</Tx></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"><Tx>结果</Tx></th>
              <th className="px-3 py-3 w-10" />
            </tr>
          )}
          footer={(
            <Pagination
              total={auditTotal}
              page={auditPage}
              pageSize={auditPageSize}
              onPageChange={setAuditPage}
              onPageSizeChange={(n) => { setAuditPageSize(n); setAuditPage(1); }}
            />
          )}
          emptyIcon={Shield}
          emptyTitle="暂无审计记录"
          renderRow={(row) => (
            <>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {row.created_at ? new Date(row.created_at).toLocaleString("zh-CN") : "—"}
              </td>
              <td className="px-3 py-2 text-xs">
                <div className="font-medium text-foreground">{row.operator_name || "—"}</div>
                <div className="text-muted-foreground">{zhOperatorRole(row.operator_role)}</div>
              </td>
              <td className="px-3 py-2 text-xs font-semibold text-foreground">{zhActionType(row.action_type)}</td>
              <td className="px-3 py-2 text-xs">
                <span className="text-muted-foreground">{zhObjectType(row.object_type)}</span>
                {row.object_id ? (
                  <div className="text-[10px] text-muted-foreground" title={row.object_id}><Tx>已关联</Tx></div>
                ) : null}
              </td>
              <td className="px-3 py-2 text-xs text-foreground max-w-[200px] truncate" title={row.summary || undefined}>{zhAuditSummary(row.summary)}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${row.result === "success" ? "bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)] text-[var(--theme-price)]" : "bg-destructive/15 text-destructive"}`}>
                  {zhAuditResult(row.result)}
                </span>
              </td>
              <td className="px-3 py-2">
                <button type="button" onClick={() => setDetail(row)} className="text-[var(--theme-price)] hover:underline">
                  <ChevronRight size={16} />
                </button>
              </td>
            </>
          )}
        />
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow"
          >
            <h3 className="text-sm font-bold text-foreground mb-3"><Tx>审计详情</Tx></h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground"><Tx>动作</Tx></dt><dd className="text-right font-semibold">{zhActionType(detail.action_type)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground"><Tx>摘要</Tx></dt><dd className="text-right max-w-[70%] break-words">{zhAuditSummary(detail.summary)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground"><Tx>对象</Tx></dt><dd className="text-right" title={detail.object_id || undefined}>{zhObjectType(detail.object_type)}{detail.object_id ? " · 已关联" : ""}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground"><Tx>路径</Tx></dt><dd className="text-right break-all">{detail.request_method} {detail.request_path}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground"><Tx>IP 地址</Tx></dt><dd>{detail.ip || "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground"><Tx>浏览器标识</Tx></dt><dd className="text-right break-all max-w-[70%]">{detail.user_agent || "—"}</dd></div>
              {detail.result === "failure" && detail.error_message && (
                <div className="rounded-lg bg-destructive/10 p-2 text-destructive">{zhAuditErrorMessage(detail.error_message)}</div>
              )}
              {(() => {
                const changes = buildAuditChangeSummary(detail.before_json, detail.after_json);
                if (!changes.length) return null;
                return (
                  <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)]/40 p-2">
                    <dt className="text-muted-foreground mb-1"><Tx>变更摘要</Tx></dt>
                    <div className="space-y-1 text-[11px]">
                      {changes.map((c) => (
                        <div key={c.key} className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-muted-foreground">{c.label}</span>
                          <span className="font-mono text-foreground break-all text-right">
                            {c.fromText} → {c.toText}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div>
                <dt className="text-muted-foreground mb-1"><Tx>变更前</Tx></dt>
                <pre className="max-h-40 overflow-auto rounded-lg bg-secondary p-2 text-[10px]">{detail.before_json != null ? JSON.stringify(detail.before_json, null, 2) : "—"}</pre>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1"><Tx>变更后</Tx></dt>
                <pre className="max-h-40 overflow-auto rounded-lg bg-secondary p-2 text-[10px]">{detail.after_json != null ? JSON.stringify(detail.after_json, null, 2) : "—"}</pre>
              </div>
            </dl>
            <button type="button" onClick={() => setDetail(null)} className="mt-4 w-full theme-rounded border border-[var(--theme-border)] py-2 text-sm"><Tx>关闭</Tx></button>
          </div>
        </div>
      )}
    </div>
  );
}
