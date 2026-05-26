import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Eye, ExternalLink, RefreshCw, Shield, XCircle } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as eventService from "@/services/admin/eventCenterService";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import {
  ADMIN_EVENT_CATEGORY_LABELS,
  formatAdminEventSubtitle,
  formatAdminEventTitle,
  labelAdminEventCategory,
  labelAdminEventSeverity,
  labelAdminEventStatus,
} from "@/utils/adminEventLabels";
import { formatDateTime } from "@/utils/formatDateTime";
import type { AdminEventRecord } from "@/services/admin/eventCenterService";
import { adminDataGridClassName } from "@/utils/adminTableClasses";
import AdminPageShell from "@/components/admin/AdminPageShell";

const tabs = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待处理" },
  { key: "urgent", label: "紧急" },
  { key: "security", label: "安全" },
  { key: "recovered", label: "已恢复" },
] as const;

const EVENT_VIEW_PERMISSIONS = ["event.view", "event.manage"];
const EVENT_MANAGE_PERMISSIONS = ["event.manage"];

const TERMINAL_EVENT_STATUSES = new Set(["ignored", "resolved", "auto_resolved", "expired"]);

function severityClass(severity: string) {
  if (severity === "P0") return "bg-red-600 text-white";
  if (severity === "P1") return "bg-orange-500 text-white";
  if (severity === "P2") return "bg-amber-100 text-amber-800";
  return "bg-secondary text-muted-foreground";
}

function diagnosisClass(state?: string) {
  if (state === "still_active") return "border-red-200 bg-red-50 text-red-900";
  if (state === "review_required") return "border-amber-200 bg-amber-50 text-amber-900";
  if (state === "closed") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-blue-200 bg-blue-50 text-blue-900";
}

function formatEventOccurredAt(item: AdminEventRecord) {
  const raw = item.firstSeenAt || item.createdAt;
  return raw ? formatDateTime(raw) : "-";
}

