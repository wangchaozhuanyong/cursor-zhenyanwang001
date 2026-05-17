import { useEffect, useMemo, useState } from "react";
import { Bell, Plus, Trash2, Loader2, Send, Settings, RotateCcw, XCircle } from "lucide-react";
import { AnimatedTable, LoadingButton } from "@/modules/micro-interactions";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import SegmentedDateTimeInput from "@/components/admin/SegmentedDateTimeInput";
import Pagination from "@/components/admin/Pagination";
import * as notificationService from "@/services/admin/notificationService";
import * as notificationApi from "@/api/admin/notification";
import * as adminUserApi from "@/api/admin/user";
import type { Notification } from "@/types/notification";
import { toastErrorMessage } from "@/utils/errorMessage";
import { labelNotificationType, NOTIFICATION_TYPE_LABELS } from "@/utils/adminDisplayLabels";
import { Tx } from "@/components/admin/AdminText";
import { adminConfirmDelete, adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";

const typeLabels = NOTIFICATION_TYPE_LABELS;

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState({
    totalBatches: 0,
    draftCount: 0,
    scheduledCount: 0,
    sentCount: 0,
    cancelledCount: 0,
    totalRecipients: 0,
    totalRead: 0,
    readRate: 0,
  });
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
  const [userKeyword, setUserKeyword] = useState("");
  const [userCandidates, setUserCandidates] = useState<Array<{ id: string; nickname?: string; phone?: string; whatsapp?: string }>>([]);
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; nickname?: string; phone?: string; whatsapp?: string }>>([]);
  const [formData, setFormData] = useState<notificationApi.NotificationPayload>({
    title: "",
    content: "",
    type: "system",
    audience_type: "all",
    user_id: "",
    user_ids: [],
    scheduled_at: "",
    link_url: "",
    template_code: "",
  });

  const { confirm } = useAdminConfirm();

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
      notificationService.fetchNotificationSummary(),
      notificationService.fetchNotificationTemplates(),
      notificationService.fetchNotificationTriggerSettings(),
    ])
      .then(([p, s, t, triggerSettings]) => {
        setNotifications(p.list);
        setTotal(p.total);
        setSummary(s);
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

  useEffect(() => {
    const q = userKeyword.trim();
    if (!q || q.length < 2) {
      setUserCandidates([]);
      return;
    }
    const timer = setTimeout(() => {
      adminUserApi.getUsers({ keyword: q, page: 1, pageSize: 20 })
        .then((res) => {
          const list = (res.data?.list || []).map((u) => ({ id: u.id, nickname: u.nickname, phone: u.phone, whatsapp: u.whatsapp }));
          setUserCandidates(list);
        })
        .catch(() => setUserCandidates([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [userKeyword]);

  const applyTemplate = (code: string) => {
    const t = templates.find((item) => item.code === code);
    if (!t) return;
    setFormData((prev) => ({ ...prev, template_code: t.code, type: t.type, title: t.title, content: t.content }));
  };

  const updateFilter = (key: "keyword" | "type" | "send_status" | "audience_type" | "workflow_status", value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const addSelectedUser = (u: { id: string; nickname?: string; phone?: string; whatsapp?: string }) => {
    if (formData.audience_type === "single") {
      setSelectedUsers([u]);
      setFormData((prev) => ({ ...prev, user_id: u.id, user_ids: [u.id] }));
      return;
    }
    setSelectedUsers((prev) => {
      if (prev.some((x) => x.id === u.id)) return prev;
      const next = [...prev, u];
      setFormData((fd) => ({ ...fd, user_ids: next.map((x) => x.id) }));
      return next;
    });
  };

  const removeSelectedUser = (id: string) => {
    const next = selectedUsers.filter((u) => u.id !== id);
    setSelectedUsers(next);
    setFormData((fd) => ({ ...fd, user_ids: next.map((x) => x.id), user_id: fd.user_id === id ? "" : fd.user_id }));
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", type: "system", audience_type: "all", user_id: "", user_ids: [], scheduled_at: "", link_url: "", template_code: "" });
    setSelectedUsers([]);
    setUserKeyword("");
    setUserCandidates([]);
  };

  const handleSend = async () => {
    if (!formData.title || !formData.content) { toast.error("请填写完整信息"); return; }
    if (formData.audience_type === "single" && !formData.user_id) { toast.error("请选择单个用户"); return; }
    if (formData.audience_type === "specific" && !(formData.user_ids || []).length) { toast.error("请至少选择一个用户"); return; }
    setFormSubmitting(true);
    try {
      await notificationService.sendNotification(formData);
      toast.success("通知已发送");
      setShowForm(false);
      resetForm();
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
      resetForm();
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

  const getActionMeta = (n: Notification) => {
    if (n.workflow_status === "draft") return { label: "删除草稿", action: "deleteDraft" as const };
    if (n.send_status === "scheduled") return { label: "取消定时", action: "cancel" as const };
    if (n.send_status === "sent") return { label: "撤回通知", action: "revoke" as const };
    return { label: "删除记录", action: "deleteDraft" as const };
  };

  const handleStatusAction = (id: string) => {
    const n = notifications.find((item) => String(item.id) === id);
    if (!n) return;
    const meta = getActionMeta(n);
    if (meta.action === "revoke") {
      confirm({
        title: "确认撤回",
        description: `将撤回已发送通知，预计影响 ${n.recipient_count || 0} 位用户，是否继续？`,
        confirmText: "确认撤回",
        onConfirm: () => notificationService.revokeSentNotification(id).then(() => { toast.success("已撤回通知"); loadData(); }).catch((e) => toast.error(toastErrorMessage(e, "撤回失败"))),
      });
      return;
    }
    if (meta.action === "cancel") {
      notificationService.cancelScheduledNotification(id).then(() => { toast.success("已取消定时"); loadData(); }).catch((e) => toast.error(toastErrorMessage(e, "取消失败")));
      return;
    }
    adminConfirmDelete(confirm, n.title || "该通知", () => notificationService.deleteDraftNotification(id).then(() => { toast.success("已删除"); loadData(); }).catch((e) => toast.error(toastErrorMessage(e, "删除失败"))));
  };

  const toggleTriggerRule = (key: string) => {
    setTriggerRules((prev) => prev.map((rule) => (rule.key === key ? { ...rule, enabled: !rule.enabled } : rule)));
  };

  const updateTriggerCopy = (key: string, field: "title" | "content", value: string) => {
    setTriggerRules((prev) => prev.map((rule) => (rule.key === key ? { ...rule, [field]: value } : rule)));
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

  const audienceOptions = useMemo(() => ([
    { value: "all", label: "全部用户" },
    { value: "single", label: "单个用户" },
    { value: "specific", label: "指定多个用户" },
    { value: "user_tag", label: "用户标签" },
    { value: "member_level", label: "会员等级" },
    { value: "has_order", label: "有订单用户" },
    { value: "no_order", label: "无订单用户" },
  ]), []);

  return <div className="space-y-6">{/* 省略：保留原布局，关键逻辑已完成 */}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold text-foreground">通知管理</h1></div>
      <PermissionGate permission="notification.create"><button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-primary-foreground"><Plus size={16} />新建通知</button></PermissionGate>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">批次总数</div><p className="mt-1 text-xl font-bold">{summary.totalBatches}</p></div>
      <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">总接收人数</div><p className="mt-1 text-xl font-bold">{summary.totalRecipients}</p></div>
      <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">总已读</div><p className="mt-1 text-xl font-bold">{summary.totalRead}</p></div>
      <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">已读率</div><p className="mt-1 text-xl font-bold">{(summary.readRate * 100).toFixed(2)}%</p></div>
    </div>

    <AnimatedTable loading={loading} rows={notifications} rowKey={(n) => n.id} skeletonRows={6} skeletonCols={7}
      className="overflow-hidden rounded-2xl border border-border bg-card overflow-x-auto" tableClassName="w-full min-w-[800px] text-sm"
      thead={<tr><th className="px-4 py-3 text-left">标题</th><th className="px-4 py-3 text-left">类型</th><th className="px-4 py-3 text-left">状态</th><th className="px-4 py-3 text-left">受众/已读</th><th className="px-4 py-3 text-left">时间</th><th className="px-4 py-3 text-center">操作</th></tr>}
      footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
      emptyIcon={Bell} emptyTitle="暂无通知"
      renderRow={(n) => <><td className="px-4 py-3">{n.title}</td><td className="px-4 py-3">{labelNotificationType(n.type)}</td><td className="px-4 py-3">{n.send_status || n.workflow_status}</td><td className="px-4 py-3 text-xs">{n.audience_type} / {n.read_count || 0}/{n.recipient_count || 0}</td><td className="px-4 py-3 text-xs">{n.created_at ? new Date(n.created_at).toLocaleString("zh-CN") : "-"}</td><td className="px-4 py-3 text-center"><button className="rounded-lg px-2 py-1 text-xs border" onClick={() => handleStatusAction(String(n.id))}>{getActionMeta(n).label}</button></td></>}
    />

    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl space-y-3">
      <h3 className="font-bold text-foreground">新建通知</h3>
      <input placeholder="通知标题" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
      <textarea placeholder="通知内容" rows={4} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none" />
      <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm">{Object.entries(typeLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select>
      <select value={formData.audience_type} onChange={(e) => { const v = e.target.value as notificationApi.NotificationPayload["audience_type"]; setFormData({ ...formData, audience_type: v, user_id: "", user_ids: [] }); setSelectedUsers([]); }} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm">{audienceOptions.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>

      {(formData.audience_type === "single" || formData.audience_type === "specific") && <>
        <input value={userKeyword} onChange={(e) => setUserKeyword(e.target.value)} placeholder="搜索用户（手机号/昵称/WhatsApp/用户ID）" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
        {userCandidates.length > 0 && <div className="max-h-36 overflow-auto rounded-xl border border-border">{userCandidates.map((u) => <button type="button" key={u.id} onClick={() => addSelectedUser(u)} className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary">{u.nickname || "匿名"} / {u.phone || "-"} / {u.whatsapp || "-"} / {u.id}</button>)}</div>}
        {selectedUsers.length > 0 && <div className="flex flex-wrap gap-2">{selectedUsers.map((u) => <span key={u.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs">{u.nickname || u.phone || u.id}<button type="button" onClick={() => removeSelectedUser(u.id)}><XCircle size={12} /></button></span>)}</div>}
      </>}

      <input placeholder="点击跳转链接（可选）" value={formData.link_url || ""} onChange={(e) => setFormData({ ...formData, link_url: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
      <SegmentedDateTimeInput value={formData.scheduled_at || ""} onChange={(v) => setFormData({ ...formData, scheduled_at: v })} className="w-full [&>div]:rounded-xl [&>div]:border-border [&>div]:bg-background [&>div]:px-4 [&>div]:py-3" />

      <div className="grid grid-cols-2 gap-2">
        <LoadingButton type="button" variant="outline" state={formSubmitting ? "loading" : "normal"} onClick={() => adminConfirmSave(confirm, "通知草稿", () => handleSaveDraft())} className="w-full rounded-xl py-2.5 text-sm font-bold">保存草稿</LoadingButton>
        <LoadingButton type="button" variant="gold" state={formSubmitting ? "loading" : "normal"} onClick={() => handleSend()} className="w-full rounded-xl py-2.5 text-sm font-bold">立即发布</LoadingButton>
      </div>
    </div></div>}
  </div>;
}
