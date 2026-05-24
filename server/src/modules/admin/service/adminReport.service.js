const repo = require('../repository/adminReport.repository');
const { parseReportFilters } = require('./adminReportFilters');
const { labelReportColumn, labelReportCellValue } = require('../../../utils/reportColumnLabels');
const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const { writeAuditLog } = require('../../../utils/auditLog');
const siteCapabilitiesService = require('./adminSiteCapabilities.service');
const { getReportDefinition } = require('../report/adminReportRegistry');

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return formatDate(new Date());
  }
  return date.toISOString().slice(0, 10);
}

function parseQueryDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveDateRange(query = {}) {
  const now = new Date();
  const preset = query.range_preset || 'last_7_days';
  let start = new Date(now);
  let end = new Date(now);

  if (preset === 'today') {
  } else if (preset === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (preset === 'last_7_days') {
    start.setDate(start.getDate() - 6);
  } else if (preset === 'last_30_days') {
    start.setDate(start.getDate() - 29);
  } else if (preset === 'this_month') {
    start.setDate(1);
  } else if (preset === 'last_month') {
    start.setMonth(start.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (preset === 'this_quarter') {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  }

  const parsedFrom = parseQueryDate(query.date_from);
  const parsedTo = parseQueryDate(query.date_to);
  if (parsedFrom) start = parsedFrom;
  if (parsedTo) end = parsedTo;

  return { dateFrom: formatDate(start), dateTo: formatDate(end) };
}

function safeNumber(v, digits = 2) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
}

function normalizeTrafficFilters(query = {}) {
  const clean = (value) => String(value || '').trim();
  const allow = (value, allowed) => {
    const v = clean(value);
    return allowed.includes(v) ? v : '';
  };
  return {
    granularity: allow(query.granularity, ['day', 'week', 'month']) || 'day',
    device: allow(query.device, ['desktop', 'mobile', 'tablet']),
    visitor_type: allow(query.visitor_type, ['new', 'returning']),
    traffic_source: allow(query.traffic_source, ['direct', 'campaign', 'referral', 'organic', 'social', 'paid']),
    page_type: allow(query.page_type, ['home', 'product', 'category', 'cart', 'checkout', 'search', 'other']),
  };
}

function rate(part, total) {
  const p = Number(part || 0);
  const t = Number(total || 0);
  return t > 0 ? safeNumber((p / t) * 100) : 0;
}

function salesPeriodKey(dateValue, granularity = 'day') {
  const dateKey = dateValue instanceof Date
    ? formatDate(dateValue)
    : String(dateValue || '').slice(0, 10);
  if (!dateKey) return '';
  if (granularity === 'month') return dateKey.slice(0, 7);
  if (granularity === 'week') {
    const d = new Date(`${dateKey}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return dateKey;
    const day = d.getUTCDay();
    const offset = day === 0 ? 6 : day - 1;
    d.setUTCDate(d.getUTCDate() - offset);
    return d.toISOString().slice(0, 10);
  }
  return dateKey;
}

function aggregateProfitRowsForSalesPeriod(profitRows = [], granularity = 'day') {
  const grouped = new Map();
  for (const row of profitRows) {
    const key = salesPeriodKey(row.date, granularity);
    if (!key) continue;
    const normalized = normalizeProfitRow(row);
    const current = grouped.get(key) || {};
    grouped.set(key, normalizeProfitRow({
      date: key,
      paid_order_count: Number(current.paid_order_count || 0) + Number(normalized.paid_order_count || 0),
      paid_amount: Number(current.paid_amount || 0) + Number(normalized.paid_amount || 0),
      product_sales_amount: Number(current.product_sales_amount || 0) + Number(normalized.product_sales_amount || 0),
      discount_amount: Number(current.discount_amount || 0) + Number(normalized.discount_amount || 0),
      points_discount_amount: Number(current.points_discount_amount || 0) + Number(normalized.points_discount_amount || 0),
      reward_cash_discount_amount: Number(current.reward_cash_discount_amount || 0) + Number(normalized.reward_cash_discount_amount || 0),
      net_goods_sales_amount: Number(current.net_goods_sales_amount || 0) + Number(normalized.net_goods_sales_amount || 0),
      goods_cost_amount: Number(current.goods_cost_amount || 0) + Number(normalized.goods_cost_amount || 0),
      gross_profit_amount: Number(current.gross_profit_amount || 0) + Number(normalized.gross_profit_amount || 0),
      shipping_income: Number(current.shipping_income || 0) + Number(normalized.shipping_income || 0),
      shipping_cost_amount: Number(current.shipping_cost_amount || 0) + Number(normalized.shipping_cost_amount || 0),
      payment_fee_amount: Number(current.payment_fee_amount || 0) + Number(normalized.payment_fee_amount || 0),
      refund_amount: Number(current.refund_amount || 0) + Number(normalized.refund_amount || 0),
      expense_amount: Number(current.expense_amount || 0) + Number(normalized.expense_amount || 0),
      net_profit_amount: Number(current.net_profit_amount || 0) + Number(normalized.net_profit_amount || 0),
      missing_cost_order_count: Number(current.missing_cost_order_count || 0) + Number(normalized.missing_cost_order_count || 0),
      missing_cost_item_count: Number(current.missing_cost_item_count || 0) + Number(normalized.missing_cost_item_count || 0),
    }));
  }
  return grouped;
}

function buildTrafficFunnel(raw = {}) {
  const steps = [
    ['访问网站', raw.visit_count],
    ['浏览商品', raw.product_view_count],
    ['点击商品', raw.product_click_count],
    ['加入购物车', raw.add_to_cart_count],
    ['发起结算', raw.checkout_start_count],
    ['提交订单', raw.order_submit_count],
    ['支付成功', raw.payment_success_count],
  ];
  const first = Number(steps[0][1] || 0);
  return steps.map(([name, countRaw], index) => {
    const count = Number(countRaw || 0);
    const previous = index === 0 ? count : Number(steps[index - 1][1] || 0);
    return {
      name,
      count,
      rate: index === 0 ? 100 : rate(count, first),
      drop_rate: index === 0 ? 0 : safeNumber(100 - rate(count, previous)),
    };
  });
}

function emptyTrafficPayload(dateFrom, dateTo) {
  return {
    summary: {
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
    },
    trend: [],
    funnel: buildTrafficFunnel({}),
    topPages: [],
    sources: [],
    devices: [],
    analytics_downgraded: true,
    warnings: ['流量分析埋点表或必要字段未就绪，暂无法统计 PV、UV、来源、设备和漏斗数据。'],
    date_from: dateFrom,
    date_to: dateTo,
    last_updated_at: new Date().toISOString(),
  };
}

async function getOverview(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const analyticsReady = await repo.isAnalyticsEventsReady();
  const summaryRaw = await repo.selectOverviewSummary(dateFrom, dateTo);
  const behaviorRaw = await repo.selectOverviewBehaviorSummary(dateFrom, dateTo);
  const hot = await repo.selectOverviewTopProducts(dateFrom, dateTo, false);
  const slow = await repo.selectOverviewTopProducts(dateFrom, dateTo, true);
  const paidOrders = Number(summaryRaw.paid_order_count || 0);
  const gross = safeNumber(summaryRaw.gross_sales);
  const refund = safeNumber(summaryRaw.refund_amount);
  const net = safeNumber(gross - refund);

  return {
    summary: {
      销售额: gross,
      净销售额: net,
      支付订单数: paidOrders,
      客单价: paidOrders > 0 ? safeNumber(gross / paidOrders) : 0,
      退款金额: refund,
      优惠金额: safeNumber(summaryRaw.discount_amount),
      待处理订单: Number(summaryRaw.pending_orders || 0),
      商品浏览次数: Number(behaviorRaw.product_view_count || 0),
      商品点击次数: Number(behaviorRaw.product_click_count || 0),
      加购次数: Number(behaviorRaw.add_to_cart_count || 0),
      收藏次数: Number(behaviorRaw.favorite_count || 0),
      发起结算次数: Number(behaviorRaw.checkout_start_count || 0),
    },
    topHotProducts: hot,
    topSlowProducts: slow,
    analytics_downgraded: !analyticsReady,
    warnings: analyticsReady ? [] : ['行为埋点表未就绪，商品浏览、加购和发起结算等行为指标已降级。'],
    date_from: dateFrom,
    date_to: dateTo,
    last_updated_at: new Date().toISOString(),
  };
}

async function getSalesDaily(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const filters = parseReportFilters(query);
  let list = [];
  let profitRows = [];
  try {
    [list, profitRows] = await Promise.all([
      repo.selectSalesDaily(dateFrom, dateTo, filters),
      repo.selectProfitDaily(dateFrom, dateTo),
    ]);
  } catch (error) {
    if (canDowngradeReportError(error)) {
      console.warn(`[admin-report] sales daily downgraded: ${error.message}`);
      list = [];
      profitRows = [];
    } else {
      throw error;
    }
  }
  const profitByPeriod = aggregateProfitRowsForSalesPeriod(profitRows, filters.granularity || 'day');
  const salesPeriods = new Set(list.map((r) => salesPeriodKey(r.date, filters.granularity || 'day')));
  const normalizeSalesRow = (r, profitRow = {}) => {
    const paid = Number(r.paid_order_count || 0);
    const orderCount = Number(r.order_count || 0);
    const items = Number(r.items_sold || 0);
    const grossSales = safeNumber(r.gross_sales);
    const refundAmount = safeNumber(r.refund_amount);
    const netGoodsSales = safeNumber(profitRow.net_goods_sales_amount);
    const grossProfit = safeNumber(profitRow.gross_profit_amount);
    const netProfit = safeNumber(profitRow.net_profit_amount);
    const paymentRate = orderCount > 0 ? safeNumber((paid / orderCount) * 100) : 0;
    const refundRate = paid > 0 ? safeNumber((Number(r.refund_order_count || 0) / paid) * 100) : 0;
    return {
      ...r,
      date: salesPeriodKey(r.date, filters.granularity || 'day'),
      gross_sales: grossSales,
      refund_amount: refundAmount,
      net_sales: safeNumber(grossSales - refundAmount),
      average_order_value: paid > 0 ? safeNumber(grossSales / paid) : 0,
      units_per_order: paid > 0 ? safeNumber(items / paid) : 0,
      payment_rate: paymentRate,
      refund_rate: refundRate,
      product_sales_amount: safeNumber(profitRow.product_sales_amount),
      net_goods_sales_amount: netGoodsSales,
      goods_cost_amount: safeNumber(profitRow.goods_cost_amount),
      gross_profit_amount: grossProfit,
      gross_margin: netGoodsSales > 0 ? safeNumber((grossProfit / netGoodsSales) * 100) : 0,
      expense_amount: safeNumber(profitRow.expense_amount),
      net_profit_amount: netProfit,
      net_margin: grossSales > 0 ? safeNumber((netProfit / grossSales) * 100) : 0,
      missing_cost_order_count: Number(profitRow.missing_cost_order_count || r.missing_cost_order_count || 0),
      missing_cost_item_count: Number(profitRow.missing_cost_item_count || 0),
    };
  };
  const normalized = list.map((r) => normalizeSalesRow(r, profitByPeriod.get(salesPeriodKey(r.date, filters.granularity || 'day'))));
  for (const [date, profitRow] of profitByPeriod) {
    if (salesPeriods.has(date)) continue;
    normalized.push(normalizeSalesRow({
      date,
      order_count: 0,
      paid_order_count: profitRow.paid_order_count,
      refund_order_count: 0,
      gross_sales: 0,
      refund_amount: profitRow.refund_amount,
      discount_amount: profitRow.discount_amount,
      items_sold: 0,
    }, profitRow));
  }
  normalized.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const summary = normalized.reduce((acc, row) => ({
    gross_sales: safeNumber(acc.gross_sales + Number(row.gross_sales || 0)),
    net_sales: safeNumber(acc.net_sales + Number(row.net_sales || 0)),
    paid_order_count: acc.paid_order_count + Number(row.paid_order_count || 0),
    order_count: acc.order_count + Number(row.order_count || 0),
    refund_amount: safeNumber(acc.refund_amount + Number(row.refund_amount || 0)),
    discount_amount: safeNumber(acc.discount_amount + Number(row.discount_amount || 0)),
    product_sales_amount: safeNumber(acc.product_sales_amount + Number(row.product_sales_amount || 0)),
    net_goods_sales_amount: safeNumber(acc.net_goods_sales_amount + Number(row.net_goods_sales_amount || 0)),
    goods_cost_amount: safeNumber(acc.goods_cost_amount + Number(row.goods_cost_amount || 0)),
    gross_profit_amount: safeNumber(acc.gross_profit_amount + Number(row.gross_profit_amount || 0)),
    expense_amount: safeNumber(acc.expense_amount + Number(row.expense_amount || 0)),
    net_profit_amount: safeNumber(acc.net_profit_amount + Number(row.net_profit_amount || 0)),
    missing_cost_order_count: acc.missing_cost_order_count + Number(row.missing_cost_order_count || 0),
    missing_cost_item_count: acc.missing_cost_item_count + Number(row.missing_cost_item_count || 0),
  }), {
    gross_sales: 0,
    net_sales: 0,
    paid_order_count: 0,
    order_count: 0,
    refund_amount: 0,
    discount_amount: 0,
    product_sales_amount: 0,
    net_goods_sales_amount: 0,
    goods_cost_amount: 0,
    gross_profit_amount: 0,
    expense_amount: 0,
    net_profit_amount: 0,
    missing_cost_order_count: 0,
    missing_cost_item_count: 0,
  });
  summary.gross_margin = summary.net_goods_sales_amount > 0
    ? safeNumber((summary.gross_profit_amount / summary.net_goods_sales_amount) * 100)
    : 0;
  summary.net_margin = summary.gross_sales > 0 ? safeNumber((summary.net_profit_amount / summary.gross_sales) * 100) : 0;
  return { summary, list: normalized, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

function canDowngradeReportError(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return code === 'ER_BAD_FIELD_ERROR'
    || code === 'ER_NO_SUCH_TABLE'
    || code === 'ER_PARSE_ERROR'
    || /unknown column|doesn't exist|no such table/i.test(msg);
}

function normalizeProfitRow(row) {
  return {
    ...row,
    paid_amount: safeNumber(row.paid_amount),
    product_sales_amount: safeNumber(row.product_sales_amount),
    discount_amount: safeNumber(row.discount_amount),
    points_discount_amount: safeNumber(row.points_discount_amount),
    reward_cash_discount_amount: safeNumber(row.reward_cash_discount_amount),
    net_goods_sales_amount: safeNumber(row.net_goods_sales_amount),
    goods_cost_amount: safeNumber(row.goods_cost_amount),
    gross_profit_amount: safeNumber(row.gross_profit_amount),
    gross_margin: safeNumber(row.gross_margin),
    shipping_income: safeNumber(row.shipping_income),
    shipping_cost_amount: safeNumber(row.shipping_cost_amount),
    payment_fee_amount: safeNumber(row.payment_fee_amount),
    refund_amount: safeNumber(row.refund_amount),
    expense_amount: safeNumber(row.expense_amount),
    net_profit_amount: safeNumber(row.net_profit_amount),
    net_margin: safeNumber(row.net_margin),
    paid_order_count: Number(row.paid_order_count || 0),
    missing_cost_order_count: Number(row.missing_cost_order_count || 0),
    missing_cost_item_count: Number(row.missing_cost_item_count || 0),
  };
}

function buildProfitSummary(list) {
  const summary = list.reduce((acc, row) => ({
    paid_order_count: acc.paid_order_count + Number(row.paid_order_count || 0),
    paid_amount: safeNumber(acc.paid_amount + Number(row.paid_amount || 0)),
    product_sales_amount: safeNumber(acc.product_sales_amount + Number(row.product_sales_amount || 0)),
    net_goods_sales_amount: safeNumber(acc.net_goods_sales_amount + Number(row.net_goods_sales_amount || 0)),
    goods_cost_amount: safeNumber(acc.goods_cost_amount + Number(row.goods_cost_amount || 0)),
    gross_profit_amount: safeNumber(acc.gross_profit_amount + Number(row.gross_profit_amount || 0)),
    shipping_income: safeNumber(acc.shipping_income + Number(row.shipping_income || 0)),
    shipping_cost_amount: safeNumber(acc.shipping_cost_amount + Number(row.shipping_cost_amount || 0)),
    payment_fee_amount: safeNumber(acc.payment_fee_amount + Number(row.payment_fee_amount || 0)),
    refund_amount: safeNumber(acc.refund_amount + Number(row.refund_amount || 0)),
    expense_amount: safeNumber(acc.expense_amount + Number(row.expense_amount || 0)),
    net_profit_amount: safeNumber(acc.net_profit_amount + Number(row.net_profit_amount || 0)),
    missing_cost_order_count: acc.missing_cost_order_count + Number(row.missing_cost_order_count || 0),
    missing_cost_item_count: acc.missing_cost_item_count + Number(row.missing_cost_item_count || 0),
  }), {
    paid_order_count: 0,
    paid_amount: 0,
    product_sales_amount: 0,
    net_goods_sales_amount: 0,
    goods_cost_amount: 0,
    gross_profit_amount: 0,
    shipping_income: 0,
    shipping_cost_amount: 0,
    payment_fee_amount: 0,
    refund_amount: 0,
    expense_amount: 0,
    net_profit_amount: 0,
    missing_cost_order_count: 0,
    missing_cost_item_count: 0,
  });
  summary.gross_margin = summary.net_goods_sales_amount > 0
    ? safeNumber((summary.gross_profit_amount / summary.net_goods_sales_amount) * 100)
    : 0;
  summary.net_margin = summary.paid_amount > 0 ? safeNumber((summary.net_profit_amount / summary.paid_amount) * 100) : 0;
  return summary;
}

function mergeSalesMonthlyWithProfit(salesRow, profitRow = {}) {
  const gross = safeNumber(salesRow.gross_sales);
  const paid = Number(salesRow.paid_order_count || 0);
  return {
    ...salesRow,
    gross_sales: gross,
    net_sales: safeNumber(salesRow.net_sales),
    average_order_value: paid > 0 ? safeNumber(gross / paid) : 0,
    refund_rate: gross > 0 ? safeNumber((Number(salesRow.refund_amount || 0) / gross) * 100) : 0,
    product_sales_amount: safeNumber(profitRow.product_sales_amount),
    net_goods_sales_amount: safeNumber(profitRow.net_goods_sales_amount),
    goods_cost_amount: safeNumber(profitRow.goods_cost_amount),
    gross_profit_amount: safeNumber(profitRow.gross_profit_amount),
    gross_margin: safeNumber(profitRow.gross_margin),
    expense_amount: safeNumber(profitRow.expense_amount),
    net_profit_amount: safeNumber(profitRow.net_profit_amount),
    net_margin: safeNumber(profitRow.net_margin),
    missing_cost_order_count: Number(profitRow.missing_cost_order_count || 0),
    missing_cost_item_count: Number(profitRow.missing_cost_item_count || 0),
  };
}

async function getSalesMonthly(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  let list = [];
  let profitRows = [];
  try {
    [list, profitRows] = await Promise.all([
      repo.selectSalesMonthly(dateFrom, dateTo),
      repo.selectProfitMonthly(dateFrom, dateTo),
    ]);
  } catch (error) {
    if (canDowngradeReportError(error)) {
      console.warn(`[admin-report] sales monthly downgraded: ${error.message}`);
      list = [];
      profitRows = [];
    } else {
      throw error;
    }
  }
  const profitByMonth = new Map(
    profitRows.map((row) => [String(row.month), normalizeProfitRow(row)]),
  );
  const salesMonths = new Set(list.map((r) => String(r.month)));
  let prev = null;
  const normalized = list.map((r) => {
    const month = String(r.month);
    const merged = mergeSalesMonthlyWithProfit(r, profitByMonth.get(month));
    const mom = prev ? (prev > 0 ? safeNumber(((merged.gross_sales - prev) / prev) * 100) : 0) : 0;
    prev = merged.gross_sales;
    return { ...merged, mom_growth_rate: mom };
  });
  for (const [month, profitRow] of profitByMonth) {
    if (salesMonths.has(month)) continue;
    const merged = mergeSalesMonthlyWithProfit(
      {
        month,
        gross_sales: 0,
        net_sales: 0,
        paid_order_count: profitRow.paid_order_count,
        refund_amount: profitRow.refund_amount,
        discount_amount: profitRow.discount_amount,
      },
      profitRow,
    );
    normalized.push({ ...merged, mom_growth_rate: 0 });
  }
  normalized.sort((a, b) => String(a.month).localeCompare(String(b.month)));
  const profitSummary = buildProfitSummary([...profitByMonth.values()]);
  return {
    summary: { 月份数: normalized.length, ...profitSummary },
    list: normalized,
    date_from: dateFrom,
    date_to: dateTo,
    last_updated_at: new Date().toISOString(),
  };
}

async function getProfitDaily(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  let list;
  try {
    list = (await repo.selectProfitDaily(dateFrom, dateTo)).map(normalizeProfitRow);
  } catch (error) {
    if (canDowngradeReportError(error)) {
      console.warn(`[admin-report] profit daily downgraded: ${error.message}`);
      list = [];
    } else {
      throw error;
    }
  }
  const summary = buildProfitSummary(list);
  return { summary, list, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getProfitMonthly(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  let list;
  try {
    list = (await repo.selectProfitMonthly(dateFrom, dateTo)).map(normalizeProfitRow);
  } catch (error) {
    if (canDowngradeReportError(error)) {
      console.warn(`[admin-report] profit monthly downgraded: ${error.message}`);
      list = [];
    } else {
      throw error;
    }
  }
  const summary = buildProfitSummary(list);
  return { summary, list, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getProductsAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const filters = parseReportFilters(query);
  const list = await repo.selectProductsAnalysis(dateFrom, dateTo, filters);
  return { summary: { 商品数: list.length }, list, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getCategoriesAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const filters = parseReportFilters(query);
  const list = await repo.selectSimpleCategoryAnalysis(dateFrom, dateTo, filters);
  return { summary: { 分类数: list.length }, list, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

function normalizeOrderAnalysisRow(row) {
  const orderCount = Number(row.order_count || 0);
  const paid = Number(row.paid_order_count || 0);
  const paidAmount = safeNumber(row.paid_amount);
  const refundAmount = safeNumber(row.refund_amount);
  const refundOrders = Number(row.refund_order_count || 0);
  return {
    ...row,
    order_count: orderCount,
    paid_order_count: paid,
    unpaid_order_count: Number(row.unpaid_order_count || 0),
    cancelled_order_count: Number(row.cancelled_order_count || 0),
    refund_order_count: refundOrders,
    paid_amount: paidAmount,
    refund_amount: refundAmount,
    average_order_value: paid > 0 ? safeNumber(paidAmount / paid) : 0,
    payment_rate: orderCount > 0 ? safeNumber((paid / orderCount) * 100) : 0,
    refund_rate: paid > 0 ? safeNumber((refundOrders / paid) * 100) : 0,
  };
}

async function getOrdersAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const filters = parseReportFilters(query);
  const [summaryRaw, listRaw] = await Promise.all([
    repo.selectSimpleOrderAnalysis(dateFrom, dateTo, filters),
    repo.selectOrderAnalysisDaily(dateFrom, dateTo, filters),
  ]);
  const list = listRaw.map(normalizeOrderAnalysisRow);
  const summary = normalizeOrderAnalysisRow(summaryRaw);
  return { summary, list, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

function buildCustomerSummary(raw = {}) {
  const payingUsers = Number(raw.paying_users || 0);
  const paidOrderCount = Number(raw.paid_order_count || 0);
  const repeatBuyers = Number(raw.repeat_buyer_count || 0);
  const totalPaidAmount = safeNumber(raw.total_paid_amount);

  const summary = {
    new_users: Number(raw.new_users || 0),
    order_users: Number(raw.order_users || 0),
    paying_users: payingUsers,
    repeat_buyer_count: repeatBuyers,
    repeat_purchase_rate: payingUsers > 0 ? safeNumber((repeatBuyers / payingUsers) * 100) : 0,
    average_order_value: paidOrderCount > 0 ? safeNumber(totalPaidAmount / paidOrderCount) : 0,
    average_orders_per_buyer: payingUsers > 0 ? safeNumber(paidOrderCount / payingUsers) : 0,
    total_paid_amount: totalPaidAmount,
    paid_order_count: paidOrderCount,
  };
  if (raw.active_users != null) {
    summary.active_users = Number(raw.active_users || 0);
  }
  return summary;
}

async function getCustomersAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const raw = await repo.selectSimpleCustomerAnalysis(dateFrom, dateTo);
  const summary = buildCustomerSummary(raw);
  return {
    summary,
    list: [],
    summary_only: true,
    data_scope_note: '客户分析当前为汇总型报表，统计所选时间内新用户、下单用户、付款用户、复购用户。',
    date_from: dateFrom,
    date_to: dateTo,
    last_updated_at: new Date().toISOString(),
  };
}

function normalizeActivityAnalysisRow(row, salesTrackingAvailable) {
  const base = {
    activity_id: row.activity_id,
    activity_title: row.activity_title,
    activity_type: row.activity_type,
    start_at: row.start_at,
    end_at: row.end_at,
    product_count: Number(row.product_count || 0),
  };
  if (!salesTrackingAvailable) return base;

  const paidOrderCount = Number(row.paid_order_count || 0);
  const viewCount = Number(row.view_count || 0);
  return {
    ...base,
    paid_order_count: paidOrderCount,
    sales_qty: Number(row.sales_qty || 0),
    sales_amount: Number(row.sales_amount || 0),
    discount_amount: Number(row.discount_amount || 0),
    gross_profit_amount: Number(row.gross_profit_amount || 0),
    ...(viewCount > 0
      ? {
          view_count: viewCount,
          ...(row.conversion_rate != null ? { conversion_rate: Number(row.conversion_rate) } : {}),
        }
      : {}),
  };
}

function buildActivityAnalysisSummary(list, salesTrackingAvailable) {
  const summary = { 活动数: list.length };
  if (!salesTrackingAvailable) return summary;
  summary.有销售活动数 = list.filter((r) => Number(r.paid_order_count || 0) > 0).length;
  summary.支付订单数 = list.reduce((sum, r) => sum + Number(r.paid_order_count || 0), 0);
  summary.销量 = list.reduce((sum, r) => sum + Number(r.sales_qty || 0), 0);
  summary.销售额 = list.reduce((sum, r) => sum + Number(r.sales_amount || 0), 0);
  summary.优惠金额 = list.reduce((sum, r) => sum + Number(r.discount_amount || 0), 0);
  summary.商品毛利 = list.reduce((sum, r) => sum + Number(r.gross_profit_amount || 0), 0);
  return summary;
}

async function getActivitiesAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const filters = parseReportFilters(query);
  const salesTrackingAvailable = await repo.isOrderItemsActivitySnapshotReady();
  const listRaw = await repo.selectSimpleActivitiesAnalysis(dateFrom, dateTo, filters);
  const list = listRaw.map((row) => normalizeActivityAnalysisRow(row, salesTrackingAvailable));
  const warnings = salesTrackingAvailable
    ? []
    : ['订单明细尚未记录活动 ID 快照，无法统计活动带来的订单与销售额。'];
  return {
    sales_tracking_available: salesTrackingAvailable,
    summary: buildActivityAnalysisSummary(list, salesTrackingAvailable),
    list,
    warnings,
    date_from: dateFrom,
    date_to: dateTo,
    last_updated_at: new Date().toISOString(),
  };
}

function computeCouponRoi(row) {
  const paidOrders = Number(row.paid_order_count || 0);
  const discountAmount = Number(row.discount_amount || 0);
  const grossProfit = Number(row.gross_profit_amount || 0);
  if (paidOrders <= 0) return null;
  if (discountAmount <= 0) return null;
  return safeNumber(grossProfit / discountAmount, 4);
}

function normalizeCouponAnalysisRow(row) {
  const issued = Number(row.issued_count || 0);
  const claimed = Number(row.claimed_count || 0);
  const used = Number(row.used_count || 0);
  const expired = Number(row.expired_count || 0);
  const paidOrderCount = Number(row.paid_order_count || 0);
  const salesAmount = safeNumber(row.sales_amount);
  const discountAmount = safeNumber(row.discount_amount);
  const netSales = safeNumber(row.net_sales);
  const grossProfitAmount = safeNumber(row.gross_profit_amount);

  const base = {
    coupon_title: row.coupon_title || '',
    claimed_count: claimed,
    used_count: used,
    expired_count: expired,
    claim_rate: issued > 0 ? safeNumber((claimed / issued) * 100) : (claimed > 0 ? 100 : 0),
    use_rate: claimed > 0 ? safeNumber((used / claimed) * 100) : 0,
    paid_order_count: paidOrderCount,
    sales_amount: salesAmount,
    discount_amount: discountAmount,
    net_sales: netSales,
    gross_profit_amount: grossProfitAmount,
    roi: computeCouponRoi({
      paid_order_count: paidOrderCount,
      discount_amount: discountAmount,
      gross_profit_amount: grossProfitAmount,
    }),
  };

  return base;
}

async function getCouponsAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const filters = parseReportFilters(query);
  const list = await repo.selectCouponsAnalysis(dateFrom, dateTo, filters);
  const normalized = list.map(normalizeCouponAnalysisRow);
  const summary = normalized.reduce((acc, row) => ({
    优惠券数: acc.优惠券数 + 1,
    领取总量: acc.领取总量 + row.claimed_count,
    使用总量: acc.使用总量 + row.used_count,
    过期总量: acc.过期总量 + row.expired_count,
    支付订单数: acc.支付订单数 + row.paid_order_count,
    带动销售额: safeNumber(acc.带动销售额 + row.sales_amount),
    优惠成本: safeNumber(acc.优惠成本 + row.discount_amount),
    净销售额: safeNumber(acc.净销售额 + row.net_sales),
    商品毛利: safeNumber(acc.商品毛利 + row.gross_profit_amount),
  }), {
    优惠券数: 0,
    领取总量: 0,
    使用总量: 0,
    过期总量: 0,
    支付订单数: 0,
    带动销售额: 0,
    优惠成本: 0,
    净销售额: 0,
    商品毛利: 0,
  });
  summary.综合投入产出比 = summary.优惠成本 > 0 && summary.支付订单数 > 0
    ? safeNumber(summary.商品毛利 / summary.优惠成本, 4)
    : null;

  return {
    summary,
    list: normalized,
    date_from: dateFrom,
    date_to: dateTo,
    last_updated_at: new Date().toISOString(),
  };
}

const INVENTORY_SORT_COLUMNS = new Set(['current_stock', 'sales_7d', 'sales_30d', 'available_stock_days', 'product_name']);

function resolveInventorySort(query = {}) {
  const sortBy = String(query.sort_by || query.sortBy || 'available_stock_days').trim();
  const sortOrder = String(query.sort_order || query.sortOrder || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  return {
    sortBy: INVENTORY_SORT_COLUMNS.has(sortBy) ? sortBy : 'available_stock_days',
    sortOrder,
  };
}

function normalizeInventoryRow(row) {
  const sales7d = Number(row.sales_7d || 0);
  const sales30d = Number(row.sales_30d || 0);
  const currentStock = Number(row.current_stock || 0);
  const warningStock = Number(row.warning_stock || 0);
  const avgDailySales = safeNumber(sales30d / 30, 4);
  const availableStockDays = avgDailySales > 0 ? safeNumber(currentStock / avgDailySales, 1) : null;

  let stockStatus = 'normal';
  if (currentStock <= 0) {
    stockStatus = 'out_of_stock';
  } else if (warningStock > 0 && currentStock <= warningStock) {
    stockStatus = 'low_stock';
  } else if (sales30d <= 0) {
    stockStatus = 'slow_moving';
  } else if (availableStockDays !== null && availableStockDays >= 60) {
    stockStatus = 'slow_moving';
  }

  return {
    product_name: row.product_name || '',
    current_stock: currentStock,
    warning_stock: warningStock,
    sales_7d: sales7d,
    sales_30d: sales30d,
    avg_daily_sales: avgDailySales,
    available_stock_days: availableStockDays,
    stock_status: stockStatus,
  };
}

function sortInventoryRows(rows, { sortBy, sortOrder }) {
  const dir = sortOrder === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortBy === 'product_name') {
      const cmp = String(a.product_name || '').localeCompare(String(b.product_name || ''), 'zh-CN');
      return cmp * dir;
    }
    const av = a[sortBy];
    const bv = b[sortBy];
    const aNull = av === null || av === undefined;
    const bNull = bv === null || bv === undefined;
    if (aNull && bNull) return String(a.product_name || '').localeCompare(String(b.product_name || ''), 'zh-CN');
    if (aNull) return 1;
    if (bNull) return -1;
    const diff = Number(av) - Number(bv);
    if (diff === 0) return String(a.product_name || '').localeCompare(String(b.product_name || ''), 'zh-CN');
    return diff * dir;
  });
}

async function getInventoryAnalysis(query = {}) {
  const { sortBy, sortOrder } = resolveInventorySort(query);
  const rows = await repo.selectInventoryAnalysis();
  const normalized = sortInventoryRows(rows.map(normalizeInventoryRow), { sortBy, sortOrder });

  const summary = normalized.reduce((acc, row) => ({
    商品数: acc.商品数 + 1,
    缺货商品: acc.缺货商品 + (row.stock_status === 'out_of_stock' ? 1 : 0),
    低库存商品: acc.低库存商品 + (row.stock_status === 'low_stock' ? 1 : 0),
    滞销商品: acc.滞销商品 + (row.stock_status === 'slow_moving' ? 1 : 0),
    当前库存总量: acc.当前库存总量 + row.current_stock,
    近7天销量: acc.近7天销量 + row.sales_7d,
    近30天销量: acc.近30天销量 + row.sales_30d,
  }), {
    商品数: 0,
    缺货商品: 0,
    低库存商品: 0,
    滞销商品: 0,
    当前库存总量: 0,
    近7天销量: 0,
    近30天销量: 0,
  });

  return {
    summary,
    list: normalized,
    sort_by: sortBy,
    sort_order: sortOrder,
    last_updated_at: new Date().toISOString(),
  };
}

async function getSearchAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const searchTermsReady = await repo.isSearchTermsReady();
  if (!searchTermsReady) {
    return {
      summary: { 关键词数: 0 },
      list: [],
      analytics_downgraded: true,
      warnings: ['搜索词表未就绪，暂无法统计搜索关键词。'],
      date_from: dateFrom,
      date_to: dateTo,
      last_updated_at: new Date().toISOString(),
    };
  }
  const analyticsReady = await repo.isAnalyticsEventsReady();
  const list = await repo.selectSimpleSearchAnalysis(dateFrom, dateTo);
  return {
    summary: { 关键词数: list.length },
    list,
    analytics_downgraded: !analyticsReady,
    warnings: analyticsReady ? [] : ['搜索点击、加购、下单和销售额依赖 analytics_events 埋点，当前仅展示搜索词和无结果词。'],
    date_from: dateFrom,
    date_to: dateTo,
    last_updated_at: new Date().toISOString(),
  };
}

async function getTrafficAnalysis(query = {}) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  if (!(await repo.isAnalyticsEventsReady())) return emptyTrafficPayload(dateFrom, dateTo);
  let summaryRaw;
  let bounceRaw;
  let trendRaw;
  let funnelRaw;
  let topPagesRaw;
  let sourcesRaw;
  let devicesRaw;
  let lastUpdatedRaw;
  const filters = normalizeTrafficFilters(query);
  try {
    [summaryRaw, bounceRaw, trendRaw, funnelRaw, topPagesRaw, sourcesRaw, devicesRaw, lastUpdatedRaw] = await Promise.all([
      repo.selectTrafficSummary(dateFrom, dateTo, filters),
      repo.selectTrafficBounce(dateFrom, dateTo, filters),
      repo.selectTrafficTrend(dateFrom, dateTo, filters),
      repo.selectTrafficFunnel(dateFrom, dateTo, filters),
      repo.selectTrafficTopPages(dateFrom, dateTo, filters),
      repo.selectTrafficSources(dateFrom, dateTo, filters),
      repo.selectTrafficDevices(dateFrom, dateTo, filters),
      repo.selectTrafficLastUpdated(dateFrom, dateTo, filters),
    ]);
  } catch (error) {
    const code = String(error?.code || '');
    const msg = String(error?.message || '');
    const canDowngrade = code === 'ER_BAD_FIELD_ERROR'
      || code === 'ER_NO_SUCH_TABLE'
      || code === 'ER_PARSE_ERROR'
      || /unknown column|doesn't exist|no such table/i.test(msg);
    if (canDowngrade) {
      console.warn(`[admin-report] traffic analysis downgraded: ${code || 'UNKNOWN'} ${msg}`);
      return emptyTrafficPayload(dateFrom, dateTo);
    }
    throw error;
  }

  const sessions = Number(summaryRaw.sessions || 0);
  const paymentSuccess = Number(summaryRaw.payment_success_count || 0);
  const summary = {
    pv: Number(summaryRaw.pv || 0),
    uv: Number(summaryRaw.uv || 0),
    sessions,
    unique_ip_count: Number(summaryRaw.unique_ip_count || 0),
    online_visitors: Number(summaryRaw.online_visitors || 0),
    new_visitors: Number(summaryRaw.new_visitors || 0),
    returning_visitors: Number(summaryRaw.returning_visitors || 0),
    avg_duration_seconds: safeNumber(Number(summaryRaw.avg_duration_ms || 0) / 1000),
    bounce_rate: rate(Number(bounceRaw.bounce_sessions || 0), Number(bounceRaw.sessions || 0)),
    product_view_count: Number(summaryRaw.product_view_count || 0),
    product_click_count: Number(summaryRaw.product_click_count || 0),
    add_to_cart_count: Number(summaryRaw.add_to_cart_count || 0),
    checkout_start_count: Number(summaryRaw.checkout_start_count || 0),
    order_submit_count: Number(summaryRaw.order_submit_count || 0),
    payment_success_count: paymentSuccess,
    paid_amount: safeNumber(summaryRaw.paid_amount),
    conversion_rate: rate(paymentSuccess, sessions),
  };

  const trend = trendRaw.map((row) => ({
    date: String(row.date || ''),
    pv: Number(row.pv || 0),
    uv: Number(row.uv || 0),
    sessions: Number(row.sessions || 0),
    product_views: Number(row.product_views || 0),
    add_to_cart: Number(row.add_to_cart || 0),
    checkout_start: Number(row.checkout_start || 0),
    order_submit: Number(row.order_submit || 0),
    payment_success: Number(row.payment_success || 0),
    paid_amount: safeNumber(row.paid_amount),
  }));
  const topPages = topPagesRaw.map((row) => ({
    ...row,
    pv: Number(row.pv || 0),
    uv: Number(row.uv || 0),
    avg_duration_seconds: safeNumber(Number(row.avg_duration_ms || 0) / 1000),
    bounce_rate: safeNumber(row.bounce_rate),
    exit_count: Number(row.exit_count || 0),
    add_to_cart_count: Number(row.add_to_cart_count || 0),
    order_submit_count: Number(row.order_submit_count || 0),
    paid_amount: safeNumber(row.paid_amount),
  })).map(({ avg_duration_ms, ...row }) => row);
  const sources = sourcesRaw.map((row) => {
    const uv = Number(row.uv || 0);
    const payment = Number(row.payment_success_count || 0);
    return {
      ...row,
      pv: Number(row.pv || 0),
      uv,
      new_visitors: Number(row.new_visitors || 0),
      order_submit_count: Number(row.order_submit_count || 0),
      payment_success_count: payment,
      paid_amount: safeNumber(row.paid_amount),
      conversion_rate: rate(payment, uv),
    };
  });
  const devices = devicesRaw.map((row) => ({
    ...row,
    pv: Number(row.pv || 0),
    uv: Number(row.uv || 0),
    sessions: Number(row.sessions || 0),
    payment_success_count: Number(row.payment_success_count || 0),
    paid_amount: safeNumber(row.paid_amount),
  }));

  return {
    summary,
    trend,
    funnel: buildTrafficFunnel(funnelRaw),
    topPages,
    sources,
    devices,
    date_from: dateFrom,
    date_to: dateTo,
    last_updated_at: lastUpdatedRaw.last_updated_at || new Date().toISOString(),
  };
}

function buildCsv(headers, rows) {
  const BOM = '\uFEFF';
  const esc = (value) => {
    const s = String(value ?? '');
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const h = headers.map(esc).join(',');
  const body = rows.map((r) => r.map(esc).join(',')).join('\r\n');
  return `${BOM}${h}\r\n${body}`;
}

function buildCsvFromRecords(records, preferredKeys) {
  if (!records?.length) return buildCsv([], []);
  const availableKeys = records.reduce((set, record) => {
    Object.keys(record || {}).forEach((key) => set.add(key));
    return set;
  }, new Set());
  const keys = preferredKeys?.length
    ? preferredKeys.filter((key) => availableKeys.has(key))
    : Array.from(availableKeys);
  const preferPath = keys.includes('category_path');
  const exportKeys = preferPath
    ? keys.filter((k) => !['category_id', 'category_name', 'parent_category_id', 'parent_category_name'].includes(k))
    : keys;
  if (exportKeys.includes('section')) {
    const rest = exportKeys.filter((k) => k !== 'section');
    exportKeys.splice(0, exportKeys.length, 'section', ...rest);
  }
  return buildCsv(
    exportKeys.map(labelReportColumn),
    records.map((r) => exportKeys.map((k) => labelReportCellValue(k, r[k]))),
  );
}

function assertExportRows(rows, message) {
  if (!rows?.length) {
    throw new BusinessError(400, message);
  }
}

function pickRecordKeys(record, keys) {
  const out = {};
  keys.forEach((key) => {
    if (record[key] !== undefined && record[key] !== null) {
      out[key] = record[key];
    }
  });
  return out;
}

const ACTIVITY_EXPORT_BASE_KEYS = [
  'activity_title',
  'activity_type',
  'start_at',
  'end_at',
  'product_count',
];

async function assertReportCapability(definition) {
  if (!definition?.capability) return;
  const enabled = await siteCapabilitiesService.isCapabilityEnabled(definition.capability);
  if (!enabled) throw new BusinessError(403, '该报表对应功能已关闭');
}

function buildTrafficExportRows(data) {
  const rows = [];
  Object.entries(data.summary || {}).forEach(([key, value]) => {
    rows.push({
      section: '核心指标',
      metric: labelReportColumn(key),
      value: labelReportCellValue(key, value),
    });
  });
  const appendSection = (section, list) => {
    (list || []).forEach((row) => {
      rows.push({ section, ...row });
    });
  };
  appendSection('趋势', data.trend);
  appendSection('转化漏斗', data.funnel);
  appendSection('页面排行', data.topPages);
  appendSection('来源排行', data.sources);
  appendSection('设备排行', data.devices);
  return rows;
}

function hasTrafficExportData(data) {
  const summary = data.summary || {};
  const hasSummaryMetric = Object.values(summary).some((v) => Number(v) > 0);
  const hasTrend = (data.trend || []).some((row) => Number(row.pv || 0) > 0 || Number(row.uv || 0) > 0);
  const hasPages = (data.topPages || []).length > 0;
  return hasSummaryMetric || hasTrend || hasPages;
}

function normalizeExpensePayload(body = {}) {
  const expenseDate = String(body.expense_date || body.date || '').slice(0, 10);
  const amount = Number(body.amount);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) throw new BusinessError(400, '支出日期格式不正确');
  if (!Number.isFinite(amount) || amount < 0) throw new BusinessError(400, '支出金额必须大于等于 0');
  return {
    expense_date: expenseDate,
    category: String(body.category || 'other').trim() || 'other',
    amount: safeNumber(amount),
    title: String(body.title || '').trim().slice(0, 255),
    remark: String(body.remark || '').trim().slice(0, 500),
  };
}

async function listOperatingExpenses(query = {}) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const list = await repo.selectOperatingExpenses(dateFrom, dateTo, String(query.category || '').trim());
  const summary = {
    expense_amount: safeNumber(list.reduce((sum, row) => sum + Number(row.amount || 0), 0)),
    expense_count: list.length,
  };
  return { summary, list, date_from: dateFrom, date_to: dateTo };
}

function resolveAdminId(admin = {}) {
  return admin.id || admin.userId || null;
}

async function createOperatingExpense(body, admin = {}, req) {
  const payload = normalizeExpensePayload(body);
  const operatorId = resolveAdminId(admin);
  const created = await repo.insertOperatingExpense({
    id: generateId(),
    ...payload,
    operator_id: operatorId,
  });
  await writeAuditLog({
    req,
    operatorId,
    actionType: 'operating_expense.create',
    objectType: 'operating_expense',
    objectId: created.id,
    summary: `创建经营支出 ${created.title || created.id}`,
    after: created,
    result: 'success',
  });
  return created;
}

async function updateOperatingExpense(id, body, admin = {}, req) {
  const before = await repo.selectOperatingExpenseById(id);
  if (!before) throw new BusinessError(404, '经营支出记录不存在');
  const payload = normalizeExpensePayload(body);
  const updated = await repo.updateOperatingExpense(id, payload);
  await writeAuditLog({
    req,
    operatorId: resolveAdminId(admin),
    actionType: 'operating_expense.update',
    objectType: 'operating_expense',
    objectId: id,
    summary: `更新经营支出 ${updated.title || id}`,
    before,
    after: updated,
    result: 'success',
  });
  return updated;
}

async function deleteOperatingExpense(id, admin = {}, req) {
  const before = await repo.selectOperatingExpenseById(id);
  if (!before) throw new BusinessError(404, '经营支出记录不存在');
  await repo.deleteOperatingExpense(id);
  await writeAuditLog({
    req,
    operatorId: resolveAdminId(admin),
    actionType: 'operating_expense.delete',
    objectType: 'operating_expense',
    objectId: id,
    summary: `删除经营支出 ${before.title || id}`,
    before,
    result: 'success',
  });
  return { ok: true };
}

async function exportByType(type, query) {
  const definition = getReportDefinition(type);
  if (!definition) throw new BusinessError(400, `不支持的报表类型: ${type}`);
  await assertReportCapability(definition);

  if (type === 'traffic_analysis') {
    if (!(await repo.isAnalyticsEventsReady())) {
      throw new BusinessError(400, '流量分析埋点未就绪，暂无法导出');
    }
    const data = await getTrafficAnalysis(query);
    if (!hasTrafficExportData(data)) {
      throw new BusinessError(400, '所选时间范围内暂无流量数据，无法导出');
    }
    const rows = buildTrafficExportRows(data);
    assertExportRows(rows, '流量分析暂无可导出数据');
    const csv = buildCsvFromRecords(rows);
    return { csv, filename: `traffic-analysis-${data.date_from}-${data.date_to}.csv` };
  }

  if (type === 'search_analysis' && !(await repo.isSearchTermsReady())) {
    throw new BusinessError(400, '搜索词表未就绪，暂无法导出搜索分析');
  }

  const handlers = {
    getSalesDaily,
    getSalesMonthly,
    getProfitDaily,
    getProfitMonthly,
    listOperatingExpenses,
    getProductsAnalysis,
    getCategoriesAnalysis,
    getInventoryAnalysis,
    getOrdersAnalysis,
    getCustomersAnalysis,
    getActivitiesAnalysis,
    getCouponsAnalysis,
    getSearchAnalysis,
  };
  const handler = handlers[definition.serviceHandler];
  if (!handler) throw new BusinessError(400, `导出类型未绑定处理器: ${type}`);
  const data = await handler(query);

  let rows = Array.isArray(data.list) ? data.list : [];
  if (type === 'customer_analysis' && rows.length === 0 && data.summary && Object.keys(data.summary).length > 0) {
    rows = [data.summary];
  }
  if (type === 'activity_analysis' && data.sales_tracking_available === false) {
    rows = rows.map((row) => pickRecordKeys(row, definition.degradedCsvColumns || ACTIVITY_EXPORT_BASE_KEYS));
  }
  assertExportRows(rows, `${definition.filenamePrefix} 在所选范围内暂无可导出数据`);
  const columns = type === 'activity_analysis' && data.sales_tracking_available === false
    ? definition.degradedCsvColumns
    : definition.csvColumns;
  const csv = buildCsvFromRecords(rows, columns);
  const dateRange = data.date_from && data.date_to ? `-${data.date_from}-${data.date_to}` : '';
  return { csv, filename: `${definition.filenamePrefix}${dateRange}.csv` };
}

module.exports = {
  getOverview,
  getSalesDaily,
  getSalesMonthly,
  getProfitDaily,
  getProfitMonthly,
  getProductsAnalysis,
  getCategoriesAnalysis,
  getOrdersAnalysis,
  getCustomersAnalysis,
  getActivitiesAnalysis,
  getCouponsAnalysis,
  getInventoryAnalysis,
  getSearchAnalysis,
  getTrafficAnalysis,
  listOperatingExpenses,
  createOperatingExpense,
  updateOperatingExpense,
  deleteOperatingExpense,
  exportByType,
};






