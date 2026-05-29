import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, DollarSign, Package, RefreshCw, ShoppingCart, Truck, Users } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import StatsCard from "@/components/admin/StatsCard";
import DashboardCustomRangePanel from "@/components/admin/dashboard/DashboardCustomRangePanel";
import * as dashboardService from "@/services/admin/dashboardService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import type { DashboardRangePreset } from "@/types/admin";
import { getErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { formatTimezoneLabel } from "@/utils/formatTimezoneLabel";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";

type TrendMetric = "sales" | "order_count" | "paid_order_count" | "refund_amount" | "avg_order_value";

const RANGE_OPTIONS: { value: DashboardRangePreset; zh: string; en: string }[] = [
  { value: "today", zh: "今天", en: "Today" },
  { value: "last_7_days", zh: "近 7 天", en: "Last 7 days" },
  { value: "last_30_days", zh: "近 30 天", en: "Last 30 days" },
  { value: "this_month", zh: "本月", en: "This month" },
  { value: "custom", zh: "自定义", en: "Custom" },
];

const TREND_METRICS: { key: TrendMetric; zh: string; en: string; isMoney?: boolean }[] = [
  { key: "sales", zh: "销售额", en: "Sales", isMoney: true },
  { key: "order_count", zh: "订单数", en: "Orders" },
  { key: "paid_order_count", zh: "支付订单数", en: "Paid orders" },
  { key: "refund_amount", zh: "退款金额", en: "Refunds", isMoney: true },
  { key: "avg_order_value", zh: "客单价", en: "AOV", isMoney: true },
];

function money(value: unknown) {
  const n = Number(value || 0);
  return `RM ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export default function Dashboard() {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
  const navigate = useNavigate();
  const can = useAdminPermissionStore((s) => s.can);
  const [rangePreset, setRangePreset] = useState<DashboardRangePreset>("last_7_days");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [lastPresetBeforeCustom, setLastPresetBeforeCustom] = useState<DashboardRangePreset>("last_7_days");
  const customButtonRef = useRef<HTMLButtonElement>(null);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("sales");

  const customRangeReady = Boolean(dateFrom && dateTo);

  const queryParams = useMemo<dashboardService.DashboardStatsQuery>(() => {
    const query: dashboardService.DashboardStatsQuery = { range_preset: rangePreset };
    if (rangePreset === "custom") {
      if (dateFrom) query.date_from = dateFrom;
      if (dateTo) query.date_to = dateTo;
    }
    return query;
  }, [rangePreset, dateFrom, dateTo]);

  const dashboardQuery = useQuery({
    queryKey: [...adminQueryKeys.dashboard(), queryParams],
    queryFn: () => dashboardService.fetchDashboardStats(queryParams),
    enabled: rangePreset !== "custom" || customRangeReady,
    refetchInterval: 90_000,
  });

  const openCustomRangePanel = () => {
    const currentStats = dashboardQuery.data as { range?: { dateFrom?: string; dateTo?: string } } | undefined;
    setDraftFrom(dateFrom || currentStats?.range?.dateFrom || "");
    setDraftTo(dateTo || currentStats?.range?.dateTo || "");
    setCustomRangeOpen(true);
  };

  const selectRangePreset = (value: DashboardRangePreset) => {
    if (value === "custom") {
      if (rangePreset !== "custom") setLastPresetBeforeCustom(rangePreset);
      setRangePreset("custom");
      openCustomRangePanel();
      return;
    }
    setCustomRangeOpen(false);
    setRangePreset(value);
  };

  const closeCustomRangePanel = () => {
    setCustomRangeOpen(false);
    if (rangePreset === "custom" && !customRangeReady) {
      setRangePreset(lastPresetBeforeCustom);
    }
  };

  const applyCustomRange = () => {
    if (!draftFrom || !draftTo) {
      toast.error(L("请选择开始和结束日期", "Please choose both start and end dates"));
      return;
    }
    if (draftFrom > draftTo) {
      toast.error(L("开始日期不能晚于结束日期", "Start date cannot be later than end date"));
      return;
    }
    setDateFrom(draftFrom);
    setDateTo(draftTo);
    setRangePreset("custom");
    setCustomRangeOpen(false);
  };

  const stats = dashboardQuery.data as any;
  const today = stats?.today ?? {};
  const todos = stats?.todos ?? {};
  const salesTrend = stats?.salesTrend ?? [];
  const canViewOrders = stats?.canViewOrders ?? can("order.view");
  const trendConfig = TREND_METRICS.find((item) => item.key === trendMetric) ?? TREND_METRICS[0];
  const trendChartData = salesTrend.map((row: any) => ({ ...row, metric: row[trendMetric] ?? 0 }));
  const error = dashboardQuery.error ? getErrorMessage(dashboardQuery.error, L("加载仪表盘数据失败", "Failed to load dashboard data")) : null;
  const rangeMetricPrefix = rangePreset === "today" ? L("今日", "Today") : L("筛选范围", "Range");
  const rangeMeta = stats?.range
    ? `${L("统计时区", "Timezone")}: ${formatTimezoneLabel(stats.range.timezone, locale)} · ${stats.range.dateFrom} ${L("至", "to")} ${stats.range.dateTo}`
    : null;
  const overviewReportPath = `/admin/reports/overview?range_preset=${encodeURIComponent(rangePreset)}${
    rangePreset === "custom"
      ? `&date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`
      : ""
  }`;

  if (dashboardQuery.isLoading && !stats) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <div className="skeleton-base skeleton-shimmer h-10 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow space-y-2">
              <div className="skeleton-base skeleton-shimmer h-3 w-20 rounded" />
              <div className="skeleton-base skeleton-shimmer h-7 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <AdminPageShell
      hint={rangeMeta ? <span>{rangeMeta}</span> : undefined}
      toolbar={(
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto sm:gap-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              ref={opt.value === "custom" ? customButtonRef : undefined}
              type="button"
              onClick={() => selectRangePreset(opt.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                rangePreset === opt.value
                  ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                  : "border border-[var(--theme-border)] text-muted-foreground hover:bg-[var(--theme-bg)]"
              }`}
            >
              {isEn ? opt.en : opt.zh}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void dashboardQuery.refetch()}
            className="shrink-0 rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
          >
            <Tx>刷新</Tx>
          </button>
        </div>
      )}
    >
      <DashboardCustomRangePanel
        open={customRangeOpen}
        onClose={closeCustomRangePanel}
        anchorRef={customButtonRef}
        draftFrom={draftFrom}
        draftTo={draftTo}
        onDraftFromChange={setDraftFrom}
        onDraftToChange={setDraftTo}
        onApply={applyCustomRange}
      />

      {error ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--theme-danger)]/30 bg-[color-mix(in_srgb,var(--theme-danger)_8%,transparent)] px-3 py-2 text-xs text-[var(--theme-danger)]">
          <span>{error}</span>
          <button type="button" onClick={() => void dashboardQuery.refetch()} className="font-semibold underline"><Tx>重试</Tx></button>
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground"><Tx>经营概览</Tx></h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatsCard icon={DollarSign} label={`${rangeMetricPrefix}${isEn ? " Sales" : "销售额"}`} value={money(today.revenue ?? stats?.todayRevenue)} onClick={() => navigate(overviewReportPath)} />
          <StatsCard icon={ShoppingCart} label={`${rangeMetricPrefix}${isEn ? " Paid orders" : "支付订单"}`} value={today.paidOrders ?? 0} onClick={() => navigate("/admin/orders?payment_status=paid")} />
          <StatsCard icon={Package} label={`${rangeMetricPrefix}${isEn ? " Orders" : "下单数"}`} value={today.orderCount ?? stats?.todayOrders ?? 0} onClick={() => navigate("/admin/orders")} />
          <StatsCard icon={Users} label={`${rangeMetricPrefix}${isEn ? " New users" : "新增用户"}`} value={today.newUsers ?? stats?.todayNewUsers ?? 0} onClick={() => navigate("/admin/users")} />
          <StatsCard icon={AlertTriangle} label={L("当前待付款", "Pending payment")} value={today.pendingPayment ?? 0} onClick={() => navigate("/admin/orders?payment_status=pending")} />
          <StatsCard icon={Truck} label={L("当前待发货", "Pending shipment")} value={today.pendingShip ?? stats?.pendingOrders ?? 0} onClick={() => navigate("/admin/orders?status=paid")} />
          <StatsCard icon={RefreshCw} label={L("当前待售后", "Pending after-sales")} value={today.pendingAfterSale ?? 0} onClick={() => navigate("/admin/returns")} />
          <StatsCard icon={Package} label={L("当前低库存", "Low stock")} value={today.lowStock ?? 0} onClick={() => navigate("/admin/inventory")} />
        </div>
      </section>

      <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-5 theme-shadow">
        <h2 className="mb-3 text-sm font-semibold text-foreground"><Tx>待办中心</Tx></h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: L("待发货订单", "Pending shipments"), value: todos.pendingShip ?? 0, path: "/admin/orders?status=paid" },
            { label: L("退款/售后", "Refunds / after-sales"), value: todos.afterSale ?? 0, path: "/admin/returns" },
            { label: L("付款失败", "Payment failed"), value: todos.paymentFailed ?? 0, path: "/admin/orders?payment_status=failed" },
            { label: L("低库存", "Low stock"), value: todos.lowStock ?? 0, path: "/admin/inventory" },
            { label: L("缺货商品", "Out of stock"), value: todos.outOfStock ?? 0, path: "/admin/inventory" },
          ].map((item) => (
            <button key={item.label} type="button" onClick={() => navigate(item.path)} className="touch-manipulation rounded-xl border border-[var(--theme-border)] p-3 text-left transition hover:bg-[var(--theme-bg)]">
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{item.value}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-5 theme-shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground"><Tx>经营趋势</Tx></h3>
            <div className="flex flex-wrap gap-1">
              {TREND_METRICS.map((metric) => (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => setTrendMetric(metric.key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${trendMetric === metric.key ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "border border-[var(--theme-border)] text-muted-foreground"}`}
                >
                  {isEn ? metric.en : metric.zh}
                </button>
              ))}
            </div>
          </div>
          {trendChartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => (trendConfig.isMoney ? money(v) : String(v))} />
                  <Line type="monotone" dataKey="metric" stroke="var(--theme-price)" strokeWidth={2.5} dot={false} name={isEn ? trendConfig.en : trendConfig.zh} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-8 text-center text-sm text-muted-foreground"><Tx>暂无趋势数据</Tx></p>}
        </div>

        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-5 theme-shadow">
          <h3 className="mb-3 text-sm font-semibold text-foreground"><Tx>累计概览</Tx></h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground"><Tx>累计订单</Tx></span><strong>{stats?.totalOrders ?? 0}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground"><Tx>累计销售额</Tx></span><strong>{money(stats?.totalRevenue)}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground"><Tx>用户总数</Tx></span><strong>{stats?.totalUsers ?? 0}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground"><Tx>在售商品</Tx></span><strong>{stats?.totalProducts ?? 0}</strong></div>
          </div>
        </div>
      </section>

      {canViewOrders ? (
        <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-5 theme-shadow">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground"><Tx>最近订单</Tx></h3>
            <button type="button" onClick={() => navigate("/admin/orders")} className="text-xs text-[var(--theme-price)] hover:underline"><Tx>查看全部</Tx></button>
          </div>
          {(stats?.recentOrders ?? []).length > 0 ? (
            <div className="divide-y divide-[var(--theme-border)]">
              {(stats?.recentOrders ?? []).map((o: any) => (
                <button key={o.id} type="button" onClick={() => navigate(`/admin/orders/${o.id}`)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
                  <div>
                    <p className="font-mono text-xs text-foreground">{o.order_no}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(o.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{money(o.total_amount)}</p>
                    <span className="mt-1 inline-flex"><OrderStatusBadge status={o.status} /></span>
                  </div>
                </button>
              ))}
            </div>
          ) : <p className="py-4 text-center text-sm text-muted-foreground"><Tx>暂无订单</Tx></p>}
        </section>
      ) : null}
    </AdminPageShell>
  );
}
