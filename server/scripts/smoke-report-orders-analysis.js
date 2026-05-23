/**
 * 订单分析报表冒烟（直连 service + 生产库，需在 server 目录执行）
 *   node scripts/smoke-report-orders-analysis.js [date_from] [date_to]
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const svc = require("../src/modules/admin/service/adminReport.service.js");

const dateFrom = process.argv[2] || "2025-04-01";
const dateTo = process.argv[3] || new Date().toISOString().slice(0, 10);

async function main() {
  const data = await svc.getOrdersAnalysis({ date_from: dateFrom, date_to: dateTo });
  const list = data.list || [];
  console.log(
    JSON.stringify(
      {
        ok: true,
        date_from: data.date_from,
        date_to: data.date_to,
        listLen: list.length,
        summary: data.summary,
        firstRow: list[0] || null,
        lastRow: list[list.length - 1] || null,
      },
      null,
      2,
    ),
  );
  if (!list.length) process.exit(2);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
