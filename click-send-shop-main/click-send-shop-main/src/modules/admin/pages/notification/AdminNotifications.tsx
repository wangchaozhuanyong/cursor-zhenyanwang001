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
    void load();
  }, [load]);

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
    </div>
  );
}
