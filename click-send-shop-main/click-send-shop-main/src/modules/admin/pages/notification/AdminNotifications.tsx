import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import {
  AdminFilterButton,
  AdminFilterSelect,
} from "@/components/admin/AdminFilterControls";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import * as notificationService from "@/services/admin/notificationService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { Notification } from "@/types/notification";
import type { NotificationPayload } from "@/services/admin/notificationService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import SegmentedDateTimeInput from "@/components/admin/SegmentedDateTimeInput";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminRowActionsMenu from "@/components/admin/AdminRowActionsMenu";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import {
  adminTableCellClass,
  adminTableTheadRow,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";

const NOTIFICATION_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "left", "left", "center", "right", "left", "right",
];
import {
  getTriggerTemplateDisplay,
  hasCustomTriggerTemplate,
  normalizeTriggerRuleForSave,
  patchTriggerRuleTemplate,
} from "./triggerRuleTemplates";

const NOTIFICATION_PAGE_PERMISSIONS = ["notification.view", "notification.manage"];
const NOTIFICATION_COMPOSE_PERMISSIONS = ["notification.create", "notification.send", "notification.manage"];
const NOTIFICATION_TRIGGER_PERMISSIONS = ["notification.trigger", "notification.manage"];
const NOTIFICATION_DRAFT_PERMISSIONS = ["notification.create", "notification.manage"];
const NOTIFICATION_SEND_PERMISSIONS = ["notification.send", "notification.manage"];
const NOTIFICATION_REVOKE_PERMISSIONS = ["notification.revoke", "notification.manage"];

type TabKey = "list" | "manual" | "settings";
type AudienceType = NotificationPayload["audience_type"];
type RowAction = "deleteDraft" | "cancelScheduled" | "revokeSent";

type ManualForm = {
  title: string;
  content: string;
  type: string;
  audience_type: AudienceType;
  identifiers: string;
  scheduled_at: string;
  link_url: string;
};

const defaultManualForm: ManualForm = {
  title: "",
  content: "",
  type: "system",
  audience_type: "all",
  identifiers: "",
  scheduled_at: "",
  link_url: "",
};

function label(map: Record<string, string>, value?: string | null) {
  return value ? map[value] || value : "-";
}

function buildPayload(form: ManualForm): NotificationPayload {
  const identifiers = form.identifiers.split(/[\n,，\s]+/).map((item) => item.trim()).filter(Boolean);
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    type: form.type,
    audience_type: form.audience_type,
    user_id: form.audience_type === "single" ? identifiers[0] : undefined,
    user_ids: form.audience_type === "specific" ? identifiers : undefined,
    scheduled_at: form.scheduled_at || undefined,
    link_url: form.link_url.trim() || undefined,
  };
}

function getRowAction(row: Notification): { action: RowAction; label: string; permissions: string[] } | null {
  const status = row.send_status || row.workflow_status;
  if (row.workflow_status === "draft" || status === "draft") {
    return { action: "deleteDraft", label: "Delete draft", permissions: NOTIFICATION_DRAFT_PERMISSIONS };
  }
  if (status === "scheduled") {
    return { action: "cancelScheduled", label: "Cancel schedule", permissions: NOTIFICATION_SEND_PERMISSIONS };
  }
  if (status === "sent") {
    return { action: "revokeSent", label: "Revoke", permissions: NOTIFICATION_REVOKE_PERMISSIONS };
  }
  return null;
}

