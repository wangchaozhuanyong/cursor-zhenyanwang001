import { formatDateTime } from "@/utils/formatDateTime";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { fetchCouponRecords } from "@/services/admin/couponService";
import type { CouponClaimRecord } from "@/types/coupon";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Tx } from "@/components/admin/AdminText";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import {
  buildCouponRecordFilterChips,
  hasActiveCouponRecordFilters,
  removeCouponRecordFilterChip,
} from "@/utils/adminCouponRecordFilters";
import { formatUserDisplay } from "@/utils/adminDisplayLabels";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { THEME_BADGE_SUCCESS } from "@/utils/themeVisuals";
import { useAdminT } from "@/hooks/useAdminT";

const statusLabels: Record<string, { label: string; color: string }> = {
  available: { label: "未使用", color: "bg-gold/10 text-theme-price" },
  used: { label: "已使用", color: THEME_BADGE_SUCCESS },
  expired: { label: "已过期", color: "bg-muted text-muted-foreground" },
};

export default function AdminCouponRecords() {
  const { tText } = useAdminT();
  const { couponRecordStatus: labelCouponRecordStatus, text: L } = useAdminDisplayLabel();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const recordsQuery = useQuery({
    queryKey: adminQueryKeys.couponRecords(),
    queryFn: () => fetchCouponRecords(),
    staleTime: 60_000,
  });

  const records = recordsQuery.data?.list ?? [];
  const loading = recordsQuery.isLoading && !recordsQuery.data;

  const filtered = records.filter((record) => {
    if (statusFilter && record.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (record.nickname || "").toLowerCase().includes(q)
        || (record.phone || "").toLowerCase().includes(q)
        || (record.coupon_title || "").toLowerCase().includes(q);
    }
    return true;
  });
  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filtered, 10);

  const filterState = useMemo(() => ({ search, statusFilter }), [search, statusFilter]);
  const filterChips = useMemo(() => buildCouponRecordFilterChips(filterState), [filterState]);
  const filtersActive = hasActiveCouponRecordFilters(filterState);
  const emptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.couponRecordsFiltered : ADMIN_EMPTY_GUIDES.couponRecords,
  );

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeCouponRecordFilterChip(key);
    if ("search" in patch) setSearch(patch.search ?? "");
    if ("statusFilter" in patch) setStatusFilter(patch.statusFilter ?? "");
    setPage(1);
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return "—";
    const raw = String(phone).trim();
    if (raw.length < 7) return raw;
    return `${raw.slice(0, 3)}****${raw.slice(-4)}`;
  };

  const renderMobileCard = (record: CouponClaimRecord) => {
    const statusLabel = statusLabels[record.status]?.label ? L(statusLabels[record.status].label) : labelCouponRecordStatus(record.status);
    const statusColor = statusLabels[record.status]?.color || "bg-secondary text-foreground";

    return (
      <AdminTableMobileCard>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{formatUserDisplay(record.nickname, record.phone)}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusColor}`}>{statusLabel}</span>
        </div>
        <div className="space-y-2">
          <AdminTableMobileCardField label={tText("优惠券")}>
            <span className="text-xs text-muted-foreground">{record.coupon_title || "—"}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={tText("手机号")}>
            <span className="text-xs text-muted-foreground">{formatPhone(record.phone)}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={tText("领取时间")}>
            <span className="text-xs text-muted-foreground">{formatDateTime(record.claimed_at)}</span>
          </AdminTableMobileCardField>
          {record.used_at ? (
            <AdminTableMobileCardField label={tText("使用时间")}>
              <span className="text-xs text-muted-foreground">{formatDateTime(record.used_at)}</span>
            </AdminTableMobileCardField>
          ) : null}
        </div>
      </AdminTableMobileCard>
    );
  };

  return (
    <AdminPageShell
      hint={<Tx>查看用户领券与使用状态，支持按用户、优惠券与状态筛选。</Tx>}
      filters={(
        <div className="flex flex-wrap gap-2">
          <SearchBar placeholder={tText("搜索用户/优惠券")} value={search} onChange={(value) => { setSearch(value); setPage(1); }} />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg bg-secondary px-3 py-2 text-sm"
          >
            <option value=""><Tx>全部状态</Tx></option>
            <option value="available"><Tx>未使用</Tx></option>
            <option value="used"><Tx>已使用</Tx></option>
            <option value="expired"><Tx>已过期</Tx></option>
          </select>
        </div>
      )}
    >
      <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />

      <AnimatedTable
        loading={loading}
        rows={paginatedData}
        rowKey={(record: CouponClaimRecord) => record.id}
        skeletonRows={8}
        skeletonCols={6}
        tableClassName="min-w-[900px]"
        className="overflow-hidden border-border bg-card"
        theadClassName="bg-secondary/40 text-left text-xs text-muted-foreground"
        thead={(
          <tr>
            <th className="px-4 py-3"><Tx>用户</Tx></th>
            <th className="px-4 py-3"><Tx>手机号</Tx></th>
            <th className="px-4 py-3"><Tx>优惠券</Tx></th>
            <th className="px-4 py-3"><Tx>状态</Tx></th>
            <th className="px-4 py-3"><Tx>领取时间</Tx></th>
            <th className="px-4 py-3"><Tx>使用时间</Tx></th>
          </tr>
        )}
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
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
        renderRow={(record) => (
          <>
            <td className="px-4 py-3">{formatUserDisplay(record.nickname, record.phone)}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{formatPhone(record.phone)}</td>
            <td className="max-w-[12rem] px-4 py-3 align-middle">
              <AdminTableCell value={record.coupon_title || "—"} fullText={record.coupon_title || ""} maxWidth="11rem" />
            </td>
            <td className="px-4 py-3">
              <span className={`rounded-full px-2 py-0.5 text-xs ${statusLabels[record.status]?.color || "bg-secondary text-foreground"}`}>
                {statusLabels[record.status]?.label ? L(statusLabels[record.status].label) : labelCouponRecordStatus(record.status)}
              </span>
            </td>
            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(record.claimed_at)}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{record.used_at ? formatDateTime(record.used_at) : "—"}</td>
          </>
        )}
      />
    </AdminPageShell>
  );
}
