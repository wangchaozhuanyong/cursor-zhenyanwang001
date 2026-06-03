import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { ReportFilterProfile } from "@/config/reportPageConfig";
import {
  getEnabledFilters,
  isFilterEnabled,
  type ReportFilterKey,
} from "@/utils/reportFilters";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import { Tx } from "@/components/admin/AdminText";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import { useAdminT } from "@/hooks/useAdminT";

type Props = {
  filterProfile?: ReportFilterProfile;
  /** 显式指定筛选项；未传时由 filterProfile + supportsGranularity 推导 */
  enabledFilters?: ReportFilterKey[];
  supportsGranularity?: boolean;
  categoryOptions?: Array<{ value: string; label: string }>;
  onChange?: (params: URLSearchParams) => void;
};

const RANGE_OPTIONS = [
  { value: "today", label: "今日" },
  { value: "yesterday", label: "昨日" },
  { value: "last_7_days", label: "最近7天" },
  { value: "last_30_days", label: "最近30天" },
  { value: "this_month", label: "本月" },
  { value: "last_month", label: "上月" },
  { value: "this_quarter", label: "本季度" },
  { value: "custom", label: "自定义" },
] as const;

const GRANULARITY_OPTIONS = [
  { value: "day", label: "按日" },
  { value: "week", label: "按周" },
  { value: "month", label: "按月" },
] as const;

const selectClass =
  "min-h-[36px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--theme-border)]";

