import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { useNavigate } from "react-router-dom";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchInviteRecords } from "@/services/admin/inviteService";

const statusLabels: Record<string, { label: string; color: string }> = {
  registered: { label: "已注册", color: "bg-gold/10 text-gold" },
  ordered: { label: "已下单", color: "bg-green-500/10 text-green-500" },
};

export default function AdminInvites() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchInviteRecords()
      .then((p) => setInvites(p.list))
      .catch(() => toast.error("加载邀请记录失败"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = invites.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (inv.nickname || "").toLowerCase().includes(q)
      || (inv.phone || "").toLowerCase().includes(q)
      || (inv.inviter_nickname || "").toLowerCase().includes(q)
      || (inv.parent_invite_code || "").toLowerCase().includes(q);
  });

  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filtered, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar placeholder="搜索邀请人 / 被邀请人..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: "总邀请记录", value: String(filtered.length) },
          { label: "邀请人数", value: String(new Set(filtered.map((i) => i.inviter_nickname || i.parent_invite_code)).size) },
          { label: "被邀请人数", value: String(new Set(filtered.map((i) => i.id)).size) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {paginatedData.map((inv) => (
          <div key={inv.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{inv.nickname || "—"}</p>
                <p className="text-sm text-muted-foreground">{inv.phone || "—"}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{inv.created_at ? new Date(inv.created_at).toLocaleString("zh-CN") : "—"}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">邀请人 <span className="text-foreground">{inv.inviter_nickname || "—"}</span></p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">码 {inv.parent_invite_code || "—"}</p>
            <PermissionGate permission="user.view" fallback={<span className="mt-3 block text-xs text-muted-foreground">—</span>}>
              <button type="button" onClick={() => navigate(`/admin/users/${inv.id}`)} className="mt-3 w-full min-h-[44px] rounded-lg border border-gold/40 py-2.5 text-sm font-medium text-gold active:bg-secondary">
                查看用户
              </button>
            </PermissionGate>
          </div>
        ))}
        {paginatedData.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无邀请记录</div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {["被邀请人", "手机号", "邀请人", "邀请码", "注册时间", "操作"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-3 text-foreground">{inv.nickname || "—"}</td>
                <td className="px-4 py-3 text-foreground">{inv.phone || "—"}</td>
                <td className="px-4 py-3 text-foreground">{inv.inviter_nickname || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.parent_invite_code || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{inv.created_at ? new Date(inv.created_at).toLocaleString("zh-CN") : "—"}</td>
                <td className="px-4 py-3">
                  <PermissionGate permission="user.view" fallback={<span className="text-xs text-muted-foreground">—</span>}>
                    <button type="button" onClick={() => navigate(`/admin/users/${inv.id}`)} className="text-xs text-gold hover:underline">查看用户</button>
                  </PermissionGate>
                </td>
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">暂无邀请记录</td></tr>
            )}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}
