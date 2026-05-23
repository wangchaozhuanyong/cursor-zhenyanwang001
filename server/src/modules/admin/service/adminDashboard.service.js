const repo = require('../repository/adminDashboard.repository');
const {
  resolveKLDateRange,
  fillDailySeries,
  formatChartLabel,
  klDateString,
} = require('../../../utils/klDateRange');

function canViewOrders(user) {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return Array.isArray(user.permissions) && user.permissions.includes('order.view');
}

function parseNum(v, digits = 2) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
}

function buildSalesTrend(rows, dateFrom, dateTo) {
  return fillDailySeries(
    rows,
    dateFrom,
    dateTo,
    (r) => {
      const paid = Number(r.paid_order_count || 0);
      const sales = parseNum(r.sales);
      return {
        date: formatChartLabel(r.date instanceof Date ? klDateString(r.date) : r.date),
        sales,
        order_count: Number(r.order_count || 0),
        paid_order_count: paid,
        refund_amount: parseNum(r.refund_amount),
        avg_order_value: paid > 0 ? parseNum(sales / paid) : 0,
      };
    },
    (d) => ({
      date: formatChartLabel(d),
      sales: 0,
      order_count: 0,
      paid_order_count: 0,
      refund_amount: 0,
      avg_order_value: 0,
    }),
  );
}

function buildCategorySalesShare(rows) {
  const total = rows.reduce((s, r) => s + parseNum(r.sales_amount), 0);
  return rows.map((r) => ({
    name: r.name,
    value: parseNum(r.sales_amount),
    sales_qty: Number(r.sales_qty || 0),
    share_percent: total > 0 ? parseNum((parseNum(r.sales_amount) / total) * 100, 1) : 0,
  }));
}

async function settleDashboardQuery(label, fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    console.error(`[dashboard] ${label} failed:`, error?.message || error);
    return fallback;
  }
}

