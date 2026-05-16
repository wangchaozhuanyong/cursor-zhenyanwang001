import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ReportFilterBar from "@/components/admin/report/ReportFilterBar";
import { AnimatedTable } from "@/modules/micro-interactions";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";

const COLUMN_LABELS: Record<string, string> = {
  date: "日期",
  month: "月份",
  order_count: "订单数",
  paid_order_count: "支付订单数",
  cancelled_order_count: "取消订单数",
  refund_order_count: "退款订单数",
  gross_sales: "销售额",
  discount_amount: "优惠金额",
  shipping_fee: "运费",
  refund_amount: "退款金额",
  net_sales: "净销售额",
  items_sold: "销售件数",
  paying_users: "支付用户数",
  average_order_value: "客单价",
  payment_rate: "支付率",
  refund_rate: "退款率",
  product_id: "商品ID",
  product_name: "商品名称",
  category_name: "分类",
  sales_qty: "销量",
  sales_amount: "销售额",
  buyer_count: "购买用户",
  current_stock: "当前库存",
  view_count: "浏览量",
  add_cart_count: "加购量",
  favorite_count: "收藏量",
  conversion_rate: "转化率",
};

function formatCellValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if ((key === "date" || key === "month") && typeof value === "string") {
    if (key === "date") return value.slice(0, 10);
    return value;
  }
  return String(value);
}

type Props = {
  title: string;
  fetcher: (params: Record<string, string>) => Promise<Record<string, unknown>>;
};

export default function AdminReportGenericPage({ title, fetcher }: Props) {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const p: Record<string, string> = {};
        searchParams.forEach((v, k) => (p[k] = v));
        const data = await fetcher(p);
        setPayload(data || {});
      } catch (e) {
        toast.error(toastErrorMessage(e, "加载报表失败"));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [fetcher, searchParams]);

  const list = Array.isArray(payload.list) ? (payload.list as Record<string, unknown>[]) : [];
  const summary = (payload.summary || {}) as Record<string, unknown>;
  const columns = useMemo(
    () => (list.length > 0 ? Object.keys(list[0]) : ["col1", "col2", "col3", "col4", "col5"]),
    [list],
  );

  const summaryEntries = Object.entries(summary).slice(0, 8);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>
      <ReportFilterBar />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 space-y-2">
                <div className="skeleton-base skeleton-shimmer h-3 w-16 rounded" />
                <div className="skeleton-base skeleton-shimmer h-6 w-24 rounded" />
              </div>
            ))
          : summaryEntries.map(([k, v]) => (
              <div key={k} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
                <p className="text-xs text-[var(--theme-text-muted)]">{COLUMN_LABELS[k] || k}</p>
                <p className="mt-1 text-lg font-bold text-[var(--theme-text)]">{String(v ?? "-")}</p>
              </div>
            ))}
      </div>
      <AnimatedTable
        loading={loading}
        rows={list}
        rowKey={(row) => String(list.indexOf(row))}
        skeletonRows={8}
        skeletonCols={columns.length}
        className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-0 overflow-auto"
        tableClassName="w-full min-w-[900px] text-xs"
        theadClassName="border-b border-[var(--theme-border)]"
        thead={(
          <tr>
            {columns.map((k) => (
              <th key={k} className="px-2 py-2 text-left text-muted-foreground">{COLUMN_LABELS[k] || k}</th>
            ))}
          </tr>
        )}
        emptyIcon={FileSpreadsheet}
        emptyTitle="暂无数据"
        renderRow={(row) => (
          <>
            {columns.map((k) => (
              <td key={k} className="px-2 py-2">{formatCellValue(k, row[k])}</td>
            ))}
          </>
        )}
      />
    </div>
  );
}
