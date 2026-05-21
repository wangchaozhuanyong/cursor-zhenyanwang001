import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDateTime } from "@/utils/formatDateTime";
import { ShoppingCart } from "lucide-react";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildCheckoutAbandonmentFilterChips,
  hasActiveCheckoutAbandonmentFilters,
  removeCheckoutAbandonmentFilterChip,
} from "@/utils/adminCheckoutAbandonmentFilters";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import * as orderService from "@/services/admin/orderService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { CheckoutAbandonment, CheckoutAbandonmentStatus } from "@/types/order";
import { toastErrorMessage } from "@/utils/errorMessage";
import { labelCheckoutPaymentMethod } from "@/utils/adminDisplayLabels";
import { Tx } from "@/components/admin/AdminText";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { THEME_BADGE_ACCENT, THEME_BADGE_MUTED, THEME_BADGE_SUCCESS, THEME_BADGE_WARNING } from "@/utils/themeVisuals";

const STATUS_OPTIONS: Array<{ value: "" | CheckoutAbandonmentStatus; label: string }> = [
  { value: "", label: "未完成" },
  { value: "open", label: "仅进入结算" },
  { value: "ordered", label: "已下单未支付" },
  { value: "paid", label: "已支付" },
  { value: "closed", label: "已关闭" },
];

const STATUS_LABEL: Record<CheckoutAbandonmentStatus, string> = {
  open: "仅进入结算",
  ordered: "已下单未支付",
  paid: "已支付",
  closed: "已关闭",
};

const STATUS_BADGE: Record<CheckoutAbandonmentStatus, string> = {
  open: THEME_BADGE_WARNING,
  ordered: THEME_BADGE_ACCENT,
  paid: THEME_BADGE_SUCCESS,
  closed: THEME_BADGE_MUTED,
};

