const STICKY_COLUMN_ORDER = [
  "date",
  "month",
  "product_name",
  "category_path",
  "category_name",
  "activity_title",
  "coupon_title",
] as const;

const STICKY_WIDTH_REM: Record<string, number> = {
  date: 6.5,
  month: 6,
  product_name: 11,
  category_path: 10,
  category_name: 8,
  activity_title: 10,
  coupon_title: 10,
};

const HIDDEN_COLUMN_KEYS = new Set([
  "parent_category_id",
  "parent_category_name",
  "category_name",
  "category_id",
  "product_id",
  "order_id",
  "user_id",
  "activity_id",
  "coupon_id",
]);

const PREFER_OVER_ID: Array<[string, string]> = [
  ["category_path", "category_id"],
  ["category_name", "category_id"],
  ["product_name", "product_id"],
  ["order_no", "order_id"],
  ["nickname", "user_id"],
  ["phone", "user_id"],
  ["activity_title", "activity_id"],
  ["coupon_title", "coupon_id"],
];

/** 活动销售归因列：无 order_items.activity_id 快照时不展示，避免 0 误导 */
const ACTIVITY_SALES_METRIC_KEYS = new Set([
  "paid_order_count",
  "sales_qty",
  "sales_amount",
  "discount_amount",
  "gross_profit_amount",
  "view_count",
  "conversion_rate",
  "order_count",
]);

function hasValue(rows: Record<string, unknown>[], key: string) {
  return rows.some((row) => {
    const value = row[key];
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
}

export type BuildReportTableColumnsOptions = {
  hideActivitySalesMetrics?: boolean;
};

export function buildReportTableColumns(
  list: Record<string, unknown>[],
  options: BuildReportTableColumnsOptions = {},
) {
  if (list.length === 0) {
    return { columns: ["date", "col2", "col3", "col4"], stickyKeys: new Set<string>() };
  }

  const keys = Object.keys(list[0]);
  const hidden = new Set(HIDDEN_COLUMN_KEYS);

  for (const [preferField, idField] of PREFER_OVER_ID) {
    if (hasValue(list, preferField)) hidden.add(idField);
  }

  let visible = keys.filter((k) => !hidden.has(k));
  if (options.hideActivitySalesMetrics) {
    visible = visible.filter((k) => !ACTIVITY_SALES_METRIC_KEYS.has(k));
  }
  const stickyInData = STICKY_COLUMN_ORDER.filter((k) => visible.includes(k));
  const rest = visible.filter((k) => !stickyInData.includes(k));
  const columns = [...stickyInData, ...rest];

  return { columns, stickyKeys: new Set(stickyInData) };
}

export function getReportStickyCellStyle(columnKey: string, columns: string[], stickyKeys: Set<string>) {
  if (!stickyKeys.has(columnKey)) return undefined;

  const stickyCols = columns.filter((k) => stickyKeys.has(k));
  const index = stickyCols.indexOf(columnKey);
  if (index < 0) return undefined;

  let leftRem = 0;
  for (let i = 0; i < index; i += 1) {
    leftRem += STICKY_WIDTH_REM[stickyCols[i]] ?? 8;
  }

  return {
    position: "sticky" as const,
    left: `${leftRem}rem`,
    zIndex: 2,
    background: "var(--theme-surface)",
    boxShadow: index === stickyCols.length - 1 ? "4px 0 8px -4px rgba(0,0,0,0.08)" : undefined,
  };
}

export function reportTableBodyCellClass(sticky: boolean) {
  return sticky
    ? "max-w-0 px-3 py-2.5 align-middle bg-[var(--theme-surface)]"
    : "max-w-0 px-3 py-2.5 align-middle";
}

export function reportTableHeadCellClass(sticky: boolean) {
  return sticky
    ? "px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground bg-[var(--theme-surface)]"
    : "px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground";
}
