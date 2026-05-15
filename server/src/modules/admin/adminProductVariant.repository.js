const db = require('../../config/db');
const { BusinessError } = require('../../errors/BusinessError');

async function selectVariantsByProductId(productId, opts = {}) {
  const includeDeleted = !!opts.includeDeleted;
  const [rows] = await db.query(
    `SELECT id, product_id, sku_code, title, price, stock, sort_order, is_default, stock_warning_threshold,
            reserved_stock, cost_price, barcode, deleted_at, created_at, updated_at
     FROM product_variants
     WHERE product_id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
     ORDER BY is_default DESC, sort_order ASC, created_at ASC`,
    [productId],
  );
  return rows;
}

async function softDeleteVariantsByIds(conn, productId, ids) {
  if (!ids.length) return;
  const [guardRows] = await conn.query(
    `SELECT
       v.id,
       v.title,
       v.sku_code,
       v.stock,
       EXISTS(SELECT 1 FROM order_items oi WHERE oi.variant_id = v.id LIMIT 1) AS has_orders,
       EXISTS(SELECT 1 FROM inventory_stock_records sr WHERE sr.variant_id = v.id LIMIT 1) AS has_records
     FROM product_variants v
     WHERE v.product_id = ? AND v.id IN (${ids.map(() => '?').join(',')})
     FOR UPDATE`,
    [productId, ...ids],
  );
  const blocked = guardRows.find((row) =>
    Number(row.stock || 0) > 0 || Number(row.has_orders || 0) > 0 || Number(row.has_records || 0) > 0);
  if (blocked) {
    const skuLabel = blocked.title || blocked.sku_code || blocked.id;
    throw new BusinessError(400, `规格「${skuLabel}」存在库存/订单/库存流水记录，禁止删除`);
  }
  await conn.query(
    `UPDATE product_variants
     SET deleted_at = NOW(), is_default = 0
     WHERE product_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
    [productId, ...ids],
  );
}

async function upsertProductVariants(productId, rows) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query(
      'SELECT id FROM product_variants WHERE product_id = ? AND deleted_at IS NULL',
      [productId],
    );
    const existingIds = new Set(existing.map((r) => r.id));
    const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id));

    for (const r of rows) {
      if (r.id && existingIds.has(r.id)) {
        await conn.query(
          `UPDATE product_variants
           SET sku_code = ?, title = ?, price = ?, sort_order = ?, is_default = ?,
               stock_warning_threshold = COALESCE(?, stock_warning_threshold),
               barcode = COALESCE(?, barcode), cost_price = COALESCE(?, cost_price), deleted_at = NULL
           WHERE id = ? AND product_id = ?`,
          [
            r.sku_code ?? null,
            r.title ?? '',
            r.price,
            r.sort_order ?? 0,
            r.is_default ? 1 : 0,
            r.stock_warning_threshold ?? null,
            r.barcode ?? null,
            r.cost_price ?? null,
            r.id,
            productId,
          ],
        );
      } else {
        await conn.query(
          `INSERT INTO product_variants
             (id, product_id, sku_code, title, price, stock, sort_order, is_default, stock_warning_threshold, reserved_stock, barcode, cost_price, deleted_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL)`,
          [
            r.id,
            productId,
            r.sku_code ?? null,
            r.title ?? '',
            r.price,
            r.stock ?? 0,
            r.sort_order ?? 0,
            r.is_default ? 1 : 0,
            r.stock_warning_threshold ?? 5,
            r.reserved_stock ?? 0,
            r.barcode ?? null,
            r.cost_price ?? null,
          ],
        );
      }
    }

    const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
    await softDeleteVariantsByIds(conn, productId, toDelete);

    await conn.query(
      `UPDATE products p
       SET p.stock = COALESCE((SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id AND v.deleted_at IS NULL),0)
       WHERE p.id = ?`,
      [productId],
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateDefaultVariantPriceStock(productId, price, stock) {
  await db.query(
    'UPDATE product_variants SET price = ?, stock = ? WHERE product_id = ? AND is_default = 1 AND deleted_at IS NULL LIMIT 1',
    [price, stock, productId],
  );
}

module.exports = {
  selectVariantsByProductId,
  upsertProductVariants,
  updateDefaultVariantPriceStock,
};