export default function AdminNotifications() {
  const { locale, tText } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
  const typeLabels: Record<string, string> = isEn
    ? {
        system: "System",
        order: "Order",
        shipping: "Shipping",
        payment: "Payment",
        refund: "Refund",
        after_sale: "After-sales",
        promotion: "Marketing",
        coupon: "Coupon",
        points: "Points",
        reward: "Cashback",
      }
    : {
        system: "系统通知",
        order: "订单通知",
        shipping: "物流通知",
        payment: "支付通知",
        refund: "退款通知",
        after_sale: "售后通知",
        promotion: "营销通知",
        coupon: "优惠券通知",
        points: "积分通知",
        reward: "返现通知",
      };
  const statusLabels: Record<string, string> = isEn
    ? {
        draft: "Draft",
        sent: "Sent",
        scheduled: "Scheduled",
        cancelled: "Cancelled",
        published: "Published",
      }
    : {
        draft: "草稿",
        sent: "已发送",
        scheduled: "定时发送",
        cancelled: "已取消",
        published: "已发布",
      };
  const audienceLabels: Record<string, string> = isEn
    ? {
        all: "All users",
        single: "Single user",
        specific: "Specific users",
        user_tag: "User tags",
        member_level: "Member level",
        has_order: "Users with orders",
        no_order: "Users without orders",
      }
    : {
        all: "全部用户",
        single: "单个用户",
        specific: "指定用户",
        user_tag: "用户标签",
        member_level: "会员等级",
        has_order: "有订单用户",
        no_order: "无订单用户",
      };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const [tab, setTab] = useState<TabKey>("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const [sendStatus, setSendStatus] = useState("");
  const [form, setForm] = useState<ManualForm>(defaultManualForm);
  const [rulesDraft, setRulesDraft] = useState<notificationService.NotificationTriggerRule[] | null>(null);

  const listParams = useMemo(() => ({
    page,
    pageSize,
    keyword: keyword.trim() || undefined,
    type: type || undefined,
    send_status: sendStatus || undefined,
  }), [keyword, page, pageSize, sendStatus, type]);

  const notificationsQuery = useQuery({
    queryKey: [...adminQueryKeys.notificationsRoot(), "list", listParams],
    queryFn: () => notificationService.fetchNotifications(listParams),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const rulesQuery = useQuery({
    queryKey: [...adminQueryKeys.notificationsRoot(), "trigger-settings"],
    queryFn: notificationService.fetchNotificationTriggerSettings,
    enabled: tab === "settings",
    staleTime: 60_000,
  });

  const invalidateNotifications = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.notificationsRoot() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
    ]);
  };

  const sendMutation = useMutation({
    mutationFn: (mode: "send" | "draft") => {
      const payload = buildPayload(form);
      if (!payload.title || !payload.content) {
        throw new Error(L("请填写标题和正文", "Please fill in the title and body"));
      }
      if ((payload.audience_type === "single" || payload.audience_type === "specific") && !form.identifiers.trim()) {
        throw new Error(L("请填写接收用户（编号或手机号）", "Please fill in the recipients (ID or phone number)"));
      }
      return mode === "send" ? notificationService.sendNotification(payload) : notificationService.saveNotificationDraft(payload);
    },
    onSuccess: async (_, mode) => {
      toast.success(mode === "send" ? L("通知已发送", "Notification sent") : L("草稿已保存", "Draft saved"));
      setForm(defaultManualForm);
      setTab("list");
      await invalidateNotifications();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("通知提交失败", "Failed to submit notification"))),
  });

  const deleteMutation = useMutation({
    mutationFn: async (row: Notification) => {
      const action = getRowAction(row)?.action;
      if (action === "deleteDraft") {
        await notificationService.deleteDraftNotification(row.id);
      } else if (action === "cancelScheduled") {
        await notificationService.cancelScheduledNotification(row.id);
      } else if (action === "revokeSent") {
        await notificationService.revokeSentNotification(row.id);
      } else {
        throw new Error(L("当前通知状态不支持该操作", "This notification status does not support that action"));
      }
    },
    onSuccess: async () => {
      toast.success(L("通知已处理", "Notification handled"));
      await invalidateNotifications();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("处理通知失败", "Failed to process notification"))),
  });

  const saveRulesMutation = useMutation({
    mutationFn: () => notificationService.saveNotificationTriggerSettings(
      (rulesDraft || rulesQuery.data || []).map(normalizeTriggerRuleForSave),
    ),
    onSuccess: async (nextRules) => {
      toast.success(L("触发通知设置已保存", "Notification trigger settings saved"));
      setRulesDraft(nextRules);
      await invalidateNotifications();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("保存设置失败", "Failed to save settings"))),
  });

  const rows = notificationsQuery.data?.list || [];
  const total = notificationsQuery.data?.total || 0;
  const rules = rulesDraft || rulesQuery.data || [];

  const handleRefresh = () => {
    if (tab === "settings") {
      void rulesQuery.refetch();
      return;
    }
    void notificationsQuery.refetch();
  };

  const updateRule = (key: string, patch: Partial<notificationService.NotificationTriggerRule>) => {
    setRulesDraft((current) => (current || rules).map((rule) => rule.key === key ? { ...rule, ...patch } : rule));
  };

  const updateRuleTemplate = (key: string, field: "title" | "content", displayValue: string) => {
    setRulesDraft((current) =>
      (current || rules).map((rule) =>
        rule.key === key ? patchTriggerRuleTemplate(rule, field, displayValue) : rule,
      ),
    );
  };

  const renderMobileCard = (row: Notification) => {
    const rowAction = getRowAction(row);
    return (
      <AdminTableMobileCard>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold">{row.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.content || "—"}</p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs">{label(statusLabels, row.send_status || row.workflow_status)}</span>
        </div>
        <div className="space-y-2">
          <AdminTableMobileCardField label={L("类型", "Type")}>{label(typeLabels, row.type)}</AdminTableMobileCardField>
          <AdminTableMobileCardField label={L("受众", "Audience")}>{label(audienceLabels, row.audience_type)}</AdminTableMobileCardField>
          <AdminTableMobileCardField label={L("触达 / 已读", "Delivered / Read")}>
            <span className="text-xs text-muted-foreground">{row.recipient_count || 0} / {row.read_count || 0}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={L("时间", "Time")}>
            <span className="text-xs text-muted-foreground">{formatDateTime(row.sent_at || row.scheduled_at || row.created_at)}</span>
          </AdminTableMobileCardField>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <button type="button" onClick={() => navigate(`/admin/notifications/${row.id}`)} className="touch-manipulation rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
            {L("详情", "Details")}
          </button>
          {rowAction ? (
            <PermissionGate anyOf={rowAction.permissions}>
              <button type="button" onClick={() => deleteMutation.mutate(row)} disabled={deleteMutation.isPending} className="touch-manipulation rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-60">
                {rowAction.label}
              </button>
            </PermissionGate>
          ) : null}
        </div>
      </AdminTableMobileCard>
    );
  };

  return (
    <PermissionGate anyOf={NOTIFICATION_PAGE_PERMISSIONS}>
      <AdminPageShell
        hint={L("通知列表和触发设置已接入 Query，发送、保存或删除后自动刷新。", "Notification list and trigger settings are connected to Query and refresh automatically after sending, saving, or deleting.")}
        filters={(
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border)] pb-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setTab("list")} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === "list" ? "bg-[var(--theme-price)]/15 text-[var(--theme-price)]" : "text-muted-foreground hover:bg-secondary"}`}>
                {L("通知列表", "Notifications")}
              </button>
              <PermissionGate anyOf={NOTIFICATION_COMPOSE_PERMISSIONS}>
                <button type="button" onClick={() => setTab("manual")} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === "manual" ? "bg-[var(--theme-price)]/15 text-[var(--theme-price)]" : "text-muted-foreground hover:bg-secondary"}`}>
                  {L("手动发送", "Send manually")}
                </button>
              </PermissionGate>
              <PermissionGate anyOf={NOTIFICATION_TRIGGER_PERMISSIONS}>
                <button type="button" onClick={() => setTab("settings")} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === "settings" ? "bg-[var(--theme-price)]/15 text-[var(--theme-price)]" : "text-muted-foreground hover:bg-secondary"}`}>
                  {L("触发设置", "Trigger settings")}
                </button>
              </PermissionGate>
            </div>
            <button type="button" onClick={handleRefresh} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
              <RefreshCw size={16} className={(tab === "settings" ? rulesQuery.isFetching : notificationsQuery.isFetching) ? "animate-spin" : ""} />
              {L("刷新", "Refresh")}
            </button>
          </div>
        )}
      >
        {tab === "list" ? (
          <>
            <div className="mb-4 grid gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 md:grid-cols-[180px_180px_1fr_auto]">
              <AdminFilterSelect value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
                <option value="">{L("全部类型", "All types")}</option>
                {Object.entries(typeLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </AdminFilterSelect>
              <AdminFilterSelect value={sendStatus} onChange={(e) => { setSendStatus(e.target.value); setPage(1); }}>
                <option value="">{L("全部状态", "All statuses")}</option>
                {Object.entries(statusLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </AdminFilterSelect>
              <AdminSearchInput value={keyword} onChange={(value) => { setKeyword(value); setPage(1); }} placeholder={L("搜索标题或正文", "Search title or body")} />
              <AdminFilterButton onClick={() => { setType(""); setSendStatus(""); setKeyword(""); setPage(1); }}>{L("清空筛选", "Clear filters")}</AdminFilterButton>
            </div>

            <AnimatedTable
              loading={notificationsQuery.isLoading}
              rows={rows}
              rowKey={(row) => row.id}
              skeletonRows={8}
              skeletonCols={8}
              emptyIcon={Bell}
              emptyTitle={L("暂无通知", "No notifications")}
              emptyDescription={L("当前筛选条件下没有通知记录。", "No notification records match the current filters.")}
              className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
              tableClassName="min-w-[1040px] w-full text-sm"
              theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
              thead={adminTableTheadRow(
                [L("标题", "Title"), L("类型", "Type"), L("受众", "Audience"), L("发送状态", "Status"), L("触达 / 已读", "Delivered / Read"), L("时间", "Time"), L("操作", "Actions")],
                NOTIFICATION_COLUMN_ALIGNS,
              )}
              footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
              renderMobileCard={renderMobileCard}
              renderRow={(row) => {
                const rowAction = getRowAction(row);
                return (
                <>
                  <td className={adminTableCellClass("left", "max-w-[18rem]")}>
                    <AdminTableCellGroup
                      maxWidth="17rem"
                      lines={[
                        { text: row.title },
                        { text: row.content || "—", muted: true },
                      ]}
                      tooltipLines={[row.title, row.content || "—"]}
                    />
                  </td>
                  <td className={adminTableCellClass("left", "text-sm")}>{label(typeLabels, row.type)}</td>
                  <td className={adminTableCellClass("left", "text-sm")}>{label(audienceLabels, row.audience_type)}</td>
                  <td className={adminTableCellClass("center")}><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{label(statusLabels, row.send_status || row.workflow_status)}</span></td>
                  <td className={adminTableCellClass("right", "text-sm text-muted-foreground")}>{row.recipient_count || 0} / {row.read_count || 0}</td>
                  <td className={adminTableCellClass("left", "text-xs text-muted-foreground whitespace-nowrap")}>{formatDateTime(row.sent_at || row.scheduled_at || row.created_at)}</td>
                  <td className={adminTableCellClass("right")}>
                    <AdminRowActionsMenu
                      primary={(
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/notifications/${row.id}`)}
                          className="inline-flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-secondary"
                        >
                          {L("详情", "Details")}
                        </button>
                      )}
                      moreLabel={L("更多", "More")}
                      menuDisabled={deleteMutation.isPending}
                      items={[
                        ...(rowAction && canAny(rowAction.permissions) ? ([
                          {
                            key: "rowAction",
                            label: rowAction.label,
                            danger: rowAction.action === "deleteDraft",
                            disabled: deleteMutation.isPending,
                            onClick: () => deleteMutation.mutate(row),
                          },
                        ] as const) : []),
                      ]}
                    />
                  </td>
                </>
                );
              }}
            />
          </>
        ) : null}

        {tab === "manual" ? (
          <PermissionGate anyOf={NOTIFICATION_COMPOSE_PERMISSIONS}>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">{L("通知类型", "Notification type")}
                <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  {Object.entries(typeLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-muted-foreground">{L("接收人", "Audience")}
                <select value={form.audience_type} onChange={(e) => setForm((prev) => ({ ...prev, audience_type: e.target.value as AudienceType }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  {Object.entries(audienceLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                </select>
              </label>
              <label className="md:col-span-2 text-xs font-medium text-muted-foreground">{L("标题", "Title")}
                <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="md:col-span-2 text-xs font-medium text-muted-foreground">{L("正文", "Body")}
                <textarea value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} rows={5} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-muted-foreground">{L("接收用户（编号 / 手机号）", "Recipients (ID / phone number)")}
                <textarea value={form.identifiers} onChange={(e) => setForm((prev) => ({ ...prev, identifiers: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={L("单个用户或指定用户时填写，多个用换行/逗号分隔", "Fill when targeting one or specific users; separate multiple entries with new lines or commas")} />
              </label>
              <div className="space-y-4">
                <label className="block text-xs font-medium text-muted-foreground">{L("定时发送时间", "Scheduled time")}
                  <SegmentedDateTimeInput value={form.scheduled_at} onChange={(scheduled_at) => setForm((prev) => ({ ...prev, scheduled_at }))} className="mt-1 w-full" controlClassName="bg-background" />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">{L("跳转链接", "Link URL")}
                  <input value={form.link_url} onChange={(e) => setForm((prev) => ({ ...prev, link_url: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={L("/orders 或完整 URL", "/orders or a full URL")} />
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <PermissionGate anyOf={NOTIFICATION_DRAFT_PERMISSIONS}>
                <button type="button" onClick={() => sendMutation.mutate("draft")} disabled={sendMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-60">{L("保存草稿", "Save draft")}</button>
              </PermissionGate>
              <PermissionGate anyOf={NOTIFICATION_SEND_PERMISSIONS}>
                <button type="button" onClick={() => sendMutation.mutate("send")} disabled={sendMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  <Send size={16} />
                  {L("立即发送", "Send now")}
                </button>
              </PermissionGate>
            </div>
          </div>
          </PermissionGate>
        ) : null}

        {tab === "settings" ? (
          <PermissionGate anyOf={NOTIFICATION_TRIGGER_PERMISSIONS}>
          <div className="space-y-4">
            {rulesQuery.isLoading ? <p className="text-sm text-muted-foreground">{L("正在加载触发规则...", "Loading trigger rules...")}</p> : null}
            {rules.map((rule) => (
              <div key={rule.key} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{rule.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!rule.enabled} onChange={(e) => updateRule(rule.key, { enabled: e.target.checked })} />
                    {L("启用", "Enabled")}
                  </label>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block text-xs font-medium text-muted-foreground">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>{L("标题模板", "Title template")}</span>
                      {!hasCustomTriggerTemplate(rule, "title") ? (
                        <span className="font-normal text-muted-foreground/80">{L("系统默认", "System default")}</span>
                      ) : null}
                    </span>
                    <input
                      value={getTriggerTemplateDisplay(rule, "title")}
                      onChange={(e) => updateRuleTemplate(rule.key, "title", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-medium text-muted-foreground">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>{L("正文模板", "Body template")}</span>
                      {!hasCustomTriggerTemplate(rule, "content") ? (
                        <span className="font-normal text-muted-foreground/80">{L("系统默认", "System default")}</span>
                      ) : null}
                    </span>
                    <textarea
                      value={getTriggerTemplateDisplay(rule, "content")}
                      onChange={(e) => updateRuleTemplate(rule.key, "content", e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y"
                    />
                  </label>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <button type="button" onClick={() => saveRulesMutation.mutate()} disabled={saveRulesMutation.isPending} className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{L("保存触发设置", "Save trigger settings")}</button>
            </div>
          </div>
          </PermissionGate>
        ) : null}
      </AdminPageShell>
    </PermissionGate>
  );
}
