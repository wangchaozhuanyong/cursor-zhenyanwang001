import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, MousePointerClick, Timer, TrendingUp, Users } from "lucide-react";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import type { ReportQuery } from "@/services/admin/reportService";
import { exportTrafficAnalysisCsv, fetchTrafficAnalysisReport } from "@/services/admin/reportService";
import { toastErrorMessage } from "@/utils/errorMessage";
import { adminTableClassName, adminTdClassName, adminThClassName } from "@/utils/adminTableClasses";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";

type Summary = {
  pv: number;
  uv: number;
  sessions: number;
  unique_ip_count: number;
  online_visitors?: number;
  new_visitors: number;
  returning_visitors: number;
  avg_duration_seconds: number;
  bounce_rate: number;
  product_view_count: number;
  product_click_count: number;
  add_to_cart_count: number;
  checkout_start_count: number;
  order_submit_count: number;
  payment_success_count: number;
  paid_amount: number;
  conversion_rate: number;
};

type TrendRow = {
  date: string;
  pv: number;
  uv: number;
  sessions: number;
  paid_amount: number;
};

type FunnelRow = {
  name: string;
  count: number;
  rate: number;
  drop_rate: number;
};

type TableRow = Record<string, string | number | null | undefined>;

type TrafficPayload = {
  summary: Summary;
  trend: TrendRow[];
  funnel: FunnelRow[];
  topPages: TableRow[];
  sources: TableRow[];
  devices: TableRow[];
  analytics_downgraded?: boolean;
  warnings?: string[];
  last_updated_at?: string;
};

const DEFAULT_SUMMARY: Summary = {
  pv: 0,
  uv: 0,
  sessions: 0,
  unique_ip_count: 0,
  online_visitors: 0,
  new_visitors: 0,
  returning_visitors: 0,
  avg_duration_seconds: 0,
  bounce_rate: 0,
  product_view_count: 0,
  product_click_count: 0,
  add_to_cart_count: 0,
  checkout_start_count: 0,
  order_submit_count: 0,
  payment_success_count: 0,
  paid_amount: 0,
  conversion_rate: 0,
};

const PAGE_TYPE_LABELS: Record<string, string> = {
  home: "首页",
  product: "商品详情",
  category: "分类页",
  cart: "购物车",
  checkout: "结算页",
  search: "搜索页",
  other: "其他页面",
};

const SOURCE_LABELS: Record<string, string> = {
  direct: "直接访问",
  campaign: "广告活动",
  referral: "外部引荐",
  organic: "自然搜索",
  social: "社交媒体",
  paid: "付费投放",
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "电脑",
  mobile: "手机",
  tablet: "平板",
  unknown: "未知",
};

