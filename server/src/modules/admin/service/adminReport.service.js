const repo = require('../repository/adminReport.repository');
const { labelReportColumn, labelReportCellValue } = require('../../../utils/reportColumnLabels');

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
    date_from: dateFrom,
    date_to: dateTo,
    last_updated_at: new Date().toISOString(),
  };
}

async function getOverview(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
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
      今日销售额: gross,
      今日净销售额: net,
      今日支付订单数: paidOrders,
      今日客单价: paidOrders > 0 ? safeNumber(gross / paidOrders) : 0,
      今日退款金额: refund,
      今日优惠金额: safeNumber(summaryRaw.discount_amount),
      待处理订单: Number(summaryRaw.pending_orders || 0),
      商品浏览次数: Number(behaviorRaw.product_view_count || 0),
      商品点击次数: Number(behaviorRaw.product_click_count || 0),
      加购次数: Number(behaviorRaw.add_to_cart_count || 0),
      收藏次数: Number(behaviorRaw.favorite_count || 0),
      发起结算次数: Number(behaviorRaw.checkout_start_count || 0),
    },
    topHotProducts: hot,
    topSlowProducts: slow,
    date_from: dateFrom,
    date_to: dateTo,
    last_updated_at: new Date().toISOString(),
  };
}

async function getSalesDaily(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const list = await repo.selectSalesDaily(dateFrom, dateTo);
  const normalized = list.map((r) => {
    const paid = Number(r.paid_order_count || 0);
    const orderCount = Number(r.order_count || 0);
    const items = Number(r.items_sold || 0);
    const grossSales = safeNumber(r.gross_sales);
    const refundAmount = safeNumber(r.refund_amount);
    const paymentRate = orderCount > 0 ? safeNumber((paid / orderCount) * 100) : 0;
    const refundRate = paid > 0 ? safeNumber((Number(r.refund_order_count || 0) / paid) * 100) : 0;
    return {
      ...r,
      gross_sales: grossSales,
      refund_amount: refundAmount,
      net_sales: safeNumber(grossSales - refundAmount),
      average_order_value: paid > 0 ? safeNumber(grossSales / paid) : 0,
      units_per_order: paid > 0 ? safeNumber(items / paid) : 0,
      payment_rate: paymentRate,
      refund_rate: refundRate,
    };
  });
  const summary = normalized.reduce((acc, row) => ({
    gross_sales: safeNumber(acc.gross_sales + Number(row.gross_sales || 0)),
    net_sales: safeNumber(acc.net_sales + Number(row.net_sales || 0)),
    paid_order_count: acc.paid_order_count + Number(row.paid_order_count || 0),
    order_count: acc.order_count + Number(row.order_count || 0),
    refund_amount: safeNumber(acc.refund_amount + Number(row.refund_amount || 0)),
    discount_amount: safeNumber(acc.discount_amount + Number(row.discount_amount || 0)),
  }), { gross_sales: 0, net_sales: 0, paid_order_count: 0, order_count: 0, refund_amount: 0, discount_amount: 0 });
  return { summary, list: normalized, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getSalesMonthly(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const list = await repo.selectSalesMonthly(dateFrom, dateTo);
  let prev = null;
  const normalized = list.map((r) => {
    const gross = safeNumber(r.gross_sales);
    const paid = Number(r.paid_order_count || 0);
    const mom = prev ? (prev > 0 ? safeNumber(((gross - prev) / prev) * 100) : 0) : 0;
    prev = gross;
    return {
      ...r,
      gross_sales: gross,
      net_sales: safeNumber(r.net_sales),
      average_order_value: paid > 0 ? safeNumber(gross / paid) : 0,
      refund_rate: gross > 0 ? safeNumber((Number(r.refund_amount || 0) / gross) * 100) : 0,
      mom_growth_rate: mom,
    };
  });
  return { summary: { 月份数: normalized.length }, list: normalized, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getProductsAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const list = await repo.selectProductsAnalysis(dateFrom, dateTo);
  return { summary: { 商品数: list.length }, list, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getCategoriesAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const list = await repo.selectSimpleCategoryAnalysis(dateFrom, dateTo);
  return { summary: { 分类数: list.length }, list, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getOrdersAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const summary = await repo.selectSimpleOrderAnalysis(dateFrom, dateTo);
  return { summary, list: [], date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getCustomersAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const summary = await repo.selectSimpleCustomerAnalysis(dateFrom, dateTo);
  return { summary, list: [], date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getActivitiesAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const list = await repo.selectSimpleActivitiesAnalysis(dateFrom, dateTo);
  return { summary: { 活动数: list.length }, list, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getCouponsAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const list = await repo.selectSimpleCouponsAnalysis(dateFrom, dateTo);
  const normalized = list.map((r) => {
    const issued = Number(r.issued_count || 0);
    const claimed = Number(r.claimed_count || 0);
    const used = Number(r.used_count || 0);
    return {
      ...r,
      claim_rate: issued > 0 ? safeNumber((claimed / issued) * 100) : 0,
      use_rate: claimed > 0 ? safeNumber((used / claimed) * 100) : 0,
      roi: 0,
    };
  });
  return { summary: { 优惠券数: normalized.length }, list: normalized, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getInventoryAnalysis(_query = {}) {
  const list = await repo.selectSimpleInventoryAnalysis();
  return { summary: { 商品数: list.length }, list, last_updated_at: new Date().toISOString() };
}

async function getSearchAnalysis(query) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  const list = await repo.selectSimpleSearchAnalysis(dateFrom, dateTo);
  return { summary: { 关键词数: list.length }, list, date_from: dateFrom, date_to: dateTo, last_updated_at: new Date().toISOString() };
}

async function getTrafficAnalysis(query = {}) {
  const { dateFrom, dateTo } = resolveDateRange(query);
  if (!(await repo.isAnalyticsEventsReady())) return emptyTrafficPayload(dateFrom, dateTo);

  const filters = normalizeTrafficFilters(query);
  const [summaryRaw, bounceRaw, trendRaw, funnelRaw, topPagesRaw, sourcesRaw, devicesRaw, lastUpdatedRaw] = await Promise.all([
    repo.selectTrafficSummary(dateFrom, dateTo, filters),
    repo.selectTrafficBounce(dateFrom, dateTo, filters),
    repo.selectTrafficTrend(dateFrom, dateTo, filters),
    repo.selectTrafficFunnel(dateFrom, dateTo, filters),
    repo.selectTrafficTopPages(dateFrom, dateTo, filters),
    repo.selectTrafficSources(dateFrom, dateTo, filters),
    repo.selectTrafficDevices(dateFrom, dateTo, filters),
    repo.selectTrafficLastUpdated(dateFrom, dateTo, filters),
  ]);

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

function buildCsvFromRecords(records) {
  if (!records?.length) return buildCsv([], []);
  const keys = Array.from(records.reduce((set, record) => {
    Object.keys(record || {}).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  const preferPath = keys.includes('category_path');
  const exportKeys = preferPath
    ? keys.filter((k) => !['category_id', 'category_name', 'parent_category_id', 'parent_category_name'].includes(k))
    : keys;
  return buildCsv(
    exportKeys.map(labelReportColumn),
    records.map((r) => exportKeys.map((k) => labelReportCellValue(k, r[k]))),
  );
}

async function exportByType(type, query) {
  if (type === 'sales_daily') {
    const data = await getSalesDaily(query);
    const csv = buildCsvFromRecords(data.list);
    return { csv, filename: `sales-daily-${data.date_from}-${data.date_to}.csv` };
  }
  if (type === 'sales_monthly') {
    const data = await getSalesMonthly(query);
    const csv = buildCsvFromRecords(data.list);
    return { csv, filename: `sales-monthly-${data.date_from}-${data.date_to}.csv` };
  }
  if (type === 'product_analysis') {
    const data = await getProductsAnalysis(query);
    const csv = buildCsvFromRecords(data.list);
    return { csv, filename: `product-analysis-${data.date_from}-${data.date_to}.csv` };
  }
  if (type === 'category_analysis') {
    const data = await getCategoriesAnalysis(query);
    const csv = buildCsvFromRecords(data.list);
    return { csv, filename: `category-analysis-${data.date_from}-${data.date_to}.csv` };
  }
  if (type === 'order_analysis') {
    const data = await getOrdersAnalysis(query);
    const csv = buildCsvFromRecords([data.summary || {}]);
    return { csv, filename: `order-analysis-${data.date_from}-${data.date_to}.csv` };
  }
  if (type === 'customer_analysis') {
    const data = await getCustomersAnalysis(query);
    const csv = buildCsvFromRecords([data.summary || {}]);
    return { csv, filename: `customer-analysis-${data.date_from}-${data.date_to}.csv` };
  }
  if (type === 'activity_analysis') {
    const data = await getActivitiesAnalysis(query);
    const csv = buildCsvFromRecords(data.list);
    return { csv, filename: `activity-analysis-${data.date_from}-${data.date_to}.csv` };
  }
  if (type === 'coupon_analysis') {
    const data = await getCouponsAnalysis(query);
    const csv = buildCsvFromRecords(data.list);
    return { csv, filename: `coupon-analysis-${data.date_from}-${data.date_to}.csv` };
  }
  if (type === 'inventory_analysis') {
    const data = await getInventoryAnalysis(query);
    const csv = buildCsvFromRecords(data.list);
    return { csv, filename: `inventory-analysis.csv` };
  }
  if (type === 'search_analysis') {
    const data = await getSearchAnalysis(query);
    const csv = buildCsvFromRecords(data.list);
    return { csv, filename: `search-analysis-${data.date_from}-${data.date_to}.csv` };
  }
  if (type === 'traffic_analysis') {
    const data = await getTrafficAnalysis(query);
    const rows = [
      ...Object.entries(data.summary || {}).map(([key, value]) => ({ type: '核心指标', name: labelReportColumn(key), value })),
      ...data.trend.map((row) => ({ type: '趋势数据', ...row })),
      ...data.funnel.map((row) => ({ type: '转化漏斗', ...row })),
      ...data.topPages.map((row) => ({ type: '页面排行', ...row })),
      ...data.sources.map((row) => ({ type: '来源排行', ...row })),
      ...data.devices.map((row) => ({ type: '设备排行', ...row })),
    ];
    const csv = buildCsvFromRecords(rows);
    return { csv, filename: `traffic-analysis-${data.date_from}-${data.date_to}.csv` };
  }
  throw new Error(`不支持的报表类型: ${type}`);
}

module.exports = {
  getOverview,
  getSalesDaily,
  getSalesMonthly,
  getProductsAnalysis,
  getCategoriesAnalysis,
  getOrdersAnalysis,
  getCustomersAnalysis,
  getActivitiesAnalysis,
  getCouponsAnalysis,
  getInventoryAnalysis,
  getSearchAnalysis,
  getTrafficAnalysis,
  exportByType,
};







