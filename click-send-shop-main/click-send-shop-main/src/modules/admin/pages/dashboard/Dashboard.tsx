import { formatDateTime } from "@/utils/formatDateTime";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  DollarSign,
  Headphones,
  Package,
  RefreshCw,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import * as dashboardService from "@/services/admin/dashboardService";
import type { DashboardOverview, DashboardRangePreset, DashboardSalesTrendPoint } from "@/types/admin";
import { Tx } from "@/components/admin/AdminText";
import { getOrderStatusBadgeClass, getOrderStatusLabel } from "@/constants/statusDictionary";
import { getErrorMessage } from "@/utils/errorMessage";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";

const PIE_COLORS = [
  "var(--theme-price)",
  "hsl(210, 80%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(340, 70%, 55%)",
  "hsl(270, 60%, 55%)",
  "hsl(30, 80%, 55%)",
];

const RANGE_OPTIONS: { value: DashboardRangePreset; label: string }[] = [
  { value: "today", label: "今天" },
  { value: "last_7_days", label: "近7天" },
  { value: "last_30_days", label: "近30天" },
  { value: "this_month", label: "本月" },
  { value: "custom", label: "自定义" },
];

type TrendMetric = "sales" | "order_count" | "paid_order_count" | "refund_amount" | "avg_order_value";

const TREND_METRICS: { key: TrendMetric; label: string; isMoney?: boolean }[] = [
  { key: "sales", label: "销售额", isMoney: true },
  { key: "order_count", label: "订单数" },
  { key: "paid_order_count", label: "支付订单数" },
  { key: "refund_amount", label: "退款金额", isMoney: true },
  { key: "avg_order_value", label: "客单价", isMoney: true },
];

