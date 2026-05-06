import { useEffect, useState } from "react";
import { Bell, Plus, Trash2, Loader2, Send, Settings } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import * as notificationService from "@/services/admin/notificationService";
import type { Notification } from "@/types/notification";
import { toastErrorMessage } from "@/utils/errorMessage";

const typeLabels: Record<string, string> = {
  system: "系统通知",
  order: "订单通知",
  promotion: "促销活动",
  points: "积分变动",
  reward: "返现通知",
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<Array<{ code: string; name: string; type: string; title: string; content: string }>>([]);
  const [triggerRules, setTriggerRules] = useState<notificationService.NotificationTriggerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTriggers, setSavingTriggers] = useState(false);
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

  const handleSend = () => {
    if (!formData.title || !formData.content) { toast.error("请填写完整信息"); return; }
    if (formData.audience_type === "single" && !formData.user_id.trim()) {
      toast.error("请选择单用户发送时，请填写用户ID");
      return;
    }
    notificationService.sendNotification(formData)
      .then(() => {
        toast.success("通知已发送");
        setShowForm(false);
        setFormData({ title: "", content: "", type: "system", audience_type: "all", user_id: "", scheduled_at: "", link_url: "", template_code: "" });
        loadData();
      })
      .catch((e) => toast.error(toastErrorMessage(e, "发送失败")));
  };

  const handleSaveDraft = () => {
    if (!formData.title) { toast.error("草稿至少需要标题"); return; }
    notificationService.saveNotificationDraft(formData)
      .then(() => {
        toast.success("草稿已保存");
        setShowForm(false);
        loadData();
      })
      .catch((e) => toast.error(toastErrorMessage(e, "保存草稿失败")));
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
    notificationService.deleteNotification(id)
      .then(() => {
        toast.success("已删除");
        loadData();
      })
      .catch((e) => toast.error(toastErrorMessage(e, "删除失败")));
  };

  const toggleTriggerRule = (key: string) => {
    setTriggerRules((prev) => prev.map((rule) => (
      rule.key === key ? { ...rule, enabled: !rule.enabled } : rule
    )));
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">通知管理</h1>
          <p className="text-sm text-muted-foreground">向用户推送通知和公告</p>
        </div>
        <PermissionGate permission="notification.manage">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-primary-foreground active:scale-[0.98]">
            <Plus size={16} /> 新建通知
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Bell size={16} /><span className="text-xs">总通知</span></div>
          <p className="mt-1 text-xl font-bold text-foreground">{notifications.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Bell size={16} /><span className="text-xs">未读</span></div>
          <p className="mt-1 text-xl font-bold text-foreground">{notifications.filter((n) => !n.is_read).length}</p>
        </div>
      </div>

      <PermissionGate permission="notification.manage">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Settings size={17} className="text-gold" />
                <h2 className="text-sm font-bold text-foreground">自动触发通知设置</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                控制订单、支付、售后等业务操作是否自动向客户端右上角通知中心推送消息。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSaveTriggerRules()}
              disabled={savingTriggers}
              className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
            >
              {savingTriggers ? "保存中..." : "保存规则"}
            </button>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {triggerRules.map((rule) => (
              <label
                key={rule.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/50 p-3"
              >
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleTriggerRule(rule.key)}
                  className="mt-1 h-4 w-4 accent-gold"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{rule.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{rule.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </PermissionGate>

      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-3 md:grid-cols-5">
        <input value={filters.keyword} onChange={(e) => updateFilter("keyword", e.target.value)} placeholder="关键词筛选" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <select value={filters.type} onChange={(e) => updateFilter("type", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="">全部类型</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.send_status} onChange={(e) => updateFilter("send_status", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="">全部发送状态</option>
          <option value="draft">草稿</option>
          <option value="scheduled">定时中</option>
          <option value="sent">已发送</option>
          <option value="cancelled">已撤回</option>
        </select>
        <select value={filters.audience_type} onChange={(e) => updateFilter("audience_type", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="">全部受众</option>
          <option value="all">全部用户</option>
          <option value="single">单用户</option>
        </select>
        <select value={filters.workflow_status} onChange={(e) => updateFilter("workflow_status", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="">全部流转状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <div className="space-y-3 md:hidden">
        {notifications.map((n) => (
          <div key={n.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-foreground">{n.title}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${n.is_read ? "bg-muted text-muted-foreground" : "bg-gold/10 text-gold"}`}>
                {n.is_read ? "已读" : "未读"}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{n.content}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{typeLabels[n.type] || n.type}</span>
              <span className="text-[11px] text-muted-foreground">{n.created_at ? new Date(n.created_at).toLocaleString("zh-CN") : "—"}</span>
            </div>
            <PermissionGate permission="notification.manage">
              <button type="button" onClick={() => handleDelete(String(n.id))} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-xl border border-destructive/30 py-2 text-sm text-destructive active:bg-destructive/10">
                <Trash2 size={16} /> 删除
              </button>
            </PermissionGate>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无通知</div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">标题</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">内容</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">类型</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">发送状态</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">受众/已读</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">时间</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{n.title}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{n.content}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {typeLabels[n.type] || n.type}
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
                            <button type="button" onClick={() => handlePublish(String(n.id))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-emerald-600" title="发布">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground">新建通知</h3>
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
              <option value="">选择模板（可选）</option>
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
              <option value="all">发送给全部用户</option>
              <option value="single">发送给单个用户（填用户ID）</option>
            </select>
            {formData.audience_type === "single" && (
              <input
                placeholder="用户ID（user.id）"
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
            <input
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
            />
            <p className="text-[11px] text-muted-foreground">留空=立即发送；填写后到时间自动对用户可见。</p>
            <PermissionGate permission="notification.manage">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleSaveDraft} className="w-full rounded-xl border border-border py-2.5 text-sm font-bold text-foreground">保存草稿</button>
                <button onClick={handleSend} className="w-full rounded-xl bg-gold py-2.5 text-sm font-bold text-primary-foreground">立即发布</button>
              </div>
            </PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}
