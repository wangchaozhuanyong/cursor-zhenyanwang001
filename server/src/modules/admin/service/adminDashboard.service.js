const repo = require('../repository/adminDashboard.repository');

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

  const salesTrend = salesTrendRaw.map((r) => {
    const d = r.date;
    let label = '';
    if (d instanceof Date) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      label = `${m}-${day}`;
    } else if (d != null) {
      const s = String(d);
      label = s.length >= 10 ? s.slice(5, 10) : s;
    }
    return {
      ...r,
      sales: parseFloat(r.sales),
      date: label,
    };
  });

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
      contact_name: o.contact_name || '-',
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







