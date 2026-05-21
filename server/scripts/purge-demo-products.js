/**
 * 清理历史演示商品（腕表/香水/耳机等 Unsplash 占位图），前台将不再展示。
 *
 * 用法（server 目录）:
 *   npm run purge:demo-products
 *   DRY_RUN=1 npm run purge:demo-products
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const db = require("../src/config/db");
const { purgeLegacyDemoCatalog } = require("../src/maintenance/purgeLegacyDemoCatalog");

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  if (dryRun) console.log("[DRY_RUN] 仅统计，不写库\n");

  const stats = await purgeLegacyDemoCatalog(db, { dryRun });
  console.log("匹配演示/占位商品:", stats.matched);
  console.log("已下架（含原本在回收站）:", stats.softDeleted);
  console.log("已物理删除（无订单引用）:", stats.hardDeleted);
  if (stats.keptForOrders) console.log("因存在订单明细保留记录:", stats.keptForOrders);
  if (stats.demoCategoryHidden) console.log("已隐藏空「演示分类」:", stats.demoCategoryHidden);
  if (!stats.matched) console.log("未发现需清理的演示商品。");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
