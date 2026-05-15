const db = require('../../config/db');
const { PAID_PAYMENT_STATUS_LIST } = require('../../constants/status');

const PAID_PAYMENT_SQL = PAID_PAYMENT_STATUS_LIST.map((s) => `'${s}'`).join(', ');

function rangeWhere(fieldSql) {
  return `(${fieldSql}) BETWEEN ? AND ?`;
}

async function queryOne(sql, params = []) {
  const [[row]] = await db.query(sql, params);
  return row || {};
}

async function queryList(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows || [];
}

async function selectOverviewSummary(dateFrom, dateTo) {
  return queryOne(
    `SELECT
      COALESCE(SUM(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN total_amount ELSE 0 END),0) AS gross_sales,
      COALESCE(SUM(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN paid_amount ELSE 0 END),0) AS paid_amount,
      COALESCE(SUM(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN discount_amount ELSE 0 END),0) AS discount_amount,
      COUNT(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COUNT(*) AS order_count,
      COALESCE(SUM(CASE WHEN payment_status='refunded' OR order_status='refunded' THEN total_amount ELSE 0 END),0) AS refund_amount,
      COUNT(CASE WHEN order_status IN ('pending','processing') THEN 1 END) AS pending_orders
     FROM orders
     WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}`,
    [dateFrom, dateTo],
  );
}

async function selectOverviewTopProducts(dateFrom, dateTo, asc = false) {
  return queryList(
    `SELECT p.id AS product_id,p.name AS product_name,COALESCE(SUM(oi.qty),0) AS sales_qty,COALESCE(SUM(oi.qty*oi.price),0) AS sales_amount
     FROM order_items oi
     INNER JOIN orders o ON o.id=oi.order_id
     INNER JOIN products p ON p.id=oi.product_id
     WHERE o.payment_status IN (${PAID_PAYMENT_SQL})
       AND ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}
     GROUP BY p.id,p.name
     ORDER BY sales_qty ${asc ? "ASC" : "DESC"}
     LIMIT 10`,
    [dateFrom, dateTo],
  );
}

async function selectSalesDaily(dateFrom, dateTo) {
  return queryList(
    `SELECT
      DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR)) AS date,
      COUNT(*) AS order_count,
      COUNT(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COUNT(CASE WHEN o.order_status='cancelled' THEN 1 END) AS cancelled_order_count,
      COUNT(CASE WHEN o.order_status='refunded' OR o.payment_status='refunded' THEN 1 END) AS refund_order_count,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.total_amount ELSE 0 END),0) AS gross_sales,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.discount_amount ELSE 0 END),0) AS discount_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.shipping_amount ELSE 0 END),0) AS shipping_fee,
      COALESCE(SUM(CASE WHEN o.order_status='refunded' OR o.payment_status='refunded' THEN o.total_amount ELSE 0 END),0) AS refund_amount,
      COALESCE(SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.total_amount ELSE 0 END),0) - COALESCE(SUM(CASE WHEN o.order_status='refunded' OR o.payment_status='refunded' THEN o.total_amount ELSE 0 END),0) AS net_sales,
      COALESCE(SUM(oi.qty),0) AS items_sold,
      COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN o.user_id END) AS paying_users
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id=o.id
     WHERE ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}
     GROUP BY DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))
     ORDER BY date ASC`,
    [dateFrom, dateTo],
  );
}

async function selectSalesMonthly(dateFrom, dateTo) {
  return queryList(
    `SELECT
      DATE_FORMAT(DATE_ADD(created_at, INTERVAL 8 HOUR),'%Y-%m') AS month,
      COALESCE(SUM(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN total_amount ELSE 0 END),0) AS gross_sales,
      COALESCE(SUM(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN total_amount ELSE 0 END),0) - COALESCE(SUM(CASE WHEN payment_status='refunded' OR order_status='refunded' THEN total_amount ELSE 0 END),0) AS net_sales,
      COUNT(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COALESCE(SUM(CASE WHEN payment_status='refunded' OR order_status='refunded' THEN total_amount ELSE 0 END),0) AS refund_amount,
      COALESCE(SUM(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN discount_amount ELSE 0 END),0) AS discount_amount
     FROM orders
     WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}
     GROUP BY DATE_FORMAT(DATE_ADD(created_at, INTERVAL 8 HOUR),'%Y-%m')
     ORDER BY month ASC`,
    [dateFrom, dateTo],
  );
}

