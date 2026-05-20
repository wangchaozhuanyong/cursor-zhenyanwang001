/**
 * Keep products.stock aligned with enabled, non-deleted SKU rows.
 */

async function syncProductStockFromVariants(q, productId) {
  await q.query(
    `UPDATE products p
     SET p.stock = COALESCE((
       SELECT SUM(v.stock)
       FROM product_variants v
       WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1
     ), 0)
     WHERE p.id = ?`,
    [productId],
  );
}

module.exports = {
  syncProductStockFromVariants,
};