export default function AdminEventCenter() {
  const { tText } = useAdminT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("pending");
  const [category, setCategory] = useState("");
  const params = useMemo(() => ({ tab, category: category || undefined, page: 1, pageSize: 30 }), [tab, category]);

  const eventsQuery = useQuery({
    queryKey: adminQueryKeys.eventCenterEvents(params),
    queryFn: () => eventService.fetchAdminEvents(params),
  });
  const metricsQuery = useQuery({
    queryKey: adminQueryKeys.eventCenterBossMetrics(),
    queryFn: eventService.fetchAdminEventBossMetrics,
  });
  const summaryQuery = useQuery({
    queryKey: adminQueryKeys.eventCenterSummary({ tab }),
    queryFn: () => eventService.fetchAdminEventSummary({ tab }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.eventCenterRoot() });
  };

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "read" | "ack" | "progress" | "resolve" | "ignore" }) => {
      if (action === "read") return eventService.markAdminEventRead(id);
      if (action === "ack") return eventService.acknowledgeAdminEvent(id);
      if (action === "progress") return eventService.startAdminEventProgress(id);
      if (action === "resolve") return eventService.resolveAdminEvent(id);
      return eventService.ignoreAdminEvent(id);
    },
    onSuccess: refresh,
  });

  const metrics = metricsQuery.data;
  const metricItems = [
    ["今日影响收入事件", metrics?.revenueEventsToday || 0],
    ["未处理订单", metrics?.pendingOrders || 0],
    ["已付款未发货", metrics?.paidUnshipped || 0],
    ["退款待处理", metrics?.refundPending || 0],
    ["库存风险商品", metrics?.stockRisks || 0],
    ["支付异常", metrics?.paymentAnomalies || 0],
    ["数据一致性异常", metrics?.consistencyAnomalies || 0],
    ["安全风险", metrics?.securityRisks || 0],
    ["系统健康风险", metrics?.systemHealthRisks || 0],
  ] as const;

  const rows = eventsQuery.data?.list || [];
  const categoryCounts = summaryQuery.data?.categoryCounts || {};
  const categoryOptions = useMemo(() => {
    const keys = new Set([...Object.keys(ADMIN_EVENT_CATEGORY_LABELS), ...Object.keys(categoryCounts)]);
    return [...keys].map((key) => ({
      key,
      label: ADMIN_EVENT_CATEGORY_LABELS[key] || labelAdminEventCategory(key),
      count: categoryCounts[key] ?? 0,
    }));
  }, [categoryCounts]);
  const categoryTotal = useMemo(() => categoryOptions.reduce((sum, item) => sum + item.count, 0), [categoryOptions]);

  return (
    <AdminPageShell
      hint={(
        <>
          <p><Tx>每条事件都会显示诊断和下一步。已读只表示你看过，完成才表示问题已处理。</Tx></p>
          <p className="mt-2 font-medium text-foreground"><Tx>处理规则</Tx></p>
          <p className="mt-1"><Tx>备份 P0 必须重新验证备份/增量/恢复演练；订单 P1 必须先处理订单；安全 P1 是高风险操作确认，确认本人操作后再完成。</Tx></p>
        </>
      )}
      toolbar={(
        <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
          <RefreshCw size={16} className={eventsQuery.isFetching ? "animate-spin" : ""} />
          <Tx>刷新</Tx>
        </button>
      )}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {metricItems.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-lg font-semibold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{tText(label)}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((item) => {
          const tabCount = summaryQuery.data?.tabCounts?.[item.key] ?? 0;
          return (
            <button
              key={item.key}
              type="button"
              className={`rounded-lg px-3 py-2 text-sm ${tab === item.key ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-secondary"}`}
              onClick={() => setTab(item.key)}
            >
              {tText(`${item.label} (${tabCount})`)}
            </button>
          );
        })}
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="">{tText(`全部分类 (${categoryTotal})`)}</option>
          {categoryOptions.map(({ key, label, count }) => (
            <option key={key} value={key}>
              {tText(`${label} (${count})`)}
            </option>
          ))}
        </select>
        <div className="ml-auto text-sm text-muted-foreground">
          {tText(`未读 ${summaryQuery.data?.unreadCount || 0} / 未处理 ${summaryQuery.data?.unresolvedCount || 0} / P0 ${summaryQuery.data?.p0Count || 0}`)}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="min-w-[1120px]">
          <div className={adminDataGridClassName("grid grid-cols-[76px_84px_minmax(200px,1fr)_minmax(260px,1.1fr)_148px_minmax(96px,auto)_minmax(240px,auto)] gap-x-3 gap-y-2 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground")}>
            <span><Tx>级别</Tx></span>
            <span><Tx>分类</Tx></span>
            <span><Tx>事件</Tx></span>
            <span><Tx>诊断 / 下一步</Tx></span>
            <span><Tx>时间</Tx></span>
            <span><Tx>状态</Tx></span>
            <span><Tx>操作</Tx></span>
          </div>
          {rows.length ? rows.map((item) => {
            const occurredAt = formatEventOccurredAt(item);
            const diagnosis = item.diagnosis;
            return (
              <div key={item.id} className={adminDataGridClassName("grid grid-cols-[76px_84px_minmax(200px,1fr)_minmax(260px,1.1fr)_148px_minmax(96px,auto)_minmax(240px,auto)] gap-x-3 gap-y-2 border-b border-border px-4 py-3 text-sm last:border-b-0")}>
                <div className="flex items-start">
                  <span className={`whitespace-nowrap rounded px-2 py-1 text-xs font-bold ${severityClass(item.severity)}`}>
                    {tText(labelAdminEventSeverity(item.severity))}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  {item.category === "security" ? <Shield size={14} className="text-red-600" /> : <AlertTriangle size={14} className="text-amber-600" />}
                  {tText(labelAdminEventCategory(item.category))}
                </div>
                <div className="min-w-0 text-center">
                  <div className="truncate font-medium text-foreground">{tText(formatAdminEventTitle(item.title, item.eventType, item.category))}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {tText(formatAdminEventSubtitle(item.message, item.eventType, item.category, item.title))}
                  </div>
                  {item.seenCount > 1 ? <div className="mt-1 text-[11px] text-muted-foreground">{tText(`重复出现 ${item.seenCount} 次`)}</div> : null}
                </div>
                <div className={`rounded-lg border px-3 py-2 text-left text-xs leading-5 ${diagnosisClass(diagnosis?.state)}`}>
                  <div className="font-semibold">{tText(diagnosis?.summary || "需要人工确认。")}</div>
                  <div className="mt-1">{tText(diagnosis?.nextAction || "查看关联业务数据，处理根因后再关闭。")}</div>
                  {diagnosis?.closeHint ? <div className="mt-1 opacity-80">{tText(diagnosis.closeHint)}</div> : null}
                  {diagnosis?.linkUrl ? (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1 rounded border border-current px-2 py-1 font-medium"
                      onClick={() => navigate(diagnosis.linkUrl || "/admin/event-center")}
                    >
                      <ExternalLink size={12} />
                      {tText(diagnosis.linkText || "查看")}
                    </button>
                  ) : null}
                </div>
                <div className="whitespace-nowrap text-xs text-muted-foreground" title={occurredAt}>{occurredAt}</div>
                <div className="whitespace-nowrap text-xs font-medium text-foreground">{tText(labelAdminEventStatus(item.status))}</div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <PermissionGate anyOf={EVENT_VIEW_PERMISSIONS}>
                    <button type="button" className="inline-flex shrink-0 items-center rounded border border-border px-2 py-1 text-xs hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "read" })}><Eye size={13} className="mr-1" /><Tx>已读</Tx></button>
                  </PermissionGate>
                  <PermissionGate anyOf={EVENT_MANAGE_PERMISSIONS}>
                    {!TERMINAL_EVENT_STATUSES.has(item.status) ? (
                      <>
                        <button type="button" className="shrink-0 rounded border border-border px-2 py-1 text-xs hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "ack" })}><Tx>确认</Tx></button>
                        <button type="button" className="shrink-0 rounded border border-border px-2 py-1 text-xs hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "progress" })}><Tx>处理中</Tx></button>
                        <button type="button" className="shrink-0 rounded border border-border px-2 py-1 text-xs hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "ignore" })}><XCircle size={13} className="mr-1 inline" /><Tx>忽略</Tx></button>
                      </>
                    ) : null}
                    <button type="button" className="inline-flex shrink-0 items-center rounded border border-border px-2 py-1 text-xs text-emerald-700 hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "resolve" })}><CheckCircle2 size={13} className="mr-1" /><Tx>完成</Tx></button>
                  </PermissionGate>
                </div>
              </div>
            );
          }) : (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground"><Tx>暂无事件</Tx></div>
          )}
        </div>
      </div>
    </AdminPageShell>
  );
}
