import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Plus, XCircle } from "lucide-react";
import { AnimatedTable, LoadingButton } from "@/modules/micro-interactions";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import SegmentedDateTimeInput from "@/components/admin/SegmentedDateTimeInput";
import Pagination from "@/components/admin/Pagination";
import * as notificationService from "@/services/admin/notificationService";
import * as adminUserApi from "@/api/admin/user";
import * as adminUserService from "@/services/admin/userService";
import type { Notification } from "@/types/notification";
import type { NotificationPayload } from "@/api/admin/notification";
import { toastErrorMessage } from "@/utils/errorMessage";
import { labelNotificationType, NOTIFICATION_TYPE_LABELS } from "@/utils/adminDisplayLabels";
import { adminConfirmDelete, adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";

type CandidateUser = { id: string; nickname?: string; phone?: string; whatsapp?: string };

type NotificationSummary = {
  totalBatches: number;
  draftCount: number;
  scheduledCount: number;
  sentCount: number;
  cancelledCount: number;
  totalRecipients: number;
  totalRead: number;
  readRate: number;
};

const TYPE_LABELS = NOTIFICATION_TYPE_LABELS;
const AUDIENCE_OPTIONS: Array<{ value: NotificationPayload["audience_type"]; label: string }> = [
  { value: "all", label: "全部用户" },
  { value: "single", label: "单个用户" },
  { value: "specific", label: "指定多个用户" },
  { value: "user_tag", label: "用户标签" },
  { value: "member_level", label: "会员等级" },
  { value: "has_order", label: "有订单用户" },
  { value: "no_order", label: "无订单用户" },
];

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { confirm } = useAdminConfirm();
  const [loading, setLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>({
    totalBatches: 0, draftCount: 0, scheduledCount: 0, sentCount: 0, cancelledCount: 0, totalRecipients: 0, totalRead: 0, readRate: 0,
  });
  const [templates, setTemplates] = useState<Array<{ code: string; name: string; type: string; title: string; content: string }>>([]);
  const [triggerRules, setTriggerRules] = useState<notificationService.NotificationTriggerRule[]>([]);
  const [savingTriggers, setSavingTriggers] = useState(false);
  const [tagOptions, setTagOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [memberLevelOptions, setMemberLevelOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [tagKeyword, setTagKeyword] = useState("");
  const [levelKeyword, setLevelKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ keyword: "", type: "", send_status: "", audience_type: "", workflow_status: "" });

  const [formData, setFormData] = useState<NotificationPayload>({
    title: "",
    content: "",
    type: "system",
    audience_type: "all",
    user_id: "",
    user_ids: [],
    audience_value: "",
    scheduled_at: "",
    link_url: "",
    template_code: "",
  });
  const [userKeyword, setUserKeyword] = useState("");
  const [userCandidates, setUserCandidates] = useState<CandidateUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<CandidateUser[]>([]);
  const [bulkImportText, setBulkImportText] = useState("");
  const [estimatedRecipients, setEstimatedRecipients] = useState<number>(0);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      notificationService.fetchNotifications({ page, pageSize, ...filters }),
      notificationService.fetchNotificationSummary(),
      notificationService.fetchNotificationTemplates(),
      notificationService.fetchNotificationTriggerSettings(),
      adminUserService.fetchUserTags(),
      adminUserService.fetchMemberLevels(),
    ])
      .then(([listData, summaryData, templateData, triggerData, tags, levels]) => {
        setNotifications(listData.list);
        setTotal(listData.total);
        setSummary(summaryData);
        setTemplates(templateData || []);
        setTriggerRules(triggerData || []);
        setTagOptions((tags || []).map((t) => ({ id: t.id, name: t.name })));
        setMemberLevelOptions((levels || []).map((l) => ({ id: l.id, name: l.name })));
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载通知失败")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filters]);

  useEffect(() => {
    if (!showForm) return;
    notificationService.estimateNotificationAudience(formData)
      .then((r) => setEstimatedRecipients(r.estimated_recipients || 0))
      .catch(() => setEstimatedRecipients(0));
  }, [formData, showForm]);

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
    }, 280);
    return () => clearTimeout(timer);
  }, [userKeyword]);

  const updateFilter = (key: "keyword" | "type" | "send_status" | "audience_type" | "workflow_status", value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyTemplate = (code: string) => {
    const t = templates.find((x) => x.code === code);
    if (!t) return;
    setFormData((prev) => ({ ...prev, template_code: t.code, type: t.type, title: t.title, content: t.content }));
  };

  const addSelectedUser = (u: CandidateUser) => {
    if (formData.audience_type === "single") {
      setSelectedUsers([u]);
      setFormData((prev) => ({ ...prev, user_id: u.id, user_ids: [u.id] }));
      return;
    }
    if (selectedUsers.some((x) => x.id === u.id)) return;
    const next = [...selectedUsers, u];
    setSelectedUsers(next);
    setFormData((prev) => ({ ...prev, user_ids: next.map((x) => x.id) }));
  };

  const removeSelectedUser = (id: string) => {
    const next = selectedUsers.filter((u) => u.id !== id);
    setSelectedUsers(next);
    setFormData((prev) => ({ ...prev, user_ids: next.map((x) => x.id), user_id: prev.user_id === id ? "" : prev.user_id }));
  };

  const handleBulkResolveUsers = async () => {
    const identifiers = bulkImportText
      .split(/[\n,，\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!identifiers.length) {
      toast.error("请粘贴 user_id 或手机号");
      return;
    }
    try {
      const result = await notificationService.resolveNotificationUsers(identifiers);
      const resolved = result.list || [];
      const unresolved = result.unresolved || [];
      const current = new Map(selectedUsers.map((u) => [u.id, u]));
      for (const u of resolved) current.set(u.id, u);
      const next = Array.from(current.values());
      setSelectedUsers(next);
      setFormData((prev) => ({ ...prev, user_ids: next.map((x) => x.id) }));
      if (unresolved.length) {
        toast.warning(`未匹配 ${unresolved.length} 项`);
      } else {
        toast.success(`导入成功 ${resolved.length} 人`);
      }
    } catch (e) {
      toast.error(toastErrorMessage(e, "批量导入失败"));
    }
  };

  const resetForm = () => {
    setFormData({
      title: "", content: "", type: "system", audience_type: "all", user_id: "", user_ids: [], audience_value: "", scheduled_at: "", link_url: "", template_code: "",
    });
    setSelectedUsers([]);
    setUserKeyword("");
    setUserCandidates([]);
    setEstimatedRecipients(0);
    setBulkImportText("");
  };

  const getActionMeta = (n: Notification) => {
    if (n.workflow_status === "draft") return { label: "删除草稿", action: "deleteDraft" as const };
    if (n.send_status === "scheduled") return { label: "取消定时", action: "cancel" as const };
    if (n.send_status === "sent") return { label: "撤回通知", action: "revoke" as const };
    return { label: "删除记录", action: "deleteDraft" as const };
  };

  const handleStatusAction = (id: string) => {
    const n = notifications.find((x) => String(x.id) === id);
    if (!n) return;
    const meta = getActionMeta(n);
    if (meta.action === "revoke") {
      confirm({
        title: "确认撤回",
        description: `将撤回已发送通知，影响 ${n.recipient_count || 0} 位用户。`,
        confirmText: "确认撤回",
        onConfirm: () => notificationService.revokeSentNotification(id).then(() => { toast.success("已撤回"); loadData(); }).catch((e) => toast.error(toastErrorMessage(e, "撤回失败"))),
      });
      return;
    }
    if (meta.action === "cancel") {
      notificationService.cancelScheduledNotification(id).then(() => { toast.success("已取消定时"); loadData(); }).catch((e) => toast.error(toastErrorMessage(e, "取消失败")));
      return;
    }
    adminConfirmDelete(confirm, n.title || "该通知", () => notificationService.deleteDraftNotification(id).then(() => { toast.success("已删除"); loadData(); }).catch((e) => toast.error(toastErrorMessage(e, "删除失败"))));
  };

  const handleSend = async () => {
    if (!formData.title || !formData.content) return toast.error("请填写标题和内容");
    if (formData.audience_type === "single" && !formData.user_id) return toast.error("请选择单个用户");
    if (formData.audience_type === "specific" && !(formData.user_ids || []).length) return toast.error("请至少选择一个用户");
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
    if (!formData.title) return toast.error("草稿至少需要标题");
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

  const statusText = useMemo(() => ({
    draft: "草稿", scheduled: "定时中", sent: "已发送", cancelled: "已取消", published: "已发布",
  } as Record<string, string>), []);

  const filteredTagOptions = useMemo(
    () => tagOptions.filter((t) => !tagKeyword.trim() || t.name.includes(tagKeyword.trim())),
    [tagOptions, tagKeyword],
  );
  const filteredLevelOptions = useMemo(
    () => memberLevelOptions.filter((l) => !levelKeyword.trim() || l.name.includes(levelKeyword.trim())),
    [memberLevelOptions, levelKeyword],
  );

  const updateTriggerField = (key: string, field: "title" | "content", value: string) => {
    setTriggerRules((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };
  const toggleTrigger = (key: string) => {
    setTriggerRules((prev) => prev.map((r) => (r.key === key ? { ...r, enabled: !r.enabled } : r)));
  };
  const saveTriggerRules = async () => {
    setSavingTriggers(true);
    try {
      const saved = await notificationService.saveNotificationTriggerSettings(triggerRules);
      setTriggerRules(saved || []);
      toast.success("触发规则已保存");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存触发规则失败"));
    } finally {
      setSavingTriggers(false);
    }
  };
  const previewTrigger = async (key: string) => {
    try {
      const r = await notificationService.previewNotificationTriggerRule(key);
      toast.success(`预览：${r.title}`);
    } catch (e) {
      toast.error(toastErrorMessage(e, "预览失败"));
    }
  };
  const testSendTrigger = async (key: string) => {
    try {
      await notificationService.testSendNotificationTriggerRule(key);
      toast.success("测试通知已发送给自己");
    } catch (e) {
      toast.error(toastErrorMessage(e, "测试发送失败"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">通知管理</h1>
        <PermissionGate permission="notification.create">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-primary-foreground"><Plus size={16} />新建通知</button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">批次总数</div><p className="mt-1 text-xl font-bold">{summary.totalBatches}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">总接收人数</div><p className="mt-1 text-xl font-bold">{summary.totalRecipients}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">总已读</div><p className="mt-1 text-xl font-bold">{summary.totalRead}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">已读率</div><p className="mt-1 text-xl font-bold">{(summary.readRate * 100).toFixed(2)}%</p></div>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-3 md:grid-cols-5">
        <input value={filters.keyword} onChange={(e) => updateFilter("keyword", e.target.value)} placeholder="关键字" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <select value={filters.type} onChange={(e) => updateFilter("type", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">全部类型</option>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={filters.send_status} onChange={(e) => updateFilter("send_status", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">发送状态</option><option value="draft">草稿</option><option value="scheduled">定时中</option><option value="sent">已发送</option><option value="cancelled">已取消</option></select>
        <select value={filters.audience_type} onChange={(e) => updateFilter("audience_type", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">受众类型</option>{AUDIENCE_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
        <select value={filters.workflow_status} onChange={(e) => updateFilter("workflow_status", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="">流转状态</option><option value="draft">草稿</option><option value="published">已发布</option><option value="cancelled">已取消</option></select>
      </div>

      <AnimatedTable loading={loading} rows={notifications} rowKey={(n) => n.id} skeletonRows={6} skeletonCols={7} className="overflow-hidden rounded-2xl border border-border bg-card overflow-x-auto" tableClassName="w-full min-w-[860px] text-sm"
        thead={<tr><th className="px-4 py-3 text-left">标题</th><th className="px-4 py-3 text-left">类型</th><th className="px-4 py-3 text-left">状态</th><th className="px-4 py-3 text-left">接收/已读</th><th className="px-4 py-3 text-left">创建时间</th><th className="px-4 py-3 text-center">操作</th></tr>}
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />} emptyIcon={Bell} emptyTitle="暂无通知"
        renderRow={(n) => <><td className="px-4 py-3"><button className="font-medium text-left hover:underline" onClick={() => navigate(`/admin/notifications/${n.id}`)}>{n.title}</button></td><td className="px-4 py-3">{labelNotificationType(n.type)}</td><td className="px-4 py-3">{statusText[n.send_status || ""] || statusText[n.workflow_status || ""] || "-"}</td><td className="px-4 py-3 text-xs">{n.recipient_count || 0} / {n.read_count || 0}</td><td className="px-4 py-3 text-xs">{n.created_at ? new Date(n.created_at).toLocaleString("zh-CN") : "-"}</td><td className="px-4 py-3 text-center"><button className="rounded-lg border px-2 py-1 text-xs" onClick={() => handleStatusAction(String(n.id))}>{getActionMeta(n).label}</button></td></>}
      />

      <PermissionGate permission="notification.trigger">
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between"><h3 className="font-semibold">自动触发规则</h3><LoadingButton type="button" variant="outline" state={savingTriggers ? "loading" : "normal"} onClick={saveTriggerRules} className="rounded-xl px-3 py-2 text-xs">保存规则</LoadingButton></div>
          <div className="grid gap-3 md:grid-cols-2">{triggerRules.map((rule) => <div key={rule.key} className="rounded-xl border border-border p-3 space-y-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rule.enabled} onChange={() => toggleTrigger(rule.key)} /><span className="font-medium">{rule.label}</span></label><p className="text-xs text-muted-foreground">{rule.description}</p><input value={rule.title || ""} onChange={(e) => updateTriggerField(rule.key, "title", e.target.value)} placeholder={rule.default_title || "标题模板"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" /><textarea value={rule.content || ""} onChange={(e) => updateTriggerField(rule.key, "content", e.target.value)} placeholder={rule.default_content || "正文模板"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none" rows={2} />{rule.placeholders?.length ? <p className="text-[11px] text-muted-foreground">可用变量：{rule.placeholders.map((p) => `{${p}}`).join(" ")}</p> : null}<div className="flex gap-2"><button type="button" onClick={() => previewTrigger(rule.key)} className="rounded-lg border px-2 py-1 text-xs">变量预览</button><button type="button" onClick={() => testSendTrigger(rule.key)} className="rounded-lg border px-2 py-1 text-xs">测试发送给自己</button></div></div>)}</div>
        </section>
      </PermissionGate>

      {showForm ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-2xl bg-card p-6 shadow-xl space-y-3"><h3 className="font-bold text-foreground">新建通知</h3>
        <input placeholder="通知标题" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
        <textarea placeholder="通知内容" rows={4} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none" />
        <select value={formData.template_code} onChange={(e) => applyTemplate(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"><option value="">选择模板（可选）</option>{templates.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</select>
        <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm">{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={formData.audience_type} onChange={(e) => { const audienceType = e.target.value as NotificationPayload["audience_type"]; setFormData({ ...formData, audience_type: audienceType, user_id: "", user_ids: [], audience_value: "" }); setSelectedUsers([]); }} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm">{AUDIENCE_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
        {(formData.audience_type === "single" || formData.audience_type === "specific") ? <><input value={userKeyword} onChange={(e) => setUserKeyword(e.target.value)} placeholder="搜索用户（手机号/昵称/WhatsApp/用户ID）" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />{userCandidates.length > 0 ? <div className="max-h-40 overflow-auto rounded-xl border border-border">{userCandidates.map((u) => <button type="button" key={u.id} onClick={() => addSelectedUser(u)} className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary">{u.nickname || "匿名"} / {u.phone || "-"} / {u.whatsapp || "-"} / {u.id}</button>)}</div> : null}{selectedUsers.length > 0 ? <div className="flex flex-wrap gap-2">{selectedUsers.map((u) => <span key={u.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs">{u.nickname || u.phone || u.id}<button type="button" onClick={() => removeSelectedUser(u.id)}><XCircle size={12} /></button></span>)}</div> : null}{formData.audience_type === "specific" ? <div className="space-y-2"><textarea value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)} placeholder="批量导入：粘贴 user_id/手机号（换行或逗号分隔）" rows={3} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none" /><button type="button" onClick={handleBulkResolveUsers} className="rounded-lg border px-3 py-1.5 text-xs">批量解析并添加</button></div> : null}</> : null}
        {formData.audience_type === "user_tag" ? (
          <div className="space-y-2">
            <input value={tagKeyword} onChange={(e) => setTagKeyword(e.target.value)} placeholder="搜索标签名称" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
            <select value={formData.audience_value || ""} onChange={(e) => setFormData({ ...formData, audience_value: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm">
              <option value="">选择用户标签</option>
              {filteredTagOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        ) : null}
        {formData.audience_type === "member_level" ? (
          <div className="space-y-2">
            <input value={levelKeyword} onChange={(e) => setLevelKeyword(e.target.value)} placeholder="搜索会员等级" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
            <select value={formData.audience_value || ""} onChange={(e) => setFormData({ ...formData, audience_value: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm">
              <option value="">选择会员等级</option>
              {filteredLevelOptions.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        ) : null}
        <div className="rounded-xl bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">预计接收人数：<span className="font-semibold text-foreground">{estimatedRecipients}</span></div>
        <input placeholder="点击跳转链接（可选）" value={formData.link_url || ""} onChange={(e) => setFormData({ ...formData, link_url: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
        <SegmentedDateTimeInput value={formData.scheduled_at || ""} onChange={(v) => setFormData({ ...formData, scheduled_at: v })} className="w-full [&>div]:rounded-xl [&>div]:border-border [&>div]:bg-background [&>div]:px-4 [&>div]:py-3" />
        <div className="grid grid-cols-2 gap-2"><LoadingButton type="button" variant="outline" state={formSubmitting ? "loading" : "normal"} onClick={() => adminConfirmSave(confirm, "通知草稿", () => handleSaveDraft())} className="w-full rounded-xl py-2.5 text-sm font-bold">保存草稿</LoadingButton><LoadingButton type="button" variant="gold" state={formSubmitting ? "loading" : "normal"} onClick={handleSend} className="w-full rounded-xl py-2.5 text-sm font-bold">立即发布</LoadingButton></div>
      </div></div> : null}
    </div>
  );
}
