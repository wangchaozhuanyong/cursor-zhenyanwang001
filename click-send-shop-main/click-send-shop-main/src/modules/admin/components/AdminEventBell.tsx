import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle2, Eye, Shield, Siren, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as eventService from "@/services/admin/eventCenterService";

const tabs = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待处理" },
  { key: "urgent", label: "紧急" },
  { key: "security", label: "安全" },
  { key: "recovered", label: "已恢复" },
] as const;

function severityClass(severity: string) {
  if (severity === "P0") return "bg-red-600 text-white";
  if (severity === "P1") return "bg-orange-500 text-white";
  if (severity === "P2") return "bg-amber-100 text-amber-800";
  return "bg-secondary text-muted-foreground";
}

export default function AdminEventBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("pending");

  const summaryQuery = useQuery({
    queryKey: adminQueryKeys.eventCenterSummary(),
    queryFn: eventService.fetchAdminEventSummary,
    refetchInterval: 15000,
  });
  const eventsQuery = useQuery({
    queryKey: adminQueryKeys.eventCenterEvents({ tab, page: 1, pageSize: 8 }),
    queryFn: () => eventService.fetchAdminEvents({ tab, page: 1, pageSize: 8 }),
    enabled: open,
    refetchInterval: open ? 15000 : false,
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

  const summary = summaryQuery.data;
  const badge = Math.max(summary?.unreadCount || 0, summary?.p0Count || 0);
  const rows = eventsQuery.data?.list || [];
  const hasP0 = (summary?.p0Count || 0) > 0;

  const counts = useMemo(() => [
    { label: "未读", value: summary?.unreadCount || 0 },
    { label: "未处理", value: summary?.unresolvedCount || 0 },
    { label: "P0", value: summary?.p0Count || 0 },
    { label: "安全", value: summary?.securityCount || 0 },
  ], [summary]);

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="后台事件中心"
        className={`touch-manipulation relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-secondary ${hasP0 ? "text-red-600" : "text-muted-foreground"}`}
        onClick={() => setOpen((v) => !v)}
      >
        {hasP0 ? <Siren size={20} /> : <Bell size={20} />}
        {badge > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-[min(94vw,28rem)] rounded-xl border border-border bg-card p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle size={17} className={hasP0 ? "text-red-600" : "text-muted-foreground"} />
              <p className="truncate text-sm font-semibold text-foreground">后台事件监控</p>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => {
                setOpen(false);
                navigate("/admin/event-center");
              }}
            >
              事件中心
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {counts.map((item) => (
              <div key={item.label} className="rounded-lg border border-border px-2 py-1.5 text-center">
                <div className="text-sm font-semibold text-foreground">{item.value}</div>
                <div className="text-[11px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs ${tab === item.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"}`}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-2 max-h-80 overflow-y-auto">
            {rows.length ? rows.map((item) => (
              <div key={item.id} className="border-b border-border py-2 last:border-b-0">
                <button
                  type="button"
                  className="flex w-full gap-2 rounded-lg p-1 text-left hover:bg-secondary"
                  onClick={() => {
                    setOpen(false);
                    navigate(`/admin/event-center?eventId=${encodeURIComponent(item.id)}`);
                  }}
                >
                  {item.category === "security" ? <Shield size={15} className="mt-0.5 shrink-0 text-red-600" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${severityClass(item.severity)}`}>{item.severity}</span>
                      <span className="truncate text-xs font-medium text-foreground">{item.title}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.message || item.eventType}</span>
                  </span>
                </button>
                <div className="mt-1 flex flex-wrap gap-1 pl-7">
                  <button type="button" className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "read" })}><Eye size={12} className="mr-1 inline" />已读</button>
                  <button type="button" className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "ack" })}>确认</button>
                  <button type="button" className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "progress" })}>处理中</button>
                  <button type="button" className="rounded px-2 py-1 text-[11px] text-emerald-700 hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "resolve" })}><CheckCircle2 size={12} className="mr-1 inline" />完成</button>
                  <button type="button" className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary" onClick={() => actionMutation.mutate({ id: item.id, action: "ignore" })}><XCircle size={12} className="mr-1 inline" />忽略</button>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-xs text-muted-foreground">暂无事件</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
