import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { AnimatedTable } from "@/modules/micro-interactions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import * as notificationService from "@/services/admin/notificationService";
import type { Notification } from "@/types/notification";
import { toastErrorMessage } from "@/utils/errorMessage";
import { labelNotificationType } from "@/utils/adminDisplayLabels";
import { adminConfirmDelete, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";

const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  sent: "已发送",
  scheduled: "定时发送",
  cancelled: "已取消",
  revoked: "已撤回",
  published: "已发布",
};

function labelNotificationStatus(value?: string | null) {
  if (!value) return "-";
  return NOTIFICATION_STATUS_LABELS[value] || value;
}

const NOTIFICATION_TYPE_OPTIONS = [
  { value: "system", label: "系统通知" },
  { value: "order", label: "订单通知" },
  { value: "shipping", label: "物流通知" },
  { value: "payment", label: "支付通知" },
  { value: "refund", label: "退款通知" },
  { value: "after_sale", label: "售后通知" },
  { value: "promotion", label: "活动通知" },
  { value: "coupon", label: "优惠券通知" },
  { value: "points", label: "积分通知" },
  { value: "reward", label: "奖励通知" },
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: "全部用户" },
  { value: "single", label: "单个用户" },
  { value: "specific", label: "指定用户" },
  { value: "has_order", label: "有订单用户" },
  { value: "no_order", label: "无订单用户" },
] as const;

type AudienceType = (typeof AUDIENCE_OPTIONS)[number]["value"];

type ManualForm = {
  title: string;
  content: string;
  type: string;
  audience_type: AudienceType;
  recipients: string;
  link_url: string;
  scheduled_at: string;
};

const EMPTY_MANUAL_FORM: ManualForm = {
  title: "",
  content: "",
  type: "system",
  audience_type: "all",
  recipients: "",
  link_url: "",
  scheduled_at: "",
};

