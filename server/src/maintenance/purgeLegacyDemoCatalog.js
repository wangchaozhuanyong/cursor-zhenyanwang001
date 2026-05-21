/**
 * 移除历史「演示 / Unsplash 占位」商品与空演示分类，不影响真实订单关联商品。
 */
const DEMO_KW = "[demo-seed-product]";

/** @returns {{ sql: string, params: string[] }} */
function demoProductMatchClause(alias = "p") {
  const a = alias;
  return {
    sql: `(
      ${a}.search_keywords = ?
      OR ${a}.name LIKE '演示·%'
      OR ${a}.cover_image LIKE '%images.unsplash.com%'
      OR ${a}.images LIKE '%images.unsplash.com%'
      OR (${a}.description LIKE ? AND ${a}.description LIKE '%可安全删除%')
    )`,
    params: [DEMO_KW, `%${DEMO_KW}%`],
  };
}

async function selectDemoProductIds(db) {
  const { sql, params } = demoProductMatchClause("p");
  const [rows] = await db.query(`SELECT id FROM products p WHERE ${sql}`, params);
  return rows.map((r) => r.id);
}

async function runDeletes(db, sql, ids, dryRun) {
  if (!ids.length) return 0;
  if (dryRun) return ids.length;
  const ph = ids.map(() => "?").join(",");
  const [result] = await db.query(sql.replace("__IDS__", ph), ids);
  return result.affectedRows ?? 0;
}

/**
 * @param {import('mysql2/promise').Pool | import('mysql2/promise').PoolConnection} db
 * @param {{ dryRun?: boolean }} [options]
 */
async function purgeLegacyDemoCatalog(db, options = {}) {
  const dryRun = options.dryRun === true;
  const ids = await selectDemoProductIds(db);
  if (!ids.length) {
    return { matched: 0, softDeleted: 0, hardDeleted: 0, demoCategoryHidden: 0 };
  }

  const childDeletes = [
    "DELETE FROM cart_items WHERE product_id IN (__IDS__)",
    "DELETE FROM favorites WHERE product_id IN (__IDS__)",
    "DELETE FROM browsing_history WHERE product_id IN (__IDS__)",
    "DELETE FROM product_spec_values WHERE product_id IN (__IDS__)",
    "DELETE FROM product_spec_groups WHERE product_id IN (__IDS__)",
    "DELETE FROM product_variants WHERE product_id IN (__IDS__)",
  ];

  for (const sql of childDeletes) {
    await runDeletes(db, sql, ids, dryRun);
  }

  if (!dryRun) {
    const ph = ids.map(() => "?").join(",");
    await db.query(
      `UPDATE products
         SET deleted_at = COALESCE(deleted_at, NOW()),
             lifecycle_status = 0,
             status = 'inactive',
             is_hot = 0,
             is_new = 0,
             is_recommended = 0
       WHERE id IN (${ph})`,
      ids,
    );
  }

  const [orderRows] = await db.query(
    `SELECT DISTINCT product_id AS id FROM order_items WHERE product_id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  const linked = new Set(orderRows.map((r) => r.id));
  const hardIds = ids.filter((id) => !linked.has(id));

  let hardDeleted = 0;
  if (hardIds.length && !dryRun) {
    const ph = hardIds.map(() => "?").join(",");
    await db.query(`DELETE FROM product_variants WHERE product_id IN (${ph})`, hardIds);
    await db.query(`DELETE FROM product_spec_values WHERE product_id IN (${ph})`, hardIds);
    await db.query(`DELETE FROM product_spec_groups WHERE product_id IN (${ph})`, hardIds);
    const [result] = await db.query(`DELETE FROM products WHERE id IN (${ph})`, hardIds);
    hardDeleted = result.affectedRows ?? 0;
  } else if (hardIds.length && dryRun) {
    hardDeleted = hardIds.length;
  }

  let demoCategoryHidden = 0;
  if (!dryRun) {
    const [catResult] = await db.query(
      `UPDATE categories c
          SET c.deleted_at = COALESCE(c.deleted_at, NOW()),
              c.is_visible = 0,
              c.is_active = 0
        WHERE c.name = '演示分类'
          AND c.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM products p
             WHERE p.category_id = c.id AND p.deleted_at IS NULL
          )`,
    );
    demoCategoryHidden = catResult.affectedRows ?? 0;
  }

  return {
    matched: ids.length,
    softDeleted: dryRun ? ids.length : ids.length,
    hardDeleted,
    demoCategoryHidden,
    keptForOrders: linked.size,
  };
}

module.exports = {
  DEMO_KW,
  demoProductMatchClause,
  purgeLegacyDemoCatalog,
};
