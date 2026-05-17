import { useEffect, useState } from "react";
import { Bell, Plus, Trash2, Loader2, Send, Settings } from "lucide-react";
import { AnimatedTable, LoadingButton } from "@/modules/micro-interactions";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import SegmentedDateTimeInput from "@/components/admin/SegmentedDateTimeInput";
import Pagination from "@/components/admin/Pagination";
import * as notificationService from "@/services/admin/notificationService";
import type { Notification } from "@/types/notification";
import { toastErrorMessage } from "@/utils/errorMessage";
import { labelNotificationType, NOTIFICATION_TYPE_LABELS } from "@/utils/adminDisplayLabels";
import { Tx } from "@/components/admin/AdminText";
import { adminConfirmDelete, adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";

const typeLabels = NOTIFICATION_TYPE_LABELS;

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<Array<{ code: string; name: string; type: string; title: string; content: string }>>([]);
  const [triggerRules, setTriggerRules] = useState<notificationService.NotificationTriggerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTriggers, setSavingTriggers] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ keyword: "", type: "", send_status: "", audience_type: "", workflow_status: "" });
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "system",
    audience_type: "all" as "all" | "single",
    user_id: "",
    scheduled_at: "",
    link_url: "",
    template_code: "",
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      notificationService.fetchNotifications({
        page,
        pageSize,
        keyword: filters.keyword,
        type: filters.type,
        send_status: filters.send_status,
        audience_type: filters.audience_type,
        workflow_status: filters.workflow_status,
      }),
      notificationService.fetchNotificationTemplates(),
      notificationService.fetchNotificationTriggerSettings(),
    ])
      .then(([p, t, triggerSettings]) => {
        setNotifications(p.list);
        setTotal(p.total);
        setTemplates(t || []);
        setTriggerRules(triggerSettings || []);
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filters]);

  const applyTemplate = (code: string) => {
    const t = templates.find((item) => item.code === code);
    if (!t) return;
    setFormData((prev) => ({
      ...prev,
      template_code: t.code,
      type: t.type,
      title: t.title,
      content: t.content,
    }));
  };

  const updateFilter = (key: "keyword" | "type" | "send_status" | "audience_type" | "workflow_status", value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSend = async () => {
    if (!formData.title || !formData.content) { toast.error("请填写完整信息"); return; }
    if (formData.audience_type === "single" && !formData.user_id.trim()) {
      toast.error("请选择单用户发送时，请填写用户ID");
      return;
    }
    setFormSubmitting(true);
    try {
      await notificationService.sendNotification(formData);
      toast.success("通知已发送");
      setShowForm(false);
      setFormData({ title: "", content: "", type: "system", audience_type: "all", user_id: "", scheduled_at: "", link_url: "", template_code: "" });
      loadData();
    } catch (e) {
      toast.error(toastErrorMessage(e, "发送失败"));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title) { toast.error("草稿至少需要标题"); return; }
    setFormSubmitting(true);
    try {
      await notificationService.saveNotificationDraft(formData);
      toast.success("草稿已保存");
      setShowForm(false);
      loadData();
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存草稿失败"));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handlePublish = (id: string) => {
    notificationService.publishNotification(id)
      .then(() => {
        toast.success("发布成功");
        loadData();
      })
      .catch((e) => toast.error(toastErrorMessage(e, "发布失败")));
  };

  const handleDelete = (id: string) => {
    const n = notifications.find((item) => String(item.id) === id);
    adminConfirmDelete(confirm, n?.title || "该通知", () =>
      notificationService
        .deleteNotification(id)
        .then(() => {
          toast.success("已删除");
          loadData();
        })
        .catch((e) => toast.error(toastErrorMessage(e, "删除失败"))),
    );
  };

  const toggleTriggerRule = (key: string) => {
    setTriggerRules((prev) => prev.map((rule) => (
      rule.key === key ? { ...rule, enabled: !rule.enabled } : rule
    )));
  };

  const updateTriggerCopy = (key: string, field: "title" | "content", value: string) => {
    setTriggerRules((prev) => prev.map((rule) => (
      rule.key === key ? { ...rule, [field]: value } : rule
    )));
  };

  const triggerPlaceholderHint = (rule: notificationService.NotificationTriggerRule) => {
    const ph = rule.placeholders;
    if (!ph?.length) return "";
    return `可用占位符：${ph.map((p) => `{${p}}`).join(" ")}`;
  };

  const handleSaveTriggerRules = async () => {
    setSavingTriggers(true);
    try {
      const saved = await notificationService.saveNotificationTriggerSettings(triggerRules);
      setTriggerRules(saved || []);
      toast.success("自动触发规则已保存");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存自动触发规则失败"));
    } finally {
      setSavingTriggers(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground"><Tx>通知管理</Tx></h1>
          <p className="text-sm text-muted-foreground"><Tx>向用户推送通知和公告（列表为数据库实时数据，无前端写死演示项）。</Tx></p>
        </div>
        <PermissionGate permission="notification.manage">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-primary-foreground active:scale-[0.98]">
            <Plus size={16} /><Tx> 新建通知
          </Tx></button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Bell size={16} /><span className="text-xs"><Tx>总通知</Tx></span></div>
          <p className="mt-1 text-xl font-bold text-foreground">{notifications.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Bell size={16} /><span className="text-xs"><Tx>未读</Tx></span></div>
          <p className="mt-1 text-xl font-bold text-foreground">{notifications.filter((n) => !n.is_read).length}</p>
        </div>
      </div>

      <PermissionGate permission="notification.manage">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Settings size={17} className="text-gold" />
                <h2 className="text-sm font-bold text-foreground"><Tx>自动触发通知设置</Tx></h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground"><Tx>
                控制订单、支付、售后等业务操作是否自动向客户端通知中心推送消息。可为每条规则单独填写标题与正文；留空则使用默认话术（见输入框占位提示）。
              </Tx></p>
            </div>
            <LoadingButton
              type="button"
              variant="gold"
              state={savingTriggers ? "loading" : "normal"}
              loadingText="保存中..."
              onClick={() => adminConfirmSave(confirm, "自动触发规则", () => handleSaveTriggerRules())}
              className="rounded-xl px-4 py-2.5 text-xs font-bold"
            ><Tx>
              保存规则
            </Tx></LoadingButton>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {triggerRules.map((rule) => (
              <div
                key={rule.key}
                className="rounded-xl border border-border bg-background/50 p-3"
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleTriggerRule(rule.key)}
                    className="mt-1 h-4 w-4 shrink-0 accent-gold"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{rule.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{rule.description}</span>
                  </span>
                </label>
                <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                  <input
                    type="text"
                    disabled={!rule.enabled}
                    placeholder={rule.default_title ? `默认：${rule.default_title}` : "自定义标题（留空用默认）"}
                    value={rule.title ?? ""}
                    onChange={(e) => updateTriggerCopy(rule.key, "title", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-gold disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <textarea
                    disabled={!rule.enabled}
                    placeholder={rule.default_content ? `默认：${rule.default_content}` : "自定义正文（留空用默认）"}
                    value={rule.content ?? ""}
                    onChange={(e) => updateTriggerCopy(rule.key, "content", e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-gold disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {triggerPlaceholderHint(rule) ? (
                    <p className="text-[10px] leading-relaxed text-muted-foreground">{triggerPlaceholderHint(rule)}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </PermissionGate>

      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-3 md:grid-cols-5">
        <input value={filters.keyword} onChange={(e) => updateFilter("keyword", e.target.value)} placeholder="关键词筛选" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <select value={filters.type} onChange={(e) => updateFilter("type", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value=""><Tx>全部类型</Tx></option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.send_status} onChange={(e) => updateFilter("send_status", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value=""><Tx>全部发送状态</Tx></option>
          <option value="draft"><Tx>草稿</Tx></option>
          <option value="scheduled"><Tx>定时中</Tx></option>
          <option value="sent"><Tx>已发送</Tx></option>
          <option value="cancelled"><Tx>已撤回</Tx></option>
        </select>
        <select value={filters.audience_type} onChange={(e) => updateFilter("audience_type", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value=""><Tx>全部受众</Tx></option>
          <option value="all"><Tx>全部用户</Tx></option>
          <option value="single"><Tx>单用户</Tx></option>
        </select>
        <select value={filters.workflow_status} onChange={(e) => updateFilter("workflow_status", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value=""><Tx>全部流转状态</Tx></option>
          <option value="draft"><Tx>草稿</Tx></option>
          <option value="published"><Tx>已发布</Tx></option>
          <option value="cancelled"><Tx>已取消</Tx></option>
        </select>
      </div>

      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="skeleton-base skeleton-shimmer h-4 w-2/3 rounded" />
                <div className="skeleton-base skeleton-shimmer h-12 w-full rounded" />
                <div className="skeleton-base skeleton-shimmer h-10 w-full rounded-xl" />
              </div>
            ))
          : null}
        {!loading && notifications.map((n) => (
          <div key={n.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-foreground">{n.title}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${n.is_read ? "bg-muted text-muted-foreground" : "bg-gold/10 text-gold"}`}>
                {n.is_read ? "已读" : "未读"}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{n.content}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{labelNotificationType(n.type)}</span>
              <span className="text-[11px] text-muted-foreground">{n.created_at ? new Date(n.created_at).toLocaleString("zh-CN") : "—"}</span>
            </div>
            <PermissionGate permission="notification.manage">
              <button type="button" onClick={() => handleDelete(String(n.id))} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-xl border border-destructive/30 py-2 text-sm text-destructive active:bg-destructive/10">
                <Trash2 size={16} /><Tx> 删除
              </Tx></button>
            </PermissionGate>
          </div>
        ))}
        {!loading && notifications.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground"><Tx>暂无通知</Tx></div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <div className="hidden md:block">
        <AnimatedTable
          loading={loading}
          rows={notifications}
          rowKey={(n) => n.id}
          skeletonRows={8}
          skeletonCols={7}
          className="overflow-hidden rounded-2xl border border-border bg-card overflow-x-auto"
          tableClassName="w-full min-w-[800px] text-sm"
          theadClassName="border-b border-border bg-secondary/50"
          thead={(
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>标题</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>内容</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>类型</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>发送状态</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>受众/已读</Tx></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><Tx>时间</Tx></th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground"><Tx>操作</Tx></th>
            </tr>
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          emptyIcon={Bell}
          emptyTitle="暂无通知"
          renderRow={(n) => (
            <>
              <td className="px-4 py-3 font-medium">{n.title}</td>
              <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{n.content}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {labelNotificationType(n.type)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  n.send_status === "scheduled"
                    ? "bg-blue-50 text-blue-600"
                    : n.send_status === "cancelled"
                      ? "bg-muted text-muted-foreground"
                      : "bg-emerald-50 text-emerald-600"
                }`}>
                  {n.send_status === "scheduled" ? "定时中" : n.send_status === "cancelled" ? "已撤回" : "已发送"}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {(n.audience_type === "all" ? "全部用户" : "单用户")} / {n.read_count || 0}/{n.recipient_count || 0}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{n.created_at ? new Date(n.created_at).toLocaleString("zh-CN") : "—"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center">
                  <PermissionGate permission="notification.manage">
                    <div className="flex items-center gap-1">
                      {n.workflow_status === "draft" && (
                        <button
                          type="button"
                          onClick={() =>
                            confirm({
                              title: "确认发布",
                              description: `确定发布通知「${n.title}」？`,
                              confirmText: "发布",
                              onConfirm: () => handlePublish(String(n.id)),
                            })
                          }
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-emerald-600"
                          title="发布"
                        >
                          <Send size={14} />
                        </button>
                      )}
                      <button type="button" onClick={() => handleDelete(String(n.id))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </PermissionGate>
                </div>
              </td>
            </>
          )}
        />
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground"><Tx>新建通知</Tx></h3>
            <input
              placeholder="通知标题"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
            />
            <textarea
              placeholder="通知内容"
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold resize-none"
            />
            <select
              value={formData.template_code}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
            >
              <option value=""><Tx>选择模板（可选）</Tx></option>
              {templates.map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={formData.audience_type}
              onChange={(e) => setFormData({ ...formData, audience_type: e.target.value as "all" | "single" })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
            >
              <option value="all"><Tx>发送给全部用户</Tx></option>
              <option value="single"><Tx>发送给单个用户（填用户ID）</Tx></option>
            </select>
            {formData.audience_type === "single" && (
              <input
                placeholder="用户手机号或昵称（定向发送时）"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
              />
            )}
            <input
              placeholder="点击跳转链接（可选）"
              value={formData.link_url}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
            />
            <SegmentedDateTimeInput
              value={formData.scheduled_at}
              onChange={(v) => setFormData({ ...formData, scheduled_at: v })}
              className="w-full [&>div]:rounded-xl [&>div]:border-border [&>div]:bg-background [&>div]:px-4 [&>div]:py-3"
            />
            <p className="text-[11px] text-muted-foreground"><Tx>留空=立即发送；填写后到时间自动对用户可见。</Tx></p>
            <PermissionGate permission="notification.manage">
              <div className="grid grid-cols-2 gap-2">
                <LoadingButton type="button" variant="outline" state={formSubmitting ? "loading" : "normal"} loadingText="保存中..." onClick={() => adminConfirmSave(confirm, "通知草稿", () => handleSaveDraft())} className="w-full rounded-xl py-2.5 text-sm font-bold"><Tx>保存草稿</Tx></LoadingButton>
                <LoadingButton
                  type="button"
                  variant="gold"
                  state={formSubmitting ? "loading" : "normal"}
                  loadingText="发布中..."
                  onClick={() =>
                    confirm({
                      title: "确认发送",
                      description: "确定立即发送该通知？发送后用户将收到推送。",
                      confirmText: "发送",
                      onConfirm: () => handleSend(),
                    })
                  }
                  className="w-full rounded-xl py-2.5 text-sm font-bold"
                >
                  <Tx>立即发布</Tx>
                </LoadingButton>
              </div>
            </PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}
