import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDateTime } from "@/utils/formatDateTime";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import { AnimatedTable } from "@/modules/micro-interactions";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import {
  CHECKOUT_ABANDONMENT_DEFAULT_STATUS_LABEL,
  hasActiveCheckoutAbandonmentFilters,
  removeCheckoutAbandonmentFilterChip,
} from "@/utils/adminCheckoutAbandonmentFilters";
import { getCheckoutAbandonmentActionLabel } from "@/utils/adminCheckoutAbandonmentDisplay";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import * as orderService from "@/services/admin/orderService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { CheckoutAbandonment, CheckoutAbandonmentStatus } from "@/types/order";
import { Tx } from "@/components/admin/AdminText";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { THEME_BADGE_ACCENT, THEME_BADGE_MUTED, THEME_BADGE_SUCCESS, THEME_BADGE_WARNING } from "@/utils/themeVisuals";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { useLocalizedOptions } from "@/hooks/useLocalizedOptions";
import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";

const STATUS_OPTIONS: Array<{ value: "" | CheckoutAbandonmentStatus; label: string }> = [
  { value: "", label: CHECKOUT_ABANDONMENT_DEFAULT_STATUS_LABEL },
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

function MergedSnapshotsBadge({ snapshotCount }: { snapshotCount: number }) {
  const { tText } = useAdminT();
  if (snapshotCount <= 1) return null;
  return (
    <span className="ml-1.5 inline-flex shrink-0 rounded-full bg-[var(--theme-bg)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {tText(`已合并 ${snapshotCount} 条快照`)}
    </span>
  );
}

function CheckoutAbandonmentIdCell({
  row,
  onViewOrder,
}: {
  row: CheckoutAbandonment;
  onViewOrder: (orderId: string) => void;
}) {
  const { tText } = useAdminT();
  const label =
    row.display_type === "order"
      ? `#${row.order_no || row.display_id}`
      : `${tText("快照")} #${row.display_id}`;
  const merged = <MergedSnapshotsBadge snapshotCount={row.snapshot_count} />;

  if (row.display_type === "order" && row.order_id) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-x-1">
        <button
          type="button"
          onClick={() => onViewOrder(row.order_id!)}
          className="font-mono text-xs text-[var(--theme-price)] hover:underline"
        >
          {label}
        </button>
        {merged}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 font-mono text-xs text-foreground">
      <span>{label}</span>
      {merged}
    </div>
  );
}

const TABLE_HEADERS = ["状态", "订单/结算编号", "联系人", "商品摘要", "金额", "支付方式", "结算时间", "操作"] as const;