function splitRecipientInput(value: string) {
  return value
    .split(/[\s,，;；\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { confirm } = useAdminConfirm();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<"list" | "manual" | "settings">("list");

  const [triggerLoading, setTriggerLoading] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [rules, setRules] = useState<notificationService.NotificationTriggerRule[]>([]);
  const [manualForm, setManualForm] = useState<ManualForm>(EMPTY_MANUAL_FORM);
  const [sendingManual, setSendingManual] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [estimatingAudience, setEstimatingAudience] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.fetchNotifications({ page, pageSize });
      setRows(data.list || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载通知失败"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (tab === "list") void load();
  }, [load, tab]);

  const loadTriggerSettings = useCallback(async () => {
    setTriggerLoading(true);
    try {
      const data = await notificationService.fetchNotificationTriggerSettings();
      setRules(
        (data || []).map((rule) => ({
          ...rule,
          title: (rule.title && String(rule.title).trim()) ? rule.title : (rule.default_title || ""),
          content: (rule.content && String(rule.content).trim()) ? rule.content : (rule.default_content || ""),
        })),
      );
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载内容设定失败"));
    } finally {
      setTriggerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "settings") void loadTriggerSettings();
  }, [tab, loadTriggerSettings]);

  const removeDraft = (id: string, title?: string) => {
    adminConfirmDelete(confirm, title || "该通知", async () => {
      try {
        await notificationService.deleteDraftNotification(id);
        toast.success("已删除");
        void load();
      } catch (e) {
        toast.error(toastErrorMessage(e, "删除失败"));
      }
    });
  };

  const buildManualPayload = async () => {
    const payload: Parameters<typeof notificationService.sendNotification>[0] = {
      title: manualForm.title.trim(),
      content: manualForm.content.trim(),
      type: manualForm.type,
      audience_type: manualForm.audience_type,
      link_url: manualForm.link_url.trim() || undefined,
      scheduled_at: manualForm.scheduled_at || undefined,
    };

    if (manualForm.audience_type === "single" || manualForm.audience_type === "specific") {
      const identifiers = splitRecipientInput(manualForm.recipients);
      if (!identifiers.length) throw new Error(manualForm.audience_type === "single" ? "请输入目标用户 ID 或手机号" : "请输入至少一个用户 ID 或手机号");
      const resolved = await notificationService.resolveNotificationUsers(identifiers);
      if (resolved.unresolved?.length) throw new Error(`以下用户未找到：${resolved.unresolved.join("、")}`);
      const ids = resolved.list.map((u) => String(u.id)).filter(Boolean);
      if (manualForm.audience_type === "single") {
        if (ids.length !== 1) throw new Error("单个用户发送只能填写一个有效用户");
        payload.user_id = ids[0];
      } else {
        payload.user_ids = ids;
      }
    }

    return payload;
  };

  const estimateManualAudience = async () => {
    setEstimatingAudience(true);
    try {
      const payload = await buildManualPayload();
      const data = await notificationService.estimateNotificationAudience(payload);
      setAudienceCount(data.estimated_recipients || 0);
      toast.success(`预计接收 ${data.estimated_recipients || 0} 人`);
    } catch (e) {
      setAudienceCount(null);
      toast.error(toastErrorMessage(e, "预估接收人数失败"));
    } finally {
      setEstimatingAudience(false);
    }
  };

  const submitManualNotification = async (mode: "send" | "draft") => {
    if (mode === "send") setSendingManual(true);
    else setSavingDraft(true);
    try {
      const payload = await buildManualPayload();
      if (mode === "send") {
        await notificationService.sendNotification(payload);
        toast.success(payload.scheduled_at ? "定时通知已创建" : "通知已发送");
      } else {
        await notificationService.saveNotificationDraft(payload);
        toast.success("草稿已保存");
      }
      setManualForm(EMPTY_MANUAL_FORM);
      setAudienceCount(null);
      setTab("list");
      void load();
    } catch (e) {
      toast.error(toastErrorMessage(e, mode === "send" ? "发送通知失败" : "保存草稿失败"));
    } finally {
      setSendingManual(false);
      setSavingDraft(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">通知管理</h1>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={`rounded-lg border px-3 py-1.5 text-sm ${tab === "list" ? "bg-secondary" : ""}`} onClick={() => setTab("list")}>通知列表</button>
        <PermissionGate anyOf={["notification.send", "notification.create", "notification.manage"]}>
          <button type="button" className={`rounded-lg border px-3 py-1.5 text-sm ${tab === "manual" ? "bg-secondary" : ""}`} onClick={() => setTab("manual")}>人工发布</button>
        </PermissionGate>
        <button type="button" className={`rounded-lg border px-3 py-1.5 text-sm ${tab === "settings" ? "bg-secondary" : ""}`} onClick={() => setTab("settings")}>内容设定</button>
      </div>

      {tab === "list" ? (
        <AnimatedTable
          loading={loading}
          rows={rows}
          rowKey={(n) => n.id}
          skeletonRows={6}
          skeletonCols={6}
          className="overflow-hidden rounded-2xl border border-border bg-card overflow-x-auto"
          tableClassName="w-full min-w-[780px] text-sm"
          thead={(
            <tr>
              <th className="px-4 py-3 text-left">标题</th>
              <th className="px-4 py-3 text-left">类型</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">接收/已读</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          emptyIcon={ADMIN_EMPTY_GUIDES.notifications.icon}
          emptyTitle={ADMIN_EMPTY_GUIDES.notifications.title}
          emptyDescription={ADMIN_EMPTY_GUIDES.notifications.description}
          emptyAction={(
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <PermissionGate anyOf={["notification.send", "notification.create", "notification.manage"]}>
                <button
                  type="button"
                  onClick={() => setTab("manual")}
                  className="rounded-lg btn-theme-price px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  去人工发布
                </button>
              </PermissionGate>
              <button
                type="button"
                onClick={() => setTab("settings")}
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs font-semibold text-foreground"
              >
                配置自动通知
              </button>
            </div>
          )}
          renderRow={(n) => (
            <>
              <td className="px-4 py-3">
                <button className="font-medium text-left hover:underline" onClick={() => navigate(`/admin/notifications/${n.id}`)}>{n.title}</button>
              </td>
              <td className="px-4 py-3">{labelNotificationType(n.type)}</td>
              <td className="px-4 py-3">{labelNotificationStatus(n.send_status || n.workflow_status)}</td>
              <td className="px-4 py-3 text-xs">{n.recipient_count || 0} / {n.read_count || 0}</td>
              <td className="px-4 py-3 text-center">
                <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => removeDraft(String(n.id), n.title)}>删除</button>
              </td>
            </>
          )}
        />
      ) : null}

      {tab === "manual" ? (
        <PermissionGate anyOf={["notification.send", "notification.create", "notification.manage"]}>
          <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="text-xs text-muted-foreground">通知类型</span>
                <select
                  value={manualForm.type}
                  onChange={(e) => setManualForm((p) => ({ ...p, type: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gold"
                >
                  {NOTIFICATION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-xs text-muted-foreground">接收对象</span>
                <select
                  value={manualForm.audience_type}
                  onChange={(e) => {
                    setAudienceCount(null);
                    setManualForm((p) => ({ ...p, audience_type: e.target.value as AudienceType }));
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gold"
                >
                  {AUDIENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            {(manualForm.audience_type === "single" || manualForm.audience_type === "specific") ? (
              <label className="space-y-1.5 text-sm">
                <span className="text-xs text-muted-foreground">{manualForm.audience_type === "single" ? "目标用户" : "指定用户"}</span>
                <textarea
                  value={manualForm.recipients}
                  onChange={(e) => {
                    setAudienceCount(null);
                    setManualForm((p) => ({ ...p, recipients: e.target.value }));
                  }}
                  placeholder="输入用户 ID 或手机号；多个用户可用换行、逗号、空格分隔"
                  className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gold"
                />
              </label>
            ) : null}

            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">通知标题</span>
              <input
                value={manualForm.title}
                onChange={(e) => setManualForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gold"
                placeholder="请输入通知标题"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">通知内容</span>
              <textarea
                value={manualForm.content}
                onChange={(e) => setManualForm((p) => ({ ...p, content: e.target.value }))}
                className="min-h-[128px] w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gold"
                placeholder="请输入通知内容"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="text-xs text-muted-foreground">跳转链接</span>
                <input
                  value={manualForm.link_url}
                  onChange={(e) => setManualForm((p) => ({ ...p, link_url: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gold"
                  placeholder="如 /coupons，可留空"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-xs text-muted-foreground">定时发送</span>
                <input
                  type="datetime-local"
                  value={manualForm.scheduled_at}
                  onChange={(e) => setManualForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gold"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="text-xs text-muted-foreground">
                {audienceCount === null ? "发送前可先预估接收人数" : `预计接收：${audienceCount} 人`}
              </div>
              <div className="flex flex-wrap gap-2">
                <PermissionGate anyOf={["notification.send", "notification.create", "notification.manage"]}>
                  <button
                    type="button"
                    disabled={estimatingAudience || sendingManual || savingDraft}
                    onClick={() => void estimateManualAudience()}
                    className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {estimatingAudience ? "预估中..." : "预估人数"}
                  </button>
                </PermissionGate>
                <PermissionGate anyOf={["notification.create", "notification.manage"]}>
                  <button
                    type="button"
                    disabled={savingDraft || sendingManual}
                    onClick={() => void submitManualNotification("draft")}
                    className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {savingDraft ? "保存中..." : "保存草稿"}
                  </button>
                </PermissionGate>
                <PermissionGate anyOf={["notification.send", "notification.manage"]}>
                  <button
                    type="button"
                    disabled={sendingManual || savingDraft}
                    onClick={() => void submitManualNotification("send")}
                    className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
                  >
                    <Send size={16} />
                    {sendingManual ? "发布中..." : "发布通知"}
                  </button>
                </PermissionGate>
              </div>
            </div>
          </section>
        </PermissionGate>
      ) : null}

      {tab === "settings" ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          {triggerLoading ? <div className="text-sm text-muted-foreground">加载中...</div> : null}
          {!triggerLoading && rules.length === 0 ? <div className="text-sm text-muted-foreground">暂无内容设定规则</div> : null}
          <div className="space-y-4">
            {rules.map((rule) => (
              <article key={rule.key} className="rounded-xl border border-border bg-background p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{rule.label}</p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!rule.enabled}
                      onChange={(e) => setRules((prev) => prev.map((x) => (x.key === rule.key ? { ...x, enabled: e.target.checked } : x)))}
                    />
                    启用
                  </label>
                </div>
                <input
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  placeholder={rule.default_title || "标题模板"}
                  value={rule.title || ""}
                  onChange={(e) => setRules((prev) => prev.map((x) => (x.key === rule.key ? { ...x, title: e.target.value } : x)))}
                />
                <textarea
                  className="min-h-[88px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  placeholder={rule.default_content || "内容模板"}
                  value={rule.content || ""}
                  onChange={(e) => setRules((prev) => prev.map((x) => (x.key === rule.key ? { ...x, content: e.target.value } : x)))}
                />
                <div className="space-y-1 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                  <p>默认标题：{rule.default_title || "无"}</p>
                  <p>默认内容：{rule.default_content || "无"}</p>
                  {rule.placeholders?.length ? <p>可用占位符：{rule.placeholders.map((x) => `{${x}}`).join("、")}</p> : null}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={savingRules}
              className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm disabled:opacity-60"
              onClick={async () => {
                setSavingRules(true);
                try {
                  await notificationService.saveNotificationTriggerSettings(rules);
                  toast.success("内容设定已保存");
                } catch (e) {
                  toast.error(toastErrorMessage(e, "保存内容设定失败"));
                } finally {
                  setSavingRules(false);
                }
              }}
            >
              {savingRules ? "保存中..." : "保存内容设定"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
