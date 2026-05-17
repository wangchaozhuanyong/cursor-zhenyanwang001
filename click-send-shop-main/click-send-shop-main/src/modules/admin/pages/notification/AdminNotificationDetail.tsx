import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import * as notificationService from "@/services/admin/notificationService";
import { labelNotificationType } from "@/utils/adminDisplayLabels";
import { toastErrorMessage } from "@/utils/errorMessage";

export default function AdminNotificationDetail() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [readFilter, setReadFilter] = useState<"" | "read" | "unread">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<null | Awaited<ReturnType<typeof notificationService.fetchNotificationDetail>>>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    notificationService.fetchNotificationDetail(id, { read_status: readFilter || undefined, page, pageSize })
      .then(setData)
      .catch((e) => toast.error(toastErrorMessage(e, "加载通知详情失败")))
      .finally(() => setLoading(false));
  }, [id, readFilter, page, pageSize]);

  if (loading || !data) return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => navigate("/admin/notifications")}> <ArrowLeft size={14} /> </button>
          <h1 className="text-xl font-bold">通知详情</h1>
        </div>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs"
          onClick={() =>
            notificationService
              .exportNotificationRecipientsCsv(id, readFilter)
              .catch((e) => toast.error(toastErrorMessage(e, "导出失败")))
          }
        >
          导出接收用户 CSV
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><div className="text-xs text-muted-foreground">标题</div><div>{data.title}</div></div>
        <div><div className="text-xs text-muted-foreground">类型</div><div>{labelNotificationType(data.type)}</div></div>
        <div><div className="text-xs text-muted-foreground">发送状态</div><div>{data.send_status}</div></div>
        <div><div className="text-xs text-muted-foreground">受众</div><div>{data.audience_type}</div></div>
        <div><div className="text-xs text-muted-foreground">接收人数</div><div>{data.recipient_count}</div></div>
        <div><div className="text-xs text-muted-foreground">已读人数</div><div>{data.read_count}</div></div>
        <div><div className="text-xs text-muted-foreground">已读率</div><div>{(data.read_rate * 100).toFixed(2)}%</div></div>
        <div><div className="text-xs text-muted-foreground">定时/发送</div><div>{data.scheduled_at || data.sent_at || "-"}</div></div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground">内容</div>
        <div className="mt-1 whitespace-pre-wrap text-sm">{data.content}</div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">接收用户</h3>
          <div className="flex gap-2">
            <button className={`rounded-lg border px-2 py-1 text-xs ${readFilter === "" ? "bg-secondary" : ""}`} onClick={() => { setReadFilter(""); setPage(1); }}>全部</button>
            <button className={`rounded-lg border px-2 py-1 text-xs ${readFilter === "read" ? "bg-secondary" : ""}`} onClick={() => { setReadFilter("read"); setPage(1); }}>已读</button>
            <button className={`rounded-lg border px-2 py-1 text-xs ${readFilter === "unread" ? "bg-secondary" : ""}`} onClick={() => { setReadFilter("unread"); setPage(1); }}>未读</button>
          </div>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60"><tr><th className="px-3 py-2 text-left">用户</th><th className="px-3 py-2 text-left">手机</th><th className="px-3 py-2 text-left">WhatsApp</th><th className="px-3 py-2 text-left">状态</th></tr></thead>
            <tbody>{data.recipients.list.map((r) => <tr key={r.id} className="border-t border-border"><td className="px-3 py-2">{r.nickname || r.user_id}</td><td className="px-3 py-2">{r.phone || "-"}</td><td className="px-3 py-2">{r.whatsapp || "-"}</td><td className="px-3 py-2">{r.is_read ? "已读" : "未读"}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>共 {data.recipients.total} 条</span>
          <div className="flex items-center gap-2">
            <select
              className="rounded border px-2 py-1"
              value={pageSize}
              onChange={(e) => {
                const v = Number(e.target.value) || 20;
                setPageSize(v);
                setPage(1);
              }}
            >
              <option value={10}>10/页</option>
              <option value={20}>20/页</option>
              <option value={50}>50/页</option>
            </select>
            <button className="rounded border px-2 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</button>
            <span>第 {data.recipients.page} 页</span>
            <button
              className="rounded border px-2 py-1 disabled:opacity-50"
              disabled={data.recipients.page * data.recipients.pageSize >= data.recipients.total}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 font-semibold">操作日志</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60"><tr><th className="px-3 py-2 text-left">时间</th><th className="px-3 py-2 text-left">操作人</th><th className="px-3 py-2 text-left">动作</th><th className="px-3 py-2 text-left">摘要</th></tr></thead>
            <tbody>{data.logs.map((l) => <tr key={l.id} className="border-t border-border"><td className="px-3 py-2">{new Date(l.created_at).toLocaleString("zh-CN")}</td><td className="px-3 py-2">{l.operator_name || "-"}</td><td className="px-3 py-2">{l.action_type}</td><td className="px-3 py-2">{l.summary || "-"}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