async function selectProductsAnalysis(dateFrom, dateTo) {
  return queryList(
    `SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.cover_image,
      c.name AS category_name,
      COALESCE(SUM(oi.qty),0) AS sales_qty,
      COALESCE(SUM(oi.qty*oi.price),0) AS sales_amount,
      COUNT(DISTINCT o.id) AS order_count,
      COUNT(DISTINCT o.user_id) AS buyer_count,
      0 AS refund_qty,
      0 AS refund_amount,
      0 AS refund_rate,
      COALESCE(SUM(o.discount_amount),0) AS discount_amount,
      NULL AS gross_profit,
      NULL AS gross_margin,
      p.stock AS current_stock,
      NULL AS available_stock_days,
      COALESCE(ae.view_count,0) AS view_count,
      COALESCE(ae.add_cart_count,0) AS add_cart_count,
      COALESCE(ae.favorite_count,0) AS favorite_count,
      CASE WHEN COALESCE(ae.view_count,0) > 0 THEN ROUND(COUNT(DISTINCT o.id) / COALESCE(ae.view_count,1), 4) ELSE 0 END AS conversion_rate
     FROM products p
     LEFT JOIN categories c ON c.id=p.category_id
     LEFT JOIN order_items oi ON oi.product_id=p.id
     LEFT JOIN orders o ON o.id=oi.order_id AND o.payment_status IN (${PAID_PAYMENT_SQL})
      LEFT JOIN (
        SELECT product_id,
          SUM(CASE WHEN event_type='product_view' THEN 1 ELSE 0 END) AS view_count,
          SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_cart_count,
          SUM(CASE WHEN event_type='favorite' THEN 1 ELSE 0 END) AS favorite_count
        FROM analytics_events
        WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}
        GROUP BY product_id
      ) ae ON ae.product_id=p.id
     WHERE (o.id IS NULL OR ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")})
     GROUP BY p.id,p.name,p.cover_image,c.name,p.stock
     ORDER BY sales_amount DESC
     LIMIT 200`,
    [dateFrom, dateTo, dateFrom, dateTo],
  );
}

async function selectSimpleCategoryAnalysis(dateFrom, dateTo) {
  return queryList(
    `SELECT c.id AS category_id,c.name AS category_name,
      COUNT(DISTINCT p.id) AS product_count,
      COUNT(DISTINCT CASE WHEN p.lifecycle_status=1 THEN p.id END) AS active_product_count,
      COALESCE(SUM(oi.qty),0) AS sales_qty,
      COALESCE(SUM(oi.qty*oi.price),0) AS sales_amount,
      COALESCE(SUM(p.stock),0) AS stock_qty
     FROM categories c
     LEFT JOIN products p ON p.category_id=c.id
     LEFT JOIN order_items oi ON oi.product_id=p.id
     LEFT JOIN orders o ON o.id=oi.order_id AND ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}
     GROUP BY c.id,c.name
     ORDER BY sales_amount DESC`,
    [dateFrom, dateTo],
  );
}

async function selectSimpleOrderAnalysis(dateFrom, dateTo) {
  return queryOne(
    `SELECT
      COUNT(*) AS order_count,
      COUNT(CASE WHEN payment_status IN (${PAID_PAYMENT_SQL}) THEN 1 END) AS paid_order_count,
      COUNT(CASE WHEN payment_status='unpaid' THEN 1 END) AS unpaid_order_count,
      COUNT(CASE WHEN order_status='cancelled' THEN 1 END) AS cancelled_order_count,
      COUNT(CASE WHEN order_status='refunded' OR payment_status='refunded' THEN 1 END) AS refund_order_count,
      COALESCE(AVG(total_amount),0) AS average_order_value
     FROM orders
     WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}`,
    [dateFrom, dateTo],
  );
}

async function selectSimpleCustomerAnalysis(dateFrom, dateTo) {
  return queryOne(
    `SELECT
      COUNT(DISTINCT u.id) AS active_users,
      COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN u.id END) AS order_users,
      COUNT(DISTINCT CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN u.id END) AS paying_users,
      COUNT(DISTINCT CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN u.id END) AS new_users
     FROM users u
     LEFT JOIN orders o ON o.user_id=u.id AND ${rangeWhere("DATE(DATE_ADD(o.created_at, INTERVAL 8 HOUR))")}`,
    [dateFrom, dateTo],
  );
}

