import { useState, useEffect } from "react";
import { Download, TrendingUp, Users, ShoppingCart, DollarSign, Loader2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { loadAdminReportsBundle } from "@/services/admin/reportService";
import {
  downloadReportCsv,
  type ReportExportKind,
} from "@/services/admin/reportExportService";
import PermissionGate from "@/components/admin/PermissionGate";
import { toastErrorMessage } from "@/utils/errorMessage";

export default function AdminReports() {
  const [dateRange, setDateRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [salesChart, setSalesChart] = useState<Record<string, unknown>[]>([]);
  const [userChart, setUserChart] = useState<Record<string, unknown>[]>([]);
  const [topProducts, setTopProducts] = useState<Record<string, unknown>[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [newArrivalStats, setNewArrivalStats] = useState({
    impressions: 0,
    clicks: 0,
    ctr: 0,
    topProducts: [] as Array<{ productName: string; impressions: number; clicks: number; ctr: number }>,
  });

  const loadReports = async (range: string) => {
    setLoading(true);
    try {
      const bundle = await loadAdminReportsBundle(range);
      if (bundle.home) {
        const d = bundle.home as {
          impressions?: number;
          clicks?: number;
          ctr?: number;
          topProducts?: Array<{ productName: string; impressions: number; clicks: number; ctr: number }>;
        };
        setNewArrivalStats({
          impressions: d.impressions ?? 0,
          clicks: d.clicks ?? 0,
          ctr: d.ctr ?? 0,
          topProducts: d.topProducts ?? [],
        });
      }
      if (bundle.sales) {
        const d = bundle.sales as { chart?: unknown[]; totalRevenue?: number; totalOrders?: number };
        setSalesChart((d.chart || []) as Record<string, unknown>[]);
        setTotalRevenue(d.totalRevenue ?? 0);
        setTotalOrders(d.totalOrders ?? 0);
      }
      if (bundle.users) {
        const d = bundle.users as { chart?: unknown[]; totalUsers?: number };
        setUserChart((d.chart || []) as Record<string, unknown>[]);
        setTotalUsers(d.totalUsers ?? 0);
      }
      if (bundle.products) {
        const d = bundle.products as { topProducts?: unknown[] };
        setTopProducts((d.topProducts || []) as Record<string, unknown>[]);
      }
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载报表失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports(dateRange);
  }, [dateRange]);

  const handleExport = async (kind: ReportExportKind) => {
    const r = await downloadReportCsv(kind, dateRange);
    if (!r.ok) {
      toast.error(r.reason);
      return;
    }
    toast.success(kind === "sales" ? "销售报表已导出" : kind === "users" ? "用户报表已导出" : "热销商品报表已导出");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-price)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">数据报表</h1>
          <p className="text-sm text-muted-foreground">
            销售与热销商品统计按「已支付」口径（payment_status 为 paid / partially_refunded）；用户增长为注册数。
          </p>
        </div>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs outline-none">
          <option value="7d">最近7天</option>
          <option value="30d">最近30天</option>
          <option value="90d">最近90天</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "总销售额", value: `RM ${totalRevenue.toFixed(2)}`, icon: DollarSign },
          { label: "总订单数", value: totalOrders, icon: ShoppingCart },
          { label: "总用户数", value: totalUsers, icon: Users },
          { label: "客单价", value: totalOrders > 0 ? `RM ${(totalRevenue / totalOrders).toFixed(2)}` : "—", icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <div className="flex items-center gap-2 text-muted-foreground"><s.icon size={16} /><span className="text-xs">{s.label}</span></div>
            <p className="mt-1 text-xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
        <h3 className="mb-4 text-sm font-bold text-foreground">首页新品轮播转化</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary p-3">
            <p className="text-xs text-muted-foreground">曝光</p>
            <p className="mt-1 text-lg font-bold text-foreground">{newArrivalStats.impressions}</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <p className="text-xs text-muted-foreground">点击</p>
            <p className="mt-1 text-lg font-bold text-foreground">{newArrivalStats.clicks}</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <p className="text-xs text-muted-foreground">CTR</p>
            <p className="mt-1 text-lg font-bold text-[var(--theme-price)]">{newArrivalStats.ctr}%</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {newArrivalStats.topProducts.slice(0, 5).map((it) => (
            <div key={it.productName} className="flex items-center justify-between text-xs">
              <span className="truncate text-foreground">{it.productName}</span>
              <span className="text-muted-foreground">
                曝光 {it.impressions} / 点击 {it.clicks} / CTR {it.ctr}%
              </span>
            </div>
          ))}
          {newArrivalStats.topProducts.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">暂无新品轮播埋点数据</p>
          )}
        </div>
      </div>

      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">销售趋势</h3>
          <PermissionGate permission="report.export">
            <button type="button" onClick={() => handleExport("sales")} className="flex items-center gap-1.5 theme-rounded px-3 py-1.5 text-xs font-medium text-[var(--theme-price)] hover:bg-[var(--theme-price)]/10">
              <Download size={12} /> 导出CSV
            </button>
          </PermissionGate>
        </div>
        {salesChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={salesChart}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--theme-price)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--theme-price)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="var(--theme-price)" fill="url(#revGrad)" strokeWidth={2} name="销售额" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">暂无销售数据</p>
        )}
      </div>

      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">用户增长</h3>
          <PermissionGate permission="report.export">
            <button type="button" onClick={() => handleExport("users")} className="flex items-center gap-1.5 theme-rounded px-3 py-1.5 text-xs font-medium text-[var(--theme-price)] hover:bg-[var(--theme-price)]/10">
              <Download size={12} /> 导出
            </button>
          </PermissionGate>
        </div>
        {userChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="newUsers" fill="var(--theme-price)" radius={[4, 4, 0, 0]} name="新用户" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">暂无用户数据</p>
        )}
      </div>

      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">热销商品</h3>
          <PermissionGate permission="report.export">
            <button type="button" onClick={() => handleExport("products")} className="flex items-center gap-1.5 theme-rounded px-3 py-1.5 text-xs font-medium text-[var(--theme-price)] hover:bg-[var(--theme-price)]/10">
              <Download size={12} /> 导出
            </button>
          </PermissionGate>
        </div>
        <div className="space-y-3">
          {topProducts.slice(0, 10).map((item, i) => {
            const maxSold = Number(topProducts[0]?.totalSold) || 1;
            const sold = Number(item.totalSold) || 0;
            const pct = (sold / maxSold) * 100;
            return (
              <div key={String(item.id ?? i)} className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? "bg-[var(--theme-price)] text-white" : "bg-secondary text-muted-foreground"}`}>{i + 1}</span>
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">{String(item.name ?? "")}</span>
                <div className="hidden sm:block w-24 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--theme-price)]" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{sold} 件</span>
                <span className="text-xs font-medium text-[var(--theme-price)] flex-shrink-0">RM {Number(item.totalRevenue || 0).toFixed(2)}</span>
              </div>
            );
          })}
          {topProducts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
          )}
        </div>
      </div>
    </div>
  );
}
