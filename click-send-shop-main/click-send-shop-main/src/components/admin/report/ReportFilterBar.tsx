import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type Props = {
  categoryOptions?: Array<{ value: string; label: string }>;
  productOptions?: Array<{ value: string; label: string }>;
  activityOptions?: Array<{ value: string; label: string }>;
  couponOptions?: Array<{ value: string; label: string }>;
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
  { value: "day", label: "日" },
  { value: "week", label: "周" },
  { value: "month", label: "月" },
] as const;

const COMPARE_OPTIONS = [
  { value: "", label: "不对比" },
  { value: "previous_period", label: "对比昨日/上周期" },
  { value: "previous_week", label: "对比上周同期" },
  { value: "previous_month", label: "对比上月同期" },
] as const;

export default function ReportFilterBar({ categoryOptions = [], onChange }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();

  const rangePreset = searchParams.get("range_preset") || "last_7_days";
  const granularity = searchParams.get("granularity") || "day";
  const compare = searchParams.get("compare") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const categoryId = searchParams.get("category_id") || "";
  const productId = searchParams.get("product_id") || "";
  const activityId = searchParams.get("activity_id") || "";
  const couponId = searchParams.get("coupon_id") || "";
  const orderStatus = searchParams.get("order_status") || "";
  const paymentStatus = searchParams.get("payment_status") || "";
  const paymentMethod = searchParams.get("payment_method") || "";
  const userType = searchParams.get("user_type") || "";

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

  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
      <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
        <select value={rangePreset} onChange={(e) => applyPreset(e.target.value)} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs">
          {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={granularity} onChange={(e) => update({ granularity: e.target.value })} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs">
          {GRANULARITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={compare} onChange={(e) => update({ compare: e.target.value })} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs">
          {COMPARE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input disabled={!isCustom} type="date" value={dateFrom} onChange={(e) => update({ date_from: e.target.value })} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs disabled:opacity-60" />
        <input disabled={!isCustom} type="date" value={dateTo} onChange={(e) => update({ date_to: e.target.value })} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs disabled:opacity-60" />
        <select value={categoryId} onChange={(e) => update({ category_id: e.target.value })} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs">
          <option value="">全部分类</option>
          {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input value={productId} onChange={(e) => update({ product_id: e.target.value })} placeholder="商品ID" className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs" />
        <input value={activityId} onChange={(e) => update({ activity_id: e.target.value })} placeholder="活动ID" className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs" />
        <input value={couponId} onChange={(e) => update({ coupon_id: e.target.value })} placeholder="优惠券ID" className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs" />
        <select value={orderStatus} onChange={(e) => update({ order_status: e.target.value })} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs">
          <option value="">全部订单状态</option>
          <option value="pending">待付款</option>
          <option value="paid">已支付</option>
          <option value="shipped">已发货</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
          <option value="refunded">已退款</option>
        </select>
        <select value={paymentStatus} onChange={(e) => update({ payment_status: e.target.value })} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs">
          <option value="">全部支付状态</option>
          <option value="unpaid">未支付</option>
          <option value="paid">已支付</option>
          <option value="partially_refunded">部分退款</option>
          <option value="refunded">已全额退款</option>
        </select>
        <select value={paymentMethod} onChange={(e) => update({ payment_method: e.target.value })} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs">
          <option value="">全部支付方式</option>
          <option value="fpx">FPX</option>
          <option value="card">银行卡</option>
          <option value="wallet">电子钱包</option>
          <option value="cod">货到付款</option>
        </select>
        <select value={userType} onChange={(e) => update({ user_type: e.target.value })} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-2 text-xs">
          <option value="">全部用户类型</option>
          <option value="new">新客</option>
          <option value="old">老客</option>
        </select>
      </div>
    </div>
  );
}
