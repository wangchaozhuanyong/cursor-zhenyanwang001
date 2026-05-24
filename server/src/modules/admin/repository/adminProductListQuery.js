const { isEffectiveOrderExpr, reportDateExpr } = require('../report/reportMetricDefinitions');

const PAID_ORDER_FILTER = isEffectiveOrderExpr('o');
const SALES_DATE_EXPR = reportDateExpr('o');
const LAST_7_START = 'DATE(DATE_SUB(DATE(DATE_ADD(NOW(), INTERVAL 8 HOUR)), INTERVAL 6 DAY))';
const LAST_30_START = 'DATE(DATE_SUB(DATE(DATE_ADD(NOW(), INTERVAL 8 HOUR)), INTERVAL 29 DAY))';

const PRODUCT_LIST_FROM = `
  FROM products p
  LEFT JOIN categories c ON BINARY c.id = BINARY p.category_id
  LEFT JOIN (
    SELECT
      v.product_id,
      COUNT(*) AS sku_count,
      SUM(CASE WHEN v.enabled = 1 THEN 1 ELSE 0 END) AS enabled_sku_count,
      MIN(CASE WHEN v.enabled = 1 THEN v.price END) AS min_sku_price,
      MAX(CASE WHEN v.enabled = 1 THEN v.price END) AS max_sku_price,
      MIN(CASE WHEN v.enabled = 1 AND v.cost_price > 0 THEN v.cost_price END) AS min_cost_price,
      MAX(CASE WHEN v.enabled = 1 AND v.cost_price > 0 THEN v.cost_price END) AS max_cost_price,
      SUM(CASE WHEN v.enabled = 1 AND (v.cost_price IS NULL OR v.cost_price <= 0) THEN 1 ELSE 0 END) AS missing_cost_sku_count,
      SUM(CASE WHEN v.enabled = 1 AND v.stock <= 0 THEN 1 ELSE 0 END) AS out_of_stock_sku_count,
      SUM(
        CASE
          WHEN v.enabled = 1 AND v.stock > 0 AND v.stock <= COALESCE(v.stock_warning_threshold, 5) THEN 1
          ELSE 0
        END
      ) AS stock_warning_sku_count,
      MIN(CASE WHEN v.enabled = 1 THEN v.sku_code END) AS min_sku_code
    FROM product_variants v
    WHERE v.deleted_at IS NULL
    GROUP BY v.product_id
  ) vagg ON BINARY vagg.product_id = BINARY p.id
  LEFT JOIN (
    SELECT
      oi.product_id,
      SUM(CASE
        WHEN ${PAID_ORDER_FILTER} AND ${SALES_DATE_EXPR} >= ${LAST_7_START}
        THEN oi.qty ELSE 0 END) AS sales_qty_7d,
      SUM(CASE
        WHEN ${PAID_ORDER_FILTER} AND ${SALES_DATE_EXPR} >= ${LAST_30_START}
        THEN oi.qty ELSE 0 END) AS sales_qty_30d,
      SUM(CASE
        WHEN ${PAID_ORDER_FILTER} AND ${SALES_DATE_EXPR} >= ${LAST_30_START}
        THEN COALESCE(oi.net_sales_amount, oi.qty * oi.price) ELSE 0 END) AS sales_amount_30d,
      SUM(CASE
        WHEN ${PAID_ORDER_FILTER} AND ${SALES_DATE_EXPR} >= ${LAST_30_START}
        THEN COALESCE(
          oi.gross_profit_amount,
          GREATEST(0, COALESCE(oi.net_sales_amount, oi.qty * oi.price) - COALESCE(oi.cost_amount, 0))
        ) ELSE 0 END) AS gross_profit_30d
    FROM order_items oi
    INNER JOIN orders o ON BINARY o.id = BINARY oi.order_id
    GROUP BY oi.product_id
  ) pm ON BINARY pm.product_id = BINARY p.id
`;