async function getStats(query = {}, user = {}) {
  const { dateFrom, dateTo, preset } = resolveKLDateRange(query);
  const viewOrders = canViewOrders(user);

  const emptyToday = {
    todayRevenue: 0,
    todayPaidOrders: 0,
    todayOrders: 0,
    todayNewUsers: 0,
    pendingPayment: 0,
    pendingShip: 0,
    pendingAfterSale: 0,
    lowStock: 0,
    outOfStock: 0,
  };
  const emptyTodos = {
    pendingShip: 0,
    afterSale: 0,
    paymentFailed: 0,
    lowStock: 0,
    outOfStock: 0,
  };

  const [
    totalOrders,
    totalUsers,
    totalProducts,
    totalRevenue,
    todayRaw,
    todosRaw,
    salesTrendRaw,
    categoryRaw,
    topHot,
    topSlow,
    lowStockProducts,
    analyticsRaw,
    recentOrdersRaw,
  ] = await Promise.all([
    settleDashboardQuery('countOrders', () => repo.countOrdersExcludingCancelled(), 0),
    settleDashboardQuery('countUsers', () => repo.countUsers(), 0),
    settleDashboardQuery('countProducts', () => repo.countProducts(), 0),
    settleDashboardQuery('sumRevenue', () => repo.sumCompletedRevenue(), 0),
    settleDashboardQuery('rangeSummary', () => repo.selectTodaySummary(dateFrom, dateTo), emptyToday),
    settleDashboardQuery('todos', () => repo.selectTodos(), emptyTodos),
    settleDashboardQuery('salesTrend', () => repo.selectSalesTrend(dateFrom, dateTo), []),
    settleDashboardQuery('categoryShare', () => repo.selectCategorySalesShare(dateFrom, dateTo), []),
    settleDashboardQuery('topProducts', () => repo.selectTopProducts(dateFrom, dateTo, false, 10), []),
    settleDashboardQuery('slowProducts', () => repo.selectTopProducts(dateFrom, dateTo, true, 10), []),
    settleDashboardQuery('lowStockProducts', () => repo.selectLowStockProducts(10), []),
    settleDashboardQuery('analytics', () => repo.selectAnalyticsMonitor(dateFrom, dateTo), {}),
    viewOrders
      ? settleDashboardQuery('recentOrders', () => repo.selectRecentOrders(5), [])
      : Promise.resolve([]),
  ]);

  const installClicked = Number(analyticsRaw.pwa_install_button_clicked || 0);
  const installDone = Number(analyticsRaw.pwa_installed || 0);
  const installConversionRate = installClicked > 0
    ? parseNum((installDone / installClicked) * 100, 1)
    : 0;

  const customerServiceClicks = Number(analyticsRaw.contact_whatsapp_click || 0)
    + Number(analyticsRaw.support_channel_click || 0);

  return {
    range: { preset, dateFrom, dateTo, timezone: 'Asia/Kuala_Lumpur' },
    canViewOrders: viewOrders,
    totalOrders,
    totalUsers,
    totalProducts,
    totalRevenue: parseNum(totalRevenue),
    today: {
      revenue: parseNum(todayRaw.todayRevenue),
      paidOrders: Number(todayRaw.todayPaidOrders || 0),
      orderCount: Number(todayRaw.todayOrders || 0),
      newUsers: Number(todayRaw.todayNewUsers || 0),
      pendingPayment: Number(todayRaw.pendingPayment || 0),
      pendingShip: Number(todayRaw.pendingShip || 0),
      pendingAfterSale: Number(todayRaw.pendingAfterSale || 0),
      lowStock: Number(todayRaw.lowStock || 0),
      outOfStock: Number(todayRaw.outOfStock || 0),
    },
    todos: {
      pendingShip: Number(todosRaw.pendingShip || 0),
      afterSale: Number(todosRaw.afterSale || 0),
      paymentFailed: Number(todosRaw.paymentFailed || 0),
      lowStock: Number(todosRaw.lowStock || 0),
      outOfStock: Number(todosRaw.outOfStock || 0),
    },
    salesTrend: buildSalesTrend(salesTrendRaw, dateFrom, dateTo),
    categorySalesShare: buildCategorySalesShare(categoryRaw),
    topProducts: topHot.map((p) => ({
      product_id: p.product_id,
      product_name: p.product_name,
      sales_qty: Number(p.sales_qty || 0),
      sales_amount: parseNum(p.sales_amount),
      current_stock: Number(p.current_stock || 0),
    })),
    slowProducts: topSlow.map((p) => ({
      product_id: p.product_id,
      product_name: p.product_name,
      sales_qty: Number(p.sales_qty || 0),
      sales_amount: parseNum(p.sales_amount),
      current_stock: Number(p.current_stock || 0),
    })),
    lowStockProducts: lowStockProducts.map((p) => ({
      product_id: p.product_id,
      product_name: p.product_name,
      current_stock: Number(p.current_stock || 0),
      warning_stock: Number(p.warning_stock || 0),
    })),
    analytics: {
      customerServiceClicks,
      qrViews: Number(analyticsRaw.support_qr_view || 0),
      androidDownloadClicks: Number(analyticsRaw.android_download_click || 0),
      iosSafariGuide: Number(analyticsRaw.pwa_ios_guide_shown || 0),
      pwaInstallPrompt: Number(analyticsRaw.pwa_install_button_shown || 0),
      pwaOpen: Number(analyticsRaw.pwa_open_standalone || 0),
      installConversionRate,
      pwaDownloadPageViews: Number(analyticsRaw.pwa_download_page_view || 0),
      pwaInstalled: installDone,
    },
    recentOrders: viewOrders
      ? recentOrdersRaw.map((o) => ({
        id: o.id,
        order_no: o.order_no,
        contact_name: o.contact_name || '-',
        total_amount: parseNum(o.total_amount),
        status: o.status,
        created_at: o.created_at,
      }))
      : [],
    /** @deprecated kept for backward compatibility */
    todayOrders: Number(todayRaw.todayOrders || 0),
    todayRevenue: parseNum(todayRaw.todayRevenue),
    todayNewUsers: Number(todayRaw.todayNewUsers || 0),
    pendingOrders: Number(todayRaw.pendingShip || 0),
    categoryData: buildCategorySalesShare(categoryRaw).map((c) => ({
      name: c.name,
      value: c.value,
    })),
    weeklyOrders: [],
  };
}

module.exports = { getStats, canViewOrders };
