import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "@/utils/formatDateTime";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchInviteRecords } from "@/services/admin/inviteService";
import type { InviteRecord, InviteRecordsSummary } from "@/types/invite";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { AnimatedTable } from "@/modules/micro-interactions";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildInviteRecordFilterChips,
  hasActiveInviteRecordFilters,
  removeInviteRecordFilterChip,
} from "@/utils/adminInviteRecordFilters";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import {
  adminTableCellClass,
  adminTableTheadRow,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";

const INVITE_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "left", "left", "left", "left", "right",
];

export default function AdminInvites() {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
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

  const filterState = useMemo(() => ({ search }), [search]);
  const filterChips = useMemo(() => {
    const chips = buildInviteRecordFilterChips(filterState);
    return chips.map((chip) => (
      chip.key === "search"
        ? { ...chip, label: L(`关键词：${search.trim()}`, `Keyword: ${search.trim()}`) }
        : chip
    ));
  }, [filterState, search, L]);
  const tableHeaders = useMemo(
    () => [
      L("被邀请人", "Invitee"),
      L("手机号", "Phone"),
      L("邀请人", "Inviter"),
      L("邀请码", "Invite Code"),
      L("注册时间", "Registered At"),
      L("操作", "Actions"),
    ],
    [L],
  );
  const filtersActive = hasActiveInviteRecordFilters(filterState);
  const emptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.invitesFiltered : ADMIN_EMPTY_GUIDES.invites,
  );

  const clearFilters = () => {
    setSearch("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeInviteRecordFilterChip(key);
    if ("search" in patch) setSearch(patch.search ?? "");
    setPage(1);
  };

  const renderMobileCard = (inv: InviteRecord) => (
    <AdminTableMobileCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{inv.nickname || "-"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{inv.phone || "-"}</p>
        </div>
        <PermissionGate permission="user.view" fallback={null}>
          <button
            type="button"
            onClick={() => navigate(`/admin/users/${inv.id}`)}
            className="shrink-0 text-xs text-theme-price hover:underline"
          >
            {L("查看用户", "View user")}
          </button>
        </PermissionGate>
      </div>
      <div className="mt-3 space-y-2">
        <AdminTableMobileCardField label={L("邀请人", "Inviter")}>
          <span className="text-xs text-muted-foreground">{inv.inviter_nickname || "-"}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("邀请码", "Invite Code")}>
          <span className="font-mono text-xs text-muted-foreground">{inv.parent_invite_code || "-"}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("注册时间", "Registered At")}>
          <span className="text-xs text-muted-foreground">{inv.created_at ? formatDateTime(inv.created_at) : "-"}</span>
        </AdminTableMobileCardField>
      </div>
    </AdminTableMobileCard>
  );

  return (
    <AdminPageShell
      hint={L(
        "查看邀请注册记录与邀请关系，可跳转用户详情。",
        "Review invite registrations and relationships, with a shortcut to user details.",
      )}
      filters={(
        <>
          <div className="space-y-2">
            <SearchBar
              placeholder={L("搜索邀请人 / 被邀请人 / 邀请码...", "Search inviter / invitee / invite code...")}
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
            />
            <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[
              { label: L("总邀请记录", "Total records"), value: String(summary.totalRecords || total || 0) },
              { label: L("邀请人数", "Inviters"), value: String(summary.inviterUsers || 0) },
              { label: L("被邀请人数", "Invitees"), value: String(summary.inviteeUsers || 0) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    >
      <AnimatedTable
        loading={loading}
        rows={invites}
        rowKey={(inv) => inv.id}
        skeletonRows={8}
        skeletonCols={6}
        mobileCardFrom="md"
        className="overflow-x-auto rounded-xl border border-border bg-card"
        tableClassName="w-full min-w-[720px] text-sm"
        theadClassName="border-b border-border bg-secondary/50"
        thead={adminTableTheadRow(tableHeaders, INVITE_COLUMN_ALIGNS)}
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
        renderMobileCard={renderMobileCard}
        renderRow={(inv) => (
          <>
            <td className={adminTableCellClass("left", "text-foreground")}>{inv.nickname || "-"}</td>
            <td className={adminTableCellClass("left", "text-foreground")}>{inv.phone || "-"}</td>
            <td className={adminTableCellClass("left", "text-foreground")}>{inv.inviter_nickname || "-"}</td>
            <td className={adminTableCellClass("left", "font-mono text-xs text-muted-foreground")}>{inv.parent_invite_code || "-"}</td>
            <td className={adminTableCellClass("left", "text-xs text-muted-foreground")}>{inv.created_at ? formatDateTime(inv.created_at) : "-"}</td>
            <td className={adminTableCellClass("right")}>
              <PermissionGate permission="user.view" fallback={<span className="text-xs text-muted-foreground">-</span>}>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/users/${inv.id}`)}
                  className="text-xs text-theme-price hover:underline"
                >
                  {L("查看用户", "View user")}
                </button>
              </PermissionGate>
            </td>
          </>
        )}
      />
    </AdminPageShell>
  );
}
