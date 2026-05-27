import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Tx } from "@/components/admin/AdminText";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as eventService from "@/services/admin/eventCenterService";
import { formatDateTime } from "@/utils/formatDateTime";
import {
  formatAdminEventSubtitle,
  formatAdminEventTitle,
  labelAdminEventCategory,
  labelAdminEventSeverity,
  labelAdminEventStatus,
} from "@/utils/adminEventLabels";

function JsonPanel({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}

export default function AdminEventDetail() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: [...adminQueryKeys.eventCenterRoot(), "detail", id],
    queryFn: () => eventService.fetchAdminEventDetail(id),
    enabled: Boolean(id),
  });

  const closeMutation = useMutation({
    mutationFn: async (action: "resolve" | "ignore" | "ack") => {
      const remark = action === "ack" ? undefined : window.prompt("请输入处理备注，P0/P1 必填") || undefined;
      if (action === "resolve") return eventService.resolveAdminEvent(id, remark);
      if (action === "ignore") return eventService.ignoreAdminEvent(id, remark);
      return eventService.acknowledgeAdminEvent(id, remark);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.eventCenterRoot() });
    },
  });

  const detail = detailQuery.data;
  const event = detail?.event;
  const actions = detail?.actions || [];
  const monitoringUrl = event?.payload && typeof event.payload === "object" && "linkUrl" in event.payload
    ? String((event.payload as { linkUrl?: string }).linkUrl || "")
    : "";

  return (
    <AdminPageShell hint={<Tx>查看事件基础信息、诊断、Payload、处理时间线、操作人、备注和 Telegram 升级记录。</Tx>}>
      {!event ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          {detailQuery.isLoading ? <Tx>加载中...</Tx> : <Tx>事件不存在或无权限查看</Tx>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-red-50 px-2 py-1 font-semibold text-red-700">{labelAdminEventSeverity(event.severity)}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{labelAdminEventCategory(event.category)}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{labelAdminEventStatus(event.status)}</span>
                </div>
                <h1 className="mt-3 text-xl font-semibold text-foreground">{formatAdminEventTitle(event.title, event.eventType, event.category)}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{formatAdminEventSubtitle(event.message, event.eventType, event.category, event.title)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded border border-border px-3 py-2 text-sm" onClick={() => closeMutation.mutate("ack")}><Tx>确认</Tx></button>
                <button className="rounded border border-border px-3 py-2 text-sm" onClick={() => closeMutation.mutate("ignore")}><Tx>忽略</Tx></button>
                <button className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => closeMutation.mutate("resolve")}><Tx>完成</Tx></button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
              <h2 className="text-base font-semibold text-foreground"><Tx>诊断与下一步</Tx></h2>
              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
                <div className="font-medium">{event.diagnosis?.summary || "需要人工确认"}</div>
                <div>{event.diagnosis?.nextAction || "查看关联业务数据，处理根因后再关闭。"}</div>
                {event.diagnosis?.closeHint ? <div className="mt-1 opacity-80">{event.diagnosis.closeHint}</div> : null}
                {monitoringUrl ? <Link className="mt-2 inline-block font-semibold text-blue-700" to={monitoringUrl}><Tx>跳转监控异常详情</Tx></Link> : null}
              </div>
            </section>
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-base font-semibold text-foreground"><Tx>基础信息</Tx></h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">ID</dt><dd className="truncate">{event.id}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">类型</dt><dd className="truncate">{event.eventType}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">重复次数</dt><dd>{event.seenCount}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">负责人</dt><dd>{event.assigneeLabel || event.assigneeId || "-"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">首次出现</dt><dd>{formatDateTime(event.firstSeenAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">最后出现</dt><dd>{formatDateTime(event.lastSeenAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">关闭原因</dt><dd>{event.closedReason || "-"}</dd></div>
              </dl>
            </section>
          </div>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground"><Tx>Payload</Tx></h2>
            <div className="mt-3"><JsonPanel value={event.payload} /></div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground"><Tx>处理时间线</Tx></h2>
            <div className="mt-3 space-y-3">
              {actions.map((action) => (
                <div key={action.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{action.actionType}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(action.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {action.operatorLabel || action.operatorType} · {action.fromStatus || "-"} → {action.toStatus || "-"}
                  </div>
                  {action.remark ? <p className="mt-2 text-sm text-foreground">{action.remark}</p> : null}
                  {action.actionType.includes("telegram") ? <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800"><Tx>Telegram 升级记录</Tx></div> : null}
                </div>
              ))}
              {!actions.length ? <div className="text-sm text-muted-foreground"><Tx>暂无处理记录</Tx></div> : null}
            </div>
          </section>
        </div>
      )}
    </AdminPageShell>
  );
}