async function selectSimpleActivitiesAnalysis(dateFrom, dateTo) {
  return queryList(
    `SELECT id AS activity_id,title AS activity_title,type AS activity_type,start_at,end_at,
      product_count,0 AS sales_amount,0 AS order_count,0 AS sales_qty,0 AS discount_amount
     FROM activities
     WHERE DATE(DATE_ADD(created_at, INTERVAL 8 HOUR)) BETWEEN ? AND ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [dateFrom, dateTo],
  );
}

async function selectSimpleCouponsAnalysis(dateFrom, dateTo) {
  return queryList(
    `SELECT c.id AS coupon_id,c.title AS coupon_title,
      c.total_count AS issued_count,
      (SELECT COUNT(*) FROM coupon_records cr WHERE cr.coupon_id=c.id) AS claimed_count,
      (SELECT COUNT(*) FROM coupon_records cr WHERE cr.coupon_id=c.id AND cr.status='used') AS used_count,
      0 AS expired_count
     FROM coupons c
     WHERE DATE(DATE_ADD(c.created_at, INTERVAL 8 HOUR)) BETWEEN ? AND ?
     ORDER BY c.created_at DESC
     LIMIT 100`,
    [dateFrom, dateTo],
  );
}

async function selectSimpleInventoryAnalysis() {
  return queryList(
    `SELECT p.id AS product_id,p.name AS product_name,p.stock AS current_stock,p.stock_warning_threshold AS warning_stock,
      0 AS sales_7d,0 AS sales_30d,0 AS avg_daily_sales,NULL AS available_stock_days,
      CASE WHEN p.stock <= COALESCE(p.stock_warning_threshold,0) THEN 'low' ELSE 'normal' END AS stock_status
     FROM products p
     ORDER BY p.stock ASC
     LIMIT 200`,
  );
}

async function selectSimpleSearchAnalysis(dateFrom, dateTo) {
  return queryList(
    `SELECT
      st.keyword,
      st.search_count,
      st.user_count,
      st.no_result_count,
      st.last_searched_at,
      COALESCE(ae.product_click_count,0) AS product_click_count,
      COALESCE(ae.add_cart_count,0) AS add_cart_count,
      COALESCE(ae.order_count,0) AS order_count,
      COALESCE(ae.sales_amount,0) AS sales_amount
     FROM (
       SELECT keyword,COUNT(*) AS search_count,COUNT(DISTINCT user_id) AS user_count,
         SUM(CASE WHEN result_count=0 THEN 1 ELSE 0 END) AS no_result_count,
         MAX(created_at) AS last_searched_at
       FROM search_terms
       WHERE DATE(DATE_ADD(created_at, INTERVAL 8 HOUR)) BETWEEN ? AND ?
       GROUP BY keyword
     ) st
     LEFT JOIN (
       SELECT keyword,
         SUM(CASE WHEN event_type='product_click' THEN 1 ELSE 0 END) AS product_click_count,
         SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_cart_count,
         COUNT(DISTINCT CASE WHEN event_type='order_submit' THEN order_id END) AS order_count,
         SUM(CASE WHEN event_type='payment_success' THEN COALESCE(amount,0) ELSE 0 END) AS sales_amount
       FROM analytics_events
       WHERE DATE(DATE_ADD(created_at, INTERVAL 8 HOUR)) BETWEEN ? AND ?
       GROUP BY keyword
     ) ae ON ae.keyword=st.keyword
     ORDER BY st.search_count DESC
     LIMIT 200`,
    [dateFrom, dateTo, dateFrom, dateTo],
  );
}

async function selectOverviewBehaviorSummary(dateFrom, dateTo) {
  return queryOne(
    `SELECT
      SUM(CASE WHEN event_type='product_view' THEN 1 ELSE 0 END) AS product_view_count,
      SUM(CASE WHEN event_type='product_click' THEN 1 ELSE 0 END) AS product_click_count,
      SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) AS add_to_cart_count,
      SUM(CASE WHEN event_type='favorite' THEN 1 ELSE 0 END) AS favorite_count,
      SUM(CASE WHEN event_type='checkout_start' THEN 1 ELSE 0 END) AS checkout_start_count
     FROM analytics_events
     WHERE ${rangeWhere("DATE(DATE_ADD(created_at, INTERVAL 8 HOUR))")}`,
    [dateFrom, dateTo],
  );
}

module.exports = {
  selectOverviewSummary,
  selectOverviewTopProducts,
  selectSalesDaily,
  selectSalesMonthly,
  selectProductsAnalysis,
  selectSimpleCategoryAnalysis,
  selectSimpleOrderAnalysis,
  selectSimpleCustomerAnalysis,
  selectSimpleActivitiesAnalysis,
  selectSimpleCouponsAnalysis,
  selectSimpleInventoryAnalysis,
  selectSimpleSearchAnalysis,
  selectOverviewBehaviorSummary,
};