export default function AdminCheckoutAbandonments() {
  const { tText } = useAdminT();
  const { checkoutPaymentMethod: labelCheckoutPaymentMethod } = useAdminDisplayLabel();
  const statusOptionsLocalized = useLocalizedOptions(STATUS_OPTIONS);
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

  const handleViewOrder = (orderId: string) => {
    navigate(`/admin/orders/${orderId}`);
  };

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

  const filterState = useMemo(() => ({ keyword, status }), [keyword, status]);
  const filterChips = useMemo(() => {
    const chips: AdminFilterChip[] = [];
    if (filterState.keyword.trim()) {
      chips.push({ key: "keyword", label: `${tText("关键词")}：${filterState.keyword.trim()}` });
    }
    if (filterState.status) {
      chips.push({
        key: "status",
        label: `${tText("状态")}：${tText(STATUS_LABEL[filterState.status])}`,
      });
    }
    return chips;
  }, [filterState, tText]);
  const filtersActive = hasActiveCheckoutAbandonmentFilters(filterState);
  const emptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.checkoutAbandonmentsFiltered : ADMIN_EMPTY_GUIDES.checkoutAbandonments,
  );

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

  const itemsSummaryLocalized = (row: CheckoutAbandonment) => {
    const lines = row.items_summary.map((item) => `${item.name || tText("未命名商品")} x${item.qty}`);
    return lines.join("\n") || tText("无商品摘要");
  };

  const renderAction = (row: CheckoutAbandonment) => {
    const label = tText(getCheckoutAbandonmentActionLabel(row));
    if (row.order_id) {
      return (
        <button
          type="button"
          onClick={() => handleViewOrder(row.order_id!)}
          className="text-xs text-[var(--theme-price)] hover:underline"
        >
          {label}
        </button>
      );
    }
    return <span className="text-xs text-muted-foreground">{label}</span>;
  };


  const renderMobileCard = (row: CheckoutAbandonment) => (
    <AdminTableMobileCard>
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[row.status]}`}>{tText(STATUS_LABEL[row.status])}</span>
        <span className="text-xs text-muted-foreground">{formatDateTime(row.updated_at)}</span>
      </div>
      <div className="mt-2">
        <CheckoutAbandonmentIdCell row={row} onViewOrder={handleViewOrder} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0 text-sm text-foreground">
          <p>{row.contact_name || tText("未填写联系人")}</p>
          <p className="text-xs text-muted-foreground">{row.contact_phone_masked || tText("未填写电话")}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[var(--theme-price)]">RM {row.total_amount.toFixed(2)}</p>
      </div>
      <div className="mt-2">
        <AdminTableCell value={row.items_preview} fullText={itemsSummaryLocalized(row)} maxWidth="100%" muted />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{labelCheckoutPaymentMethod(row.payment_method)}</span>
        {renderAction(row)}
      </div>
    </AdminTableMobileCard>
  );

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
              </Tx></p>
              <p className="mt-1 text-muted-foreground"><Tx>
                同一订单的多个结算快照已自动合并展示，不影响原始记录。
              </Tx></p>
            </>
          )}
          hintContentClassName="max-w-md"
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar placeholder={tText("搜索订单号 / 联系人 / 手机号 / 商品名...")} value={keyword} onChange={setKeyword} />
          </div>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as "" | CheckoutAbandonmentStatus)}
            className="touch-manipulation min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2.5 text-sm text-foreground outline-none"
          >
            {statusOptionsLocalized.map((option) => <option key={option.value || "pending"} value={option.value}>{option.label}</option>)}
          </select>
          <button type="button" onClick={handleSearch} className="touch-manipulation min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2.5 text-sm text-foreground hover:opacity-90"><Tx>
            搜索
          </Tx></button>
        </div>
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
      </div>

      <div className=" theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow">
        <AnimatedTable
          embedded
          loading={loading}
          rows={rows}
          rowKey={(row) => row.group_key || row.id}
          skeletonRows={8}
          skeletonCols={8}
          tableClassName="w-full text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={(
            <tr>
              {TABLE_HEADERS.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{tText(h)}</th>
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
          mobileCardFrom="md"
          renderMobileCard={renderMobileCard}
          renderRow={(row) => (
            <>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[row.status]}`}>{tText(STATUS_LABEL[row.status])}</span></td>
              <td className="max-w-[12rem] px-4 py-3 align-middle">
                <CheckoutAbandonmentIdCell row={row} onViewOrder={handleViewOrder} />
              </td>
              <td className="max-w-[11rem] px-4 py-3 align-middle">
                <AdminTableCellGroup
                  maxWidth="10.5rem"
                  lines={[
                    { text: row.contact_name || "—" },
                    { text: row.contact_phone_masked || "—", muted: true },
                  ]}
                />
              </td>
              <td className="max-w-[14rem] px-4 py-3 align-middle">
                <AdminTableCell
                  value={row.items_preview}
                  fullText={itemsSummaryLocalized(row)}
                  maxWidth="13rem"
                />
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">RM {row.total_amount.toFixed(2)}</td>
              <td className="px-4 py-3 text-foreground">{labelCheckoutPaymentMethod(row.payment_method)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateTime(row.updated_at)}</td>
              <td className="px-4 py-3">{renderAction(row)}</td>
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
