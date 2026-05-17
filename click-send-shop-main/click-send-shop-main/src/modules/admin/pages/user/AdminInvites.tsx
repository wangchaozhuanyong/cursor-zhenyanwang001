/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { useNavigate } from "react-router-dom";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchInviteRecords } from "@/services/admin/inviteService";
import { Tx } from "@/components/admin/AdminText";
import { AnimatedTable } from "@/modules/micro-interactions";

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
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="space-y-2">
                <div className="skeleton-base skeleton-shimmer h-4 w-3/4 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-1/2 rounded" />
                <div className="skeleton-base skeleton-shimmer h-10 w-full rounded-lg" />
              </div>
            </div>
          ))
          : null}
        {!loading && paginatedData.map((inv) => (
          <div key={inv.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{inv.nickname || "—"}</p>
                <p className="text-sm text-muted-foreground">{inv.phone || "—"}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{inv.created_at ? new Date(inv.created_at).toLocaleString("zh-CN") : "—"}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground"><Tx>邀请人 </Tx><span className="text-foreground">{inv.inviter_nickname || "—"}</span></p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">码 {inv.parent_invite_code || "—"}</p>
            <PermissionGate permission="user.view" fallback={<span className="mt-3 block text-xs text-muted-foreground">—</span>}>
              <button type="button" onClick={() => navigate(`/admin/users/${inv.id}`)} className="mt-3 w-full min-h-[44px] rounded-lg border border-gold/40 py-2.5 text-sm font-medium text-gold active:bg-secondary"><Tx>
                查看用户
              </Tx></button>
            </PermissionGate>
          </div>
        ))}
        {!loading && paginatedData.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground"><Tx>暂无邀请记录</Tx></div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <div className="hidden md:block">
        <AnimatedTable
          loading={loading}
          rows={paginatedData}
          rowKey={(inv) => inv.id}
          skeletonRows={8}
          skeletonCols={6}
          className="overflow-x-auto rounded-xl border border-border bg-card"
          tableClassName="w-full min-w-[720px] text-sm"
          theadClassName="border-b border-border bg-secondary/50"
          thead={(
            <tr>
              {["被邀请人", "手机号", "邀请人", "邀请码", "注册时间", "操作"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          emptyIcon={Users}
          emptyTitle="暂无邀请记录"
          renderRow={(inv) => (
            <>
              <td className="px-4 py-3 text-foreground">{inv.nickname || "—"}</td>
              <td className="px-4 py-3 text-foreground">{inv.phone || "—"}</td>
              <td className="px-4 py-3 text-foreground">{inv.inviter_nickname || "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.parent_invite_code || "—"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{inv.created_at ? new Date(inv.created_at).toLocaleString("zh-CN") : "—"}</td>
              <td className="px-4 py-3">
                <PermissionGate permission="user.view" fallback={<span className="text-xs text-muted-foreground">—</span>}>
                  <button type="button" onClick={() => navigate(`/admin/users/${inv.id}`)} className="text-xs text-gold hover:underline"><Tx>查看用户</Tx></button>
                </PermissionGate>
              </td>
            </>
          )}
        />
      </div>
    </div>
  );
}
