import { useEffect, useLayoutEffect } from "react";
import { Loader2, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import * as userService from "@/services/admin/userService";
import PermissionGate from "@/components/admin/PermissionGate";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";

export default function AdminUsers() {
  const navigate = useNavigate();
  const users = useAdminUsersStore((s) => s.users);
  const loading = useAdminUsersStore((s) => s.loading);
  const search = useAdminUsersStore((s) => s.search);
  const setSearch = useAdminUsersStore((s) => s.setSearch);
  const loadUsers = useAdminUsersStore((s) => s.loadUsers);
  const resetUsersStore = useAdminUsersStore((s) => s.reset);

  useLayoutEffect(() => {
    useAdminUsersStore.setState({ loading: true });
  }, []);

  useEffect(() => {
    loadUsers().catch(() => toast.error("加载数据失败"));
  }, [loadUsers]);

  useEffect(() => () => resetUsersStore(), [resetUsersStore]);

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.nickname?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q);
  });
  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filteredUsers, 10);

  const handleExportCsv = async () => {
    try {
      await userService.exportUsersCsv({ keyword: search || undefined });
      toast.success("已开始下载 CSV");
    } catch {
      toast.error("导出失败");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-price)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchBar placeholder="搜索用户昵称 / 手机号..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        </div>
        <PermissionGate permission="user.view">
          <button type="button" onClick={handleExportCsv} className="touch-manipulation flex min-h-[44px] shrink-0 items-center gap-1.5 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm text-foreground hover:bg-[var(--theme-bg)] sm:self-center">
            <Download size={16} /> 导出
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: "总用户数", value: String(users.length) },
          { label: "今日新增", value: String(users.filter((u) => { const today = new Date().toISOString().slice(0, 10); return u.created_at?.slice(0, 10) === today; }).length) },
          { label: "有邀请码", value: String(users.filter((u) => u.parent_invite_code).length) },
        ].map((s) => (
          <div key={s.label} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-center theme-shadow">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 移动端：卡片 */}
      <div className="space-y-3 md:hidden">
        {paginatedData.map((u) => (
          <div key={u.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <div className="flex items-start gap-3">
              {u.avatar ? (
                <img src={u.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "var(--theme-gradient)" }}>{(u.nickname || u.phone || "?")[0]}</div>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{u.nickname || u.phone || "—"}</p>
                  <span className="shrink-0 text-sm font-semibold text-[var(--theme-price)]">{u.points_balance ?? 0} 积分</span>
                </div>
                <p className="text-sm text-muted-foreground">{u.phone || "—"}</p>
                <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>邀请码 <span className="font-mono text-foreground">{u.invite_code || "—"}</span></span>
                  <span>上级 <span className="font-mono text-foreground">{u.parent_invite_code || "—"}</span></span>
                </div>
                <p className="text-[11px] text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleString("zh-CN") : "—"}</p>
                <button type="button" onClick={() => navigate(`/admin/users/${u.id}`)} className="touch-manipulation min-h-[44px] w-full theme-rounded border border-[var(--theme-price)]/40 py-2.5 text-sm font-medium text-[var(--theme-price)] active:bg-[var(--theme-bg)]">
                  查看详情
                </button>
              </div>
            </div>
          </div>
        ))}
        {paginatedData.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无用户</div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {/* 桌面端：表格 */}
      <div className="hidden overflow-x-auto theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] md:block theme-shadow">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70">
              {["用户", "手机号", "邀请码", "上级邀请码", "积分", "注册时间", "操作"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((u) => (
              <tr key={u.id} className="border-b border-[var(--theme-border)] last:border-0 hover:bg-[var(--theme-bg)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "var(--theme-gradient)" }}>{(u.nickname || u.phone || "?")[0]}</div>
                    )}
                    <span className="font-medium text-foreground">{u.nickname || u.phone}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground whitespace-nowrap">{u.phone}</td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{u.invite_code || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.parent_invite_code || "—"}</td>
                <td className="px-4 py-3 text-foreground">{u.points_balance ?? 0}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleString("zh-CN") : "—"}</td>
                <td className="px-4 py-3"><button type="button" onClick={() => navigate(`/admin/users/${u.id}`)} className="text-xs text-[var(--theme-price)] hover:underline">详情</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}