const FIELD_LABELS: Record<string, string> = {
  type: "排行类型",
  path: "页面路径",
  title: "标题",
  page_type: "页面类型",
  pv: "PV",
  uv: "UV",
  avg_duration_seconds: "平均停留",
  bounce_rate: "跳出率",
  exit_count: "退出次数",
  add_to_cart_count: "加购次数",
  order_submit_count: "提交订单次数",
  paid_amount: "支付金额",
  traffic_source: "渠道",
  new_visitors: "新访客",
  payment_success_count: "支付成功次数",
  conversion_rate: "转化率",
  device: "设备",
  os: "系统",
  browser: "浏览器",
  browser_language: "语言",
  sessions: "会话",
};

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function formatMoney(value: unknown) {
  return `RM ${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: unknown) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatSeconds(value: unknown) {
  return `${Number(value || 0).toFixed(1)} 秒`;
}

function labelValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (key === "traffic_source") return SOURCE_LABELS[String(value)] || String(value);
  if (key === "device") return DEVICE_LABELS[String(value)] || String(value);
  if (key === "page_type") return PAGE_TYPE_LABELS[String(value)] || String(value);
  if (key.includes("rate")) return formatPercent(value);
  if (key.includes("amount")) return formatMoney(value);
  if (key.includes("duration")) return formatSeconds(value);
  return String(value);
}

function labelField(key: string) {
  return FIELD_LABELS[key] || key;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--theme-text-muted)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm text-[var(--theme-text)] outline-none transition focus:border-[var(--theme-primary)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function DataTable({
  title,
  rows,
  columns,
  onSelect,
}: {
  title: string;
  rows: TableRow[];
  columns: Array<{ key: string; label: string }>;
  onSelect: (title: string, row: TableRow) => void;
}) {
  return (
    <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--theme-text)]">{title}</h3>
        <span className="text-xs text-[var(--theme-text-muted)]">{rows.length} 条</span>
      </div>
      <AdminNativeTable tableClassName="min-w-[760px] text-xs">
          <thead className="border-b border-[var(--theme-border)] text-[var(--theme-text-muted)]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={adminThClassName()}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-[var(--theme-text-muted)]">
                  <FileSpreadsheet className="mx-auto mb-2" size={22} />
                  暂无数据
                </td>
              </tr>
            ) : rows.map((row, index) => (
              <tr
                key={`${title}-${index}`}
                className="cursor-pointer border-b border-[var(--theme-border)] transition hover:bg-[var(--theme-primary-soft)]"
                onClick={() => onSelect(title, row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className={adminTdClassName("text-[var(--theme-text)]")}>{labelValue(column.key, row[column.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
      </AdminNativeTable>
    </div>
  );
}

export default function AdminTrafficAnalysisReport() {
  const { tText } = useAdminT();
  const [filters, setFilters] = useState<ReportQuery>({ range_preset: "last_7_days", granularity: "day" });
  const [exporting, setExporting] = useState(false);
  const [drawer, setDrawer] = useState<{ title: string; row: TableRow } | null>(null);

  const query = useMemo(() => {
    const result: ReportQuery = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        (result as Record<string, string>)[key] = String(value);
      }
    });
    return result;
  }, [filters]);

  const reportQuery = useQuery({
    queryKey: adminQueryKeys.trafficReport(query as Record<string, string>),
    queryFn: async () => (await fetchTrafficAnalysisReport(query)) as unknown as TrafficPayload,
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const payload = reportQuery.data ?? null;
  const loading = reportQuery.isLoading && !reportQuery.data;

  const summary = payload?.summary || DEFAULT_SUMMARY;
  const cards = [
    { label: "PV", value: summary.pv, hint: "页面浏览次数，同一访客重复打开同一页面也会累计。", icon: TrendingUp },
    { label: "UV", value: summary.uv, hint: "独立访客数，按 anonymous_id 去重。", icon: Users },
    { label: tText("会话"), value: summary.sessions, hint: "按 session_id 去重后的访问会话数。", icon: MousePointerClick },
    { label: tText("在线人数"), value: summary.online_visitors || 0, hint: "最近 5 分钟内仍有事件的会话数。", icon: Users },
    { label: tText("新访客"), value: summary.new_visitors, hint: "首次访问时间落在当前筛选范围内的访客。", icon: Users },
    { label: tText("平均停留"), value: summary.avg_duration_seconds, hint: "根据 page_leave 的停留时长计算平均值。", icon: Timer, formatter: formatSeconds },
    { label: tText("跳出率"), value: summary.bounce_rate, hint: "只产生一次页面浏览的会话占比。", icon: TrendingUp, formatter: formatPercent },
    { label: tText("成交转化率"), value: summary.conversion_rate, hint: "支付成功次数 / 会话数。", icon: TrendingUp, formatter: formatPercent },
  ];

  const tableSelect = (title: string, row: TableRow) => setDrawer({ title, row });

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTrafficAnalysisCsv(query);
      toast.success(tText("已开始下载 CSV"));
    } catch (error) {
      toast.error(toastErrorMessage(error, "导出失败"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminPageShell
      hint={(
        <Tx>
          最后更新：
          {payload?.last_updated_at ? new Date(payload.last_updated_at).toLocaleString("zh-CN") : "-"}
        </Tx>
      )}
      toolbar={(
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={16} />
          {exporting ? tText("导出中...") : tText("导出 CSV")}
        </button>
      )}
      filters={(
        <>
          {payload?.analytics_downgraded ? (
            <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2.5 text-sm text-[var(--theme-text)]">
              {(payload.warnings || []).join("；") || tText("流量分析数据已降级展示，请检查埋点表和字段是否完整。")}
            </div>
          ) : null}
          <div className="theme-rounded grid gap-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow sm:grid-cols-2 lg:grid-cols-6">
        <FilterSelect label={tText("时间范围")} value={String(filters.range_preset || "last_7_days")} onChange={(value) => setFilters((prev) => ({ ...prev, range_preset: value }))} options={[
          { value: "today", label: tText("今日") },
          { value: "last_7_days", label: tText("最近 7 天") },
          { value: "last_30_days", label: tText("最近 30 天") },
        ]} />
        <FilterSelect label={tText("粒度")} value={String(filters.granularity || "day")} onChange={(value) => setFilters((prev) => ({ ...prev, granularity: value as ReportQuery["granularity"] }))} options={[
          { value: "day", label: tText("按日") },
          { value: "week", label: tText("按周") },
          { value: "month", label: tText("按月") },
        ]} />
        <FilterSelect label={tText("设备")} value={String(filters.device || "")} onChange={(value) => setFilters((prev) => ({ ...prev, device: value }))} options={[
          { value: "", label: tText("全部设备") },
          { value: "desktop", label: tText("电脑") },
          { value: "mobile", label: tText("手机") },
          { value: "tablet", label: tText("平板") },
        ]} />
        <FilterSelect label={tText("访客类型")} value={String(filters.visitor_type || "")} onChange={(value) => setFilters((prev) => ({ ...prev, visitor_type: value }))} options={[
          { value: "", label: tText("全部访客") },
          { value: "new", label: tText("新访客") },
          { value: "returning", label: tText("回访客") },
        ]} />
        <FilterSelect label={tText("渠道")} value={String(filters.traffic_source || "")} onChange={(value) => setFilters((prev) => ({ ...prev, traffic_source: value }))} options={[
          { value: "", label: tText("全部渠道") },
          { value: "direct", label: tText("直接访问") },
          { value: "campaign", label: tText("广告活动") },
          { value: "referral", label: tText("外部引荐") },
        ]} />
        <FilterSelect label={tText("页面类型")} value={String(filters.page_type || "")} onChange={(value) => setFilters((prev) => ({ ...prev, page_type: value }))} options={[
          { value: "", label: tText("全部页面") },
          { value: "home", label: tText("首页") },
          { value: "product", label: tText("商品详情") },
          { value: "category", label: tText("分类页") },
          { value: "cart", label: tText("购物车") },
          { value: "checkout", label: tText("结算页") },
          { value: "search", label: tText("搜索页") },
          { value: "other", label: tText("其他页面") },
        ]} />
          </div>
        </>
      )}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-[var(--theme-text-muted)]">
                  <Icon size={15} />
                  <span>{card.label}</span>
                  <AdminFieldHint text={card.hint} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-[var(--theme-text)]">
                {loading ? "-" : card.formatter ? card.formatter(card.value) : formatNumber(card.value)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--theme-text)]"><Tx>趋势图</Tx></h3>
            <AdminFieldHint text="展示 PV、UV、会话与支付金额随时间变化，受顶部筛选条件影响。" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={payload?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <ChartTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: "12px" }} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="pv" name="PV" stroke="var(--theme-primary)" fill="var(--theme-primary)" fillOpacity={0.12} />
              <Area yAxisId="left" type="monotone" dataKey="uv" name="UV" stroke="#22c55e" fillOpacity={0.08} fill="#22c55e" />
              <Area yAxisId="left" type="monotone" dataKey="sessions" name="会话" stroke="#f97316" fillOpacity={0.08} fill="#f97316" />
              <Area yAxisId="right" type="monotone" dataKey="paid_amount" name="支付金额" stroke="#e11d48" fillOpacity={0.05} fill="#e11d48" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--theme-text)]"><Tx>转化漏斗</Tx></h3>
            <AdminFieldHint text="每一步展示人数或次数、相对首步转化率，以及相对上一环节流失率。" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={payload?.funnel || []} layout="vertical" margin={{ left: 58 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <ChartTooltip formatter={(value, name) => [formatNumber(value), name]} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: "12px" }} />
              <Bar dataKey="count" name="数量" fill="var(--theme-primary)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4">
        <DataTable title={tText("页面排行")} rows={payload?.topPages || []} onSelect={tableSelect} columns={[
          { key: "path", label: tText("路径") },
          { key: "title", label: tText("标题") },
          { key: "page_type", label: tText("页面类型") },
          { key: "pv", label: "PV" },
          { key: "uv", label: "UV" },
          { key: "avg_duration_seconds", label: tText("平均停留") },
          { key: "bounce_rate", label: tText("跳出率") },
          { key: "exit_count", label: tText("退出次数") },
          { key: "add_to_cart_count", label: tText("加购") },
          { key: "order_submit_count", label: tText("提交订单") },
          { key: "paid_amount", label: tText("支付金额") },
        ]} />
        <DataTable title={tText("来源排行")} rows={payload?.sources || []} onSelect={tableSelect} columns={[
          { key: "traffic_source", label: tText("渠道") },
          { key: "pv", label: "PV" },
          { key: "uv", label: "UV" },
          { key: "new_visitors", label: tText("新访客") },
          { key: "order_submit_count", label: tText("提交订单") },
          { key: "payment_success_count", label: tText("支付成功") },
          { key: "paid_amount", label: tText("支付金额") },
          { key: "conversion_rate", label: tText("转化率") },
        ]} />
        <DataTable title={tText("设备排行")} rows={payload?.devices || []} onSelect={tableSelect} columns={[
          { key: "device", label: tText("设备") },
          { key: "os", label: tText("系统") },
          { key: "browser", label: tText("浏览器") },
          { key: "browser_language", label: tText("语言") },
          { key: "pv", label: "PV" },
          { key: "uv", label: "UV" },
          { key: "sessions", label: tText("会话") },
          { key: "payment_success_count", label: tText("支付成功") },
          { key: "paid_amount", label: tText("支付金额") },
        ]} />
      </div>

      <AdminResponsiveSheet
        open={!!drawer}
        onOpenChange={(open) => !open && setDrawer(null)}
        title={tText("明细")}
        description={drawer?.title}
        size="md"
        height="70vh"
      >
        {drawer ? (
          <div className="space-y-2">
            {Object.entries(drawer.row).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-[var(--theme-border)] p-3">
                <p className="text-xs text-[var(--theme-text-muted)]">{labelField(key)}</p>
                <p className="mt-1 break-all text-sm font-medium text-[var(--theme-text)]">{labelValue(key, value)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </AdminResponsiveSheet>
    </AdminPageShell>
  );
}