export default function ReportFilterBar({
  filterProfile = "date",
  enabledFilters: enabledFiltersProp,
  supportsGranularity = false,
  categoryOptions = [],
  onChange,
}: Props) {
  const { tText } = useAdminT();
  const [searchParams, setSearchParams] = useSearchParams();

  const enabledFilters = useMemo(
    () => enabledFiltersProp ?? getEnabledFilters(filterProfile, { supportsGranularity }),
    [enabledFiltersProp, filterProfile, supportsGranularity],
  );

  const rangePreset = searchParams.get("range_preset") || "last_7_days";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const granularity = searchParams.get("granularity") || "day";
  const categoryId = searchParams.get("category_id") || "";
  const productId = searchParams.get("product_id") || "";
  const activityId = searchParams.get("activity_id") || "";
  const couponCampaignId = searchParams.get("coupon_campaign_id") || "";
  const couponId = searchParams.get("coupon_id") || "";
  const orderStatus = searchParams.get("order_status") || "";
  const paymentStatus = searchParams.get("payment_status") || "";
  const paymentMethod = searchParams.get("payment_method") || "";
  const keyword = searchParams.get("keyword") || "";
  const noResultOnly = searchParams.get("no_result_only") === "1";
  const sortBy = searchParams.get("sort_by") || "search_count";
  const sortOrder = searchParams.get("sort_order") || "desc";

  const isCustom = rangePreset === "custom";

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === "") next.delete(k);
      else next.set(k, v);
    });
    setSearchParams(next, { replace: true });
    onChange?.(next);
  };

  const now = useMemo(() => new Date(), []);
  const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

  const applyPreset = (preset: string) => {
    const end = new Date(now);
    const start = new Date(now);
    if (preset === "today") {
      update({ range_preset: preset, date_from: toDateInput(start), date_to: toDateInput(end) });
      return;
    }
    if (preset === "yesterday") {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      update({ range_preset: preset, date_from: toDateInput(start), date_to: toDateInput(end) });
      return;
    }
    if (preset === "last_7_days") start.setDate(start.getDate() - 6);
    if (preset === "last_30_days") start.setDate(start.getDate() - 29);
    if (preset === "this_month") start.setDate(1);
    if (preset === "last_month") {
      start.setMonth(start.getMonth() - 1, 1);
      end.setMonth(end.getMonth(), 0);
    }
    if (preset === "this_quarter") {
      const q = Math.floor(start.getMonth() / 3);
      start.setMonth(q * 3, 1);
    }
    if (preset === "custom") {
      update({ range_preset: preset });
      return;
    }
    update({ range_preset: preset, date_from: toDateInput(start), date_to: toDateInput(end) });
  };

  if (filterProfile === "none" || enabledFilters.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {isFilterEnabled(enabledFilters, "dateRange") ? (
          <>
            <select value={rangePreset} onChange={(e) => applyPreset(e.target.value)} className={selectClass}>
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <SegmentedDateInput
              disabled={!isCustom}
              value={dateFrom}
              onChange={(v) => update({ date_from: v })}
              className="min-w-[9.5rem]"
            />
            <span className="text-xs text-[var(--theme-text-muted)]"><Tx>至</Tx></span>
            <SegmentedDateInput
              disabled={!isCustom}
              value={dateTo}
              onChange={(v) => update({ date_to: v })}
              className="min-w-[9.5rem]"
            />
          </>
        ) : null}

        {isFilterEnabled(enabledFilters, "granularity") ? (
          <select value={granularity} onChange={(e) => update({ granularity: e.target.value })} className={selectClass}>
            {GRANULARITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : null}

        {isFilterEnabled(enabledFilters, "categoryId") ? (
          <select value={categoryId} onChange={(e) => update({ category_id: e.target.value })} className={selectClass}>
            <option value=""><Tx>全部分类</Tx></option>
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : null}

        {isFilterEnabled(enabledFilters, "productId") ? (
          <input
            value={productId}
            onChange={(e) => update({ product_id: e.target.value })}
            placeholder={tText("商品 ID（可选）")}
            title={tText("系统内部 ID，从商品编辑页复制")}
            className={`${selectClass} min-w-[10rem]`}
          />
        ) : null}

        {isFilterEnabled(enabledFilters, "activityId") ? (
          <input
            value={activityId}
            onChange={(e) => update({ activity_id: e.target.value })}
            placeholder={tText("活动 ID（可选）")}
            className={`${selectClass} min-w-[10rem]`}
          />
        ) : null}

        {isFilterEnabled(enabledFilters, "couponId") ? (
          <input
            value={couponId}
            onChange={(e) => update({ coupon_id: e.target.value })}
            placeholder={tText("优惠券 ID（可选）")}
            className={`${selectClass} min-w-[10rem]`}
          />
        ) : null}

        {isFilterEnabled(enabledFilters, "couponCampaignId") ? (
          <input
            value={couponCampaignId}
            onChange={(e) => update({ coupon_campaign_id: e.target.value })}
            placeholder={tText("发券活动 ID（可选）")}
            className={`${selectClass} min-w-[11rem]`}
          />
        ) : null}

        {isFilterEnabled(enabledFilters, "orderStatus") ? (
          <select value={orderStatus} onChange={(e) => update({ order_status: e.target.value })} className={selectClass}>
            <option value=""><Tx>全部订单状态</Tx></option>
            <option value="pending"><Tx>待付款</Tx></option>
            <option value="paid"><Tx>已支付</Tx></option>
            <option value="shipped"><Tx>已发货</Tx></option>
            <option value="completed"><Tx>已完成</Tx></option>
            <option value="cancelled"><Tx>已取消</Tx></option>
            <option value="refunded"><Tx>已退款</Tx></option>
          </select>
        ) : null}

        {isFilterEnabled(enabledFilters, "paymentStatus") ? (
          <select value={paymentStatus} onChange={(e) => update({ payment_status: e.target.value })} className={selectClass}>
            <option value=""><Tx>全部支付状态</Tx></option>
            <option value="unpaid"><Tx>未支付</Tx></option>
            <option value="paid"><Tx>已支付</Tx></option>
            <option value="partially_refunded"><Tx>部分退款</Tx></option>
            <option value="refunded"><Tx>已全额退款</Tx></option>
          </select>
        ) : null}

        {isFilterEnabled(enabledFilters, "paymentMethod") ? (
          <select value={paymentMethod} onChange={(e) => update({ payment_method: e.target.value })} className={selectClass}>
            <option value=""><Tx>全部支付方式</Tx></option>
            <option value="fpx">FPX</option>
            <option value="card"><Tx>银行卡</Tx></option>
            <option value="wallet"><Tx>电子钱包</Tx></option>
            <option value="cod"><Tx>货到付款</Tx></option>
          </select>
        ) : null}

        {isFilterEnabled(enabledFilters, "keyword") ? (
          <AdminSearchInput
            value={keyword}
            onChange={(value) => update({ keyword: value })}
            placeholder={tText("搜索关键词")}
            showIcon={false}
            className={`${selectClass} min-w-[12rem]`}
          />
        ) : null}

        {isFilterEnabled(enabledFilters, "noResultOnly") ? (
          <label className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2.5 py-1.5 text-sm">
            <input
              type="checkbox"
              checked={noResultOnly}
              onChange={(e) => update({ no_result_only: e.target.checked ? "1" : "" })}
            />
            <Tx>只看无结果词</Tx>
          </label>
        ) : null}

        {isFilterEnabled(enabledFilters, "sortBy") ? (
          <>
            <select value={sortBy} onChange={(e) => update({ sort_by: e.target.value })} className={selectClass}>
              <option value="search_count"><Tx>按搜索次数</Tx></option>
              <option value="no_result_count"><Tx>按无结果次数</Tx></option>
              <option value="product_click_count"><Tx>按点击次数</Tx></option>
              <option value="order_count"><Tx>按订单数</Tx></option>
              <option value="sales_amount"><Tx>按销售额</Tx></option>
              <option value="last_searched_at"><Tx>按最后搜索时间</Tx></option>
            </select>
            <select value={sortOrder} onChange={(e) => update({ sort_order: e.target.value })} className={selectClass}>
              <option value="desc"><Tx>降序</Tx></option>
              <option value="asc"><Tx>升序</Tx></option>
            </select>
          </>
        ) : null}
      </div>
    </div>
  );
}
