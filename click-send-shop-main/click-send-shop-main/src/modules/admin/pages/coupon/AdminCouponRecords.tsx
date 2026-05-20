import { formatDateTime } from "@/utils/formatDateTime";
import { useState, useEffect, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import { fetchCouponRecords } from "@/services/admin/couponService";
import type { CouponClaimRecord } from "@/types/coupon";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildCouponRecordFilterChips,
  hasActiveCouponRecordFilters,
  removeCouponRecordFilterChip,
} from "@/utils/adminCouponRecordFilters";
import { Tx } from "@/components/admin/AdminText";
import { formatUserDisplay, labelCouponRecordStatus } from "@/utils/adminDisplayLabels";
import { THEME_BADGE_SUCCESS } from "@/utils/themeVisuals";

const statusLabels: Record<string, { label: string; color: string }> = {
  available: { label: "未使用", color: "bg-gold/10 text-theme-price" },
  used: { label: "已使用", color: THEME_BADGE_SUCCESS },
  expired: { label: "已过期", color: "bg-muted text-muted-foreground" },
};

export default function AdminCouponRecords() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<CouponClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCouponRecords()
      .then((p) => setRecords(p.list))
      .catch(() => toast.error("加载领券记录失败"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.nickname || "").toLowerCase().includes(q)
        || (r.phone || "").toLowerCase().includes(q)
        || (r.coupon_title || "").toLowerCase().includes(q);
    }
    return true;
  });
  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filtered, 10);

  const filterState = { search, statusFilter };
  const filterChips = useMemo(() => buildCouponRecordFilterChips(filterState), [search, statusFilter]);
  const filtersActive = hasActiveCouponRecordFilters(filterState);
  const emptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.couponRecordsFiltered : ADMIN_EMPTY_GUIDES.couponRecords;

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><h2 className="text-lg font-semibold text-foreground"><Tx>领券记录</Tx></h2></div>

      <div className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="min-w-0 flex-1"><SearchBar placeholder="搜索用户/优惠券..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} /></div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="min-h-[44px] w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none sm:w-auto">
            <option value=""><Tx>全部状态</Tx></option>
            <option value="available"><Tx>未使用</Tx></option>
            <option value="used"><Tx>已使用</Tx></option>
            <option value="expired"><Tx>已过期</Tx></option>
          </select>
        </div>
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
      </div>

      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="space-y-2">
                <div className="skeleton-base skeleton-shimmer h-4 w-3/4 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-1/2 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-2/3 rounded" />
              </div>
            </div>
          ))
          : null}
        {!loading && paginatedData.map((r) => {
          const st = statusLabels[r.status] ?? { label: labelCouponRecordStatus(r.status), color: "" };
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{r.coupon_title || "未命名优惠券"}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>{st.label}</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{formatUserDisplay(r.nickname, r.phone)}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">领取 {r.claimed_at ? formatDateTime(r.claimed_at) : "—"}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">使用 {r.used_at ? formatDateTime(r.used_at) : "—"}</p>
            </div>
          );
        })}
        {!loading && paginatedData.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground"><Tx>无匹配记录</Tx></div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <div className="hidden md:block rounded-xl border border-border bg-card">
        <AnimatedTable
          embedded
          loading={loading}
          rows={paginatedData}
          rowKey={(r) => r.id}
          skeletonRows={8}
          skeletonCols={6}
          tableClassName="w-full min-w-[640px] text-sm"
          theadClassName="border-b border-border bg-secondary/50"
          thead={(
            <tr>
              {["用户", "手机号", "优惠券", "领取时间", "状态", "使用时间"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          )}
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
          renderRow={(r) => {
            const st = statusLabels[r.status] ?? { label: labelCouponRecordStatus(r.status), color: "" };
            return (
              <>
                <td className="px-4 py-3 text-foreground">{formatUserDisplay(r.nickname, r.phone)}</td>
                <td className="px-4 py-3 text-foreground">{formatPhone(r.phone)}</td>
                <td className="px-4 py-3 text-foreground">{r.coupon_title || "未命名优惠券"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.claimed_at ? formatDateTime(r.claimed_at) : "—"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>{st.label}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.used_at ? formatDateTime(r.used_at) : "—"}</td>
              </>
            );
          }}
        />
        {(loading || paginatedData.length > 0) && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>
    </div>
  );
}
