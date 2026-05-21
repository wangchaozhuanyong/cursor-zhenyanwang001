import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDateTime } from "@/utils/formatDateTime";
import { Users } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { useNavigate } from "react-router-dom";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchInviteRecords } from "@/services/admin/inviteService";
import type { InviteRecord, InviteRecordsSummary } from "@/types/invite";
import { Tx } from "@/components/admin/AdminText";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildInviteRecordFilterChips,
  hasActiveInviteRecordFilters,
  removeInviteRecordFilterChip,
} from "@/utils/adminInviteRecordFilters";
import { adminQueryKeys } from "@/lib/adminQueryKeys";

export default function AdminInvites() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const queryParams = useMemo(
    () => ({ page, pageSize, keyword: search || undefined }),
    [page, pageSize, search],
  );

  const listQuery = useQuery({
    queryKey: adminQueryKeys.inviteRecords(queryParams),
    queryFn: () => fetchInviteRecords(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const invites = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const summary: InviteRecordsSummary = listQuery.data?.summary ?? {};
  const loading = listQuery.isLoading && !listQuery.data;

  const filterState = { search };
  const filterChips = useMemo(() => buildInviteRecordFilterChips(filterState), [search]);
  const filtersActive = hasActiveInviteRecordFilters(filterState);
  const emptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.invitesFiltered : ADMIN_EMPTY_GUIDES.invites;

  const clearFilters = () => {
    setSearch("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeInviteRecordFilterChip(key);
    if ("search" in patch) setSearch(patch.search ?? "");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SearchBar placeholder="搜索邀请人 / 被邀请人 / 邀请码..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
      </div>
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
          emptyIcon={emptyGuide.icon}
          emptyTitle={emptyGuide.title}
          emptyDescription={emptyGuide.description}
          emptyAction={(
            <AdminEmptyGuideActions
              guide={emptyGuide}
              showClearFilters={filtersActive}
              onClearFilters={clearFilters}
            />
          )}
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
