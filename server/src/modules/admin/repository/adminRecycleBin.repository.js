const db = require('../../../config/db');

const TABLE_CONFIGS = {
  products: { label: '商品', nameCol: 'name', selectCols: "id, COALESCE(NULLIF(TRIM(name), ''), '未命名商品') AS name, cover_image, category_id, deleted_at, deleted_by", permanentDelete: true, hasDeletedBy: true },
  categories: { label: '分类', nameCol: 'name', selectCols: "id, COALESCE(NULLIF(TRIM(name), ''), '未命名分类') AS name, parent_id, deleted_at, deleted_by", permanentDelete: true, hasDeletedBy: true },
  coupons: { label: '优惠券', nameCol: 'title', selectCols: "id, COALESCE(NULLIF(TRIM(title), ''), '未命名优惠券') AS name, deleted_at, deleted_by", permanentDelete: true, hasDeletedBy: true },
  banners: { label: '轮播图', nameCol: 'title', selectCols: "id, COALESCE(NULLIF(TRIM(title), ''), '未命名轮播图') AS name, image AS cover_image, deleted_at, deleted_by", permanentDelete: true, hasDeletedBy: true },
  content_pages: { label: '内容页', nameCol: 'title', selectCols: "id, COALESCE(NULLIF(TRIM(title), ''), '未命名内容页') AS name, slug, deleted_at, deleted_by", permanentDelete: true, hasDeletedBy: true },
  product_reviews: { label: '评论', nameCol: 'content', selectCols: "id, CONCAT(LEFT(content, 50), '...') AS name, product_id, user_id, deleted_at, deleted_by", permanentDelete: true, hasDeletedBy: true },
  marketing_activities: { label: '营销活动', nameCol: 'title', selectCols: "id, COALESCE(NULLIF(TRIM(title), ''), '未命名营销活动') AS name, deleted_at, deleted_by", permanentDelete: false },
  coupon_campaigns: { label: '发券活动', nameCol: 'title', selectCols: "id, COALESCE(NULLIF(TRIM(title), ''), '未命名发券活动') AS name, deleted_at, deleted_by", permanentDelete: false, hasDeletedBy: true },
  product_tags: { label: '商品标签', nameCol: 'name', selectCols: "id, COALESCE(NULLIF(TRIM(name), ''), '未命名商品标签') AS name, image_url AS cover_image, deleted_at, NULL AS deleted_by", permanentDelete: false },
  notifications: { label: '通知', nameCol: 'title', selectCols: "id, COALESCE(NULLIF(TRIM(title), ''), '未命名通知') AS name, deleted_at, NULL AS deleted_by", permanentDelete: false },
  notification_batches: { label: '通知批次', nameCol: 'title', selectCols: "id, COALESCE(NULLIF(TRIM(title), ''), '未命名通知批次') AS name, deleted_at, NULL AS deleted_by", permanentDelete: false },
  product_variants: { label: '商品规格', nameCol: 'title', selectCols: "id, COALESCE(NULLIF(TRIM(title), ''), NULLIF(TRIM(sku_code), ''), '未命名商品规格') AS name, product_id, image_url AS cover_image, deleted_at, NULL AS deleted_by", permanentDelete: false },
  product_spec_groups: { label: '规格组', nameCol: 'name', selectCols: 'id, name, product_id, deleted_at, NULL AS deleted_by', permanentDelete: false },
  product_spec_values: { label: '规格值', nameCol: 'value', selectCols: 'id, value AS name, product_id, image_url AS cover_image, deleted_at, NULL AS deleted_by', permanentDelete: false },
  inventory_pack_rules: { label: '组装拆包规则', nameCol: 'remark', selectCols: "id, COALESCE(NULLIF(TRIM(remark), ''), '未命名组装规则') AS name, parent_product_id, child_product_id, deleted_at, NULL AS deleted_by", permanentDelete: false },
  users: { label: '用户', nameCol: 'nickname', selectCols: "id, COALESCE(NULLIF(TRIM(nickname), ''), NULLIF(TRIM(phone), ''), '未命名用户') AS name, avatar AS cover_image, deleted_at, NULL AS deleted_by", permanentDelete: false },
};

function normalizePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function buildDeletedWhere(config, query = {}) {
  let where = 'WHERE deleted_at IS NOT NULL';
  const params = [];
  if (query.keyword && config.nameCol) {
    where += ` AND ${config.nameCol} LIKE ?`;
    params.push(`%${query.keyword}%`);
  }
  if (query.dateFrom) {
    where += ' AND deleted_at >= ?';
    params.push(query.dateFrom);
  }
  if (query.dateTo) {
    where += ' AND deleted_at < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(query.dateTo);
  }
  return { where, params };
}

function buildSelectColumns(type, config) {
  const canPermanentDelete = config.permanentDelete ? 1 : 0;
  return `${config.selectCols}, '${type}' AS type, '${config.label}' AS type_label, ${canPermanentDelete} AS can_permanent_delete`;
}

