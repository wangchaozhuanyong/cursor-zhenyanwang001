/**
 * ????????SQL ???????????? mock? * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} q
 */
const db = require('../../../config/db');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const { generateId } = require('../../../utils/helpers');

function getPool() {
  return db;
}

async function getConnection() {
  return db.getConnection();
}

async function selectProductsForUpdate(q, productIds) {
  if (!productIds.length) return [];
  const [rows] = await q.query(
    `SELECT * FROM products WHERE id IN (${productIds.map(() => '?').join(',')}) AND lifecycle_status = 1 FOR UPDATE`,
    productIds,
  );
  return rows;
}

async function selectVariantsForUpdate(q, variantIds) {
  const ids = [...new Set((variantIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await q.query(
    `SELECT v.*, p.name AS product_name, p.cover_image, p.points, p.category_id, p.lifecycle_status
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id IN (${ids.map(() => '?').join(',')}) AND p.lifecycle_status = 1 AND v.deleted_at IS NULL AND v.enabled = 1
     FOR UPDATE`,
    ids,
  );
  return rows;
}

async function selectDefaultVariantsForProducts(q, productIds) {
  const ids = [...new Set((productIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await q.query(
    `SELECT v.*, p.name AS product_name, p.cover_image, p.points, p.category_id, p.lifecycle_status
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.product_id IN (${ids.map(() => '?').join(',')}) AND v.is_default = 1 AND p.lifecycle_status = 1 AND v.deleted_at IS NULL AND v.enabled = 1
     FOR UPDATE`,
    ids,
  );
  return rows;
}

const ACTIVITY_SELECT_FIELDS = `
       ap.product_id,
       ap.activity_id,
       ap.activity_price,
       ap.limit_per_user,
       ap.activity_stock,
       ap.sold_count,
       a.title,
       a.type,
       a.threshold_amount,
       a.discount_amount,
       a.activity_config,
       a.scope_type,
       a.allow_coupon_stack,
       a.allow_points_stack,
       a.allow_reward,
       a.start_at,
       a.end_at`;

async function selectProductsByIds(q, productIds) {
  if (!productIds.length) return [];
  const [rows] = await q.query(
    `SELECT * FROM products WHERE id IN (${productIds.map(() => '?').join(',')}) AND lifecycle_status = 1`,
    productIds,
  );
  return rows;
}

async function selectVariantsByIds(q, variantIds) {
  const ids = [...new Set((variantIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await q.query(
    `SELECT v.*, p.name AS product_name, p.cover_image, p.points, p.category_id, p.lifecycle_status
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id IN (${ids.map(() => '?').join(',')}) AND p.lifecycle_status = 1 AND v.deleted_at IS NULL AND v.enabled = 1`,
    ids,
  );
  return rows;
}

async function selectDefaultVariantsForProductsRead(q, productIds) {
  return selectDefaultVariantsForProducts(q, productIds);
}

async function selectVariantSpecValuesByVariantIds(q, variantIds) {
  const ids = [...new Set((variantIds || []).filter(Boolean))];
  if (!ids.length) return new Map();
  const [rows] = await q.query(
    `SELECT rel.variant_id, rel.group_id, rel.value_id, g.name AS group_name, v.value
     FROM product_variant_spec_values rel
     JOIN product_spec_groups g ON g.id = rel.group_id
     JOIN product_spec_values v ON v.id = rel.value_id
     WHERE rel.variant_id IN (${ids.map(() => '?').join(',')})
       AND g.deleted_at IS NULL
       AND v.deleted_at IS NULL
     ORDER BY g.sort_order ASC, v.sort_order ASC, g.created_at ASC, v.created_at ASC`,
    ids,
  );
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.variant_id) || [];
    list.push({
      group_id: row.group_id,
      group_name: row.group_name,
      value_id: row.value_id,
      value: row.value,
    });
    map.set(row.variant_id, list);
  }
  return map;
}

async function selectFlashSaleActivityItemsForUpdate(q, productIds) {
  if (!productIds.length) return [];
  const [rows] = await q.query(
    `SELECT ${ACTIVITY_SELECT_FIELDS}
     FROM marketing_activity_products ap
     JOIN marketing_activities a ON a.id = ap.activity_id
     WHERE ap.product_id IN (${productIds.map(() => '?').join(',')})
       AND a.deleted_at IS NULL
       AND a.disabled = 0
       AND a.type = 'flash_sale'
       AND NOW() BETWEEN a.start_at AND a.end_at
       AND ap.activity_price > 0
       AND ap.activity_stock > ap.sold_count
     ORDER BY ap.product_id ASC, ap.activity_price ASC, a.sort_order ASC, a.start_at DESC
     FOR UPDATE`,
    productIds,
  );
  return rows;
}

async function selectFlashSaleActivityItemsRead(q, productIds) {
  if (!productIds.length) return [];
  const [rows] = await q.query(
    `SELECT ${ACTIVITY_SELECT_FIELDS}
     FROM marketing_activity_products ap
     JOIN marketing_activities a ON a.id = ap.activity_id
     WHERE ap.product_id IN (${productIds.map(() => '?').join(',')})
       AND a.deleted_at IS NULL
       AND a.disabled = 0
       AND a.type = 'flash_sale'
       AND NOW() BETWEEN a.start_at AND a.end_at
       AND ap.activity_price > 0
       AND ap.activity_stock > ap.sold_count
     ORDER BY ap.product_id ASC, ap.activity_price ASC, a.sort_order ASC, a.start_at DESC`,
    productIds,
  );
  return rows;
}

/** @deprecated ?? selectFlashSaleActivityItemsForUpdate */
async function selectActiveActivityItemsForUpdate(q, productIds) {
  return selectFlashSaleActivityItemsForUpdate(q, productIds);
}

async function loadActivityScopes(q, activityIds) {
  if (!activityIds.length) return new Map();
  const [rows] = await q.query(
    `SELECT activity_id, scope_type, scope_id FROM marketing_activity_scopes
     WHERE activity_id IN (${activityIds.map(() => '?').join(',')})`,
    activityIds,
  );
  const map = new Map();
  for (const r of rows) {
    const list = map.get(r.activity_id) || [];
    list.push({ scope_type: r.scope_type, scope_id: r.scope_id });
    map.set(r.activity_id, list);
  }
  return map;
}

async function selectActiveFullReductionActivitiesForUpdate(q) {
  const [rows] = await q.query(
    `SELECT a.id AS activity_id, a.title, a.type, a.threshold_amount, a.discount_amount,
            a.activity_config, a.scope_type, a.allow_coupon_stack, a.allow_points_stack, a.allow_reward
     FROM marketing_activities a
     WHERE a.deleted_at IS NULL
       AND a.disabled = 0
       AND a.type = 'full_reduction'
       AND NOW() BETWEEN a.start_at AND a.end_at
     ORDER BY a.sort_order ASC, a.start_at DESC
     FOR UPDATE`,
  );
  const scopeMap = await loadActivityScopes(q, rows.map((r) => r.activity_id));
  return rows.map((r) => ({ ...r, scopes: scopeMap.get(r.activity_id) || [] }));
}

async function selectActiveFullReductionActivitiesRead(q) {
  const [rows] = await q.query(
    `SELECT a.id AS activity_id, a.title, a.type, a.threshold_amount, a.discount_amount,
            a.activity_config, a.scope_type, a.allow_coupon_stack, a.allow_points_stack, a.allow_reward
     FROM marketing_activities a
     WHERE a.deleted_at IS NULL
       AND a.disabled = 0
       AND a.type = 'full_reduction'
       AND NOW() BETWEEN a.start_at AND a.end_at
     ORDER BY a.sort_order ASC, a.start_at DESC`,
  );
  const scopeMap = await loadActivityScopes(q, rows.map((r) => r.activity_id));
  return rows.map((r) => ({ ...r, scopes: scopeMap.get(r.activity_id) || [] }));
}

async function selectUserCouponRead(q, ucId, userId) {
  const [[row]] = await q.query(
    `SELECT uc.id AS uc_id, c.* FROM user_coupons uc
     JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
     WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 'available'
       AND c.end_date >= CURDATE() AND c.start_date <= CURDATE()
       AND c.status = 'available'`,
    [ucId, userId],
  );
  return row || null;
}

async function incrementActivitySold(q, activityId, productId, qty) {
  const [result] = await q.query(
    `UPDATE marketing_activity_products
     SET sold_count = sold_count + ?
     WHERE activity_id = ? AND product_id = ? AND activity_stock >= sold_count + ?`,
    [qty, activityId, productId, qty],
  );
  return result.affectedRows;
}

async function decrementActivitySold(q, activityId, productId, qty) {
  const [result] = await q.query(
    `UPDATE marketing_activity_products
     SET sold_count = GREATEST(0, sold_count - ?)
     WHERE activity_id = ? AND product_id = ?`,
    [qty, activityId, productId],
  );
  return result.affectedRows;
}

async function selectShippingTemplate(q, id) {
  const [[row]] = await q.query('SELECT * FROM shipping_templates WHERE id = ? AND enabled = 1', [id]);
  return row || null;
}

async function selectDefaultEnabledShippingTemplate(q) {
  const [[row]] = await q.query(
    'SELECT * FROM shipping_templates WHERE enabled = 1 ORDER BY is_default DESC, id ASC LIMIT 1',
  );
  return row || null;
}

async function selectUserCouponForUpdate(q, ucId, userId) {
  const [[row]] = await q.query(
    `SELECT uc.id AS uc_id, c.* FROM user_coupons uc
     JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
     WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 'available'
       AND c.end_date >= CURDATE() AND c.start_date <= CURDATE()
       AND c.status = 'available'
     FOR UPDATE`,
    [ucId, userId],
  );
  return row || null;
}

async function selectCouponCategoryIds(q, couponId) {
  const [rows] = await q.query(
    'SELECT category_id FROM coupon_categories WHERE BINARY coupon_id = BINARY ?',
    [couponId],
  );
  return rows.map((r) => r.category_id).filter(Boolean);
}

async function updateUserCouponUsed(q, ucId) {
  await q.query("UPDATE user_coupons SET status = 'used', used_at = NOW() WHERE id = ?", [ucId]);
}

async function insertOrder(q, params) {
  const {
    id, userId, orderNo, rawAmount, discountAmount, discountMeta, couponTitle,
    shippingFee, shippingName, totalAmount, totalPoints,
    note, contactName, contactPhone, address, paymentMethod,
    taxMode, taxRate, taxLabel, taxableAmount, taxAmount, taxExclusiveAmount,
    addressLine1, addressLine2, addressCity, addressState, addressPostcode, addressCountry,
    pointsUsed, pointsDiscountAmount, rewardCashUsed, rewardCashDiscountAmount, loyaltyMeta,
  } = params;
  await q.query(
    `INSERT INTO orders
       (id, user_id, order_no, raw_amount, discount_amount, discount_meta, coupon_title,
        shipping_fee, shipping_name, total_amount,
        tax_mode, tax_rate, tax_label, taxable_amount, tax_amount, tax_exclusive_amount,
        points_used, points_discount_amount, reward_cash_used, reward_cash_discount_amount, loyalty_meta,
        total_points, status, payment_status,
        note, contact_name, contact_phone, shipping_phone, address,
        address_line1, address_line2, address_city, address_state, address_postcode, address_country,
        payment_method)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, userId, orderNo, rawAmount, discountAmount,
      discountMeta ? JSON.stringify(discountMeta) : null,
      couponTitle || '',
      shippingFee,
      shippingName || '',
      totalAmount,
      taxMode ?? null,
      taxRate ?? null,
      taxLabel ?? null,
      taxableAmount ?? null,
      taxAmount ?? null,
      taxExclusiveAmount ?? null,
      Number(pointsUsed || 0),
      Number(pointsDiscountAmount || 0),
      Number(rewardCashUsed || 0),
      Number(rewardCashDiscountAmount || 0),
      loyaltyMeta ? JSON.stringify(loyaltyMeta) : null,
      totalPoints,
      ORDER_STATUS.PENDING,
      PAYMENT_STATUS.PENDING,
      note || '', contactName, contactPhone, contactPhone, address || '',
      addressLine1 || '', addressLine2 || '', addressCity || '', addressState || '',
      addressPostcode || '', addressCountry || 'MY',
      paymentMethod || 'whatsapp',
    ],
  );
}

async function updateOrderCouponUcId(q, orderId, ucId) {
  await q.query('UPDATE orders SET coupon_uc_id = ? WHERE id = ?', [ucId, orderId]);
}

async function insertOrderItem(q, params) {
  const {
    id,
    orderId,
    productId,
    variantId,
    skuCode,
    variantName,
    specSnapshot,
    productName,
    productImage,
    variantImage,
    price,
    points,
    earnedPoints,
    pointsRuleSnapshot,
    qty,
    activityId,
    activityTitle,
  } = params;
  await q.query(
    `INSERT INTO order_items
       (id, order_id, product_id, variant_id, sku_code, variant_name,
        spec_snapshot, product_name_snapshot, product_image_snapshot, variant_image_snapshot,
        product_name, product_image, price, points, earned_points, points_rule_snapshot, qty, subtotal, activity_id, activity_title)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      orderId,
      productId,
      variantId || null,
      skuCode || '',
      variantName || '',
      specSnapshot ? JSON.stringify(specSnapshot) : null,
      productName,
      productImage,
      variantImage || null,
      productName,
      productImage,
      price,
      points,
      Number(earnedPoints || 0),
      pointsRuleSnapshot ? JSON.stringify(pointsRuleSnapshot) : null,
      qty,
      Number(price) * Number(qty),
      activityId || null,
      activityTitle || null,
    ],
  );
}

async function deductVariantStock(q, variantId, qty, meta = {}) {
  const [[beforeRow]] = await q.query(
    `SELECT v.stock, v.product_id, v.title, v.sku_code, p.name AS product_name
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id = ?
     FOR UPDATE`,
    [variantId],
  );
  if (!beforeRow) return 0;
  const beforeStock = Number(beforeRow.stock || 0);
  const [result] = await q.query(
    'UPDATE product_variants SET stock = stock - ? WHERE id = ? AND stock >= ?',
    [qty, variantId, qty],
  );
  if (result.affectedRows > 0) {
    const afterStock = beforeStock - qty;
    await q.query(
      `UPDATE products p
       SET p.stock = COALESCE((SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id), p.stock)
       WHERE p.id = ?`,
      [beforeRow.product_id],
    );
    await q.query(
      `INSERT INTO inventory_stock_records
         (id, product_id, variant_id, change_type, quantity_delta, before_stock,
          after_stock, reason, ref_type, ref_id, operator_id,
          product_name_snapshot, variant_name_snapshot, sku_code_snapshot, order_no_snapshot, source_no, remark, created_by_type)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        generateId(),
        beforeRow.product_id,
        variantId,
        'order_deduct',
        -qty,
        beforeStock,
        afterStock,
        meta.reason || '订单下单扣减 SKU 库存',
        meta.refType || 'order',
        meta.refId || '',
        meta.operatorId || null,
        beforeRow.product_name || '',
        beforeRow.title || '',
        beforeRow.sku_code || '',
        meta.orderNo || '',
        '',
        '',
        'system',
      ],
    );
  }
  return result.affectedRows;
}
async function ensurePointsAccount(q, userId) {
  await q.query(
    `INSERT IGNORE INTO points_accounts (user_id, balance, total_earned)
     SELECT id, COALESCE(points_balance, 0), GREATEST(COALESCE(points_balance, 0), 0)
     FROM users WHERE id = ?`,
    [userId],
  );
}

async function syncUserPointsFromAccount(q, userId) {
  await q.query(
    `UPDATE users u
     JOIN points_accounts pa ON pa.user_id = u.id
     SET u.points_balance = pa.balance
     WHERE u.id = ?`,
    [userId],
  );
}

async function incrementUserPoints(q, userId, points) {
  const amount = Math.max(Number(points) || 0, 0);
  await ensurePointsAccount(q, userId);
  await q.query(
    `UPDATE points_accounts
     SET balance = balance + ?, total_earned = total_earned + ?
     WHERE user_id = ?`,
    [amount, amount, userId],
  );
  await syncUserPointsFromAccount(q, userId);
}

async function insertPointsRecord(q, params) {
  const { id, userId, action, amount, description } = params;
  await q.query(
    `INSERT INTO points_records (id, user_id, action, amount, description) VALUES (?,?,?,?,?)`,
    [id, userId, action, amount, description],
  );
}

async function deleteCartItemsForProducts(q, userId, productIds) {
  if (!productIds.length) return;
  await q.query(
    `DELETE FROM cart_items WHERE user_id = ? AND product_id IN (${productIds.map(() => '?').join(',')})`,
    [userId, ...productIds],
  );
}

async function deleteCartItemsForLines(q, userId, lines) {
  const normalized = (lines || []).filter((line) => line && line.product_id);
  if (!normalized.length) return;
  const sql = `
    DELETE FROM cart_items
    WHERE user_id = ?
      AND (
        ${normalized.map(() => '(product_id = ? AND IFNULL(variant_id, \'\') = ?)').join(' OR ')}
      )
  `;
  const params = [userId];
  for (const line of normalized) {
    params.push(line.product_id, line.variant_id || '');
  }
  await q.query(sql, params);
}

async function selectOrderById(q, orderId) {
  const [[row]] = await q.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  return row || null;
}

function buildOrderListWhere(filters = {}) {
  const { userId, status, tab } = filters;
  let where = 'WHERE o.user_id = ?';
  const params = [userId];

  if (tab && tab !== 'all') {
    if (tab === 'pending_payment') {
      where += " AND o.status = 'pending' AND (o.payment_status IS NULL OR o.payment_status <> 'paid')";
    } else if (tab === 'paid') {
      where += " AND o.status = 'paid'";
    } else if (tab === 'shipped') {
      where += " AND o.status = 'shipped'";
    } else if (tab === 'pending_review') {
      where += ` AND o.status = 'completed'
        AND EXISTS (
          SELECT 1 FROM order_items oi
          LEFT JOIN product_reviews pr ON pr.order_item_id = oi.id
          WHERE oi.order_id = o.id AND pr.id IS NULL
        )`;
    } else if (tab === 'completed') {
      where += ` AND o.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM order_items oi
          LEFT JOIN product_reviews pr ON pr.order_item_id = oi.id
          WHERE oi.order_id = o.id AND pr.id IS NULL
        )`;
    } else if (tab === 'after_sale') {
      where += " AND o.status IN ('refunding','refunded')";
    } else if (tab === 'cancelled') {
      where += " AND o.status = 'cancelled'";
    }
  } else if (status) {
    where += ' AND o.status = ?';
    params.push(status);
  }

  return { where, params };
}

async function countOrdersForUser(q, filters = {}) {
  const { where, params } = buildOrderListWhere(filters);
  const [[{ total }]] = await q.query(`SELECT COUNT(*) as total FROM orders o ${where}`, params);
  return total;
}

async function selectOrdersPage(q, filters = {}, pageSize, offset) {
  const { where, params } = buildOrderListWhere(filters);
  const [rows] = await q.query(
    `SELECT o.* FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectOrderSummary(q, userId) {
  const [[base]] = await q.query(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'pending' AND (payment_status IS NULL OR payment_status <> 'paid') THEN 1 ELSE 0 END) AS pending_payment,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS pending_ship,
      SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped,
      SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS pending_receive,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status IN ('refunding','refunded') THEN 1 ELSE 0 END) AS after_sale,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
     FROM orders
     WHERE user_id = ?`,
    [userId],
  );

  const [[pendingReviewRow]] = await q.query(
    `SELECT COUNT(*) AS pending_review
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN product_reviews pr ON pr.order_item_id = oi.id
     WHERE o.user_id = ?
       AND o.status = 'completed'
       AND pr.id IS NULL`,
    [userId],
  );

  return {
    total: Number(base?.total || 0),
    pending_payment: Number(base?.pending_payment || 0),
    paid: Number(base?.paid || 0),
    pending_ship: Number(base?.pending_ship || 0),
    shipped: Number(base?.shipped || 0),
    pending_receive: Number(base?.pending_receive || 0),
    pending_review: Number(pendingReviewRow?.pending_review || 0),
    completed: Number(base?.completed || 0),
    after_sale: Number(base?.after_sale || 0),
    cancelled: Number(base?.cancelled || 0),
  };
}

async function selectOrderItemsByOrderIds(q, orderIds) {
  if (!orderIds.length) return [];
  const [rows] = await q.query(
    `SELECT oi.*, pr.id AS review_id, pr.status AS review_status
     FROM order_items oi
     LEFT JOIN product_reviews pr ON pr.order_item_id = oi.id
     WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})`,
    orderIds,
  );
  return rows;
}

async function selectOrderByIdAndUser(q, orderId, userId) {
  const [[row]] = await q.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
  return row || null;
}

async function selectOrderByIdAndUserForUpdate(q, orderId, userId) {
  const [[row]] = await q.query(
    'SELECT * FROM orders WHERE id = ? AND user_id = ? FOR UPDATE',
    [orderId, userId],
  );
  return row || null;
}

async function selectOrderByIdForUpdate(q, orderId) {
  const [[row]] = await q.query(
    'SELECT * FROM orders WHERE id = ? FOR UPDATE',
    [orderId],
  );
  return row || null;
}

async function selectOrderByIdOrOrderNoForUpdate(q, orderIdOrNo) {
  const [[row]] = await q.query(
    'SELECT * FROM orders WHERE id = ? OR order_no = ? LIMIT 1 FOR UPDATE',
    [orderIdOrNo, orderIdOrNo],
  );
  return row || null;
}

async function selectOrderItems(q, orderId) {
  const [rows] = await q.query(
    `SELECT oi.*, pr.id AS review_id, pr.status AS review_status
     FROM order_items oi
     LEFT JOIN product_reviews pr ON pr.order_item_id = oi.id
     WHERE oi.order_id = ?`,
    [orderId],
  );
  return rows;
}

async function updateOrderStatus(q, orderId, status) {
  await q.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
}

async function updateOrderCancelled(q, orderId, reason = '') {
  await q.query(
    `UPDATE orders
     SET status = ?, cancel_reason = ?, cancelled_at = NOW()
     WHERE id = ?`,
    [ORDER_STATUS.CANCELLED, reason || '', orderId],
  );
}

async function selectOrderItemQtyRows(q, orderId) {
  const [rows] = await q.query(
    'SELECT product_id, variant_id, qty, activity_id, activity_title FROM order_items WHERE order_id = ?',
    [orderId],
  );
  return rows;
}

async function restoreVariantStock(q, variantId, qty, meta = {}) {
  const [[beforeRow]] = await q.query(
    `SELECT v.stock, v.product_id, v.title, v.sku_code, p.name AS product_name
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id = ?
     FOR UPDATE`,
    [variantId],
  );
  if (!beforeRow) return 0;
  const beforeStock = Number(beforeRow.stock || 0);
  const afterStock = beforeStock + Number(qty || 0);
  await q.query('UPDATE product_variants SET stock = ? WHERE id = ?', [afterStock, variantId]);
  await q.query(
    `UPDATE products p
     SET p.stock = COALESCE((SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id), p.stock)
     WHERE p.id = ?`,
    [beforeRow.product_id],
  );
  await q.query(
    `INSERT INTO inventory_stock_records
       (id, product_id, variant_id, change_type, quantity_delta, before_stock,
        after_stock, reason, ref_type, ref_id, operator_id,
        product_name_snapshot, variant_name_snapshot, sku_code_snapshot, order_no_snapshot, source_no, remark, created_by_type)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      generateId(),
      beforeRow.product_id,
      variantId,
      'order_release',
      qty,
      beforeStock,
      afterStock,
      meta.reason || '订单取消释放 SKU 库存',
      meta.refType || 'order',
      meta.refId || '',
      meta.operatorId || null,
      beforeRow.product_name || '',
      beforeRow.title || '',
      beforeRow.sku_code || '',
      meta.orderNo || '',
      '',
      '',
      'system',
    ],
  );
  return 1;
}
async function incrementProductSales(q, productId, qty) {
  await q.query(
    'UPDATE products SET sales_count = sales_count + ? WHERE id = ?',
    [qty, productId],
  );
}

async function decrementUserPoints(q, userId, points) {
  const amount = Math.max(Number(points) || 0, 0);
  await ensurePointsAccount(q, userId);
  await q.query(
    `UPDATE points_accounts
     SET balance = GREATEST(0, balance - ?),
         total_spent = total_spent + ?,
         total_reversed = total_reversed + ?
     WHERE user_id = ?`,
    [amount, amount, amount, userId],
  );
  await syncUserPointsFromAccount(q, userId);
}

async function restoreUserCouponById(q, ucId) {
  await q.query("UPDATE user_coupons SET status = 'available', used_at = NULL WHERE id = ?", [ucId]);
}

async function restoreUserCouponHeuristic(q, userId, createdAt) {
  await q.query(
    `UPDATE user_coupons SET status = 'available', used_at = NULL
     WHERE user_id = ? AND status = 'used'
     AND used_at >= ? AND used_at <= DATE_ADD(?, INTERVAL 1 MINUTE) LIMIT 1`,
    [userId, createdAt, createdAt],
  );
}

async function updateOrderPaid(q, orderId, params = {}) {
  const {
    paymentTime,
    paymentChannel,
    paymentTransactionNo,
    paymentMethod,
    paymentProvider,
    providerPaymentId,
  } = params;
  const [result] = await q.query(
    `UPDATE orders
       SET status = ?, payment_status = ?, payment_time = ?, payment_channel = ?,
           payment_transaction_no = ?, payment_method = ?,
           payment_provider = ?, provider_payment_id = ?, paid_at = ?
     WHERE id = ?
       AND status = ?
       AND (payment_status IS NULL OR payment_status = ?)`,
    [
      ORDER_STATUS.PAID,
      PAYMENT_STATUS.PAID,
      paymentTime || new Date(),
      paymentChannel || 'stripe',
      paymentTransactionNo || '',
      paymentMethod || 'online',
      paymentProvider || paymentChannel || 'stripe',
      providerPaymentId || paymentTransactionNo || '',
      paymentTime || new Date(),
      orderId,
      ORDER_STATUS.PENDING,
      PAYMENT_STATUS.PENDING,
    ],
  );
  return result.affectedRows;
}

async function updateOrderRefundState(q, orderId, params = {}) {
  const { paymentStatus, orderStatus, refundStatus } = params;
  await q.query(
    `UPDATE orders
     SET payment_status = ?, status = ?, refund_status = ?
     WHERE id = ?`,
    [
      paymentStatus,
      orderStatus,
      refundStatus,
      orderId,
    ],
  );
}

async function insertWebhookEventIfAbsent(q, params) {
  const { eventId, eventType, orderId } = params;
  const [result] = await q.query(
    `INSERT IGNORE INTO payment_webhook_events (event_id, event_type, order_id, status)
     VALUES (?, ?, ?, 'processed')`,
    [eventId, eventType, orderId || null],
  );
  return result.affectedRows > 0;
}

async function insertNotification(q, params) {
  const { id, userId, type, title, content } = params;
  await q.query(
    `INSERT INTO notifications (id, user_id, type, title, content) VALUES (?,?,?,?,?)`,
    [id, userId, type, title, content],
  );
}


async function insertAnalyticsEvent(q, row) {
  const dedupeKey = String(row.dedupe_key || '').trim();
  await q.query(
    `INSERT INTO analytics_events
      (user_id, anonymous_id, session_id, dedupe_key, event_type, module, page, product_id, variant_id, category_id, activity_id, coupon_id, keyword, order_id, amount, quantity, device, referrer, ip_hash, user_agent)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE id=id`,
    [
      row.user_id || null,
      row.anonymous_id || '',
      row.session_id || '',
      dedupeKey,
      row.event_type,
      row.module || '',
      row.page || '',
      row.product_id || null,
      row.variant_id || null,
      row.category_id || null,
      row.activity_id || null,
      row.coupon_id || null,
      row.keyword || '',
      row.order_id || null,
      row.amount ?? null,
      row.quantity ?? null,
      row.device || 'server',
      row.referrer || '',
      row.ip_hash || '',
      row.user_agent || 'server',
    ],
  );
}
async function selectUserInviteCode(q, userId) {
  const [[row]] = await q.query('SELECT parent_invite_code FROM users WHERE id = ?', [userId]);
  return row || null;
}

async function selectUserIdByInviteCode(q, code) {
  const [[row]] = await q.query('SELECT id FROM users WHERE invite_code = ?', [code]);
  return row || null;
}

async function selectReferralRulesEnabled(q) {
  const [rows] = await q.query('SELECT * FROM referral_rules WHERE enabled = 1 ORDER BY level ASC');
  return rows;
}

async function insertRewardRecord(q, params) {
  const { id, userId, orderId, orderNo, amount, rate, status } = params;
  await q.query(
    `INSERT INTO reward_records (id, user_id, order_id, order_no, amount, rate, status)
     VALUES (?,?,?,?,?,?,?)`,
    [id, userId, orderId, orderNo, amount, rate, status],
  );
}

async function selectExpiredPendingOrderIds(q, minutes, limit, pendingStatus, pendingPaymentStatus) {
  const [rows] = await q.query(
    `SELECT id FROM orders
     WHERE status = ?
       AND (payment_status IS NULL OR payment_status = ?)
       AND payment_method = 'online'
       AND created_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)
     ORDER BY created_at ASC
     LIMIT ?`,
    [pendingStatus, pendingPaymentStatus, minutes, limit],
  );
  return rows.map((r) => r.id);
}

async function selectDueShippedOrderIds(q, days, limit, shippedStatus) {
  const [rows] = await q.query(
    `SELECT id FROM orders
     WHERE status = ?
       AND shipped_at IS NOT NULL
       AND shipped_at <= DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY shipped_at ASC
     LIMIT ?`,
    [shippedStatus, days, limit],
  );
  return rows.map((r) => r.id);
}

module.exports = {
  getPool,
  getConnection,
  selectProductsForUpdate,
  selectProductsByIds,
  selectVariantsForUpdate,
  selectVariantsByIds,
  selectDefaultVariantsForProducts,
  selectDefaultVariantsForProductsRead,
  selectVariantSpecValuesByVariantIds,
  selectActiveActivityItemsForUpdate,
  selectFlashSaleActivityItemsForUpdate,
  selectFlashSaleActivityItemsRead,
  selectActiveFullReductionActivitiesForUpdate,
  selectActiveFullReductionActivitiesRead,
  selectUserCouponRead,
  incrementActivitySold,
  decrementActivitySold,
  selectShippingTemplate,
  selectDefaultEnabledShippingTemplate,
  selectUserCouponForUpdate,
  selectCouponCategoryIds,
  updateUserCouponUsed,
  insertOrder,
  updateOrderCouponUcId,
  insertOrderItem,
  deductVariantStock,
  incrementUserPoints,
  insertPointsRecord,
  deleteCartItemsForProducts,
  deleteCartItemsForLines,
  selectOrderById,
  countOrdersForUser,
  selectOrdersPage,
  selectOrderSummary,
  selectOrderItemsByOrderIds,
  selectOrderByIdAndUser,
  selectOrderByIdAndUserForUpdate,
  selectOrderByIdForUpdate,
  selectOrderByIdOrOrderNoForUpdate,
  selectOrderItems,
  updateOrderStatus,
  updateOrderCancelled,
  selectOrderItemQtyRows,
  restoreVariantStock,
  incrementProductSales,
  decrementUserPoints,
  restoreUserCouponById,
  restoreUserCouponHeuristic,
  updateOrderPaid,
  updateOrderRefundState,
  insertWebhookEventIfAbsent,
  insertNotification,
  insertAnalyticsEvent,
  selectUserInviteCode,
  selectUserIdByInviteCode,
  selectReferralRulesEnabled,
  insertRewardRecord,
  selectExpiredPendingOrderIds,
  selectDueShippedOrderIds,
};
