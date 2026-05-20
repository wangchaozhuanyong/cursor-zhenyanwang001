/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { formatDateTime } from "@/utils/formatDateTime";
import { Users } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchInviteRecords } from "@/services/admin/inviteService";
import { Tx } from "@/components/admin/AdminText";
import { AnimatedTable } from "@/modules/micro-interactions";
import { toastErrorMessage } from "@/utils/errorMessage";

export default function AdminInvites() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>({});

  useEffect(() => {
    setLoading(true);
    fetchInviteRecords({ page, pageSize, keyword: search || undefined })
      .then((p: any) => {
        setInvites(p.list || []);
        setTotal(p.total || 0);
        setSummary(p.summary || {});
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载邀请记录失败")))
      .finally(() => setLoading(false));
  }, [page, pageSize, search]);

  return (
    <div className="space-y-4">
      <SearchBar placeholder="搜索邀请人 / 被邀请人 / 邀请码..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: "总邀请记录", value: String(summary.totalRecords || total || 0) },
          { label: "邀请人数", value: String(summary.inviterUsers || 0) },
          { label: "被邀请人数", value: String(summary.inviteeUsers || 0) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <AnimatedTable
          loading={loading}
          rows={invites}
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
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(v) => { setPageSize(v); setPage(1); }} />}
          emptyIcon={Users}
          emptyTitle="暂无邀请记录"
          renderRow={(inv) => (
            <>
              <td className="px-4 py-3 text-foreground">{inv.nickname || "-"}</td>
              <td className="px-4 py-3 text-foreground">{inv.phone || "-"}</td>
              <td className="px-4 py-3 text-foreground">{inv.inviter_nickname || "-"}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.parent_invite_code || "-"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{inv.created_at ? formatDateTime(inv.created_at) : "-"}</td>
              <td className="px-4 py-3">
                <PermissionGate permission="user.view" fallback={<span className="text-xs text-muted-foreground">-</span>}>
                  <button type="button" onClick={() => navigate(`/admin/users/${inv.id}`)} className="text-xs text-theme-price hover:underline"><Tx>查看用户</Tx></button>
                </PermissionGate>
              </td>
            </>
          )}
        />
      </div>
    </div>
  );
}