function emptyDeletedPage(query = {}) {
  const { page, pageSize } = normalizePagination(query);
  return {
    kind: 'paginate',
    list: [],
    total: 0,
    page,
    pageSize,
  };
}

async function listDeletedItems(type, query = {}) {
  const config = TABLE_CONFIGS[type];
  if (!config) return [];
  const { where, params } = buildDeletedWhere(config, query);
  const [rows] = await db.query(
    `SELECT ${buildSelectColumns(type, config)} FROM ${type} ${where} ORDER BY deleted_at DESC`,
    params,
  );
  return rows;
}

async function listAllDeleted(query = {}) {
  const results = [];
  for (const [type, config] of Object.entries(TABLE_CONFIGS)) {
    try {
      const { where, params } = buildDeletedWhere(config, query);
      const [rows] = await db.query(
        `SELECT ${buildSelectColumns(type, config)} FROM ${type} ${where} ORDER BY deleted_at DESC`,
        params,
      );
      results.push(...rows);
    } catch {
      // Some deployments may not have every optional table/column yet.
    }
  }
  results.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
  return results;
}

async function listDeletedPage(query = {}) {
  const { page, pageSize, offset } = normalizePagination(query);
  const type = query.type;
  if (type && !TABLE_CONFIGS[type]) return emptyDeletedPage(query);
  const rows = type && TABLE_CONFIGS[type]
    ? await listDeletedItems(type, query)
    : await listAllDeleted(query);
  return {
    kind: 'paginate',
    list: rows.slice(offset, offset + pageSize),
    total: rows.length,
    page,
    pageSize,
  };
}

async function getDeletedItem(type, id, q) {
  const query = q || db;
  const config = TABLE_CONFIGS[type];
  if (!config) return null;
  const [[row]] = await query.query(
    `SELECT ${buildSelectColumns(type, config)} FROM ${type} WHERE id = ? AND deleted_at IS NOT NULL LIMIT 1`,
    [id],
  );
  return row || null;
}

async function getActiveCategory(id) {
  if (!id) return null;
  const [[row]] = await db.query('SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
  return row || null;
}

async function getActiveProduct(id) {
  if (!id) return null;
  const [[row]] = await db.query('SELECT id FROM products WHERE id = ? AND deleted_at IS NULL LIMIT 1', [id]);
  return row || null;
}

async function getAnyUser(id) {
  if (!id) return null;
  const [[row]] = await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
  return row || null;
}

async function getCouponCategoryIds(couponId) {
  const [rows] = await db.query('SELECT category_id FROM coupon_categories WHERE coupon_id = ?', [couponId]);
  return rows.map((row) => row.category_id).filter(Boolean);
}

async function getActiveCoupon(id) {
  if (!id) return null;
  const [[row]] = await db.query('SELECT id FROM coupons WHERE BINARY id = BINARY ? AND deleted_at IS NULL AND archived_at IS NULL LIMIT 1', [id]);
  return row || null;
}

async function getCouponCampaignCouponIds(campaignId) {
  const [rows] = await db.query(
    `SELECT coupon_id
       FROM coupon_campaign_items
      WHERE BINARY campaign_id = BINARY ?`,
    [campaignId],
  );
  return rows.map((row) => row.coupon_id).filter(Boolean);
}

async function restoreItem(type, id) {
  const config = TABLE_CONFIGS[type];
  if (!config) return false;
  let result;
  if (type === 'product_reviews') {
    [result] = await db.query("UPDATE product_reviews SET status = 'normal', deleted_at = NULL, deleted_by = NULL WHERE id = ? AND deleted_at IS NOT NULL", [id]);
  } else {
    const deletedBySql = config.hasDeletedBy ? ', deleted_by = NULL' : '';
    [result] = await db.query(`UPDATE ${type} SET deleted_at = NULL${deletedBySql} WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
  }
  return result.affectedRows > 0;
}

async function permanentDeleteItem(type, id) {
  const config = TABLE_CONFIGS[type];
  if (!config || !config.permanentDelete) return false;
  if (type === 'product_reviews') {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const existing = await getDeletedItem(type, id, conn);
      if (!existing) {
        await conn.rollback();
        return false;
      }
      await conn.query('DELETE FROM review_likes WHERE review_id = ?', [id]);
      const [result] = await conn.query('DELETE FROM product_reviews WHERE id = ? AND deleted_at IS NOT NULL', [id]);
      if (result.affectedRows === 0) {
        await conn.rollback();
        return false;
      }
      await conn.commit();
      return true;
    } catch (err) {
      try { await conn.rollback(); } catch { /* ignore */ }
      throw err;
    } finally {
      conn.release();
    }
  }
  const [result] = await db.query(`DELETE FROM ${type} WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  TABLE_CONFIGS,
  listDeletedItems,
  listAllDeleted,
  listDeletedPage,
  getDeletedItem,
  getActiveCategory,
  getActiveProduct,
  getAnyUser,
  getCouponCategoryIds,
  getActiveCoupon,
  getCouponCampaignCouponIds,
  restoreItem,
  permanentDeleteItem,
};
