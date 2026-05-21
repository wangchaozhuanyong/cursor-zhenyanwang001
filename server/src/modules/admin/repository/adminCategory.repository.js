const db = require('../../../config/db');

async function selectAllCategoriesOrdered() {
  const [rows] = await db.query(`
    SELECT
      c.*,
      (
        SELECT COUNT(*)
        FROM products p
        WHERE p.category_id = c.id AND p.deleted_at IS NULL
      ) AS productCount
    FROM categories c
    WHERE c.deleted_at IS NULL
    ORDER BY
      c.parent_id IS NOT NULL,
      c.parent_id ASC,
      c.sort_order ASC,
      c.id ASC
  `);
  return rows;
}

async function insertCategory(params) {
  const { id, parent_id, name, icon, icon_url, sort_order, is_visible } = params;
  await db.query(
    `INSERT INTO categories (id, parent_id, name, icon, icon_url, sort_order, is_visible, is_active)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      id,
      parent_id || null,
      name,
      icon || '',
      icon_url || icon || '',
      sort_order || 0,
      is_visible === false ? 0 : 1,
      is_visible === false ? 0 : 1,
    ],
  );
}

async function updateCategoryDynamic(setFragments, values, id) {
  await db.query(`UPDATE categories SET ${setFragments.join(', ')} WHERE id = ?`, [...values, id]);
}

async function updateCategoryDynamicWithVersion(setFragments, values, id, version) {
  const [result] = await db.query(
    `UPDATE categories SET ${setFragments.join(', ')}, version = version + 1 WHERE id = ? AND version = ?`,
    [...values, id, Number(version)],
  );
  return result.affectedRows;
}

async function selectCategoryById(id) {
  const [[row]] = await db.query('SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL', [id]);
  return row || null;
}

async function countChildren(id) {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM categories WHERE parent_id = ? AND deleted_at IS NULL',
    [id],
  );
  return total;
}

async function countProducts(id) {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM products WHERE category_id = ? AND deleted_at IS NULL',
    [id],
  );
  return total;
}

async function batchUpdateSort(items) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const item of items) {
      await conn.query(
        'UPDATE categories SET parent_id = ?, sort_order = ? WHERE id = ? AND deleted_at IS NULL',
        [item.parent_id || null, item.sort_order || 0, item.id],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function deleteCategoryById(id, deletedBy) {
  await db.query('UPDATE categories SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [deletedBy || null, id]);
}

async function restoreCategoryById(id) {
  await db.query('UPDATE categories SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
}

module.exports = {
  selectAllCategoriesOrdered,
  selectCategoryById,
  insertCategory,
  updateCategoryDynamic,
  updateCategoryDynamicWithVersion,
  countChildren,
  countProducts,
  batchUpdateSort,
  deleteCategoryById,
  restoreCategoryById,
};