const PRODUCT_LIST_SELECT = `
  SELECT
    p.*,
    c.name AS category_name,
    COALESCE(vagg.sku_count, 0) AS sku_count,
    COALESCE(vagg.enabled_sku_count, 0) AS enabled_sku_count,
    vagg.min_sku_price,
    vagg.max_sku_price,
    vagg.min_cost_price,
    vagg.max_cost_price,
    COALESCE(vagg.missing_cost_sku_count, 0) AS missing_cost_sku_count,
    COALESCE(vagg.out_of_stock_sku_count, 0) AS out_of_stock_sku_count,
    COALESCE(vagg.stock_warning_sku_count, 0) AS stock_warning_sku_count,
    COALESCE(pm.sales_qty_7d, 0) AS sales_qty_7d,
    COALESCE(pm.sales_qty_30d, 0) AS sales_qty_30d,
    COALESCE(pm.sales_amount_30d, 0) AS sales_amount_30d,
    COALESCE(pm.gross_profit_30d, 0) AS gross_profit_30d,
    CASE
      WHEN COALESCE(pm.sales_amount_30d, 0) > 0
      THEN ROUND(COALESCE(pm.gross_profit_30d, 0) / pm.sales_amount_30d * 100, 2)
      ELSE NULL
    END AS gross_margin_30d
`;

const SORT_ORDER_SQL = {
  created_desc: 'p.created_at DESC, p.id DESC',
  created_asc: 'p.created_at ASC, p.id ASC',
  name_asc: 'p.name ASC, p.id ASC',
  name_desc: 'p.name DESC, p.id DESC',
  category_asc: 'COALESCE(c.name, \'\') ASC, p.id ASC',
  category_desc: 'COALESCE(c.name, \'\') DESC, p.id DESC',
  sku_asc: 'COALESCE(vagg.min_sku_code, \'\') ASC, p.id ASC',
  sku_desc: 'COALESCE(vagg.min_sku_code, \'\') DESC, p.id DESC',
  price_asc: 'COALESCE(p.price, 0) ASC, p.id ASC',
  price_desc: 'COALESCE(p.price, 0) DESC, p.id DESC',
  cost_asc: '(vagg.min_cost_price IS NULL), COALESCE(vagg.min_cost_price, 0) ASC, p.id ASC',
  cost_desc: '(vagg.min_cost_price IS NULL), COALESCE(vagg.min_cost_price, 0) DESC, p.id DESC',
  stock_asc: 'COALESCE(p.stock, 0) ASC, p.id ASC',
  stock_desc: 'COALESCE(p.stock, 0) DESC, p.id DESC',
  margin_asc: '(pm.sales_amount_30d IS NULL OR pm.sales_amount_30d <= 0), COALESCE(gross_margin_30d, -999999) ASC, p.id ASC',
  margin_desc: '(pm.sales_amount_30d IS NULL OR pm.sales_amount_30d <= 0), COALESCE(gross_margin_30d, -999999) DESC, p.id DESC',
  sales_7d_asc: 'COALESCE(pm.sales_qty_7d, 0) ASC, p.id ASC',
  sales_7d_desc: 'COALESCE(pm.sales_qty_7d, 0) DESC, p.id DESC',
  sales_30d_asc: 'COALESCE(pm.sales_qty_30d, 0) ASC, p.id ASC',
  sales_30d_desc: 'COALESCE(pm.sales_qty_30d, 0) DESC, p.id DESC',
  sales_amount_30d_asc: 'COALESCE(pm.sales_amount_30d, 0) ASC, p.id ASC',
  sales_amount_30d_desc: 'COALESCE(pm.sales_amount_30d, 0) DESC, p.id DESC',
  gross_profit_30d_asc: 'COALESCE(pm.gross_profit_30d, 0) ASC, p.id ASC',
  gross_profit_30d_desc: 'COALESCE(pm.gross_profit_30d, 0) DESC, p.id DESC',
};

function resolveProductListOrderBy(sort) {
  const key = String(sort || '').trim();
  return SORT_ORDER_SQL[key] || SORT_ORDER_SQL.created_desc;
}

function buildProductListQuery(where, params, options = {}) {
  const { pageSize, offset, sort } = options;
  const orderBy = resolveProductListOrderBy(sort);
  const baseSql = `${PRODUCT_LIST_SELECT} ${PRODUCT_LIST_FROM} ${where}`;
  if (pageSize != null && offset != null) {
    return {
      sql: `${baseSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      params: [...params, pageSize, offset],
    };
  }
  return {
    sql: `${baseSql} ORDER BY ${orderBy}`,
    params: [...params],
  };
}

module.exports = {
  PRODUCT_LIST_FROM,
  buildProductListQuery,
  resolveProductListOrderBy,
  SORT_ORDER_SQL,
};
