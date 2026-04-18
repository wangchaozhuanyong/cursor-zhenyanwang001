const repo = require('./adminDashboard.repository');

async function getStats() {
  const [
    totalOrders,
    totalUsers,
    totalProducts,
    totalRevenue,
    todayOrders,
    pendingOrders,
    todayRevenue,
    todayNewUsers,
    salesTrendRaw,
    weeklyOrders,
    categoryData,
    recentOrders,
  ] = await Promise.all([
    repo.countOrdersExcludingCancelled(),
    repo.countUsers(),
    repo.countProducts(),
    repo.sumCompletedRevenue(),
    repo.countTodayOrders(),
    repo.countPendingOrders(),
    repo.sumTodayRevenue(),
    repo.countTodayNewUsers(),
    repo.selectSalesTrend7d(),
    repo.selectWeeklyOrdersBreakdown(),
    repo.selectCategoryProductCounts(),
    repo.selectRecentOrders(5),
  ]);

  const salesTrend = salesTrendRaw.map((r) => ({
    ...r,
    sales: parseFloat(r.sales),
    date: String(r.date).slice(5),
  }));

  return {
    totalOrders,
    totalUsers,
    totalProducts,
    totalRevenue: parseFloat(totalRevenue),
    todayOrders,
    pendingOrders,
    todayRevenue: parseFloat(todayRevenue),
    todayNewUsers,
    salesTrend,
    weeklyOrders,
    categoryData,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      order_no: o.order_no,
      contact_name: o.contact_name || '—',
      total_amount: parseFloat(o.total_amount),
      status: o.status,
      created_at: o.created_at,
    })),
  };
}

async function getChart() {
  const rows = await repo.selectChart30d();
  rows.forEach((r) => {
    r.revenue = parseFloat(r.revenue);
  });
  return rows;
}

module.exports = { getStats, getChart };