export default function AdminCheckoutAbandonments() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"" | CheckoutAbandonmentStatus>("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      status: status || undefined,
      keyword: keyword.trim() || undefined,
    }),
    [keyword, page, pageSize, status],
  );

  const listQuery = useQuery({
    queryKey: adminQueryKeys.checkoutAbandonments(queryParams),
    queryFn: () => orderService.fetchCheckoutAbandonments(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const rows = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading && !listQuery.data;

  const handleStatusChange = (value: "" | CheckoutAbandonmentStatus) => {
    setStatus(value);
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  };

  const filterState = { keyword, status };
  const filterChips = useMemo(() => buildCheckoutAbandonmentFilterChips(filterState), [keyword, status]);
  const filtersActive = hasActiveCheckoutAbandonmentFilters(filterState);
  const emptyGuide = filtersActive
    ? ADMIN_EMPTY_GUIDES.checkoutAbandonmentsFiltered
    : ADMIN_EMPTY_GUIDES.checkoutAbandonments;

  const clearFilters = () => {
    setKeyword("");
    setStatus("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeCheckoutAbandonmentFilterChip(key);
    if ("keyword" in patch) setKeyword(patch.keyword ?? "");
    if ("status" in patch) setStatus(patch.status ?? "");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 theme-shadow sm:p-4">
        <AdminPageTitle
          title={<Tx>未完成结算</Tx>}
          className="text-lg"
          hint={(
            <>
              <p><Tx>仅做站内记录和后台查看，不触发邮件、短信或自动外呼。</Tx></p>
              <p className="mt-1"><Tx>
                同一用户、同一次停留在结算页的过程，只会维护一条「进行中」快照：内容随填写与勾选变化而更新；下单成功后该条变为「已下单未支付」，其余误入的「仅进入结算」空壳会自动关闭。
                若仍看到两条时间接近的旧数据，多为升级前产生的重复快照，可忽略或后续数据清理。
              </Tx></p>
            </>
          )}
          hintContentClassName="max-w-md"
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar placeholder="搜索订单号 / 联系人 / 手机号..." value={keyword} onChange={setKeyword} />
          </div>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as "" | CheckoutAbandonmentStatus)}
            className="touch-manipulation min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2.5 text-sm text-foreground outline-none"
          >
            {STATUS_OPTIONS.map((option) => <option key={option.value || "unfinished"} value={option.value}>{option.label}</option>)}
          </select>
          <button type="button" onClick={handleSearch} className="touch-manipulation min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2.5 text-sm text-foreground hover:opacity-90"><Tx>
            搜索
          </Tx></button>
        </div>
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
      </div>

      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 theme-shadow sm:p-4">
              <div className="space-y-2">
                <div className="skeleton-base skeleton-shimmer h-4 w-24 rounded-full" />
                <div className="skeleton-base skeleton-shimmer h-4 w-3/4 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-1/2 rounded" />
              </div>
            </div>
          ))
          : null}
        {!loading && rows.map((row) => (
          <div key={row.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 theme-shadow sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(row.updated_at)}</span>
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <AdminTableCellGroup
                  maxWidth="100%"
                  lines={[
                    { text: row.contact_name || "未填写联系人" },
                    { text: `${row.contact_phone_masked || "未填写电话"} · ${row.items_count} 件`, muted: true },
                  ]}
                />
              </div>
              <p className="shrink-0 text-sm font-semibold text-[var(--theme-price)]">RM {row.total_amount.toFixed(2)}</p>
            </div>
            <div className="mt-2">
              <AdminTableCell
                value={row.items_summary.map((item) => `${item.name || "未命名商品"} x${item.qty}`).join("，") || "无商品摘要"}
                fullText={row.items_summary.map((item) => `${item.name || "未命名商品"} x${item.qty}`).join("\n") || "无商品摘要"}
                maxWidth="100%"
                muted
              />
            </div>
            {row.order_id && (
              <button type="button" onClick={() => navigate(`/admin/orders/${row.order_id}`)} className="mt-3 text-xs text-[var(--theme-price)] hover:underline">
                查看订单 {row.order_no || ""}
              </button>
            )}
          </div>
        ))}
        {!loading && rows.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground"><Tx>暂无未完成结算</Tx></div>}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
      </div>

      <div className="hidden md:block theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow">
        <AnimatedTable
          embedded
          loading={loading}
          rows={rows}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={8}
          tableClassName="w-full text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={(
            <tr>
              {["状态", "联系人", "商品摘要", "金额", "支付方式", "关联订单", "更新时间", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
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
          renderRow={(row) => (
            <>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[row.status]}`}>{STATUS_LABEL[row.status]}</span></td>
              <td className="max-w-[11rem] px-4 py-3 align-middle">
                <AdminTableCellGroup
                  maxWidth="10.5rem"
                  lines={[
                    { text: row.contact_name || "—" },
                    { text: row.contact_phone_masked || "—", muted: true },
                  ]}
                />
              </td>
              <td className="max-w-[16rem] px-4 py-3 align-middle">
                <AdminTableCell
                  value={row.items_summary.map((item) => `${item.name || "未命名商品"} x${item.qty}`).join("，") || "—"}
                  fullText={row.items_summary.map((item) => `${item.name || "未命名商品"} x${item.qty}`).join("\n") || "—"}
                  maxWidth="15rem"
                />
                <div className="mt-0.5 text-xs text-muted-foreground">{row.items_count} 件</div>
              </td>
              <td className="px-4 py-3 font-semibold text-foreground">RM {row.total_amount.toFixed(2)}</td>
              <td className="px-4 py-3 text-foreground">{labelCheckoutPaymentMethod(row.payment_method)}</td>
              <td className="px-4 py-3 font-mono text-xs text-foreground">{row.order_no || "—"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(row.updated_at)}</td>
              <td className="px-4 py-3">
                {row.order_id ? (
                  <button type="button" onClick={() => navigate(`/admin/orders/${row.order_id}`)} className="text-xs text-[var(--theme-price)] hover:underline"><Tx>详情</Tx></button>
                ) : <span className="text-xs text-muted-foreground"><Tx>未下单</Tx></span>}
              </td>
            </>
          )}
        />
        {(loading || rows.length > 0) && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
        )}
      </div>

    </div>
  );
}
