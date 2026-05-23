import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Eye, RefreshCw, Shield, XCircle } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as eventService from "@/services/admin/eventCenterService";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import {
  ADMIN_EVENT_CATEGORY_LABELS,
  formatAdminEventSubtitle,
  labelAdminEventCategory,
  labelAdminEventStatus,
} from "@/utils/adminEventLabels";

const tabs = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待处理" },
  { key: "urgent", label: "紧急" },
  { key: "security", label: "安全" },
  { key: "recovered", label: "已恢复" },
] as const;

const EVENT_VIEW_PERMISSIONS = ["event.view", "event.manage"];
const EVENT_MANAGE_PERMISSIONS = ["event.manage"];

function severityClass(severity: string) {
  if (severity === "P0") return "bg-red-600 text-white";
  if (severity === "P1") return "bg-orange-500 text-white";
  if (severity === "P2") return "bg-amber-100 text-amber-800";
  return "bg-secondary text-muted-foreground";
}

export default function AdminEventCenter() {
  const { tText } = useAdminT();
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
    queryKey: adminQueryKeys.eventCenterSummary(),
    queryFn: eventService.fetchAdminEventSummary,
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
    ["系统健康状态", metrics?.systemHealthRisks || 0],
  ] as const;

  const rows = eventsQuery.data?.list || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground"><Tx>后台事件中心</Tx></h1>
          <p className="text-sm text-muted-foreground"><Tx>事件处理状态独立于管理员已读状态</Tx></p>
        </div>
        <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
          <RefreshCw size={16} className={eventsQuery.isFetching ? "animate-spin" : ""} />
          <Tx>刷新</Tx>
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {metricItems.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-lg font-semibold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{tText(label)}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm ${tab === item.key ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-secondary"}`}
            onClick={() => setTab(item.key)}
          >
            {tText(item.label)}
          </button>
        ))}
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value=""><Tx>全部分类</Tx></option>
          {Object.entries(ADMIN_EVENT_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{tText(label)}</option>)}
        </select>
        <div className="ml-auto text-sm text-muted-foreground">
          {tText(`未读 ${summaryQuery.data?.unreadCount || 0} / 未处理 ${summaryQuery.data?.unresolvedCount || 0} / P0 ${summaryQuery.data?.p0Count || 0}`)}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[110px_90px_1fr_120px_220px] gap-3 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
          <span><Tx>级别</Tx></span>
          <span><Tx>分类</Tx></span>
          <span><Tx>事件</Tx></span>
          <span><Tx>状态</Tx></span>
          <span><Tx>操作</Tx></span>
        </div>
        {rows.length ? rows.map((item) => (
          <div key={item.id} className="grid grid-cols-[110px_90px_1fr_120px_220px] gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0">
            <div><span className={`rounded px-2 py-1 text-xs font-bold ${severityClass(item.severity)}`}>{item.severity}</span></div>
            <div className="flex items-center gap-1 text-muted-foreground">
              {item.category === "security" ? <Shield size={14} className="text-red-600" /> : <AlertTriangle size={14} className="text-amber-600" />}
              {tText(labelAdminEventCategory(item.category))}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">{item.title}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{tText(formatAdminEventSubtitle(item.message, item.eventType))}</div>
            </div>
            <div className="text-muted-foreground">{tText(labelAdminEventStatus(item.status))}</div>
            <div className="flex flex-wrap gap-1">
              <PermissionGate anyOf={EVENT_VIEW_PERMISSIONS}>
                <button type="button" className="rounded px-2 py-1 text-xs hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "read" })}><Eye size={13} className="mr-1 inline" /><Tx>已读</Tx></button>
              </PermissionGate>
              <PermissionGate anyOf={EVENT_MANAGE_PERMISSIONS}>
                <button type="button" className="rounded px-2 py-1 text-xs hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "ack" })}><Tx>确认</Tx></button>
                <button type="button" className="rounded px-2 py-1 text-xs hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "progress" })}><Tx>处理中</Tx></button>
                <button type="button" className="rounded px-2 py-1 text-xs text-emerald-700 hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "resolve" })}><CheckCircle2 size={13} className="mr-1 inline" /><Tx>完成</Tx></button>
                <button type="button" className="rounded px-2 py-1 text-xs hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "ignore" })}><XCircle size={13} className="mr-1 inline" /><Tx>忽略</Tx></button>
              </PermissionGate>
            </div>
          </div>
        )) : (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground"><Tx>暂无事件</Tx></div>
        )}
      </div>
    </div>
  );
}
