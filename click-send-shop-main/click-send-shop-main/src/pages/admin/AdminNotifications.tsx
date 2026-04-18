import { useEffect, useState } from "react";
import { Bell, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import { usePagination } from "@/hooks/usePagination";
import * as notificationService from "@/services/admin/notificationService";

const typeLabels: Record<string, string> = {
  system: "系统通知",
  order: "订单通知",
  promotion: "促销活动",
  points: "积分变动",
  reward: "返现通知",
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", content: "", type: "system" });
  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(notifications);

  useEffect(() => {
    notificationService.fetchNotifications()
      .then((p) => setNotifications(p.list))
      .catch(() => toast.error("加载数据失败"))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = () => {
    if (!formData.title || !formData.content) { toast.error("请填写完整信息"); return; }
    notificationService.sendNotification(formData)
      .then((newNotif) => {
        setNotifications([newNotif, ...notifications]);
        toast.success("通知已发送");
        setShowForm(false);
        setFormData({ title: "", content: "", type: "system" });
      })
      .catch(() => toast.error("发送失败"));
  };

  const handleDelete = (id: string) => {
    notificationService.deleteNotification(id)
      .then(() => {
        setNotifications(notifications.filter((n) => n.id !== id));
        toast.success("已删除");
      })
      .catch(() => toast.error("删除失败"));
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

      <div className="space-y-3 md:hidden">
        {paginatedData.map((n) => (
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
        {paginatedData.length === 0 && (
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">时间</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((n) => (
                <tr key={n.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{n.title}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{n.content}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {typeLabels[n.type] || n.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${n.is_read ? "bg-muted text-muted-foreground" : "bg-gold/10 text-gold"}`}>
                      {n.is_read ? "已读" : "未读"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{n.created_at ? new Date(n.created_at).toLocaleString("zh-CN") : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <PermissionGate permission="notification.manage">
                        <button type="button" onClick={() => handleDelete(String(n.id))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive">
                          <Trash2 size={14} />
                        </button>
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
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <PermissionGate permission="notification.manage">
              <button onClick={handleSend} className="w-full rounded-xl bg-gold py-2.5 text-sm font-bold text-primary-foreground">发送通知</button>
            </PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}
