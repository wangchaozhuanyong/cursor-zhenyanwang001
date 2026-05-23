import type { ReportKpiProfile } from "@/config/reportPageConfig";
import { REPORT_KPI_PRIORITIES } from "@/config/reportPageConfig";

export type ReportAlertType = "missing_cost" | "degraded" | "incomplete";

export type ReportAlert = {
  type: ReportAlertType;
  message: string;
};

function isMeaningfulValue(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  return true;
}

/** 按业务优先级排列 KPI，避免 Object.entries 顺序随机且机械截断重点指标 */
export function pickSummaryKpiEntries(
  summary: Record<string, unknown>,
  profile: ReportKpiProfile,
  maxVisible = 12,
  summaryPriorityKeys?: string[],
): Array<[string, unknown]> {
  const useExplicitPriority = Boolean(summaryPriorityKeys?.length);
  const priority = useExplicitPriority
    ? summaryPriorityKeys!
    : (REPORT_KPI_PRIORITIES[profile] ?? []);
  const entries: Array<[string, unknown]> = [];
  const used = new Set<string>();

  for (const key of priority) {
    if (used.has(key)) continue;
    const value = summary[key];
    if (!isMeaningfulValue(value)) continue;
    entries.push([key, value]);
    used.add(key);
  }

  if (!useExplicitPriority) {
    for (const [key, value] of Object.entries(summary)) {
      if (used.has(key) || !isMeaningfulValue(value)) continue;
      entries.push([key, value]);
      used.add(key);
    }
  }

  if (maxVisible > 0 && entries.length > maxVisible) {
    return entries.slice(0, maxVisible);
  }
  return entries;
}

function sumListField(list: Record<string, unknown>[], key: string) {
  return list.reduce((sum, row) => sum + Number(row[key] || 0), 0);
}

export function buildReportAlerts(
  reportKey: string,
  payload: Record<string, unknown>,
  summary: Record<string, unknown>,
  list: Record<string, unknown>[],
): ReportAlert[] {
  const alerts: ReportAlert[] = [];

  if (payload.degraded === true || payload.data_downgraded === true || payload.analytics_downgraded === true) {
    alerts.push({
      type: "degraded",
      message: "部分统计数据已降级展示（如埋点或扩展字段不可用），请以订单与财务口径为准。",
    });
  }

  const missingOrders = Number(summary.missing_cost_order_count || 0) || sumListField(list, "missing_cost_order_count");
  const missingItems = Number(summary.missing_cost_item_count || 0) || sumListField(list, "missing_cost_item_count");
  if (missingOrders > 0 || missingItems > 0) {
    const detail = [
      missingOrders > 0 ? `缺成本订单 ${missingOrders} 笔` : "",
      missingItems > 0 ? `缺成本商品行 ${missingItems} 条` : "",
    ].filter(Boolean).join("，");
    alerts.push({
      type: "missing_cost",
      message: `存在缺成本订单，利润可能偏高，请先补齐商品成本。${detail ? `（${detail}）` : ""}`,
    });
  }

  if (reportKey === "customer_analysis" && list.length === 0 && Object.keys(summary).length > 0) {
    alerts.push({
      type: "incomplete",
      message: "客户维度明细暂未提供，当前仅展示汇总指标。",
    });
  }

  if (reportKey === "search_analysis" && list.length > 0) {
    const totalSearch = sumListField(list, "search_count");
    const totalClicks = sumListField(list, "product_click_count");
    const totalCart = sumListField(list, "add_cart_count");
    if (totalSearch > 0 && totalClicks === 0 && totalCart === 0) {
      alerts.push({
        type: "degraded",
        message: "搜索行为埋点未就绪或已降级，点击与转化相关指标可能为 0。",
      });
    }
  }

  if (reportKey === "activity_analysis" && payload.sales_tracking_available === false) {
    alerts.push({
      type: "degraded",
      message: "订单明细未记录活动 ID 快照，活动销售归因指标已隐藏。",
    });
  }

  const warnings = payload.warnings;
  if (Array.isArray(warnings)) {
    for (const w of warnings) {
      const message = String(w || "").trim();
      if (message) alerts.push({ type: "incomplete", message });
    }
  }

  return alerts;
}
