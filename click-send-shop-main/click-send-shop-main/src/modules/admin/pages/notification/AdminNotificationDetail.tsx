import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDateTime } from "@/utils/formatDateTime";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import * as notificationService from "@/services/admin/notificationService";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { toastErrorMessage } from "@/utils/errorMessage";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { adminTdClassName, adminThClassName } from "@/utils/adminTableClasses";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminTabTitle } from "@/hooks/useAdminTabTitle";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  sent: "已发送",
  scheduled: "定时发送",
  cancelled: "已取消",
  revoked: "已撤回",
  published: "已发布",
};

const AUDIENCE_TYPE_LABELS: Record<string, string> = {
  all: "全部用户",
  single: "单个用户",
  specific: "指定用户",
  user_tag: "用户标签",
  member_level: "会员等级",
  has_order: "有订单用户",
  no_order: "无订单用户",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "notification.send": "发送通知",
  "notification.draft.create": "保存草稿",
  "notification.publish": "发布通知",
  "notification.trigger_settings.update": "更新内容设定",
  "notification.trigger.test_send": "测试发送",
  "notification.delete": "删除草稿",
  "notification.cancel": "取消定时通知",
  "notification.revoke": "撤回通知",
};

export default function AdminNotificationDetail() {
  const { tText } = useAdminT();
  const { notificationType: labelNotificationType } = useAdminDisplayLabel();
  const labelNotificationStatus = (value?: string | null) => {
    if (!value) return "-";
    const zh = NOTIFICATION_STATUS_LABELS[value];
    return zh ? tText(zh) : value;
  };
  const labelAudienceType = (value?: string | null) => {
    if (!value) return "-";
    const zh = AUDIENCE_TYPE_LABELS[value];
    return zh ? tText(zh) : value;
  };
  const labelAuditAction = (value?: string | null) => {
    if (!value) return "-";
    const zh = AUDIT_ACTION_LABELS[value];
    return zh ? tText(zh) : value;
  };
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [readFilter, setReadFilter] = useState<"" | "read" | "unread">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, loading, error } = useAsyncResource(
    [id, readFilter, page, pageSize],
    () =>
      notificationService.fetchNotificationDetail(
        id,
        { read_status: readFilter || undefined, page, pageSize },
      ),
    {
      enabled: Boolean(id),
      resetOnChange: true,
      toastFallback: tText("加载通知详情失败"),
      toast: (message) => toast.error(message),
    },
  );

  const tabTitle = useMemo(() => {
    if (!data?.title?.trim()) return null;
    return tText(`通知：${data.title.trim()}`);
  }, [data?.title, tText]);
  useAdminTabTitle(tabTitle, !loading && Boolean(data?.title));

  if (!id) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Tx>缺少通知信息</Tx>
      </div>
    );
  }

  if (loading && !data) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground"><Tx>加载中...</Tx></div>;
  }

  if (error && !data) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-[var(--theme-danger)]">{error}</p>
        <p className="text-xs text-muted-foreground">
          {error.includes("不存在")
            ? tText("该通知可能已被删除，或当前链接已失效。")
            : tText("请稍后重试；若持续出现，请联系技术人员并说明操作时间。")}
        </p>
        <UnifiedButton
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs font-medium"
          onClick={() => navigate("/admin/notifications")}
        >
          <Tx>返回通知列表</Tx>
        </UnifiedButton>
      </div>
    );
  }

  if (!data) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground"><Tx>加载中...</Tx></div>;
  }

  return (
    <AdminPageShell
      toolbar={(
        <>
          <UnifiedButton type="button" className="rounded-lg border px-2 py-1 text-xs" onClick={() => navigate("/admin/notifications")} aria-label={tText("返回通知列表")}>
            <ArrowLeft size={14} />
          </UnifiedButton>
          <UnifiedButton
            type="button"
            className="rounded-lg border px-3 py-1.5 text-xs"
            onClick={() =>
              notificationService
                .exportNotificationRecipientsCsv(id, readFilter)
                .catch((e) => toast.error(toastErrorMessage(e, tText("导出失败"))))
            }
          >
            <Tx>导出接收用户 CSV</Tx>
          </UnifiedButton>
        </>
      )}
    >
      <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><div className="text-xs text-muted-foreground"><Tx>标题</Tx></div><div>{data.title}</div></div>
        <div><div className="text-xs text-muted-foreground"><Tx>类型</Tx></div><div>{labelNotificationType(data.type)}</div></div>
        <div><div className="text-xs text-muted-foreground"><Tx>发送状态</Tx></div><div>{labelNotificationStatus(data.send_status)}</div></div>
        <div><div className="text-xs text-muted-foreground"><Tx>受众</Tx></div><div>{labelAudienceType(data.audience_type)}</div></div>
        <div><div className="text-xs text-muted-foreground"><Tx>接收人数</Tx></div><div>{data.recipient_count}</div></div>
        <div><div className="text-xs text-muted-foreground"><Tx>已读人数</Tx></div><div>{data.read_count}</div></div>
        <div><div className="text-xs text-muted-foreground"><Tx>已读率</Tx></div><div>{(data.read_rate * 100).toFixed(2)}%</div></div>
        <div><div className="text-xs text-muted-foreground"><Tx>定时/发送</Tx></div><div>{formatDateTime(data.scheduled_at || data.sent_at)}</div></div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground"><Tx>内容</Tx></div>
        <div className="mt-1 whitespace-pre-wrap text-sm">{data.content}</div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold"><Tx>接收用户</Tx></h3>
          <div className="flex gap-2">
            <UnifiedButton className={`rounded-lg border px-2 py-1 text-xs ${readFilter === "" ? "bg-secondary" : ""}`} onClick={() => { setReadFilter(""); setPage(1); }}><Tx>全部</Tx></UnifiedButton>
            <UnifiedButton className={`rounded-lg border px-2 py-1 text-xs ${readFilter === "read" ? "bg-secondary" : ""}`} onClick={() => { setReadFilter("read"); setPage(1); }}><Tx>已读</Tx></UnifiedButton>
            <UnifiedButton className={`rounded-lg border px-2 py-1 text-xs ${readFilter === "unread" ? "bg-secondary" : ""}`} onClick={() => { setReadFilter("unread"); setPage(1); }}><Tx>未读</Tx></UnifiedButton>
          </div>
        </div>
        <AdminNativeTable stickyFirstColumn={false}>
            <thead className="bg-secondary/60">
              <tr>
                <th className={adminThClassName(undefined, "left")}><Tx>用户</Tx></th>
                <th className={adminThClassName(undefined, "left")}><Tx>手机</Tx></th>
                <th className={adminThClassName(undefined, "left")}>WhatsApp</th>
                <th className={adminThClassName(undefined, "center")}><Tx>状态</Tx></th>
              </tr>
            </thead>
            <tbody>
              {data.recipients.list.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className={adminTdClassName(undefined, "left")}>{r.nickname || r.phone || r.whatsapp || tText("未命名用户")}</td>
                  <td className={adminTdClassName(undefined, "left")}>{r.phone || "-"}</td>
                  <td className={adminTdClassName(undefined, "left")}>{r.whatsapp || "-"}</td>
                  <td className={adminTdClassName(undefined, "center")}>{r.is_read ? tText("已读") : tText("未读")}</td>
                </tr>
              ))}
            </tbody>
        </AdminNativeTable>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{tText("共")} {data.recipients.total} {tText("条")}</span>
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
              <option value={10}><Tx>10/页</Tx></option>
              <option value={20}><Tx>20/页</Tx></option>
              <option value={50}><Tx>50/页</Tx></option>
            </select>
            <UnifiedButton className="rounded border px-2 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><Tx>上一页</Tx></UnifiedButton>
            <span>第 {data.recipients.page} 页</span>
            <UnifiedButton
              className="rounded border px-2 py-1 disabled:opacity-50"
              disabled={data.recipients.page * data.recipients.pageSize >= data.recipients.total}
              onClick={() => setPage((p) => p + 1)}
            >
              <Tx>下一页</Tx>
            </UnifiedButton>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 font-semibold"><Tx>操作日志</Tx></h3>
        <AdminNativeTable stickyFirstColumn={false}>
            <thead className="bg-secondary/60">
              <tr>
                <th className={adminThClassName(undefined, "left")}><Tx>时间</Tx></th>
                <th className={adminThClassName(undefined, "left")}><Tx>操作人</Tx></th>
                <th className={adminThClassName(undefined, "left")}><Tx>动作</Tx></th>
                <th className={adminThClassName(undefined, "left")}><Tx>摘要</Tx></th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className={adminTdClassName(undefined, "left")}>{formatDateTime(l.created_at)}</td>
                  <td className={adminTdClassName(undefined, "left")}>{l.operator_name || "-"}</td>
                  <td className={adminTdClassName(undefined, "left")}>{labelAuditAction(l.action_type)}</td>
                  <td className={adminTdClassName(undefined, "left")}>{l.summary || "-"}</td>
                </tr>
              ))}
            </tbody>
        </AdminNativeTable>
      </div>
    </AdminPageShell>
  );
}
