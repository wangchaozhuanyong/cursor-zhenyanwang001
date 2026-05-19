import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { AnimatedTable } from "@/modules/micro-interactions";
import Pagination from "@/components/admin/Pagination";
import * as notificationService from "@/services/admin/notificationService";
import type { Notification } from "@/types/notification";
import { toastErrorMessage } from "@/utils/errorMessage";
import { labelNotificationType } from "@/utils/adminDisplayLabels";
import { adminConfirmDelete, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { confirm } = useAdminConfirm();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<"list" | "settings">("list");

  const [triggerLoading, setTriggerLoading] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [rules, setRules] = useState<notificationService.NotificationTriggerRule[]>([]);

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
      setRules(data || []);
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">通知管理</h1>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={`rounded-lg border px-3 py-1.5 text-sm ${tab === "list" ? "bg-secondary" : ""}`} onClick={() => setTab("list")}>通知列表</button>
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
          emptyIcon={Bell}
          emptyTitle="暂无通知"
          renderRow={(n) => (
            <>
              <td className="px-4 py-3">
                <button className="font-medium text-left hover:underline" onClick={() => navigate(`/admin/notifications/${n.id}`)}>{n.title}</button>
              </td>
              <td className="px-4 py-3">{labelNotificationType(n.type)}</td>
              <td className="px-4 py-3">{n.send_status || n.workflow_status || "-"}</td>
              <td className="px-4 py-3 text-xs">{n.recipient_count || 0} / {n.read_count || 0}</td>
              <td className="px-4 py-3 text-center">
                <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => removeDraft(String(n.id), n.title)}>删除</button>
              </td>
            </>
          )}
        />
      ) : (
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
                  placeholder="标题模板"
                  value={rule.title || ""}
                  onChange={(e) => setRules((prev) => prev.map((x) => (x.key === rule.key ? { ...x, title: e.target.value } : x)))}
                />
                <textarea
                  className="min-h-[88px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  placeholder="内容模板"
                  value={rule.content || ""}
                  onChange={(e) => setRules((prev) => prev.map((x) => (x.key === rule.key ? { ...x, content: e.target.value } : x)))}
                />
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
      )}
    </div>
  );
}
