import { useCallback, useEffect, useState } from "react";
import { ShoppingCart, Users, DollarSign, Package, Loader2 } from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import PermissionGate from "@/components/admin/PermissionGate";
import * as dashboardService from "@/services/admin/dashboardService";
import { ORDER_STATUS, getOrderStatusLabel } from "@/constants/statusDictionary";

const PIE_COLORS = ["var(--theme-price)", "hsl(210, 80%, 55%)", "hsl(150, 60%, 45%)", "hsl(340, 70%, 55%)", "hsl(270, 60%, 55%)", "hsl(30, 80%, 55%)"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    setLoading(true);
    setError(null);
    dashboardService.fetchDashboardStats()
      .then(setStats)
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-price)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => loadStats()}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--theme-gradient)" }}
        >
          重试
        </button>
      </div>
    );
  }

  const salesTrendData = stats?.salesTrend ?? [];
  const categoryData = stats?.categoryData ?? [];
  const weeklyOrderData = stats?.weeklyOrders ?? [];
  const recentOrders = stats?.recentOrders ?? [];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatsCard icon={ShoppingCart} label="今日订单" value={stats?.todayOrders ?? 0} trend="up" />
        <StatsCard icon={DollarSign} label="今日销售额" value={`RM ${(stats?.todayRevenue ?? 0).toFixed(2)}`} trend="up" />
        <StatsCard icon={Users} label="今日新用户" value={stats?.todayNewUsers ?? 0} trend="up" />
        <StatsCard icon={Package} label="待处理订单" value={stats?.pendingOrders ?? 0} trend="up" />
        <StatsCard icon={ShoppingCart} label="总订单数" value={stats?.totalOrders ?? 0} trend="up" />
        <StatsCard icon={DollarSign} label="总销售额" value={`RM ${(stats?.totalRevenue ?? 0).toFixed(2)}`} trend="up" />
        <StatsCard icon={Users} label="总用户数" value={stats?.totalUsers ?? 0} trend="up" />
        <StatsCard icon={Package} label="总商品数" value={stats?.totalProducts ?? 0} trend="up" />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6 lg:col-span-2 theme-shadow">
          <h3 className="mb-3 text-sm font-semibold text-foreground sm:mb-4">7日销售趋势</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesTrendData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--theme-price)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--theme-price)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area type="monotone" dataKey="sales" stroke="var(--theme-price)" fillOpacity={1} fill="url(#salesGradient)" name="销售额 (RM)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6 theme-shadow">
          <h3 className="mb-3 text-sm font-semibold text-foreground sm:mb-4">品类分布</h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                    {categoryData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {categoryData.map((c: any, i: number) => (
                  <div key={c.name} className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[10px] text-muted-foreground">{c.name} ({c.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无分类数据</p>
          )}
        </div>
      </div>

      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6 theme-shadow">
        <h3 className="mb-3 text-sm font-semibold text-foreground sm:mb-4">本周订单统计</h3>
        {weeklyOrderData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyOrderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="completed" fill="var(--theme-price)" radius={[4, 4, 0, 0]} name="已完成" />
              <Bar dataKey="cancelled" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="已取消" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无订单数据</p>
        )}
      </div>

      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-6 theme-shadow">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h3 className="text-sm font-semibold text-foreground">最近订单</h3>
          <PermissionGate permission="order.view">
            <button type="button" onClick={() => navigate("/admin/orders")} className="touch-manipulation min-h-[44px] px-2 text-xs text-[var(--theme-price)] hover:underline">查看全部</button>
          </PermissionGate>
        </div>
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((o: any) => (
              <PermissionGate key={o.id} permission="order.view" fallback={(
                <div className="flex min-h-[52px] items-center justify-between theme-rounded border border-[var(--theme-border)] p-3 opacity-80">
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{o.order_no}</p>
                    <p className="text-xs text-muted-foreground">{o.contact_name} · {new Date(o.created_at).toLocaleString("zh-CN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">RM {o.total_amount?.toFixed(2)}</p>
                    <span className={`text-[10px] font-medium ${
                      o.status === ORDER_STATUS.COMPLETED ? "text-green-500" :
                      o.status === ORDER_STATUS.CANCELLED ? "text-destructive" : "text-[var(--theme-price)]"
                    }`}>{getOrderStatusLabel(o.status)}</span>
                  </div>
                </div>
              )}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/admin/orders/${o.id}`); } }}
                  className="touch-manipulation flex min-h-[52px] cursor-pointer items-center justify-between theme-rounded border border-[var(--theme-border)] p-3 transition-colors hover:bg-[var(--theme-bg)] active:bg-[var(--theme-bg)]"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{o.order_no}</p>
                    <p className="text-xs text-muted-foreground">{o.contact_name} · {new Date(o.created_at).toLocaleString("zh-CN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">RM {o.total_amount?.toFixed(2)}</p>
                    <span className={`text-[10px] font-medium ${
                      o.status === ORDER_STATUS.COMPLETED ? "text-green-500" :
                      o.status === ORDER_STATUS.CANCELLED ? "text-destructive" : "text-[var(--theme-price)]"
                    }`}>{getOrderStatusLabel(o.status)}</span>
                  </div>
                </div>
              </PermissionGate>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">暂无订单</p>
        )}
      </div>
    </div>
  );
}
