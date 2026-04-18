const db = require('../../config/db');

const TABLE_CONFIGS = {
  products: { label: '商品', nameCol: 'name', selectCols: 'id, name, cover_image, deleted_at, deleted_by' },
  categories: { label: '分类', nameCol: 'name', selectCols: 'id, name, deleted_at, deleted_by' },
  coupons: { label: '优惠券', nameCol: 'title', selectCols: 'id, title AS name, deleted_at, deleted_by' },
  banners: { label: 'Banner', nameCol: 'title', selectCols: 'id, title AS name, image AS cover_image, deleted_at, deleted_by' },
  content_pages: { label: '内容页', nameCol: 'title', selectCols: 'id, title AS name, slug, deleted_at, deleted_by' },
  product_reviews: { label: '评论', nameCol: 'content', selectCols: "id, CONCAT(LEFT(content, 50), '...') AS name, product_id, user_id, deleted_at, deleted_by" },
};

async function listDeletedItems(type) {
  const config = TABLE_CONFIGS[type];
  if (!config) return [];
  const [rows] = await db.query(
    `SELECT ${config.selectCols}, '${type}' AS type FROM ${type} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
  );
  return rows;
}

async function listAllDeleted() {
  const results = [];
  for (const [type, config] of Object.entries(TABLE_CONFIGS)) {
    try {
      const [rows] = await db.query(
        `SELECT ${config.selectCols}, '${type}' AS type, '${config.label}' AS type_label FROM ${type} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 100`,
      );
      results.push(...rows);
    } catch { /* table may not have deleted_at yet */ }
  }
  results.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
  return results;
}

async function restoreItem(type, id) {
  const config = TABLE_CONFIGS[type];
  if (!config) return false;
  if (type === 'product_reviews') {
    await db.query("UPDATE product_reviews SET status = 'normal', deleted_at = NULL, deleted_by = NULL WHERE id = ?", [id]);
  } else {
    await db.query(`UPDATE ${type} SET deleted_at = NULL, deleted_by = NULL WHERE id = ?`, [id]);
  }
  return true;
}

async function permanentDeleteItem(type, id) {
  const config = TABLE_CONFIGS[type];
  if (!config) return false;
  await db.query(`DELETE FROM ${type} WHERE id = ?`, [id]);
  if (type === 'product_reviews') {
    await db.query('DELETE FROM review_likes WHERE review_id = ?', [id]);
  }
  return true;
}

module.exports = {
  TABLE_CONFIGS,
  listDeletedItems,
  listAllDeleted,
  restoreItem,
  permanentDeleteItem,
};