function formatMoney(v: number) {
  return `RM ${v.toFixed(2)}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const can = useAdminPermissionStore((s) => s.can);
  const [stats, setStats] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangePreset, setRangePreset] = useState<DashboardRangePreset>("last_7_days");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("sales");

  const loadStats = useCallback(() => {
    setLoading(true);
    setError(null);
    const query: dashboardService.DashboardStatsQuery = { range_preset: rangePreset };
    if (rangePreset === "custom") {
      if (dateFrom) query.date_from = dateFrom;
      if (dateTo) query.date_to = dateTo;
    }
    dashboardService.fetchDashboardStats(query)
      .then(setStats)
      .catch((e) => setError(getErrorMessage(e, "加载仪表盘数据失败")))
      .finally(() => setLoading(false));
  }, [rangePreset, dateFrom, dateTo]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const today = stats?.today;
  const todos = stats?.todos;
  const salesTrend = stats?.salesTrend ?? [];
  const categoryData = stats?.categorySalesShare ?? stats?.categoryData ?? [];
  const canViewOrders = stats?.canViewOrders ?? can("order.view");

  const trendConfig = TREND_METRICS.find((m) => m.key === trendMetric) ?? TREND_METRICS[0];

  const trendChartData = useMemo(
    () => salesTrend.map((row: DashboardSalesTrendPoint) => ({
      ...row,
      metric: row[trendMetric] ?? 0,
    })),
    [salesTrend, trendMetric],
  );

  if (error && !loading && !stats) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => loadStats()}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold btn-theme-gradient"
        >
          <RefreshCw size={14} />
          <Tx>重试</Tx>
        </button>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <div className="skeleton-base skeleton-shimmer h-10 w-full max-w-xl rounded-lg" />
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
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground sm:text-xl"><Tx>经营仪表盘</Tx></h1>
          {stats?.range ? (
            <p className="mt-1 text-xs text-muted-foreground">
              统计时区：{stats.range.timezone} · {stats.range.dateFrom} 至 {stats.range.dateTo}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRangePreset(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                rangePreset === opt.value
                  ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                  : "border border-[var(--theme-border)] text-muted-foreground hover:bg-[var(--theme-bg)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {rangePreset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
          <SegmentedDateInput value={dateFrom} onChange={setDateFrom} />
          <span className="text-xs text-muted-foreground">至</span>
          <SegmentedDateInput value={dateTo} onChange={setDateTo} />
          <button
            type="button"
            onClick={() => loadStats()}
            className="rounded-full px-4 py-1.5 text-xs font-semibold btn-theme-gradient"
          >
            应用
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--theme-danger)]/30 bg-[color-mix(in_srgb,var(--theme-danger)_8%,transparent)] px-3 py-2 text-xs text-[var(--theme-danger)]">
          <span>{error}</span>
          <button type="button" onClick={() => loadStats()} className="font-semibold underline">重试</button>
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground"><Tx>今日经营</Tx></h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatsCard icon={DollarSign} label="今日销售额" value={formatMoney(today?.revenue ?? stats?.todayRevenue ?? 0)} onClick={() => navigate("/admin/reports/overview?range_preset=today")} />
          <StatsCard icon={ShoppingCart} label="今日支付订单" value={today?.paidOrders ?? 0} onClick={() => navigate("/admin/orders?payment_status=paid")} />
          <StatsCard icon={Package} label="今日下单数" value={today?.orderCount ?? stats?.todayOrders ?? 0} onClick={() => navigate("/admin/orders")} />
          <StatsCard icon={Users} label="今日新增用户" value={today?.newUsers ?? stats?.todayNewUsers ?? 0} onClick={() => navigate("/admin/users")} />
          <StatsCard icon={AlertTriangle} label="待付款" value={today?.pendingPayment ?? 0} onClick={() => navigate("/admin/orders?payment_status=pending")} />
          <StatsCard icon={Truck} label="待发货" value={today?.pendingShip ?? stats?.pendingOrders ?? 0} onClick={() => navigate("/admin/orders?status=paid")} />
          <StatsCard icon={RefreshCw} label="待售后" value={today?.pendingAfterSale ?? 0} onClick={() => navigate("/admin/returns")} />
          <StatsCard icon={Package} label="低库存" value={today?.lowStock ?? 0} onClick={() => navigate("/admin/inventory")} />
        </div>
      </section>

      <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-5 theme-shadow">
        <h2 className="mb-3 text-sm font-semibold text-foreground"><Tx>待办中心</Tx></h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "待发货订单", value: todos?.pendingShip ?? 0, path: "/admin/orders?status=paid" },
            { label: "退款/售后", value: todos?.afterSale ?? 0, path: "/admin/returns" },
            { label: "付款失败", value: todos?.paymentFailed ?? 0, path: "/admin/orders?payment_status=failed" },
            { label: "低库存", value: todos?.lowStock ?? 0, path: "/admin/inventory" },
            { label: "缺货商品", value: todos?.outOfStock ?? 0, path: "/admin/inventory" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              className="touch-manipulation rounded-xl border border-[var(--theme-border)] p-3 text-left transition hover:bg-[var(--theme-bg)] active:bg-[var(--theme-bg)]"
            >
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{item.value}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6 lg:col-span-2 theme-shadow">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
            <h3 className="text-sm font-semibold text-foreground"><Tx>销售趋势</Tx></h3>
            <div className="flex flex-wrap gap-1">
              {TREND_METRICS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setTrendMetric(m.key)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    trendMetric === m.key
                      ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                      : "border border-[var(--theme-border)] text-muted-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  formatter={(v: number) => (trendConfig.isMoney ? formatMoney(Number(v)) : String(v))}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                />
                <Line type="monotone" dataKey="metric" stroke="var(--theme-price)" strokeWidth={2} dot={false} name={trendConfig.label} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground"><Tx>暂无趋势数据</Tx></p>
          )}
        </div>

        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6 theme-shadow">
          <h3 className="mb-3 text-sm font-semibold text-foreground sm:mb-4"><Tx>分类销售额占比</Tx></h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, _n, p) => {
                      const pct = (p?.payload as { share_percent?: number })?.share_percent;
                      return [`${formatMoney(Number(v))}${pct != null ? ` (${pct}%)` : ""}`, "销售额"];
                    }}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {categoryData.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => navigate("/admin/reports/category")}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span>{c.name} ({formatMoney(c.value)})</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground"><Tx>暂无分类销售数据</Tx></p>
          )}
        </div>
      </div>

      <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6 theme-shadow">
        <h3 className="mb-3 text-sm font-semibold text-foreground sm:mb-4"><Tx>商品分析</Tx></h3>
        <div className="grid gap-4 lg:grid-cols-3">
          <ProductRankList title="热销商品 TOP10" rows={stats?.topProducts ?? []} onRowClick={(id) => navigate(`/admin/products/${id}`)} />
          <ProductRankList title="滞销商品 TOP10" rows={stats?.slowProducts ?? []} onRowClick={(id) => navigate(`/admin/products/${id}`)} />
          <div>
            <p className="mb-2 text-xs font-semibold text-foreground"><Tx>低库存商品</Tx></p>
            {(stats?.lowStockProducts ?? []).length > 0 ? (
              <ul className="space-y-2">
                {(stats?.lowStockProducts ?? []).map((p) => (
                  <li key={p.product_id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/products/${p.product_id}`)}
                      className="flex w-full items-center justify-between rounded-lg border border-[var(--theme-border)] px-3 py-2 text-left text-xs hover:bg-[var(--theme-bg)]"
                    >
                      <span className="truncate font-medium">{p.product_name}</span>
                      <span className="shrink-0 text-muted-foreground">库存 {p.current_stock}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">暂无低库存商品</p>
            )}
            <button type="button" onClick={() => navigate("/admin/inventory")} className="mt-2 text-xs text-[var(--theme-price)] hover:underline">查看库存管理</button>
          </div>
        </div>
      </section>

      <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6 theme-shadow">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h3 className="text-sm font-semibold text-foreground"><Tx>客服 / 下载 / App 安装</Tx></h3>
          <button type="button" onClick={() => navigate("/admin/reports/traffic")} className="text-xs text-[var(--theme-price)] hover:underline">流量分析</button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { icon: Headphones, label: "客服点击", value: stats?.analytics?.customerServiceClicks ?? 0 },
            { icon: Smartphone, label: "二维码查看", value: stats?.analytics?.qrViews ?? 0 },
            { icon: Smartphone, label: "安卓下载点击", value: stats?.analytics?.androidDownloadClicks ?? 0 },
            { icon: Smartphone, label: "iOS Safari 引导", value: stats?.analytics?.iosSafariGuide ?? 0 },
            { icon: TrendingUp, label: "PWA 安装提示", value: stats?.analytics?.pwaInstallPrompt ?? 0 },
            { icon: Package, label: "PWA 打开", value: stats?.analytics?.pwaOpen ?? 0 },
            { icon: TrendingUp, label: "安装转化率", value: `${stats?.analytics?.installConversionRate ?? 0}%` },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate("/admin/reports/traffic")}
              className="rounded-xl border border-[var(--theme-border)] p-3 text-left hover:bg-[var(--theme-bg)]"
            >
              <item.icon size={14} className="text-[var(--theme-primary)]" />
              <p className="mt-2 text-[10px] text-muted-foreground">{item.label}</p>
              <p className="mt-0.5 text-base font-bold tabular-nums">{item.value}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatsCard icon={ShoppingCart} label="累计订单" value={stats?.totalOrders ?? 0} onClick={() => navigate("/admin/orders")} />
        <StatsCard icon={DollarSign} label="累计销售额" value={formatMoney(stats?.totalRevenue ?? 0)} onClick={() => navigate("/admin/reports/overview")} />
        <StatsCard icon={Users} label="用户总数" value={stats?.totalUsers ?? 0} onClick={() => navigate("/admin/users")} />
        <StatsCard icon={Package} label="在售商品" value={stats?.totalProducts ?? 0} onClick={() => navigate("/admin/products")} />
      </div>

      {canViewOrders ? (
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6 theme-shadow">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h3 className="text-sm font-semibold text-foreground"><Tx>最近订单</Tx></h3>
            <button type="button" onClick={() => navigate("/admin/orders")} className="text-xs text-[var(--theme-price)] hover:underline"><Tx>查看全部</Tx></button>
          </div>
          {(stats?.recentOrders ?? []).length > 0 ? (
            <div className="space-y-3">
              {(stats?.recentOrders ?? []).map((o) => (
                <div
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/admin/orders/${o.id}`); } }}
                  className="touch-manipulation flex min-h-[52px] cursor-pointer items-center justify-between theme-rounded border border-[var(--theme-border)] p-3 transition-colors hover:bg-[var(--theme-bg)]"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{o.order_no}</p>
                    <p className="text-xs text-muted-foreground">{o.contact_name} · {formatDateTime(o.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">RM {o.total_amount?.toFixed(2)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getOrderStatusBadgeClass(o.status)}`}>{getOrderStatusLabel(o.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground"><Tx>暂无订单</Tx></p>
          )}
        </div>
      ) : (
        <div className="theme-rounded border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-center theme-shadow">
          <p className="text-sm text-muted-foreground"><Tx>无订单查看权限，最近订单已隐藏</Tx></p>
        </div>
      )}
    </div>
  );
}

function ProductRankList({
  title,
  rows,
  onRowClick,
}: {
  title: string;
  rows: { product_id: string; product_name: string; sales_qty: number; sales_amount: number }[];
  onRowClick: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-foreground"><Tx>{title}</Tx></p>
      {rows.length > 0 ? (
        <ol className="space-y-1.5 text-xs">
          {rows.map((r, i) => (
            <li key={r.product_id}>
              <button
                type="button"
                onClick={() => onRowClick(r.product_id)}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-[var(--theme-bg)]"
              >
                <span className="w-4 shrink-0 text-muted-foreground">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate">{r.product_name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{r.sales_qty} 件</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-4 text-center text-xs text-muted-foreground">暂无数据</p>
      )}
    </div>
  );
}
