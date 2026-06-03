import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCouponRecords } from "@/services/admin/couponService";
import type { CouponClaimRecord } from "@/types/coupon";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { formatDateTime } from "@/utils/formatDateTime";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { AdminTableMobileCard, AdminTableMobileCardField } from "@/components/admin/AdminTableMobileCard";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Tx } from "@/components/admin/AdminText";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import { buildCouponRecordFilterChips, hasActiveCouponRecordFilters, removeCouponRecordFilterChip } from "@/utils/adminCouponRecordFilters";
import { formatUserDisplay } from "@/utils/adminDisplayLabels";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { THEME_BADGE_SUCCESS } from "@/utils/themeVisuals";
import { adminTableCellClass, adminTableTheadRow, type AdminTableAlign } from "@/utils/adminTableClasses";
import { useAdminTOptional } from "@/hooks/useAdminT";
import CouponCenterTabs from "./CouponCenterTabs";

const COUPON_RECORD_COLUMN_ALIGNS: AdminTableAlign[] = ["left", "left", "left", "center", "left", "left"];

const STATUS_LABELS: Record<string, { zh: string; en: string; color: string }> = {
  available: { zh: "未使用", en: "Unused", color: "bg-gold/10 text-theme-price" },
  used: { zh: "已使用", en: "Used", color: THEME_BADGE_SUCCESS },
  expired: { zh: "已过期", en: "Expired", color: "bg-muted text-muted-foreground" },
};

export default function AdminCouponRecords() {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
  const { couponRecordStatus: labelCouponRecordStatus, text: label } = useAdminDisplayLabel();

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      status: statusFilter || undefined,
      keyword: search.trim() || undefined,
    }),
    [page, pageSize, search, statusFilter],
  );

  const recordsQuery = useQuery({
    queryKey: [...adminQueryKeys.couponRecords(), queryParams],
    queryFn: () => fetchCouponRecords(undefined, queryParams),
    staleTime: 60_000,
  });

  const records = recordsQuery.data?.list ?? [];
  const loading = recordsQuery.isLoading && !recordsQuery.data;
  const total = recordsQuery.data?.total ?? 0;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

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
    if (!phone) return "-";
    const raw = String(phone).trim();
    if (raw.length < 7) return raw;
    return `${raw.slice(0, 3)}****${raw.slice(-4)}`;
  };

  const renderMobileCard = (record: CouponClaimRecord) => {
    const statusInfo = STATUS_LABELS[record.status];
    const statusLabel = statusInfo ? L(statusInfo.zh, statusInfo.en) : labelCouponRecordStatus(record.status);
    const statusColor = statusInfo?.color || "bg-secondary text-foreground";

    return (
      <AdminTableMobileCard>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{formatUserDisplay(record.nickname, record.phone)}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusColor}`}>{statusLabel}</span>
        </div>
        <div className="space-y-2">
          <AdminTableMobileCardField label={L("优惠券", "Coupon")}>
            <span className="text-xs text-muted-foreground">{record.coupon_title || "-"}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={L("手机号", "Phone")}>
            <span className="text-xs text-muted-foreground">{formatPhone(record.phone)}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={L("领取时间", "Claimed at")}>
            <span className="text-xs text-muted-foreground">{formatDateTime(record.claimed_at)}</span>
          </AdminTableMobileCardField>
          {record.used_at ? (
            <AdminTableMobileCardField label={L("使用时间", "Used at")}>
              <span className="text-xs text-muted-foreground">{formatDateTime(record.used_at)}</span>
            </AdminTableMobileCardField>
          ) : null}
        </div>
      </AdminTableMobileCard>
    );
  };

  return (
    <AdminPageShell
      hint={<Tx>{L("查看用户领券与使用状态，支持按用户、优惠券与状态筛选。", "View claim and usage status, with filters for user, coupon, and status.")}</Tx>}
      filters={(
        <div className="space-y-3">
          <CouponCenterTabs />
          <div className="flex flex-wrap gap-2">
            <SearchBar placeholder={L("搜索用户/优惠券", "Search user/coupon")} value={search} onChange={(value) => { setSearch(value); setPage(1); }} />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg bg-secondary px-3 py-2 text-sm"
            >
              <option value="">{L("全部状态", "All statuses")}</option>
              <option value="available">{L("未使用", "Unused")}</option>
              <option value="used">{L("已使用", "Used")}</option>
              <option value="expired">{L("已过期", "Expired")}</option>
            </select>
          </div>
        </div>
      )}
    >
      <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />

      <AnimatedTable
        loading={loading}
        rows={records}
        rowKey={(record: CouponClaimRecord) => record.id}
        skeletonRows={8}
        skeletonCols={6}
        tableClassName="min-w-[900px]"
        className="overflow-hidden border-border bg-card"
        theadClassName="bg-secondary/40 text-left text-xs text-muted-foreground"
        thead={adminTableTheadRow(
          [L("用户", "User"), L("手机号", "Phone"), L("优惠券", "Coupon"), L("状态", "Status"), L("领取时间", "Claimed at"), L("使用时间", "Used at")],
          COUPON_RECORD_COLUMN_ALIGNS,
          (title) => <Tx>{title}</Tx>,
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
        renderRow={(record) => {
          const statusInfo = STATUS_LABELS[record.status];
          const statusLabel = statusInfo ? L(statusInfo.zh, statusInfo.en) : labelCouponRecordStatus(record.status);
          const statusColor = statusInfo?.color || "bg-secondary text-foreground";

          return (
            <>
              <td className={adminTableCellClass("left")}>{formatUserDisplay(record.nickname, record.phone)}</td>
              <td className={adminTableCellClass("left", "text-xs text-muted-foreground")}>{formatPhone(record.phone)}</td>
              <td className={adminTableCellClass("left", "max-w-[12rem]")}>
                <AdminTableCell value={record.coupon_title || "-"} fullText={record.coupon_title || ""} maxWidth="11rem" />
              </td>
              <td className={adminTableCellClass("center")}>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor}`}>{statusLabel}</span>
              </td>
              <td className={adminTableCellClass("left", "text-xs text-muted-foreground whitespace-nowrap")}>{formatDateTime(record.claimed_at)}</td>
              <td className={adminTableCellClass("left", "text-xs text-muted-foreground whitespace-nowrap")}>{record.used_at ? formatDateTime(record.used_at) : "-"}</td>
            </>
          );
        }}
      />
    </AdminPageShell>
  );
}
