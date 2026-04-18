const repo = require('./adminReport.repository');

function parseRangeDays(range) {
  const r = range || 'week';
  if (r === 'month') return 30;
  if (r === 'quarter') return 90;
  if (r === 'year') return 365;
  return 7;
}

async function getSalesReport(query) {
  const days = parseRangeDays(query.range);
  const rows = await repo.selectSalesChart(days);
  rows.forEach((r) => {
    r.revenue = parseFloat(r.revenue);
  });
  const totalRevenue = parseFloat(await repo.sumRevenueInRange(days));
  const totalOrders = await repo.countPaidOrdersInRange(days);
  return { chart: rows, totalRevenue, totalOrders };
}

async function getUserReport(query) {
  const days = parseRangeDays(query.range);
  const chart = await repo.selectUserRegistrationsByDay(days);
  const totalUsers = await repo.countAllUsers();
  return { chart, totalUsers };
}

async function getProductReport() {
  const topProducts = await repo.selectTopProductsSold();
  topProducts.forEach((r) => {
    r.totalRevenue = parseFloat(r.totalRevenue);
  });
  return { topProducts };
}

// ─── CSV 导出 ───

const BOM = '\uFEFF';

function escapeCsvCell(value) {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(headers, rows) {
  const h = headers.map(escapeCsvCell).join(',');
  const body = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
  return `${BOM}${h}\r\n${body}`;
}

async function exportSalesReportCsv(query) {
  const days = parseRangeDays(query.range);
  const rows = await repo.selectSalesChart(days);
  const totalRevenue = parseFloat(await repo.sumRevenueInRange(days));
  const totalOrders = await repo.countPaidOrdersInRange(days);
  const dataRows = rows.map((r) => [r.date, r.orders, parseFloat(r.revenue).toFixed(2)]);
  dataRows.push(['合计', totalOrders, totalRevenue.toFixed(2)]);
  const csv = buildCsv(['日期', '订单数', '销售额(RM)'], dataRows);
  const filename = `sales-report-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

async function exportUserReportCsv(query) {
  const days = parseRangeDays(query.range);
  const chart = await repo.selectUserRegistrationsByDay(days);
  const totalUsers = await repo.countAllUsers();
  const dataRows = chart.map((r) => [r.date, r.newUsers]);
  dataRows.push(['总用户数', totalUsers]);
  const csv = buildCsv(['日期', '新增用户'], dataRows);
  const filename = `users-report-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

async function exportProductReportCsv() {
  const topProducts = await repo.selectTopProductsSold();
  const dataRows = topProducts.map((r) => [r.name, r.totalSold, parseFloat(r.totalRevenue).toFixed(2)]);
  const csv = buildCsv(['商品名称', '销量', '销售额(RM)'], dataRows);
  const filename = `top-products-report-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

module.exports = {
  getSalesReport,
  getUserReport,
  getProductReport,
  exportSalesReportCsv,
  exportUserReportCsv,
  exportProductReportCsv,
};
