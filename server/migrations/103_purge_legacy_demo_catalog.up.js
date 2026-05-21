/**
 * 部署迁移：移除 seed-demo-products 写入的腕表/香水/耳机等演示商品与 Unsplash 外链图。
 */
const { purgeLegacyDemoCatalog } = require("../src/maintenance/purgeLegacyDemoCatalog");

module.exports = {
  async up(query) {
    const db = { query };
    await purgeLegacyDemoCatalog(db, { dryRun: false });
  },
};
